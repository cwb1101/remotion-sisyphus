import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setAudioCodec('aac');
Config.setAudioBitrate('320k');
Config.setOverwriteOutput(true);

// 云端容器里用预装的 headless shell 本地开发不设这个变量就用 Remotion 自带的浏览器
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
	Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
