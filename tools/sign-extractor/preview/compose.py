"""Side-by-side sheet: video frame | avatar render, one row per frame.

    .venv/bin/python preview/compose.py out/HELLO.json out/preview/HELLO [frame ...]
"""
import json, os, sys
import cv2
import numpy as np

json_path, render_dir, *frame_args = sys.argv[1:]
data = json.load(open(json_path))
frames = [int(f) for f in frame_args] or data['keyframes']
repo = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
cap = cv2.VideoCapture(os.path.join(repo, data['video']))
rows = []
for f in frames:
    cap.set(cv2.CAP_PROP_POS_FRAMES, f)
    ok, img = cap.read()
    avatar = cv2.imread(os.path.join(render_dir, f'avatar_{f}.png'))
    h = avatar.shape[0]
    img = cv2.resize(img, (int(img.shape[1] * h / img.shape[0]), h))
    cx = img.shape[1] // 2  # crop the signer (centered) to a portrait panel
    img = img[:, max(0, cx - h // 2): cx + h // 2]
    row = np.hstack([img, avatar])
    cv2.putText(row, f'frame {f}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    rows.append(row)
out = os.path.join(render_dir, 'sheet.png')
cv2.imwrite(out, np.vstack(rows) if len(rows) <= 3 else np.vstack([np.hstack(rows[i:i + 2]) if i + 1 < len(rows) else np.hstack([rows[i], np.zeros_like(rows[i])]) for i in range(0, len(rows), 2)]))
print(out)
