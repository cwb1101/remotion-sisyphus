// 思源宋体 / 思源黑体子集（scripts/fonts.py 生成），渲染前等字体加载完再出帧
import { continueRender, delayRender, staticFile } from "remotion";

export const FONT_SERIF = "'Source Han Serif SC', 'Noto Serif SC', serif";
export const FONT_SANS = "'Source Han Sans SC', 'Noto Sans SC', sans-serif";

const FILES: [string, string, string][] = [
  ["Noto Serif SC", "900", "fonts/NotoSerifSC-900.woff2"],
  ["Noto Serif SC", "600", "fonts/NotoSerifSC-600.woff2"],
  ["Noto Sans SC", "500", "fonts/NotoSansSC-500.woff2"],
];

let started = false;
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("加载思源字体");
  Promise.all(
    FILES.map(([family, weight, file]) => {
      const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, { weight, display: "block" });
      return face.load().then((f) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
