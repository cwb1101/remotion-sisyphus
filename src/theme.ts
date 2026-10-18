// 鎏金暗场 · 金缮杯
export const COLORS = {
	bg: '#15110C',
	bgDeep: '#0C0907',
	ivory: '#E8E3D9',
	gold: '#DDBD74',
	goldDim: '#8E7746',
	vermilion: '#D9583C',
	silhouette: '#0B0907',
	silhouette2: '#120E0B',
	wood: '#2A1D13',
	woodLit: '#4A3322',
	cup: '#E8E3D9',
	cupShade: '#B9B2A4',
	liquidHero: '#D9583C',
	liquidPartner: '#DDBD74',
	murky: '#9A5A2E',
};

export const FONTS = {
	serif: '"Noto Serif SC", serif',
	sans: '"Noto Sans SC", sans-serif',
};

export const W = 1920;
export const H = 1080;

// 字幕: 字的底边在画面高度 86% (929px), 底部 10% 留给抖音界面
export const SUBTITLE = {
	size: 72,
	bottom: H - 929,
	maxWidth: 1500,
};

// 水印禁区 (屏幕坐标): 字幕 人物 动画文字都不能进来
export const WATERMARK_BOX = {x: 1640, y: 18, w: 262, h: 70};
