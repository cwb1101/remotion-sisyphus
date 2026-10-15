import {Config} from '@remotion/cli/config';

// 编码参数（h264 / crf / yuv420p）写在渲染命令里，见 package.json 与 scripts/render-full.sh
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
