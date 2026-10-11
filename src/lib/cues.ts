import {CUES, type Cue, type Section} from '../data/subtitles';

const byId = new Map(CUES.map((c) => [c.id, c]));

export const cue = (id: string): Cue => {
  const c = byId.get(id);
  if (!c) throw new Error(`字幕数据里没有 id 为 "${id}" 的屏`);
  return c;
};

/** 某屏内按比例取帧：frac=0 为开始帧，1 为结束帧 */
export const cueAt = (id: string, frac: number) => {
  const c = cue(id);
  return Math.round(c.start + (c.end - c.start) * frac);
};

export const cuesOf = (sections: Section[]) => CUES.filter((c) => sections.includes(c.section));

export const sectionRange = (section: Section) => {
  const cs = cuesOf([section]);
  return {start: cs[0].start, end: cs[cs.length - 1].end};
};

/** slam 重点词落地的帧（相对该屏开始） */
export const SLAM_HIT = 6;
/** title 每个字之间的间隔帧 */
export const TITLE_STEP = 3;

/** 每屏的冲击帧：slam 落字、title 最后一个字落地 */
export const impactFrame = (c: Cue) =>
  c.style === 'slam' ? c.start + SLAM_HIT : c.style === 'title' ? c.start + 2 + ([...c.text].length - 1) * TITLE_STEP + 5 : null;
