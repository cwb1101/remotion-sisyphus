import {Config} from '@remotion/cli/config';
import fs from 'node:fs';

// 云端容器里没有 Remotion 自带的 headless shell，优先使用预装的 Chromium。
const preinstalled =
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (fs.existsSync(preinstalled)) {
  Config.setBrowserExecutable(preinstalled);
}

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(4);
// swangle 在无 GPU 容器里比 angle 慢约 4 倍
Config.setChromiumOpenGlRenderer('angle');
