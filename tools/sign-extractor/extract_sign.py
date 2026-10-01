"""Turn an ISL sign video into an avatar animation for the Sign Kit app.

    .venv/bin/python extract_sign.py VIDEO --word HELLO [--out out]

Pipeline: MediaPipe pose + hand landmarks per frame -> hands matched to the signer's
left/right wrist -> gaps filled and smoothed -> retargeted to the Mixamo rig (skeleton.py)
-> a few keyframes picked from the motion -> out/<WORD>.js (same format as
client/src/Animations/Words/*.js) and out/<WORD>.json (per-frame data for previews).
"""
import argparse
import json
import os
import re

import cv2
import mediapipe as mp
import numpy as np

from skeleton import SIDES, Retargeter, Skeleton, to_euler

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, 'models')
GLB = os.path.join(HERE, '..', '..', 'client', 'src', 'Models', 'avatar', 'avatar.glb')

# Pose the app puts the avatar in between signs (client/src/Animations/defaultPose.js);
# every generated sign starts from and returns to it.
DEFAULT_POSE = {
    ('mixamorigLeftArm', 'z'): -np.pi / 3,
    ('mixamorigLeftForeArm', 'y'): -np.pi / 1.5,
    ('mixamorigRightArm', 'z'): np.pi / 3,
    ('mixamorigRightForeArm', 'y'): np.pi / 1.5,
}
AXES = ('x', 'y', 'z')


def detect(video_path):
    """Per-frame MediaPipe landmarks: pose world (T,33,3), pose image (T,33,2), hands {side: (T,21,3) with NaN gaps}."""
    V, B = mp.tasks.vision, mp.tasks.BaseOptions
    pose_lm = V.PoseLandmarker.create_from_options(V.PoseLandmarkerOptions(
        base_options=B(model_asset_path=os.path.join(MODELS, 'pose_landmarker_heavy.task')),
        running_mode=V.RunningMode.VIDEO))
    hand_lm = V.HandLandmarker.create_from_options(V.HandLandmarkerOptions(
        base_options=B(model_asset_path=os.path.join(MODELS, 'hand_landmarker.task')),
        running_mode=V.RunningMode.VIDEO, num_hands=2,
        min_hand_detection_confidence=0.3, min_hand_presence_confidence=0.3, min_tracking_confidence=0.3))

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    pose_w, pose_img, hands = [], [], {s: [] for s in SIDES}
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        t = int(i * 1000 / fps)
        rp, rh = pose_lm.detect_for_video(image, t), hand_lm.detect_for_video(image, t)
        i += 1
        if not rp.pose_world_landmarks:
            pose_w.append(np.full((33, 3), np.nan)), pose_img.append(np.full((33, 2), np.nan))
            for s in SIDES:
                hands[s].append(np.full((21, 3), np.nan))
            continue
        pw = np.array([[p.x, p.y, p.z] for p in rp.pose_world_landmarks[0]])
        pi = np.array([[p.x, p.y] for p in rp.pose_landmarks[0]])
        pose_w.append(pw), pose_img.append(pi)

        # Match each detected hand to the nearest pose wrist (15 = signer's left, 16 = right).
        best = {}
        for img_lm, world_lm in zip(rh.hand_landmarks, rh.hand_world_landmarks):
            wrist = np.array([img_lm[0].x, img_lm[0].y])
            d = {s: np.linalg.norm(wrist - pi[15 if s == 'Left' else 16]) for s in SIDES}
            side = min(d, key=d.get)
            if side not in best or d[side] < best[side][0]:
                best[side] = (d[side], np.array([[p.x, p.y, p.z] for p in world_lm]))
        for s in SIDES:
            hands[s].append(best[s][1] if s in best else np.full((21, 3), np.nan))
    cap.release()
    return fps, np.array(pose_w), np.array(pose_img), {s: np.array(v) for s, v in hands.items()}


def fill_and_smooth(series, window=5):
    """Linearly interpolate NaN frames (holding the ends), then centered moving average."""
    s = series.reshape(len(series), -1).copy()
    t = np.arange(len(s))
    valid = ~np.isnan(s[:, 0])
    if not valid.any():
        return None
    for c in range(s.shape[1]):
        s[:, c] = np.interp(t, t[valid], s[valid, c])
    if window > 1 and len(s) >= window:
        kernel = np.ones(window) / window
        padded = np.pad(s, ((window // 2, window // 2), (0, 0)), mode='edge')
        s = np.stack([np.convolve(padded[:, c], kernel, mode='valid') for c in range(s.shape[1])], axis=1)
    return s.reshape(series.shape)


def active_range(pose_img, margin=2):
    """Frames where a wrist is raised above mid-torso (signers start and end with hands down)."""
    sh_y = (pose_img[:, 11, 1] + pose_img[:, 12, 1]) / 2
    hip_y = (pose_img[:, 23, 1] + pose_img[:, 24, 1]) / 2
    level = hip_y - 0.35 * (hip_y - sh_y)  # image y grows downward
    raised = (pose_img[:, 15, 1] < level) | (pose_img[:, 16, 1] < level)
    idx = np.flatnonzero(raised)
    if not len(idx):
        return 0, len(pose_img) - 1
    return max(0, idx[0] - margin), min(len(pose_img) - 1, idx[-1] + margin)


def unwrap_from(start, values):
    """Unwrap an angle sequence so it is continuous starting from `start`."""
    seq = np.unwrap(np.concatenate([[start], values]))
    return seq[1:]


def pick_holds(traj, weights, start, end, max_keys=4, slow=0.35, min_gap=4, pose_tol=0.5):
    """Sign shapes are the moments the hands (nearly) stop; transitions in between are fast.
    Returns the slowest frame of each slow stretch inside [start, end], in time order. A slow
    stretch is split where the arm pose drifts more than `pose_tol` radians (a slow glide
    between two shapes is still two shapes)."""
    speed = np.abs(np.diff(traj, axis=0)) @ weights / weights.sum()
    speed = np.convolve(np.pad(speed, 1, mode='edge'), np.ones(3) / 3, mode='valid')
    lo, hi = start + 1, end - 1
    if hi <= lo:
        return []
    window = speed[lo:hi]
    candidates = np.flatnonzero(window < slow * window.max()) + lo
    groups, holds = [], []
    arm = weights == weights.max()
    for f in candidates:
        if groups and f - groups[-1][-1] <= min_gap and np.abs(traj[f, arm] - traj[groups[-1][0], arm]).max() <= pose_tol:
            groups[-1].append(f)
        else:
            groups.append([f])
    for g in groups:
        holds.append(min(g, key=lambda f: speed[f]))
    # Neighbouring holds a few frames apart are the same shape; keep the stiller one.
    merged = []
    for h in holds:
        if merged and h - merged[-1] < min_gap:
            if speed[h] < speed[merged[-1]]:
                merged[-1] = h
        else:
            merged.append(h)
    if len(merged) > max_keys:  # keep the stillest ones
        merged = sorted(sorted(merged, key=lambda f: speed[f])[:max_keys])
    return [int(h) for h in merged]


def pick_keyframes(traj, start, end, tol=0.25, max_keys=6):
    """Ramer-Douglas-Peucker on the joint-angle trajectory: add the frame with the largest
    interpolation error until every frame is within `tol` radians (or max_keys reached)."""
    keys = [start, end]
    while len(keys) < max_keys + 2:
        worst, worst_err = None, tol
        for a, b in zip(keys, keys[1:]):
            for f in range(a + 1, b):
                w = (f - a) / (b - a)
                err = np.max(np.abs(traj[f] - ((1 - w) * traj[a] + w * traj[b])))
                if err > worst_err:
                    worst, worst_err = f, err
        if worst is None:
            break
        keys = sorted(keys + [worst])
    return keys


def build(video_path, word):
    fps, pose_w, pose_img, hands = detect(video_path)
    pose_w = fill_and_smooth(pose_w)
    pose_img = fill_and_smooth(pose_img, window=1)
    hands = {s: fill_and_smooth(h) for s, h in hands.items()}

    rt = Retargeter(Skeleton(GLB))
    frames = [to_euler(rt.frame(pose_w[i], {s: (None if hands[s] is None else hands[s][i]) for s in SIDES}))
              for i in range(len(pose_w))]

    channels = sorted({(b, ax) for f in frames for b in f for ax in AXES})
    traj = np.zeros((len(frames), len(channels)))
    for c, (b, ax) in enumerate(channels):
        raw = np.array([f[b][AXES.index(ax)] if b in f else 0.0 for f in frames])
        traj[:, c] = unwrap_from(DEFAULT_POSE.get((b, ax), 0.0), raw)

    start, end = active_range(pose_img)
    # Fingers are the noisiest channels; let arm and wrist motion dominate timing.
    weights = np.array([0.3 if 'Hand' in b and not b.endswith('Hand') else 1.0 for b, _ in channels])
    keys = pick_holds(traj, weights, start, end)
    if not keys:  # continuous movement without holds: fall back to shape-preserving sampling
        keys = [k for k in pick_keyframes(traj, start, end, max_keys=4) if k not in (start, end)]
    keys = keys or [int((start + end) / 2)]

    return {
        'word': word,
        'video': os.path.relpath(video_path, os.path.join(HERE, '..', '..')),
        'fps': fps,
        'active': [int(start), int(end)],
        'keyframes': [int(k) for k in keys],
        'channels': [f'{b}.{ax}' for b, ax in channels],
        'frames': np.round(traj, 4).tolist(),
        'hands_detected': {s: None if hands[s] is None else True for s in SIDES},
    }


def to_js(data, min_delta=0.03):
    """Emit a sign in the app's keyframe format: [bone, 'rotation', axis, target, '+'|'-']."""
    channels = [tuple(c.rsplit('.', 1)) for c in data['channels']]
    current = {ch: DEFAULT_POSE.get(ch, 0.0) for ch in channels}
    lines = [
        f"// Generated by tools/sign-extractor from {data['video']}",
        f"// (frames {', '.join(map(str, data['keyframes']))}). Re-run the extractor instead of editing by hand.",
        f"export const {data['word']} = (ref) => {{",
        "",
        "    let animations = []",
    ]

    def emit(targets):
        out = []
        for ch, value in targets.items():
            if abs(value - current[ch]) < min_delta:
                continue
            sign = '+' if value > current[ch] else '-'
            out.append(f'    animations.push(["{ch[0]}", "rotation", "{ch[1]}", {value:.4f}, "{sign}"]);')
            current[ch] = value
        return out

    for k in data['keyframes']:
        body = emit({ch: data['frames'][k][c] for c, ch in enumerate(channels)})
        if body:
            lines += body + ["    ref.animations.push(animations);", "", "    animations = []"]

    lines += emit({ch: DEFAULT_POSE.get(ch, 0.0) for ch in channels})
    lines += [
        "    ref.animations.push(animations);",
        "",
        "    if(ref.pending === false){",
        "        ref.pending = true;",
        "        ref.animate();",
        "    }",
        "",
        "}",
        "",
    ]
    return '\n'.join(lines)


WORDS_DIR = os.path.join(HERE, '..', '..', 'client', 'src', 'Animations', 'Words')
WORDS_INDEX = os.path.join(HERE, '..', '..', 'client', 'src', 'Animations', 'words.js')


def install(word, js):
    """Write the sign into the app and register it in Animations/words.js (idempotent)."""
    with open(os.path.join(WORDS_DIR, f'{word}.js'), 'w') as f:
        f.write(js)
    src = open(WORDS_INDEX).read()
    names = re.search(r"var wordList = \[(.*?)\];", src, re.S).group(1)
    words = [w.strip().strip("'\"") for w in names.split(',') if w.strip()]
    if word not in words:
        words.append(word)
    imports = ''.join(f"import {{ {w} }} from './Words/{w}';\n" for w in words)
    listing = ', '.join(f"'{w}'" for w in words)
    with open(WORDS_INDEX, 'w') as f:
        f.write(f"{imports}\nvar wordList = [{listing}];\n\nexport {{\n    {', '.join(words)}, wordList\n}}\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--word', required=True, help='sign name, e.g. HELLO or THANK_YOU')
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    ap.add_argument('--install', action='store_true', help='add the sign to client/src/Animations/Words and words.js')
    args = ap.parse_args()

    word = args.word.upper().replace(' ', '_')
    data = build(args.video, word)
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, f'{word}.json'), 'w') as f:
        json.dump(data, f)
    js = to_js(data)
    with open(os.path.join(args.out, f'{word}.js'), 'w') as f:
        f.write(js)
    if args.install:
        install(word, js)
    print(f"{word}: {len(data['frames'])} frames, active {data['active']}, keyframes {data['keyframes']}"
          f"{' (installed)' if args.install else ''}")


if __name__ == '__main__':
    main()
