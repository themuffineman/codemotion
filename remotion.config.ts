import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setConcurrency(4);
// Pre-installed Chromium in this environment; remove if Remotion should download its own.
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
