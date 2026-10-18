// V2「鎏金暗场」配色与版式常量

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const C = {
  bg: '#0E0B08',
  bgCool: '#0C0C0D',
  ivory: '#E8E3D9',
  gold: '#DDBD74',
  vermilion: '#D9583C',
  earthCore: '#0B0806',
  earthMid: '#17110B',
  earthRim: '#3A2C1C',
  moon: '#8E887E',
  moonDark: '#24221F',
};

export const FONT_SERIF = '"Noto Serif SC", serif';
export const FONT_SANS = '"Noto Sans SC", sans-serif';

// 主字幕：画面中部，≥64px
export const SUB = {
  y: 470,
  size: 74,
  maxWidth: 1500,
};

// 右上角水印区：字幕、标签都不许进入
export const WATERMARK_ZONE = { x: 1640, y: 0, w: W - 1640, h: 100 };
// 底部 10% 留给抖音界面
export const SAFE_BOTTOM = H * 0.9;

// 地球 = 世界坐标原点处、半径 R 的圆
export const R = 1000;
