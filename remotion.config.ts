import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
// 编码质量（--crf=18）放在各视频渲染命令里：全局设 CRF 会让音频格式（wav）渲染报错
Config.setConcurrency(4);
// 云端容器里如已预装 Chromium headless shell，可通过环境变量指定，避免重新下载
if (process.env.REMOTION_BROWSER) {
	Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
