// 视觉方向 V1「西西弗的黑石」
export const C = {
	skyTop: '#0F1420',
	skyBottom: '#262B40',
	hillFar: '#151A29',
	hillNear: '#121624',
	slope: '#191D2B',
	slopeDeep: '#10131D',
	slopeEdge: '#3A4260',
	stone: '#060606',
	stoneHi: '#2A2A2E',
	gold: '#FFC24A',
	goldPale: '#FFE3A0',
	blue: '#8FA8FF',
	jia: '#E8E1D2',
	yi: '#B9B4AA',
	white: '#FFFFFF',
};

// 全片硬性规范里的版式边界
export const LAYOUT = {
	W: 1920,
	H: 1080,
	subtitleLeft: 360,
	subtitleWidth: 1200,
	// 字幕块底边离画面底部 96px（规范要求 ≥ 80px）
	subtitleBottom: 96,
	subtitleFontSize: 64,
	subtitleLineHeight: 1.4,
	// x ≥ 1560 的竖带不放任何字
	noTextX: 1560,
	// 砸下来的大字只能落在这个范围
	impactLeft: 200,
	impactRight: 1400,
	impactTop: 240,
	impactBottom: 700,
};

export const FONT_FAMILY = '"Noto Sans SC", "Source Han Sans SC", sans-serif';
