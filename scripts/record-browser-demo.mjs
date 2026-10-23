// Screen-records the remotion-browser demo like a real person using it: a visible cursor glides between
// elements, text is typed at an uneven human pace, then Export runs and the finished MP4 plays.
// Needs puppeteer-core (npm i -D puppeteer-core) and the demo dev server on :5199 (projects/remotion-browser).
// usage: node scripts/record-browser-demo.mjs <frames-dir>
//   then: ffmpeg -f concat -safe 0 -i <frames-dir>/list.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 16 out.mp4
// Writes <frames-dir>/marks.json: when each action happened (seconds) and where its element sits
// (in px of the 2560x1600 frames), so the video can zoom onto the right spot at the right time.
import puppeteer from 'puppeteer-core';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';

const dir = process.argv[2];
rmSync(dir, {recursive: true, force: true});
mkdirSync(dir, {recursive: true});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// The page is laid out at 1280x800 and drawn 2x (zoom on #root), so frames are 2560x1600 and zooms stay sharp.
// (Headless screencasts ignore deviceScaleFactor, hence the CSS zoom.)
const SCALE = 2;
const VIEW = {width: 1280 * SCALE, height: 800 * SCALE};

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: VIEW,
  args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

// A drawn cursor (headless Chrome has none) that follows the mouse, with a ripple on click.
await page.evaluateOnNewDocument(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.innerHTML =
      '<svg width="52" height="52" viewBox="0 0 24 24"><path d="M4 2l16 11.5-7 1.2 4 7.3-3 1.6-4-7.4L4 21z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {position: 'fixed', left: '0', top: '0', zIndex: 99999, pointerEvents: 'none', transform: 'translate(-8px,-4px)'});
    document.body.appendChild(c);
    document.addEventListener('mousemove', (e) => {
      c.style.left = e.clientX + 'px';
      c.style.top = e.clientY + 'px';
    });
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      Object.assign(r.style, {
        position: 'fixed', left: e.clientX - 36 + 'px', top: e.clientY - 36 + 'px', width: '72px', height: '72px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.35)', zIndex: 99998, pointerEvents: 'none', transition: 'transform .35s, opacity .35s',
      });
      document.body.appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = 'scale(1.8)';
        r.style.opacity = '0';
      });
      setTimeout(() => r.remove(), 400);
    });
  });
});
await page.goto('http://localhost:5199', {waitUntil: 'networkidle0'});
await page.evaluate((z) => (document.getElementById('root').style.zoom = String(z)), SCALE);
await page.mouse.move(1800, 1400);
await wait(600);

// Save every screencast frame with its timestamp; encode afterwards (live encoding is too slow on this PC).
const cdp = await page.createCDPSession();
const frames = [];
cdp.on('Page.screencastFrame', async ({data, metadata, sessionId}) => {
  const name = `f${String(frames.length).padStart(5, '0')}.jpg`;
  frames.push({name, t: metadata.timestamp});
  writeFileSync(`${dir}/${name}`, Buffer.from(data, 'base64'));
  cdp.send('Page.screencastFrameAck', {sessionId}).catch(() => {});
});
await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 92, everyNthFrame: 1});

const marks = [];
const now = () => Date.now() / 1000;
const rectOf = (sel) =>
  page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return {x: r.x, y: r.y, w: r.width, h: r.height};
  });
const mark = async (name, sel) => marks.push({name, t: now(), rect: sel ? await rectOf(sel) : null});

// Glide the cursor to the middle of an element, a bit off-center like a hand would.
let mouse = {x: 1800, y: 1400};
async function moveTo(sel, dx = 0) {
  const r = await rectOf(sel);
  const to = {x: r.x + r.w * 0.5 + dx, y: r.y + r.h * 0.55};
  const steps = 28;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // ease in-out
    await page.mouse.move(mouse.x + (to.x - mouse.x) * e, mouse.y + (to.y - mouse.y) * e);
    await wait(14);
  }
  mouse = to;
}
// Types with an uneven delay, slower after spaces, like a person.
async function typeHuman(text) {
  for (const ch of text) {
    await page.keyboard.type(ch);
    await wait(55 + Math.random() * 70 + (ch === ' ' ? 90 : 0));
  }
}

await mark('start');
await wait(2200);

// Title: click into it, clear it, type the new one.
await moveTo('label:nth-of-type(1) input', 40);
await mark('title', 'label:nth-of-type(1) input');
await page.mouse.down();
await page.mouse.up();
await page.click('label:nth-of-type(1) input', {count: 3});
await wait(250);
await page.keyboard.press('Backspace');
await wait(300);
await typeHuman('Remotion on the client');
await mark('title-done', 'label:nth-of-type(1) input');
await wait(800);

// Subtitle.
await moveTo('label:nth-of-type(2) input', 30);
await mark('subtitle', 'label:nth-of-type(2) input');
await page.click('label:nth-of-type(2) input', {count: 3});
await wait(250);
await page.keyboard.press('Backspace');
await wait(300);
await typeHuman('Exported with my own CPU');
await mark('subtitle-done', 'label:nth-of-type(2) input');
await wait(900);

// Color.
await moveTo('.swatch:nth-child(2)');
await mark('color', '.swatches');
await page.mouse.down();
await page.mouse.up();
await wait(1800);

// Export, then wait for the render.
await moveTo('button.export');
await mark('export', 'button.export');
await page.mouse.down();
await page.mouse.up();
await page.waitForSelector('.done', {timeout: 180000});
await mark('done', '.done');
console.log(await page.$eval('.done', (e) => e.textContent));
await wait(1500);
await mark('player', '.preview');
await wait(2500);
await moveTo('.done a', -40);
await mark('download', '.done a');
await wait(2500);
await mark('end');
await cdp.send('Page.stopScreencast');
await browser.close();

// ffmpeg concat list: each frame shown until the next one arrived.
const end = marks.at(-1).t;
const lines = [];
for (let i = 0; i < frames.length; i++) {
  const next = frames[i + 1]?.t ?? end;
  lines.push(`file '${frames[i].name}'`, `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`);
}
lines.push(`file '${frames.at(-1).name}'`);
writeFileSync(`${dir}/list.txt`, lines.join('\n'));
const first = frames[0].t;
writeFileSync(
  `${dir}/marks.json`,
  JSON.stringify({viewport: VIEW, marks: marks.map((m) => ({...m, t: +(m.t - first).toFixed(2)}))}, null, 1),
);
console.log(frames.length, 'frames;', marks.map((m) => `${m.name} ${(m.t - first).toFixed(1)}`).join(', '));
