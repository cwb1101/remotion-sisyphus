/** 方向一 · 拉曼查逆光 */
export const C = {
  base: '#15110D', // 深底色：焦褐黑
  mid: '#7D6E5A', // 低饱和中间色：陶土
  accent: '#D9A441', // 强调色：铜盆金
  text: '#EDE4D3', // 字幕骨白（中间色的亮阶）
  ink: '#0B0907', // 剪影
  inkSoft: '#17120D',
  fog: '#5E5243', // 雾色（中间色压暗）
  fogLight: '#9A876B',
} as const;

export const FONT_SERIF = "'Noto Serif SC', 'Source Han Serif SC', serif"; // 思源宋体
export const FONT_SANS = "'Noto Sans SC', 'Source Han Sans SC', sans-serif"; // 思源黑体

export const W = 1920;
export const H = 1080;
/** 文字离画面边缘的最小距离 */
export const SAFE = 80;

/** 右上角水印的位置；字幕禁止进入 WATERMARK_ZONE（右上角这块矩形） */
export const WATERMARK = {top: 40, right: 44, height: 38} as const;
export const WATERMARK_ZONE = {left: 1600, bottom: 140} as const;
