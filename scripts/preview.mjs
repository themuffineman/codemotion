// Preview loop: renders stills across a composition and tiles them into one contact sheet,
// so a whole video can be reviewed at a glance (by you or by the model) before a full render.
// usage: node scripts/preview.mjs <CompositionId> [everySeconds=2] [cols=4]
//   -> out/<id>-sheet.png  (+ individual frames in out/<id>/)
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , id, everyArg, colsArg] = process.argv;
if (!id) throw new Error('usage: node scripts/preview.mjs <CompositionId> [everySeconds] [cols]');
const every = Number(everyArg ?? 2);
const cols = Number(colsArg ?? 4);
// Set REMOTION_BROWSER to use a specific Chromium; otherwise Remotion uses (and downloads once) its own.
const browserExecutable = process.env.REMOTION_BROWSER ?? null;

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
// One browser for every still, instead of launching one per frame.
const puppeteerInstance = await openBrowser('chrome', {browserExecutable});
const comp = await selectComposition({serveUrl, id, browserExecutable, puppeteerInstance, port: 3123});
const dir = path.resolve('out', id);
fs.rmSync(dir, {recursive: true, force: true});
fs.mkdirSync(dir, {recursive: true});
const step = Math.round(every * comp.fps);
const frames = [];
for (let f = Math.round(step / 2); f < comp.durationInFrames; f += step) frames.push(f);
let i = 0;
for (const frame of frames) {
  const output = path.join(dir, `${String(i++).padStart(3, '0')}.png`);
  await renderStill({serveUrl, composition: comp, frame, output, browserExecutable, puppeteerInstance, scale: 0.4, port: 3123});
  process.stdout.write(`\r${i}/${frames.length}`);
}
console.log();
await puppeteerInstance.close({silent: true});
const vertical = comp.height > comp.width;
const tileW = vertical ? 216 : 384;
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, '%03d.png'),
  '-vf', `scale=${tileW}:-1,drawtext=text='%{eif\\:n*${every}+${every / 2}\\:d}s':x=8:y=h-th-8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x${Math.ceil(frames.length / cols)}:padding=6:color=0x111111`,
  '-frames:v', '1', path.resolve('out', `${id}-sheet.png`),
]);
console.log(`out/${id}-sheet.png  (${frames.length} frames, every ${every}s)`);
