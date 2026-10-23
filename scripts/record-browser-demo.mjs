// Needs puppeteer-core (npm i -D puppeteer-core) and the demo dev server on :5199 (projects/remotion-browser).
// Usage: node scripts/record-browser-demo.mjs <frames-dir>, then:
//   ffmpeg -f concat -safe 0 -i <frames-dir>/list.txt -vf "fps=30,scale=1920:-2,format=yuv420p" -c:v libx264 -crf 18 out.mp4
// Screen-records the demo: edit the title, change color, export, play the result.
// Frames are saved as JPEGs with timestamps (no live encoding), then turned into a video afterwards.
import puppeteer from 'puppeteer-core';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';

const dir = process.argv[2];
rmSync(dir, {recursive: true, force: true});
mkdirSync(dir, {recursive: true});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: {width: 1280, height: 800, deviceScaleFactor: 1.5},
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5199', {waitUntil: 'networkidle0'});
await wait(500);

const cdp = await page.createCDPSession();
const frames = [];
cdp.on('Page.screencastFrame', async ({data, metadata, sessionId}) => {
  const name = `f${String(frames.length).padStart(5, '0')}.jpg`;
  frames.push({name, t: metadata.timestamp});
  writeFileSync(`${dir}/${name}`, Buffer.from(data, 'base64'));
  cdp.send('Page.screencastFrameAck', {sessionId}).catch(() => {});
});
await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 90, everyNthFrame: 1});

const log = [];
const t0 = Date.now() / 1000;
const mark = (name) => log.push({name, t: Date.now() / 1000});
mark('start');
await wait(2500);

// Retype the title.
mark('type-title');
await page.click('input', {count: 3});
await page.keyboard.press('Backspace');
await page.keyboard.type('Remotion on the client', {delay: 70});
await wait(1200);

// Pick the rose color.
mark('color');
await page.click('.swatch:nth-child(2)');
await wait(2500);

// Export.
mark('export');
await page.click('button.export');
await page.waitForSelector('.done', {timeout: 180000});
mark('done');
console.log(await page.$eval('.done', (e) => e.textContent));
await wait(5000);
mark('end');
await cdp.send('Page.stopScreencast');
await browser.close();

// ffmpeg concat list: each frame shown until the next one arrived.
const lines = [];
for (let i = 0; i < frames.length; i++) {
  const next = frames[i + 1]?.t ?? log.at(-1).t;
  lines.push(`file '${frames[i].name}'`, `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`);
}
lines.push(`file '${frames.at(-1).name}'`);
writeFileSync(`${dir}/list.txt`, lines.join('\n'));
const first = frames[0].t;
writeFileSync(`${dir}/marks.json`, JSON.stringify(log.map((m) => ({...m, t: +(m.t - first).toFixed(2)})), null, 2));
console.log(frames.length, 'frames;', log.map((m) => `${m.name} ${(m.t - first).toFixed(2)}`).join(', '));
