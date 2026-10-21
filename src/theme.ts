import {COLORS} from './data/script';

export const W = 1920;
export const H = 1080;

export const C = {
	bg: '#12141A',
	bgDeep: '#0B0C10',
	text: COLORS.text,
	amber: COLORS.amber,
	cyan: COLORS.cyan,
	warmFill: '#2A2520',
	slab: '#2B2418',
	line: '#2A2F3A',
	grey: '#8A93A6',
	person: '#C8CDD8',
	personBack: '#9AA1AF',
	personLight: '#E8ECF2',
};

export const FONT = '"Noto Sans SC", "Source Han Sans SC", sans-serif';

/** 版式安全区（屏幕坐标） */
export const SAFE = {
	forbiddenX: 1560, // x ≥ 1560 不放任何文字
	textMaxX: 1500, // 舞台大字右边界
	textMinX: 160,
	bigTextMinY: 110,
	bigTextMaxY: 720, // 舞台大字底边不能压到字幕区
	subtitle: {left: 360, width: 1200, bottom: 96, fontSize: 64, lineHeight: 1.32},
};

/** 贯穿物件：房间（世界坐标） */
export const ROOM = {left: 420, right: 1100, top: 200, floor: 740};

/** 门（世界坐标，镜头为 1 倍时落在右侧禁字区） */
export const DOOR = {cx: 1720, top: 220, floor: 740, width: 160};

/** 天花板最终压到的高度：天花板下沿 y = ROOM.top + drop */
export const CEILING = {year1: 50, year2: 100, year3: 150, endure: 215, slam: 300};
