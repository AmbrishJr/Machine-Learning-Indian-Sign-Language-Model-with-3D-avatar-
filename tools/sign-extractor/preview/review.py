"""One review sheet per word: a row per candidate video, (video frame | avatar) pairs at each keyframe.

    .venv/bin/python preview/review.py out/cand out/review
Expects renders in <cand>/render/<NAME>/avatar_<frame>.png (preview/render.mjs).
"""
import glob, json, os, sys
from collections import defaultdict
import cv2
import numpy as np

cand, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
repo = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
H = 260
by_word = defaultdict(list)
for path in sorted(glob.glob(os.path.join(cand, '*.json'))):
    name = os.path.basename(path)[:-5]
    by_word[name.split('__')[0]].append((name, json.load(open(path))))

for word, cands in by_word.items():
    rows = []
    for name, data in cands:
        cap = cv2.VideoCapture(os.path.join(repo, data['video']))
        pairs = []
        for f in data['keyframes']:
            cap.set(cv2.CAP_PROP_POS_FRAMES, f)
            ok, img = cap.read()
            img = cv2.resize(img, (int(img.shape[1] * H / img.shape[0]), H))
            cx = img.shape[1] // 2
            img = img[:, cx - int(H * 0.45): cx + int(H * 0.45)]
            av = cv2.imread(os.path.join(cand, 'render', name, f'avatar_{f}.png'))
            av = cv2.resize(av, (int(av.shape[1] * H / av.shape[0]), H))
            pair = np.hstack([img, av, np.full((H, 6, 3), 255, np.uint8)])
            cv2.putText(pair, f'{name[-1]} f{f}', (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            pairs.append(pair)
        rows.append(np.hstack(pairs))
    W = max(r.shape[1] for r in rows)
    sheet = np.vstack([np.hstack([r, np.full((H, W - r.shape[1], 3), 255, np.uint8)]) for r in rows])
    cv2.imwrite(os.path.join(out, f'{word}.png'), sheet)
print(len(by_word), 'sheets')
