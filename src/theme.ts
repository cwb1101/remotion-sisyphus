import {SCRIPT} from './data/script';

export const COLORS = {
	bg: SCRIPT.palette.background,
	bgDeep: '#13120F',
	ink: '#3A352E',
	inkLight: '#5C5246',
	inkDark: '#26221D',
	paper: '#F4EEE6',
	text: SCRIPT.palette.text,
	warm: SCRIPT.palette.warm,
	cool: SCRIPT.palette.cool,
	dim: 'rgba(255,255,255,0.2)',
};

export const FONTS = {
	sans: 'SourceHanSansMedium',
	sansHeavy: 'SourceHanSansHeavy',
	serifHeavy: 'SourceHanSerifHeavy',
	smiley: 'SmileySans',
};

export const LAYOUT = {
	width: 1920,
	height: 1080,
	// 右侧禁字区起点
	noTextX: 1560,
	// 字幕块底边 下划线和光晕也要落在 980 以内 所以文字行底边再往上留 14px
	subtitle: {left: 360, right: 1560, bottom: 966, fontSize: 64},
	info: {left: 60, width: 290, top: 200, bottom: 800},
	progress: {left: 60, right: 1860, y: 1052, height: 6, gap: 5},
	badge: {left: 60, top: 50},
	watermark: {right: 60, top: 56},
};
