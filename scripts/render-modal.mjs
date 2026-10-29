// Renders a composition on Modal instead of this PC (much faster: parallel chunks in the cloud).
// usage: node scripts/render-modal.mjs <CompositionId> [out.mp4] [--frames N]
//
// 1. bundles src/index.ts (with public/) and puts it at gs://<bucket>/marketing-bundles/codemotion-<time>-<sha>/
//    (only new or changed files are uploaded; everything else is copied inside GCS from codemotion-cache/)
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
import crypto from 'node:crypto';
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

// Reads KEY=value lines from sycamore-mono/backend/.env (values may be quoted). Where that file isn't there
// (e.g. a cloud session with only this repo), the same keys come from environment variables.
const KEYS = ['GCS_BUCKET', 'GOOGLE_APPLICATION_CREDENTIALS_JSON', 'MODAL_RENDER_TOKEN'];
const env = {};
const envFile = path.resolve('../sycamore-mono/backend/.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
for (const k of KEYS) {
  env[k] ??= process.env[k];
  if (!env[k]) throw new Error(`${k} missing: set it in ${envFile} or as an environment variable`);
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

// Only new or changed files are uploaded. Every file is stored once under CACHE/<sha256 of its content>,
// and the bundle folder is filled with server-side copies from there (a copy inside GCS uses no local data).
const CACHE = 'marketing-bundles/codemotion-cache';
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
};
const mime = (f) => TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream';
const retry = async (fn) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= 5) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
};
let uploadedBytes = 0;
let uploadedCount = 0;
let next = 0;
console.log(`Syncing ${files.length} files to gs://${env.GCS_BUCKET}/${prefix}/ ...`);
await Promise.all(
  Array.from({length: 8}, async () => {
    while (next < files.length) {
      const f = files[next++];
      const hash = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
      const cached = bucket.file(`${CACHE}/${hash}`);
      const [exists] = await retry(() => cached.exists());
      if (!exists) {
        await retry(() => bucket.upload(f, {destination: cached.name, resumable: false}));
        uploadedBytes += fs.statSync(f).size;
        uploadedCount++;
      }
      // the copy keeps the bundle's file name, so it's served with the right content type
      const destination = `${prefix}/${path.relative(outDir, f).split(path.sep).join('/')}`;
      await retry(() => cached.copy(bucket.file(destination), {contentType: mime(f)}));
    }
  }),
);
console.log(`Uploaded ${uploadedCount} new files (${(uploadedBytes / 1048576).toFixed(1)} MB); the rest were already in the cache.`);
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
console.log(`Video URL: ${url}`);
const video = await fetch(url);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, Buffer.from(await video.arrayBuffer()));
console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s -> ${out}`);
