// 思源宋体（Noto Serif SC）做字幕，思源黑体（Noto Sans SC）做小字。字体文件来自 npm 的 @fontsource，随项目打包，渲染时不联网。
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/500.css';
import {continueRender, delayRender} from 'remotion';
import {CUES} from '../data/subtitles';
import {WATERMARK_TEXT} from '../components/Watermark';

const text = CUES.map((c) => c.text + (c.sub ?? '')).join('') + '？∞0123456789' + WATERMARK_TEXT;
const handle = delayRender('加载思源字体');

Promise.all([
  document.fonts.load('700 72px "Noto Serif SC"', text),
  document.fonts.load('900 72px "Noto Serif SC"', text),
  document.fonts.load('500 32px "Noto Sans SC"', text),
]).then(() => continueRender(handle));
