// Renders a composition on Modal instead of this PC (much faster: parallel chunks in the cloud).
// usage: node scripts/render-modal.mjs <CompositionId> [out.mp4] [--frames N]
//
// 1. bundles src/index.ts (with public/) and uploads it to gs://<bucket>/marketing-bundles/codemotion-<time>-<sha>/
//    (the "codemotion-" name keeps it out of the way of amsterdam-engine's "tutorial-" bundles)
// 2. sends it to the marketing renderer on Modal (sycamore-mono/services/modal-render/modal_app_marketing.py)
// 3. waits, then downloads the finished MP4 to out/<id>.mp4
// --frames N renders only the first N frames, for a quick test.
//
// Needs GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS_JSON and MODAL_RENDER_TOKEN, read from sycamore-mono/backend/.env.
import {bundle} from '@remotion/bundler';
import {selectComposition} from '@remotion/renderer';
import {Storage} from '@google-cloud/storage';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SUBMIT_URL = 'https://pendorastudios--marketing-submit-render.modal.run';
const STATUS_URL = 'https://pendorastudios--marketing-get-render-status.modal.run';

const args = process.argv.slice(2);
const framesFlag = args.indexOf('--frames');
const maxFrames = framesFlag >= 0 ? Number(args[framesFlag + 1]) : null;
const [id, outArg] = args.filter((a, i) => !a.startsWith('--') && (framesFlag < 0 || i !== framesFlag + 1));
if (!id) throw new Error('usage: node scripts/render-modal.mjs <CompositionId> [out.mp4] [--frames N]');
const out = path.resolve(outArg ?? `out/${id}.mp4`);

// Reads KEY=value lines from sycamore-mono/backend/.env (values may be quoted).
const env = {};
const envFile = path.resolve('../sycamore-mono/backend/.env');
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
for (const k of ['GCS_BUCKET', 'GOOGLE_APPLICATION_CREDENTIALS_JSON', 'MODAL_RENDER_TOKEN']) {
  if (!env[k]) throw new Error(`${k} missing in ${envFile}`);
}
const credentials = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const bucket = new Storage({credentials, projectId: credentials.project_id}).bucket(env.GCS_BUCKET);

// 1. Bundle and upload.
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codemotion-bundle-'));
console.log('Bundling...');
const serveUrlLocal = await bundle({entryPoint: path.resolve('src/index.ts'), outDir});
const comp = await selectComposition({serveUrl: serveUrlLocal, id});
const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const prefix = `marketing-bundles/codemotion-${stamp}-${sha}`;
const listFiles = (dir) =>
  fs.readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return fs.statSync(p).isDirectory() ? listFiles(p) : [p];
  });
const files = listFiles(outDir).filter((f) => !f.endsWith('.map'));
console.log(`Uploading ${files.length} files to gs://${env.GCS_BUCKET}/${prefix}/ ...`);
let next = 0;
await Promise.all(
  Array.from({length: 6}, async () => {
    while (next < files.length) {
      const f = files[next++];
      const destination = `${prefix}/${path.relative(outDir, f).split(path.sep).join('/')}`;
      for (let attempt = 1; ; attempt++) {
        try {
          await bucket.upload(f, {destination, resumable: false});
          break;
        } catch (e) {
          if (attempt >= 5) throw e;
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
    }
  }),
);
fs.rmSync(outDir, {recursive: true, force: true});
const serveUrl = `https://storage.googleapis.com/${env.GCS_BUCKET}/${prefix}/index.html`;

// 2. Submit the render and wait for it.
const totalFrames = maxFrames ? Math.min(maxFrames, comp.durationInFrames) : comp.durationInFrames;
const headers = {'Content-Type': 'application/json', 'x-modal-token': env.MODAL_RENDER_TOKEN};
const submit = await fetch(SUBMIT_URL, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    composition_id: id,
    total_frames: totalFrames,
    input_props: {},
    width: comp.width,
    height: comp.height,
    fps: comp.fps,
    serve_url: serveUrl,
  }),
});
if (!submit.ok) throw new Error(`submit failed (${submit.status}): ${await submit.text()}`);
const {job_id: jobId} = await submit.json();
console.log(`Rendering ${totalFrames} frames on Modal (job ${jobId})...`);
const started = Date.now();
let result;
for (;;) {
  await new Promise((r) => setTimeout(r, 10000));
  const res = await fetch(`${STATUS_URL}?job_id=${encodeURIComponent(jobId)}`, {headers}).catch(() => null);
  if (!res || !res.ok) continue; // a failed poll is not a failed render
  result = await res.json();
  if (result.status === 'error' || result.status === 'failed') throw new Error(`render failed: ${JSON.stringify(result).slice(0, 2000)}`);
  if (result.status === 'done') break;
  process.stdout.write(`  ${Math.round((Date.now() - started) / 1000)}s\r`);
}

// 3. Download.
const url = result.public_url;
if (!url) throw new Error(`no video URL in result: ${JSON.stringify(result).slice(0, 1000)}`);
const video = await fetch(url);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, Buffer.from(await video.arrayBuffer()));
console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s -> ${out}`);
