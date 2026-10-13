import fs from 'node:fs';
import {Config} from '@remotion/cli/config';

Config.setEntryPoint('./src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setOverwriteOutput(true);

// 云端容器里预装了 headless shell；本机没有就用 Remotion 自己下载的
const SHELL = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (fs.existsSync(SHELL)) Config.setBrowserExecutable(SHELL);
