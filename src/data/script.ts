import raw from './subtitles.json';

// 字幕数据的类型化访问层。所有画面与音效时间都从 subtitles.json 取。

export type AccentName = 'amber' | 'cyan';
export type Highlight = {word: string; color: AccentName};
export type SfxEvent = {
	type: string;
	level: 'weak' | 'mid' | 'strong';
	at: number | string;
	dur?: number;
	repeat?: {every: number; count: number};
};
export type Screen = {
	id: number;
	start: number;
	end: number;
	section: string;
	text: string;
	highlights: Highlight[];
	cues: Record<string, number>;
	sfx: SfxEvent[];
};
type Doc = {
	fps: number;
	width: number;
	height: number;
	colors: {text: string; amber: string; cyan: string};
	screens: Screen[];
};

export const DATA = raw as unknown as Doc;
export const FPS = DATA.fps;
export const COLORS = DATA.colors;

export const screen = (id: number): Screen => {
	const s = DATA.screens[id - 1];
	if (!s || s.id !== id) {
		throw new Error(`subtitles.json 中没有第 ${id} 屏`);
	}
	return s;
};

/** 某屏某个 cue 的绝对帧 */
export const cue = (id: number, name: string): number => {
	const s = screen(id);
	if (!(name in s.cues)) {
		throw new Error(`第 ${id} 屏没有 cue「${name}」`);
	}
	return s.start + s.cues[name];
};

/** 某屏第 i 个重点词及其色值（舞台大字只复用本屏的重点词） */
export const highlight = (id: number, i = 0): {word: string; color: string} => {
	const h = screen(id).highlights[i];
	if (!h) {
		throw new Error(`第 ${id} 屏没有第 ${i + 1} 个重点词`);
	}
	return {word: h.word, color: COLORS[h.color]};
};

export const sectionRange = (section: string) => {
	const list = DATA.screens.filter((s) => s.section === section);
	return {start: list[0].start, end: list[list.length - 1].end};
};

// 分行规则与 scripts/subtitle_rules.py 一致
const MAX_LINE_CHARS = 18;
const BREAK_PUNCT = '，、：；';
const TRIM_TAIL = /[。，；：]+$/;

export const splitLines = (text: string): string[] => {
	const t = text.replace(TRIM_TAIL, '');
	if (t.length <= MAX_LINE_CHARS) {
		return [t];
	}
	let best: [number, string, string] | null = null;
	for (let i = 0; i < t.length; i++) {
		if (BREAK_PUNCT.includes(t[i])) {
			const left = t.slice(0, i);
			const right = t.slice(i + 1);
			if (left.length <= MAX_LINE_CHARS && right.length <= MAX_LINE_CHARS) {
				const score = Math.abs(left.length - right.length);
				if (!best || score < best[0]) {
					best = [score, left, right];
				}
			}
		}
	}
	if (best) {
		return [best[1], best[2]];
	}
	const mid = Math.ceil(t.length / 2);
	return [t.slice(0, mid), t.slice(mid)];
};
