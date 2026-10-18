// 卡点表的类型化入口: 所有时间都从这里取, 不在组件里写死秒数
import raw from './beatmap.json';

export const FPS = raw.fps;
export const BEATS: number[] = raw.beats;
export const KICKS: number[] = raw.kicks;
export const BARS: number[] = raw.bars;
export const PHRASES: number[] = raw.phrases;
export const ACCENTS: number[] = raw.accents;
export const DROP_FRAME: number = raw.dropFrame;
export const MAIN_DROP_FRAME: number = raw.mainDropFrame;
export const DURATION: number = raw.durationFrames;
export const SECTIONS = raw.sections;
export const FRAMES_PER_BEAT: number = raw.framesPerBeat;

/** 当前帧在第几拍 (小数), 拍与拍之间线性插值, 用来驱动走路相位 */
export const beatAt = (frame: number): number => {
	if (frame <= BEATS[0]) return (frame - BEATS[0]) / FRAMES_PER_BEAT;
	for (let i = 0; i < BEATS.length - 1; i++) {
		if (frame < BEATS[i + 1]) return i + (frame - BEATS[i]) / (BEATS[i + 1] - BEATS[i]);
	}
	return BEATS.length - 1 + (frame - BEATS[BEATS.length - 1]) / FRAMES_PER_BEAT;
};

/** 第 b 拍 (可为小数) 对应的帧 */
export const frameOfBeat = (b: number): number => {
	if (b <= 0) return BEATS[0] + b * FRAMES_PER_BEAT;
	const i = Math.floor(b);
	if (i >= BEATS.length - 1) return BEATS[BEATS.length - 1] + (b - BEATS.length + 1) * FRAMES_PER_BEAT;
	return BEATS[i] + (b - i) * (BEATS[i + 1] - BEATS[i]);
};

/** 从某帧往后数 n 拍 (n 可为小数) 的帧号, 四舍五入到整数帧 */
export const plusBeats = (frame: number, n: number): number => Math.round(frameOfBeat(beatAt(frame) + n));

/** 落在 frame 之后至少 minGap 帧的第一个底鼓 */
export const nextKick = (frame: number, minGap = 12): number =>
	KICKS.find((k) => k >= frame + minGap) ?? frame + minGap;

/** frame 所在小节的起点 */
export const barStart = (frame: number): number => {
	let b = BARS[0];
	for (const x of BARS) if (x <= frame) b = x;
	return b;
};

/** [from, to) 之间的每一拍 */
export const beatsBetween = (from: number, to: number, step = 1): number[] => {
	const out: number[] = [];
	const b0 = Math.ceil(beatAt(from) - 1e-6);
	for (let b = b0; frameOfBeat(b) < to; b += step) out.push(Math.round(frameOfBeat(b)));
	return out;
};
