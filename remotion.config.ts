import { Config } from '@remotion/cli/config';

// 用容器里预装的 headless shell，不在渲染时下载浏览器
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(4);
