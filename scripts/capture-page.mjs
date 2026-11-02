// Screenshots a real web page at 2x and records where quotes sit, so a video can zoom in and highlight them.
// usage: node scripts/capture-page.mjs <url> <out-prefix> ['["quote one","quote two"]']
//   -> <out-prefix>.png (full page) and <out-prefix>.json ({width, height, quotes: {quote: [[x, y, w, h], ...]}}, one rect per line, in CSS px)
// For old versions of a site use a Wayback Machine URL (look one up: https://archive.org/wayback/available?url=<url>&timestamp=<yyyymmdd>).
// Needs puppeteer-core (npm i -D puppeteer-core). Very tall pages: crop around the quotes before using them in a video.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [, , url, prefix, quotesArg] = process.argv;
if (!url || !prefix) throw new Error('usage: node scripts/capture-page.mjs <url> <out-prefix> [quotes json]');
const quotes = JSON.parse(quotesArg ?? '[]');

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: {width: 1280, height: 800, deviceScaleFactor: 2},
  args: ['--hide-scrollbars'],
});
const page = await browser.newPage();
await page.goto(url, {waitUntil: 'networkidle2', timeout: 90000}).catch((e) => console.log('load warning:', e.message));

const marks = await page.evaluate((qs) => {
  // The Wayback toolbar isn't part of the page being shown.
  for (const s of ['#wm-ipp-base', '#wm-ipp-print', '#donato']) document.querySelectorAll(s).forEach((e) => e.remove());
  const found = {};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (const q of qs) {
      const i = n.textContent.indexOf(q);
      if (i < 0 || found[q]) continue;
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + q.length);
      found[q] = [...r.getClientRects()].map((b) => [b.x + scrollX, b.y + scrollY, b.width, b.height]);
    }
  }
  return {width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, quotes: found};
}, quotes);
await new Promise((r) => setTimeout(r, 1000));
await page.screenshot({path: `${prefix}.png`, fullPage: true});
fs.writeFileSync(`${prefix}.json`, JSON.stringify(marks, null, 1));
for (const q of quotes) if (!marks.quotes[q]) console.log('NOT FOUND:', q);
console.log(`${prefix}.png ${marks.width}x${marks.height}, ${Object.keys(marks.quotes).length}/${quotes.length} quotes found`);
await browser.close();
