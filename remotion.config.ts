import {Config} from '@remotion/cli/config';

// 视频默认 h264（CRF 18）；不在这里写死 codec / crf，否则音轨（--codec=wav）无法渲染
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(4);
