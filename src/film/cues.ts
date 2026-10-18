// 卡点：全部从 beatmap.json 和 subtitles.ts 取，不在别处写死帧号
import beatmap from '../data/beatmap.json';
import { screen } from '../data/subtitles';

export const BEATMAP = beatmap;
export const BARS: number[] = beatmap.bars;
export const KICKS: number[] = beatmap.kicks;
export const ACCENTS: number[] = beatmap.accents;
export const DROP = beatmap.dropFrame;
export const BAR_LEN = beatmap.beatFrames * 4;

/** 帧 f 所在小节的起点（f 本身是小节线就返回 f） */
export const barAtOrBefore = (f: number) => [...BARS].reverse().find((b) => b <= f) ?? 0;
export const barAtOrAfter = (f: number) => BARS.find((b) => b >= f) ?? BARS[BARS.length - 1];

/** f 之后（含）第一个底鼓 */
export const kickAtOrAfter = (f: number) => KICKS.find((k) => k >= f) ?? f;

/** 离 f 最近的底鼓 */
export const kickNear = (f: number) =>
  KICKS.reduce((best, k) => (Math.abs(k - f) < Math.abs(best - f) ? k : best), KICKS[0]);

/**
 * 一次镜头运动：从小节线出发，落定在底鼓上。
 * from = 不早于 f 的第一条小节线；to = 离 from + 目标时长最近的底鼓。
 */
export const move = (f: number, bars = 1.5) => {
  const from = barAtOrAfter(f);
  const to = kickNear(from + bars * BAR_LEN);
  return { from, to };
};

export const S = (id: number) => screen(id);
