# Sign extractor: ISL video → avatar sign

Turns a video of a single ISL sign into an animation for the app's avatar (`client/src/Models/avatar/avatar.glb`). The output uses the same keyframe format as the hand-written signs in `client/src/Animations/Words/`.

**How it works**
1. **MediaPipe** (pre-trained pose and hand landmark models) tracks the signer's body and both hands in each frame.
2. Each hand is matched to the signer's left or right wrist. Gaps are interpolated and the motion is smoothed.
3. **Retargeting** (`skeleton.py`) converts landmarks into bone rotations for the Mixamo rig: upper arm with an elbow-hinge-aware twist, forearm, full palm orientation, and 3 joints per finger. Directions are measured in the signer's torso frame, so camera angle and body lean don't matter.
4. **Keyframes** are the *holds*, the moments the hands nearly stop, which is where a sign's shapes are. Fast transitions between them are left to the app's interpolation.
5. The result is written to `out/<WORD>.js`. The sign starts from and returns to the app's default pose.

## Setup (once)

```bash
cd tools/sign-extractor
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
mkdir -p models && cd models
curl -LO https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task
curl -LO https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
cd .. && npm install   # puppeteer-core, only needed for previews
```

`mediapipe==0.10.14` is pinned on purpose: newer macOS builds crash on initialisation (they require a Metal GPU service), even with the CPU delegate.

## Usage

```bash
# Extract, and add the sign to the app (client/src/Animations/Words + words.js)
.venv/bin/python extract_sign.py ../../datasets/include/Greetings/hello/MVI_0029.MOV --word HELLO --install

# Check it visually: video frame | avatar, at each keyframe (needs a server on the repo root)
(cd ../.. && python3 -m http.server 5077) &
node preview/render.mjs out/HELLO.json out/preview/HELLO
.venv/bin/python preview/compose.py out/HELLO.json out/preview/HELLO   # -> out/preview/HELLO/sheet.png
```

`chosen_videos.txt` lists the video used for each installed sign. Both downloaded videos per word were converted and compared side by side, and the cleaner one was kept.

To check the real app (built app served on :5055): `preview/app_regression.mjs` drives every page's features end to end (signing, learning, videos, create form, Avatar Studio, theme toggle, mobile menu), and `preview/site_shots.mjs <dir>` screenshots every page in both themes on desktop and mobile.

Videos come from the [INCLUDE dataset](https://zenodo.org/records/4010759). `datasets/include/fetch_subset.py` downloads a few videos per word without downloading the whole zips.
