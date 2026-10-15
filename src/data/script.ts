import raw from './script.json';

export type HighlightColor = 'gold' | 'blue';
export type SfxLevel = 'weak' | 'mid' | 'strong';

export interface Highlight {
	word: string;
	color: HighlightColor;
}

export interface Sfx {
	offset: number;
	type: string;
	level: SfxLevel;
	pan?: number;
	pitch?: number;
	note?: number;
	mood?: 'warm' | 'dark';
}

export interface Impact {
	text: string;
	color: HighlightColor | 'white';
	offset: number;
}

export interface Screen {
	id: number;
	section: string;
	startFrame: number;
	endFrame: number;
	text: string;
	highlights: Highlight[];
	impact?: Impact;
	sfx: Sfx[];
}

interface ScriptDoc {
	fps: number;
	width: number;
	height: number;
	colors: Record<'text' | 'gold' | 'blue' | 'white', string>;
	sfxLevelsDbfs: Record<SfxLevel, number>;
	preview: {lastScreen: number; tailFrames: number};
	screens: Screen[];
}

export const SCRIPT = raw as unknown as ScriptDoc;
export const FPS = SCRIPT.fps;

export const sc = (id: number): Screen => {
	const s = SCRIPT.screens.find((x) => x.id === id);
	if (!s) {
		throw new Error(`screen ${id} not found in script.json`);
	}
	return s;
};

export const colorOf = (c: HighlightColor | 'white' | 'text'): string =>
	SCRIPT.colors[c];

export const PREVIEW_SCREENS = SCRIPT.screens.filter(
	(s) => s.id <= SCRIPT.preview.lastScreen,
);

export const PREVIEW_DURATION =
	sc(SCRIPT.preview.lastScreen).endFrame + SCRIPT.preview.tailFrames;

// 某屏某类音效的绝对帧号：画面动作用它对齐音效，两边都只从 script.json 取时间
export const cue = (id: number, type: string, nth = 0): number => {
	const s = sc(id);
	const list = s.sfx.filter((x) => x.type === type);
	if (!list[nth]) {
		throw new Error(`screen ${id} has no sfx "${type}" #${nth}`);
	}
	return s.startFrame + list[nth].offset;
};
