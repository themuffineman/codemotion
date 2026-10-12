# codemotion

A programmatic coding-tutorial video made with [Motion Canvas](https://motioncanvas.io/):
**"Build a Timer in React"**, which types the code line by line, highlights and zooms into
key parts, and runs a live preview of the component next to the editor.

## Scenes

- `src/scenes/intro.tsx`: animated React atom, a title that types itself, and a ticking stopwatch pill.
- `src/scenes/tutorial.tsx`: the editor plus live preview. It has five steps (component → state →
  `useEffect` → start/pause → mm:ss formatting) and ends with an outro recap.
- `src/theme.ts`: colors, the JSX syntax highlighter (Lezer), and font loading.

## Usage

```bash
npm install
npm start          # Motion Canvas editor at http://localhost:9000
npm run render     # headless render to output/project.mp4 (1080p, 30fps)
npm run render -- --fps 60 --scale 1
```

`npm run render` starts Vite and opens `render.html` in headless Chromium (via `playwright-core`).
It then drives Motion Canvas's `Renderer` with the FFmpeg exporter, so it needs no editor UI.
Set `CHROME_PATH` if Chromium is not at `/opt/pw-browsers/chromium`.
