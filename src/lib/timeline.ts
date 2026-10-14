import subtitles from '../data/subtitles.json';
import cues from '../data/cues.json';

export type Layout =
  | 'bottom-left-en'
  | 'bottom-center'
  | 'top-center'
  | 'top-left'
  | 'offset'
  | 'left-paragraph'
  | 'left-paragraph-small'
  | 'reveal'
  | 'center';

export type Screen = {
  id: string;
  section: string;
  scene: string;
  from: number;
  to: number;
  text: string;
  emphasis: string[];
  layout: Layout;
  en?: string;
  key?: number;
};

export type Section = {id: string; name: string; en: string; scene: string; from: number; to: number};

export type Cue = {
  id: string;
  frame: number;
  type: 'ambience' | 'action' | 'accent';
  sound: string;
  action: string;
  db: number;
  steps?: number;
  interval?: number;
  crossfadeFrames?: number;
  duck?: {from: number; db: number; releaseFrames: number};
};

export const FPS = subtitles.fps;
export const PREVIEW = subtitles.preview;
export const SCREENS = subtitles.screens as Screen[];
export const SECTIONS = subtitles.sections as Section[];
export const CUES = cues.cues as Cue[];

export const section = (id: string): Section => {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`no section ${id}`);
  return s;
};
export const screen = (id: string): Screen => {
  const s = SCREENS.find((x) => x.id === id);
  if (!s) throw new Error(`no screen ${id}`);
  return s;
};
export const cue = (id: string): Cue => {
  const c = CUES.find((x) => x.id === id);
  if (!c) throw new Error(`no cue ${id}`);
  return c;
};
/** 一串脚步类动作音的每一步落地帧 */
export const stepFrames = (id: string): number[] => {
  const c = cue(id);
  return Array.from({length: c.steps ?? 1}, (_, i) => c.frame + i * (c.interval ?? 0));
};
