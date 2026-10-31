import fs from 'node:fs';
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setConcurrency(4);
// Pre-installed Chromium in this environment (the version folder changes between images); remove if Remotion should download its own.
const findBrowser = () => {
  const root = '/opt/pw-browsers';
  if (!fs.existsSync(root)) return undefined;
  for (const d of fs.readdirSync(root).filter((n) => n.startsWith('chromium_headless_shell-')).sort().reverse()) {
    for (const sub of ['chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux64/headless_shell']) {
      const p = `${root}/${d}/${sub}`;
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
};
const browser = findBrowser();
if (browser) Config.setBrowserExecutable(browser);
