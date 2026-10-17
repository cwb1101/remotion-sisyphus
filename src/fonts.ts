import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import { continueRender, delayRender } from 'remotion';
import { rules, script } from './data/script';

// Fontsource 按 unicode-range 分片，只有用到的字才会下载。
// 渲染前把全片会出现的字都显式加载一遍，避免首帧回退成系统字体。
const allText = Array.from(
  new Set(script.screens.flatMap((s) => [s.text, s.bigWord?.text ?? '']).join('')),
).join('');

const handle = delayRender('Loading Noto Sans SC');
Promise.all([
  document.fonts.load(`500 22px 'Noto Sans SC'`, rules.watermark.text),
  document.fonts.load(`700 66px 'Noto Sans SC'`, allText),
  document.fonts.load(`900 200px 'Noto Sans SC'`, allText),
])
  .then(() => document.fonts.ready)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
