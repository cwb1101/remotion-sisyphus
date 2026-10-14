import {Easing} from 'remotion';

/** 灰阶与唯一强调色。所有场景只从这里取色。 */
export const C = {
  dark: '#1E1D1B',
  mid: '#6E6A64',
  light: '#A9A49B',
  paper: '#EAE5DA',
  accentText: '#1A3D57', // 字用深一档（H206 S54%），保证 ≥4.5:1
  accentLight: '#5E97BF', // 物件与光用浅一档（同色相 H205 S43%）
} as const;

/** 统一曲线：cubic-bezier(0.22, 1, 0.36, 1)，慢出无回弹。用于字幕、姿势、光。 */
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
/** 镜头运动：对称慢进慢出，速度慢而匀，同样无回弹。 */
export const easeCam = Easing.bezier(0.45, 0.05, 0.55, 0.95);

export const FONT_SERIF = 'TearsSerif';
export const FONT_SANS = 'TearsSans';
export const FONT_LATIN = 'TearsLatin';

/** 版面网格（1920×1080） */
export const GRID = {
  marginX: 160,
  baseline: 960, // 底部字幕基线离下沿 120px
  top: 120,
  mainSize: 68,
  keySize: 72,
  emphasisScale: 1.29, // ≤ 1.3 倍
  enSize: 21,
} as const;
