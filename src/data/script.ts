import data from './script.json';

export type Tier = 'weak' | 'mid' | 'strong';

export interface Highlight {
	word: string;
	color: string;
}

export interface SfxCue {
	type: string;
	tier: Tier;
	/** cues 里的名字；'start' 表示本屏开始帧 */
	cue: string;
	gainDb?: number;
}

export interface Screen {
	id: number;
	section: number;
	startFrame: number;
	endFrame: number;
	text: string;
	highlights: Highlight[];
	sfx: SfxCue[];
	cues: Record<string, number | number[]>;
}

export const FPS: number = data.fps;
export const WIDTH: number = data.width;
export const HEIGHT: number = data.height;
export const ACCENT = data.accents;
export const SCREENS = data.screens as Screen[];

export const screen = (id: number): Screen => {
	const s = SCREENS.find((x) => x.id === id);
	if (!s) {
		throw new Error(`screen ${id} not found`);
	}
	return s;
};

/** 某屏某个 cue 的绝对帧（数组 cue 取第 index 个） */
export const cue = (id: number, name: string, index = 0): number => {
	const s = screen(id);
	if (name === 'start') {
		return s.startFrame;
	}
	const v = s.cues[name];
	if (v === undefined) {
		throw new Error(`cue ${name} not found on screen ${id}`);
	}
	return s.startFrame + (Array.isArray(v) ? v[index] : v);
};

/** 数组 cue 的全部绝对帧 */
export const cueList = (id: number, name: string): number[] => {
	const s = screen(id);
	const v = s.cues[name];
	if (v === undefined) {
		throw new Error(`cue ${name} not found on screen ${id}`);
	}
	return (Array.isArray(v) ? v : [v]).map((x) => s.startFrame + x);
};

const previewScreens = SCREENS.filter((s) =>
	data.preview.sections.includes(s.section),
);

/** 预览片长：预览各节最后一屏结束 + 尾巴 */
export const PREVIEW_DURATION =
	Math.max(...previewScreens.map((s) => s.endFrame)) + data.preview.tailFrames;
