import {cue, cueList, screen} from './data/script';
import {kf} from './lib/anim';

/**
 * 整片一镜到底的镜头路径与场景布局（世界坐标）。
 * 所有关键帧都从字幕数据的 startFrame / cues 推出来，改字幕时间后镜头会跟着走。
 */

/** 贯穿全片的水位线高度（世界 y） */
export const WATER_Y = 780;
/** 第二节场景在世界中的 x 偏移 */
export const S2_X = 2600;

export interface Cam {
	cx: number;
	cy: number;
	zoom: number;
}

export const camera = (f: number): Cam => {
	const s1 = screen(1).startFrame;
	const land = cue(2, 'tearLand');
	const hit = cue(3, 'titleHit');
	const s4 = screen(4).startFrame;
	const pan = cue(4, 'panEnd');
	const s5 = screen(5).startFrame;
	const s6 = screen(6).startFrame;
	const s7 = screen(7).startFrame;
	const s8 = screen(8).startFrame;
	const s8End = screen(8).endFrame;
	const keys: [number, Cam][] = [
		[s1, {cx: 930, cy: 590, zoom: 1.2}],
		[land, {cx: 920, cy: 572, zoom: 1.1}],
		[hit - 2, {cx: 960, cy: 680, zoom: 1.0}],
		[s4, {cx: 990, cy: 680, zoom: 0.99}],
		[pan, {cx: S2_X + 960, cy: 600, zoom: 0.92}],
		[s5 + 30, {cx: S2_X + 520, cy: 640, zoom: 1.45}],
		[s6 - 4, {cx: S2_X + 535, cy: 640, zoom: 1.52}],
		[s6 + 32, {cx: S2_X + 960, cy: 560, zoom: 0.9}],
		[s8, {cx: S2_X + 1100, cy: 560, zoom: 0.95}],
		[s8 + 42, {cx: S2_X + 1150, cy: 520, zoom: 1.05}],
		[s8End + 36, {cx: S2_X + 1040, cy: 540, zoom: 1.12}],
	];
	const pick = (k: keyof Cam) => kf(f, keys.map(([fr, c]) => [fr, c[k]] as [number, number]));
	const shake = shakeAt(f);
	return {cx: pick('cx') + shake[0], cy: pick('cy') + shake[1], zoom: pick('zoom')};
};

/** 大字砸下时的镜头震动 */
const shakeAt = (f: number): [number, number] => {
	const hits = [cue(3, 'titleHit')];
	let x = 0;
	let y = 0;
	for (const h of hits) {
		const t = f - h;
		if (t >= 0 && t < 14) {
			const a = 9 * Math.exp(-t / 4);
			x += a * Math.sin(t * 2.1);
			y += a * Math.cos(t * 2.7);
		}
	}
	return [x, y];
};

/** 场景光线：开场人物背后的暖光、第二节的顶光、水面下的底光 */
export const lighting = (f: number) => {
	const hit = cue(3, 'titleHit');
	const s4 = screen(4).startFrame;
	const pan = cue(4, 'panEnd');
	return {
		stage: kf(f, [
			[0, 0.85],
			[hit, 1],
			[s4 + 20, 0.2],
			[pan, 0],
		]),
		under: kf(f, [
			[hit - 4, 0],
			[hit + 20, 1],
			[pan, 0.55],
		]),
		spot: kf(f, [
			[s4 + 10, 0],
			[pan, 1],
		]),
		flash: (() => {
			const t = f - hit;
			return t >= 0 && t < 24 ? Math.exp(-t / 6) : 0;
		})(),
	};
};

export const drips = () => cueList(5, 'drip');
