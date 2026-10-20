import {existsSync} from 'node:fs';
import {Config} from '@remotion/cli/config';

// 优先用环境变量指定的浏览器；云端容器里自带的 Chromium 作为默认值，避免联网下载
const bundled = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = process.env.REMOTION_BROWSER_EXECUTABLE ?? (existsSync(bundled) ? bundled : undefined);
if (browser) {
  Config.setBrowserExecutable(browser);
}

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setConcurrency(4);
