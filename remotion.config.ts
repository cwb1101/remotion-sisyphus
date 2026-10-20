import { Config } from "@remotion/cli/config";

// 容器里预装了 Chromium，直接用它渲染，不再下载
const headless = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? headless);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(4);
Config.setCodec("h264");
Config.setCrf(18);
