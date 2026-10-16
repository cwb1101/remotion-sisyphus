import raw from './script.json';

export type Level = 'weak' | 'mid' | 'strong';
export type Highlight = { word: string; color: string };
export type Sfx = { type: string; label: string; level: Level; beat?: string; bpm?: number };
export type Cue = {
  id: number;
  section: string;
  shot: number;
  start: number;
  end: number;
  text: string;
  highlights: Highlight[];
  big: Highlight | null;
  beats: Record<string, number>;
  sfx: Sfx[];
  counter: 'show' | 'flash' | null;
  step: number | null;
  person: string | null;
  note: string;
};
export type Section = { id: string; name: string; start: number; end: number };

export const SCRIPT = raw as unknown as {
  fps: number;
  width: number;
  height: number;
  colors: { text: string; warm: string; cool: string };
  previewEnd: number;
  sections: Section[];
  cues: Cue[];
};

export const CUES = SCRIPT.cues;
export const WARM = SCRIPT.colors.warm;
export const COOL = SCRIPT.colors.cool;
export const WHITE = SCRIPT.colors.text;

export const cue = (id: number): Cue => {
  const c = CUES.find((x) => x.id === id);
  if (!c) throw new Error(`cue ${id} not found`);
  return c;
};

/** 某屏内某个节拍点的绝对帧号（画面和音效都从这里取时间）。 */
export const beat = (id: number, name: string): number => {
  const c = cue(id);
  const off = c.beats[name];
  if (off === undefined) throw new Error(`cue ${id} has no beat "${name}"`);
  return c.start + off;
};

export const section = (id: string): Section => {
  const s = SCRIPT.sections.find((x) => x.id === id);
  if (!s) throw new Error(`section ${id} not found`);
  return s;
};

export const cueAt = (frame: number): Cue | undefined =>
  CUES.find((c) => frame >= c.start && frame < c.end);
