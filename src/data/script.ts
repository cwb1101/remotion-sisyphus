import raw from './script.json';

export type SubStyle = 'normal' | 'slam' | 'title' | 'note';
export type SfxCue = {name: string; at: number; vol: number};
export type Pulse = {bpm: [number, number]; vol: number; beep?: boolean};
export type Screen = {
	id: number;
	section: string;
	start: number;
	end: number;
	text: string;
	highlights: string[];
	style?: SubStyle;
	pulse?: Pulse;
	sfx?: SfxCue[];
};
export type Section = {id: string; title: string; bed?: string; bedVol?: number};

export const FPS: number = raw.fps;
export const WIDTH: number = raw.width;
export const HEIGHT: number = raw.height;
export const screens = raw.screens as Screen[];
export const sections = raw.sections as Section[];

const byId = new Map(screens.map((s) => [s.id, s]));

/** 取某一屏（找不到直接报错，避免改稿后静默错位） */
export const S = (id: number): Screen & {dur: number} => {
	const s = byId.get(id);
	if (!s) throw new Error(`screen ${id} not found in script.json`);
	return {...s, dur: s.end - s.start};
};

/** 某一屏里名为 name 的音效触发帧（全局帧）。画面需要和音效对齐时，从这里取 */
export const cues = (id: number, name: string): number[] =>
	(S(id).sfx ?? []).filter((c) => c.name === name).map((c) => S(id).start + c.at);
export const cue = (id: number, name: string, fallbackOffset = 0): number =>
	cues(id, name)[0] ?? S(id).start + fallbackOffset;

export const sectionRange = (id: string) => {
	const list = screens.filter((s) => s.section === id);
	if (list.length === 0) throw new Error(`section ${id} has no screens`);
	return {start: list[0].start, end: list[list.length - 1].end, screens: list};
};

export const PREVIEW_SECTIONS: string[] = raw.preview.sections;
export const PREVIEW_END =
	sectionRange(PREVIEW_SECTIONS[PREVIEW_SECTIONS.length - 1]).end + raw.preview.tail;

export const screenAt = (frame: number): Screen | undefined =>
	screens.find((s) => frame >= s.start && frame < s.end);

export const WATERMARK = '肆号静匣Logos';
export const CITATIONS = ['Ainsworth et al., 1978', 'Sroufe & Waters, 1977', 'Spangler & Grossmann, 1993', 'Mikulincer, Dolev & Shaver, 2004'];
export const ALL_TEXT = Array.from(
	new Set([...screens.map((s) => s.text).join(''), ...'回避型依恋', ...WATERMARK, ...CITATIONS.join(' ·；研究出处'), ...'心理学·依恋理论为什么你越靠近TA越想逃冷淡不等于不在乎'])
).join('');
export const FULL_END: number = screens[screens.length - 1].end;
