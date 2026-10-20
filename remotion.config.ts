import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);

// 云端容器里预装了 Chromium headless shell；本机有自己的浏览器时用环境变量覆盖或删掉这一行
const shell = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (require('fs').existsSync(shell)) {
  Config.setBrowserExecutable(shell);
}
