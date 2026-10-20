// 节奏网格的类型化入口：所有时间都从 rhythm.json 取，不在别处写死帧号
import grid from "../data/rhythm.json";

export const FPS = grid.fps;
export const FRAMES_PER_BEAT = grid.framesPerBeat;
export const FRAMES_PER_BAR = grid.framesPerBar;
export const DURATION = grid.durationInFrames;
export const CLIMAX_FRAME = grid.climaxFrame;
export const BEATS = grid.beats;
export const DOWNBEATS = grid.downbeats;
export const ACCENTS = grid.accents;
export const SECTIONS = grid.sections;
export const PHRASES = grid.phrases;

/** 第 n 小节（从 1 数）第一拍的帧号；n 可以等于小节总数 + 1，表示片尾 */
export const bar = (n: number): number =>
  n - 1 < grid.bars.length ? grid.bars[n - 1].start : grid.bars[grid.bars.length - 1].end;

/** 第 n 小节里第 k 拍（从 1 数）的帧号，k 可以是小数（0.5 = 半拍） */
export const beat = (n: number, k = 1): number =>
  bar(n) + Math.round((k - 1) * FRAMES_PER_BEAT);

/** 从某帧往后 b 拍 */
export const beatsAfter = (frame: number, b: number): number =>
  frame + Math.round(b * FRAMES_PER_BEAT);

/** 离 frame 最近的拍点 */
export const nearestBeat = (frame: number): number =>
  BEATS.reduce((best, b) => (Math.abs(b - frame) < Math.abs(best - frame) ? b : best), BEATS[0]);

/** frame 落在第几小节（从 1 数） */
export const barOf = (frame: number): number =>
  Math.min(grid.bars.length, Math.floor(frame / FRAMES_PER_BAR) + 1);

/** 从 frame 起往后数 n 个拍点（含起点之后的第一个） */
export const beatsFrom = (frame: number, n: number): number[] =>
  BEATS.filter((b) => b >= frame).slice(0, n);
