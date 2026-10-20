import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import '@fontsource/noto-serif-sc/700.css';
import { continueRender, delayRender } from 'remotion';
import { CUES, SECTIONS, THEME } from './data/script';
import { IN_PICTURE_TEXT } from './data/timeline';

/**
 * 思源黑体 / 思源宋体（Noto Sans SC / Noto Serif SC）。
 * 字体按 unicode-range 分片，这里把全片会出现的字都预先加载完，再放行渲染。
 */
const allText = Array.from(
  new Set(
    [THEME, ...SECTIONS.map((s) => s.title), ...CUES.map((c) => c.text), ...IN_PICTURE_TEXT, '0123456789TA']
      .join('')
      .replace(/\s/g, ''),
  ),
).join('');

const faces = [
  '400 30px "Noto Sans SC"',
  '500 22px "Noto Sans SC"',
  '700 68px "Noto Sans SC"',
  '900 104px "Noto Sans SC"',
  '700 30px "Noto Serif SC"',
];

if (typeof document !== 'undefined') {
  const handle = delayRender('Loading CJK fonts');
  Promise.all(faces.map((f) => document.fonts.load(f, allText)))
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}
