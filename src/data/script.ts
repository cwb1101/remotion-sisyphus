import raw from './script.json';

export type HighlightStyle = 'songUnderline' | 'outlineScale' | 'numberSweep';
export type SfxLevel = 'weak' | 'mid' | 'strong';

export type Highlight = {word: string; color: string; style: HighlightStyle};
export type SfxCue = {type: string; offset: number; level: SfxLevel};

export type Screen = {
	id: number;
	chapter: number;
	start: number;
	end: number;
	text: string;
	highlights: Highlight[];
	sfxLevel: SfxLevel;
	sfx: SfxCue[];
};

export type Chapter = {index: number; name: string; start: number; end: number};

export const SCRIPT = raw as unknown as {
	meta: {
		fps: number;
		width: number;
		height: number;
		episode: string;
		title: string;
		watermark: string;
		previewChapters: number[];
	};
	palette: {background: string; text: string; warm: string; cool: string};
	chapters: Chapter[];
	screens: Screen[];
	labels: {
		s1: {
			bigWord: string[];
			formula: string[];
			stepsPrefix: string;
			stepsSuffix: string;
			age: string;
			exp: string;
			orderEarly: string;
			orderLate: string;
			think: string;
			act: string;
		};
		s2: {
			cognition: string;
			exp: string;
			load: string;
			input: string;
			sum: string;
			mul: string;
			about: string;
			kolb: string[];
			tries: string;
			layers: string;
		};
	};
};

export const SCREENS = SCRIPT.screens;
export const CHAPTERS = SCRIPT.chapters;
export const LABELS = SCRIPT.labels;

export const FILM_END = CHAPTERS[CHAPTERS.length - 1].end;

export const PREVIEW_END = Math.max(
	...SCRIPT.meta.previewChapters.map((i) => CHAPTERS[i].end),
);

export const screenAt = (frame: number): Screen | undefined =>
	SCREENS.find((s) => frame >= s.start && frame < s.end);

export const screenById = (id: number): Screen => {
	const s = SCREENS.find((x) => x.id === id);
	if (!s) throw new Error(`no screen ${id}`);
	return s;
};

export const chapterAt = (frame: number): Chapter =>
	CHAPTERS.find((c) => frame >= c.start && frame < c.end) ??
	CHAPTERS[CHAPTERS.length - 1];

// 所有强档音效的触发帧 进度条在这些帧做脉冲
export const STRONG_FRAMES = SCREENS.flatMap((s) =>
	s.sfx.filter((c) => c.level === 'strong').map((c) => s.start + c.offset),
);
