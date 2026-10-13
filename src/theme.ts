/** 全片灰阶 + 唯一强调色。画面里所有颜色都从这里取。 */
export const C = {
  black: '#0B0B0C',
  deep: '#141416',
  dark: '#1F2023',
  mid: '#6E6C67',
  light: '#A9A59D',
  paper: '#E9E3D6',
  accent: '#E0A040',
} as const;

export const W = 1920;
export const H = 1080;

/** 字幕规格 */
export const TYPE = {
  main: 68,
  /** 重点词 = 主字幕 × 1.35（上限 1.4） */
  keyword: Math.round(68 * 1.35),
  small: 48,
  note: 24,
  marginX: 120,
  marginTop: 120,
  /** 底部字幕基线离下边缘 */
  bottom: 120,
};

export const FONT = {
  serif: 'SourceHanSerifCN-Sub',
  serifBold: 'SourceHanSerifCN-Bold-Sub',
  sans: 'SourceHanSansCN-Light-Sub',
  sansRegular: 'SourceHanSansCN-Regular-Sub',
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** 两个灰阶颜色线性混合，t=0 → a，t=1 → b */
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  const k = Math.max(0, Math.min(1, t));
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/** 右上角固定水印 */
export const WATERMARK = '肆号静匣Logos';
