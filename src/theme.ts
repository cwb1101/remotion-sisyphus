/**
 * 画风参数：暖棕金色发光 · 高斯柔光 · 暗调夜曲
 * 全片只从这里取颜色、字体、发光和噪点参数
 */

export const palette = {
	/** 深邃暗黑底色（不用纯黑） */
	bg: '#040406',
	/** 主发光线条 / 标题 */
	gold: '#d4a76a',
	/** 弱粒子 / 次要轮廓 / 远景线条 */
	goldDim: '#9b7746',
	/** 高光 / 发光中心 / 关键数字 */
	goldHi: '#f2c888',
	/** 字幕和标签文字（暖白） */
	text: '#e8e2d8',
} as const;

export const rgba = (hex: string, alpha: number) => {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** 两个色板颜色之间插值（t: 0 → a，1 → b） */
export const mixHex = (a: string, b: string, t: number) => {
	const pa = parseInt(a.slice(1), 16);
	const pb = parseInt(b.slice(1), 16);
	const k = Math.max(0, Math.min(1, t));
	const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - k) + ((pb >> shift) & 255) * k);
	return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

export const fonts = {
	/** 中文标题：思源宋体 Bold */
	titleCn: '"Noto Serif SC", serif',
	/** 标签 / 字幕：思源黑体 */
	sansCn: '"Noto Sans SC", sans-serif',
	/** 大数字：窄体粗无衬线（DIN 的开源替代） */
	number: '"Barlow Condensed", sans-serif',
	/** 英文注释与公式：等宽 */
	mono: '"JetBrains Mono", monospace',
	/** 引文：衬线斜体 */
	quote: '"Noto Serif", "Noto Serif SC", serif',
} as const;

export const glow = {
	/** 核心细线宽度（屏幕像素） */
	coreWidth: 1.5,
	coreWidthMax: 2,
	/** 内层光晕：模糊半径 3–5px，强度约 0.9 */
	inner: {blur: 4, strength: 0.9},
	/** 外层光晕：模糊半径 12–22px，强度 0.7–1.1 呼吸，周期 3–5 秒 */
	outer: {blur: 18, strengthMin: 0.7, strengthMax: 1.1, periodSec: 4},
	/** 远景：不加外层光晕，透明度 30–50% */
	far: {opacity: 0.42},
} as const;

export const noise = {
	/** 噪点透明度 2–4% */
	opacity: 0.03,
	baseFrequency: 0.82,
	octaves: 2,
	/** 每 N 帧换一次种子 */
	reseedEvery: 3,
} as const;

export const backdrop = {
	/** 中心暖棕径向光透明度 4–8% */
	radialMin: 0.04,
	radialMax: 0.08,
	/** 径向光半径（相对画面宽度） */
	radialRadius: 0.5,
	vignette: 0.72,
} as const;

export const dust = {
	farCount: 46,
	nearCount: 7,
	farSize: [1, 2] as const,
	farAlpha: [0.2, 0.6] as const,
	nearSize: [7, 14] as const,
	nearAlpha: [0.08, 0.2] as const,
	nearBlur: 5,
} as const;

export const subtitleStyle = {
	fontSize: 66,
	/** 文字块底边距画面底边 */
	bottom: 96,
	maxWidth: 960,
	lineHeight: 1.36,
	/** 只加一层很淡的阴影 */
	shadow: '0 2px 12px rgba(4, 4, 6, 0.85)',
	fadeIn: 5,
	fadeOut: 4,
} as const;

export const topicStyle = {
	left: 64,
	top: 52,
	topicSize: 22,
	sectionSize: 19,
	enSize: 11,
	opacity: 0.78,
} as const;
