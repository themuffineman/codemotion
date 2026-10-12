// Renders the Motion Canvas project to output/project.mp4 without the editor UI.
//   npm run render [-- --fps 30 --scale 1]
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const fps = arg('fps', '30');
const scale = arg('scale', '1');

const server = await createServer({server: {port: 9123}, logLevel: 'warn'});
await server.listen();

const executablePath = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .filter(Boolean)
  .find(p => existsSync(p));
const browser = await chromium.launch({executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader']});
const page = await browser.newPage();
page.on('console', m => console.log(`[page] ${m.text()}`));
page.on('response', r => r.status() >= 400 && console.error(`[${r.status()}] ${r.url()}`));
page.on('pageerror', e => console.error(`[page error] ${e.message}`));

await page.goto(`http://localhost:9123/render.html?fps=${fps}&scale=${scale}`);
let last = -1;
while (true) {
  const state = await page.evaluate(() => window.__render);
  if (state?.done) {
    console.log(`\nfinished: ${state.result}`);
    break;
  }
  if (state && state.frame !== last && state.frame % 30 === 0) {
    process.stdout.write(`\rframe ${state.frame}`);
    last = state.frame;
  }
  await new Promise(r => setTimeout(r, 500));
}
await browser.close();
await server.close();
