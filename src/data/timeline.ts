import {SCREENS, SECTIONS, type Screen, type Section} from './script';

const byId = new Map(SCREENS.map((s) => [s.id, s]));

export const screen = (id: string): Screen => {
	const s = byId.get(id);
	if (!s) {
		throw new Error(`未知字幕屏 ${id}`);
	}
	return s;
};

/** 某一屏开始帧 + 偏移 */
export const at = (id: string, offset = 0) => screen(id).startFrame + offset;

/** 某一屏结束帧 + 偏移 */
export const end = (id: string, offset = 0) => screen(id).endFrame + offset;

export const section = (id: string): Section => {
	const s = SECTIONS.find((x) => x.id === id);
	if (!s) {
		throw new Error(`未知小节 ${id}`);
	}
	return s;
};

export const sectionAt = (frame: number): Section =>
	SECTIONS.find((s) => frame >= s.startFrame && frame < s.endFrame) ?? SECTIONS[SECTIONS.length - 1];

export const screenAt = (frame: number): Screen | undefined =>
	SCREENS.find((s) => frame >= s.startFrame && frame < s.endFrame);
