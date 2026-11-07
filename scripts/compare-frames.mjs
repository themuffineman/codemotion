// Frame-by-frame check of a recreation against the original clip: renders the chosen frames of a
// composition and stacks each under the same frame of the original -> out/<id>-compare.png
// usage: node scripts/compare-frames.mjs <CompositionId> <original.mp4> <frames, e.g. 10,20,30-40:2> [cols=4]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , id, original, list, colsArg] = process.argv;
if (!id || !original || !list) throw new Error('usage: node scripts/compare-frames.mjs <Id> <original.mp4> <frames> [cols]');
const cols = Number(colsArg ?? 4);
const frames = list.split(',').flatMap((part) => {
  const [range, step] = part.split(':');
  const [a, b] = range.split('-').map(Number);
  if (b === undefined) return [a];
  const out = [];
  for (let f = a; f <= b; f += Number(step ?? 1)) out.push(f);
  return out;
});
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const dir = path.resolve('out', `${id}-compare`);
fs.rmSync(dir, {recursive: true, force: true});
fs.mkdirSync(dir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const puppeteerInstance = await openBrowser('chrome', {browserExecutable});
const comp = await selectComposition({serveUrl, id, browserExecutable, puppeteerInstance, port: 3124});
const W = 640;
const tiles = [];
for (const [i, frame] of frames.entries()) {
  const ours = path.join(dir, `ours-${frame}.png`);
  await renderStill({serveUrl, composition: comp, frame, output: ours, browserExecutable, puppeteerInstance, scale: 1280 / comp.width, port: 3124});
  const orig = path.join(dir, `orig-${frame}.png`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', original, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', orig]);
  const tile = path.join(dir, `tile-${String(i).padStart(3, '0')}.png`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', orig, '-i', ours, '-filter_complex',
    `[0]scale=${W}:-1[a];[1]scale=${W}:-1[b];[a][b]vstack,drawtext=text='${frame}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6`,
    tile,
  ]);
  tiles.push(tile);
  process.stdout.write(`\r${i + 1}/${frames.length}`);
}
console.log();
await puppeteerInstance.close({silent: true});
const sheet = path.resolve('out', `${id}-compare.png`);
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, 'tile-%03d.png'),
  '-vf', `tile=${cols}x${Math.ceil(frames.length / cols)}:padding=6:color=0x333333`, '-frames:v', '1', sheet,
]);
console.log(sheet);
