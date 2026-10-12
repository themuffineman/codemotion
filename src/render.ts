// Headless render entry: opened by scripts/render.mjs in Chromium.
// Renders the project straight to output/project.mp4 via the FFmpeg exporter.
import {Renderer, RendererResult, Vector2} from '@motion-canvas/core';
import project from './project?project';
import {fontsReady} from './theme';

declare global {
  interface Window {
    __render: {frame: number; done: boolean; result?: string};
  }
}

window.__render = {frame: 0, done: false};

async function main() {
  await fontsReady;
  await document.fonts.ready;
  const params = new URLSearchParams(location.search);
  const fps = Number(params.get('fps') ?? 30);
  const scale = Number(params.get('scale') ?? 1);
  project.logger.onLogged.subscribe(p => console.log(`[${p.level}] ${p.message}${p.stack ? '\n' + p.stack : ''}`));
  const renderer = new Renderer(project);
  renderer.onFrameChanged.subscribe(f => (window.__render.frame = f));
  renderer.onFinished.subscribe(r => {
    window.__render.done = true;
    window.__render.result = RendererResult[r];
  });
  await renderer.render({
    name: 'project',
    range: [0, Infinity],
    fps,
    size: new Vector2(1920, 1080),
    resolutionScale: scale,
    colorSpace: 'srgb',
    background: '#0b0d14',
    exporter: {
      name: '@motion-canvas/ffmpeg',
      options: {fastStart: true, includeAudio: false},
    },
  });
}

main().catch(e => {
  console.error(e);
  window.__render = {frame: -1, done: true, result: String(e)};
});
