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

## Known differences

- The in-between shapes of the turn (frames 122-128) are close but not exact.
- Colours drift from the original in a few places during the draw-on.
- The original's faint lens-flare arcs during the draw-on, and its sound, are not recreated.
