/**
 * 本地字体：public/fonts 下的 woff2 由 `npm run fonts` 从 Adobe 思源宋体 / 思源黑体
 * 按 script.ts 里实际用到的字符子集化生成。渲染前用 FontFace 加载完再出帧。
 */
import {continueRender, delayRender, staticFile} from 'remotion';
import {FONT} from '../theme';

const FILES: [string, string, string][] = [
  [FONT.serif, 'fonts/serif-semibold.woff2', '600'],
  [FONT.serifBold, 'fonts/serif-bold.woff2', '700'],
  [FONT.sans, 'fonts/sans-light.woff2', '300'],
  [FONT.sansRegular, 'fonts/sans-regular.woff2', '400'],
];

let started = false;
export const ensureFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('loading Source Han fonts');
  Promise.all(
    FILES.map(async ([family, file]) => {
      const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`);
      await face.load();
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      // 字体缺失时直接失败，避免渲染出方块字
      console.error(err);
      throw err;
    });
};
