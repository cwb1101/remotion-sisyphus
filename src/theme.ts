import {ACCENT} from './data/script';

/** 视觉方向 A「深夜水位」 */
export const C = {
	bg: '#0E1A2B',
	bgGlow: '#16304A',
	bgGlowHi: '#1E3D5E',
	white: '#FFFFFF',
	blue: ACCENT.body,
	amber: ACCENT.action,
	figure: '#2F4A6B',
	figureRim: '#8FB3D9',
	figureDeep: '#1C2C40',
	tearHi: '#D8F3FF',
	tearDeep: '#2A7FB8',
	cardFill: '#16304A',
	muted: '#5A6878',
};

export const FONT = '"Noto Sans SC", "Source Han Sans SC", sans-serif';

/** 硬性规范：右侧禁字区与字幕区 */
export const SAFE = {
	noTextX: 1560,
	subLeft: 360,
	subWidth: 1200,
	subBottom: 80,
	/** 画内文字（大字、标注）只能放在这条线以上，避免压字幕 */
	pictureTextMaxY: 820,
};
