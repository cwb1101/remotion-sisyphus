// 字体随 npm 包一起打进项目（Fontsource），不依赖 Google Fonts，国内网络也能渲染
import '@fontsource/zcool-qingke-huangyou/400.css';
import '@fontsource/noto-sans-sc/900.css';
import '@fontsource/playfair-display/700.css';
import {continueRender, delayRender} from 'remotion';
import {SCENES} from './config';

// 站酷庆科黄油体：短视频里最常见的那种粗壮标题字
export const titleFont = "'ZCOOL QingKe HuangYou'";
// 对白用最粗的黑体
export const sansFont = "'Noto Sans SC'";
// 英文小字用衬线体，和原片一致
export const serifFont = "'Playfair Display'";

// 中文字体按 unicode-range 分片，只有用到的字才会下载。
// 渲染前把文案里出现的字都加载好，避免第一帧是系统默认字体
const allText = SCENES.map((s) =>
  s.kind === 'item'
    ? `${s.no}. ${s.title}${s.quotes.map((q) => `“${q.text}”`).join('')}`
    : s.lines.flat().map((seg) => seg.text).join(''),
).join('');

if (typeof document !== 'undefined') {
  const handle = delayRender('加载字体');
  Promise.all([
    document.fonts.load(`400 100px ${titleFont}`, allText),
    document.fonts.load(`900 100px ${sansFont}`, allText),
    document.fonts.load(`700 100px ${serifFont}`, 'Aa'),
  ]).then(
    () => continueRender(handle),
    (err) => {
      console.error(err);
      continueRender(handle);
    },
  );
}
