# Hello → Apple logo recreation

Frame-by-frame recreation of a neon "hello" motion graphic (found on Twitter, 1280x720, 30 fps, 295 frames).
Original: `public/hello/original.mp4`. Recreation: composition `HelloRecreation` (`src/videos/hello/`).
Side by side: composition `HelloCompare`. Per-frame check sheets: `node scripts/compare-frames.mjs HelloRecreation public/hello/original.mp4 <frames>`.

## What was measured (analysis/)

Frames were pulled with `ffmpeg -i original.mp4 frames/f%03d.png`; the scripts expect them in `../hello/frames`.

- **The clip is a palindrome**: frame f equals frame 292 - f (mean pixel difference under 1.4/255). Only frames 0-146 are built.
- **One continuous stroke** (`appear.py`, `appear.png`): the frame each pixel first lights up shows the order: lead-in, h loop, stem, hump, e, l, l, o, tail.
- **Centrelines** traced on 10 px grids (`grid2.py`) and checked by overlaying the tube edges on the frame (`overlay.py`, `ov_hello.png`, `ov_apple.png`). Tube radius 20 px.
- **Draw-on** frames 5-40: slow through the h, then it accelerates hard (`tipcent.py`, then corrected by comparison sheets).
- **Colour** is a pattern that slides forward along the tube (`flow.py`: 8 px/frame rising to 13), repeating every 1450 px of arc (`tex.py`, `pal.py`, `palette.png`). The logo has its own colours, sampled at frame 146.
- **The turn** is not a rigid rotation (`fitrot3.py` tops out at IoU 0.70). Tracking the ascender tops (`tops.py`) showed each loop turns on its own slanted axis, the h first, the o last; the joining strokes stretch between them; then the letters slide into one stack, edge-on at frame 129.4 (`fitletters2.py`).
- **The logo** turns in from edge-on and settles with a long tail (`width.py`).

## The 3D version (composition `Hello3D`, `src/videos/hello3d/`)

A real tube mesh in three.js (render with `--gl=swangle` here, no GPU): glass shading from the viewing angle,
additive light, motion blur by averaging instants, then the same bloom. Each loop's sideways offset becomes depth
as it turns, with true perspective.

**Depth-fit test** (`depthfit2.py`, `depthfit3.py`): could one rigid 3D turn, with a depth for every point of
the word, explain frames 110-128? Same score for all (mean IoU of tube masks, thickness calibrated on frame 90):

| model | turn IoU |
|---|---|
| flat word, one rigid turn | 0.824 |
| free depth per point, one rigid turn | 0.840 (but the line is a scribble: `ovdepth.png`) |
| smooth depth, one rigid turn | 0.806 |
| per-loop turn, hand-tuned (first 2D version) | 0.733 |
| per-loop turn, fitted (`fitletters3.py`, `ovfit.png`) | 0.806 incl. frame 129 |

So the original is not one 3D object turning: the letters move separately. The fit also found the loops turn on
upright axes (not slanted), and stop at about 62 degrees.

Mean pixel difference to the original, whole clip: 2D 7.64, 3D 7.26 (draw-on 5.5, hold 7.8, turn 10.4, logo 7.2).

## Known differences

- Frames 122-129: the original's h loop disappears and the stack ends as big round loops; ours stays a narrow "hello".
- The logo's first frames (130-133) are narrower and more tilted in perspective in the original.
- Colours drift from the original in a few places during the draw-on.
- The original's faint lens-flare arcs during the draw-on, and its sound, are not recreated.
