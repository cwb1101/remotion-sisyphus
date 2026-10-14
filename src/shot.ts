import {cue, cueList, screen} from './data/script';
import {clamp01, easeInOut, kf, lerp} from './lib/anim';

/**
 * 整片一镜到底的镜头路径与场景布局（世界坐标）。
 * 所有关键帧都从字幕数据的 startFrame / cues 推出来，改字幕时间后镜头会跟着走。
 */

/** 贯穿全片的水位线高度（世界 y） */
export const WATER_Y = 780;
/** 各节场景在世界中的 x 偏移（同一条水位线上一路向右） */
export const S2_X = 2600;
export const S3_X = 5000;
export const S4_X = 7600;
export const S7_X = 12400;

export interface Cam {
	cx: number;
	cy: number;
	zoom: number;
}

type Ease = (t: number) => number;
const linear: Ease = (t) => t;
/** [帧, 机位, 进入该关键帧的缓动] */
type CamKey = [number, Cam, Ease?];

const interp = (f: number, keys: CamKey[]): Cam => {
	if (f <= keys[0][0]) return keys[0][1];
	for (let i = 0; i < keys.length - 1; i++) {
		const [f0, a] = keys[i];
		const [f1, b, ease] = keys[i + 1];
		if (f <= f1) {
			const t = (ease ?? easeInOut)(clamp01((f - f0) / (f1 - f0)));
			return {cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), zoom: lerp(a.zoom, b.zoom, t)};
		}
	}
	return keys[keys.length - 1][1];
};

/** 开头 + 第二节（预览已定稿的部分，不改） */
const firstKeys = (): CamKey[] => {
	const s1 = screen(1).startFrame;
	const land = cue(2, 'tearLand');
	const hit = cue(3, 'titleHit');
	const s4 = screen(4).startFrame;
	const pan = cue(4, 'panEnd');
	const s5 = screen(5).startFrame;
	const s6 = screen(6).startFrame;
	const s8 = screen(8).startFrame;
	return [
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
	];
};

/** 预览片尾的推近（只在预览里用） */
const previewTail = (): CamKey[] => [[screen(8).endFrame + 36, {cx: S2_X + 1040, cy: 540, zoom: 1.12}]];

/** 第三节到第七节 */
const restKeys = (): CamKey[] => {
	const s = (id: number) => screen(id).startFrame;
	const walkEnd = WALK.stop;
	return [
		// 第三节：大泪滴从容器 A 升起，镜头跟着它甩到“三种眼泪”
		[cue(9, 'rise') + 8, {cx: S2_X + 1000, cy: 470, zoom: 1.0}],
		[s(10), {cx: S3_X + 960, cy: 470, zoom: 0.95}],
		[s(10) + 46, {cx: S3_X + 800, cy: 500, zoom: 1.05}],
		[s(11) + 18, {cx: S3_X + 960, cy: 500, zoom: 1.05}],
		[s(12) + 30, {cx: S3_X + 960, cy: 440, zoom: 1.25}],
		// 拉远成路线图
		[s(13) + 30, {cx: S3_X + 960, cy: 470, zoom: 0.92}],
		[s(14) + 22, {cx: S3_X + 1060, cy: 480, zoom: 1.0}],
		// 推近闸门
		[s(15) + 24, {cx: S3_X + 900, cy: 540, zoom: 1.6}],
		[s(16) + 27, {cx: S3_X + 940, cy: 450, zoom: 0.92}],
		[s(19), {cx: S3_X + 960, cy: 450, zoom: 0.92}],
		[s(19) + 80, {cx: S3_X + 980, cy: 460, zoom: 0.96}],
		// 第四节：沿水位线甩到行走场景，镜头匀速跟着人物
		[s(20) + 39, {cx: S4_X + 520, cy: 610, zoom: 1.25}],
		[walkEnd - 10, {cx: S4_X + 520 + WALK.speed * (walkEnd - 10 - (s(20) + 39)), cy: 600, zoom: 1.12}, linear],
		[s(25) + 30, {cx: S4_X + 1540, cy: 590, zoom: 1.2}],
		[s(27) + 40, {cx: S4_X + 1530, cy: 580, zoom: 1.25}],
		// 拉远看来时的路
		[s(28) + 40, {cx: S4_X + 1200, cy: 520, zoom: 0.74}],
		[s(29) - 4, {cx: S4_X + 1220, cy: 525, zoom: 0.76}],
		// 第五节：近景
		[s(29) + 40, {cx: S4_X + 1420, cy: 600, zoom: 1.55}],
		[s(31) + 60, {cx: S4_X + 1400, cy: 590, zoom: 1.5}],
		[s(32) + 24, {cx: S4_X + 1300, cy: 520, zoom: 1.0}],
		[s(34) + 10, {cx: S4_X + 1350, cy: 505, zoom: 1.08}],
		[s(34) + 50, {cx: S4_X + 1420, cy: 600, zoom: 1.4}],
		[s(35) + 70, {cx: S4_X + 1440, cy: 590, zoom: 1.35}],
		// 第六节：中景
		[s(36) + 40, {cx: S4_X + 1460, cy: 540, zoom: 1.1}],
		[s(39) + 60, {cx: S4_X + 1440, cy: 560, zoom: 1.3}],
		[s(41) + 60, {cx: S4_X + 1250, cy: 540, zoom: 1.05}],
		[s(42) + 70, {cx: S4_X + 1230, cy: 540, zoom: 1.05}],
		[s(43) + 30, {cx: S4_X + 1420, cy: 540, zoom: 1.1}],
		[s(44) + 24, {cx: S4_X + 1600, cy: 520, zoom: 0.95}],
		[s(45) + 2, {cx: S4_X + 1660, cy: 510, zoom: 0.98}],
		// 先摇到门，再推进门里的光
		[s(46) - 6, {cx: S4_X + DOOR.x - 300, cy: 590, zoom: 1.15}],
		[s(46) + 22, {cx: S4_X + DOOR.x, cy: DOOR.y, zoom: 6}, (t) => t * t * t],
	];
};

/** 第七节：门光退去，回到开场构图（独立机位段，在门光铺满时接上） */
const endKeys = (): CamKey[] => {
	const s = (id: number) => screen(id).startFrame;
	return [
		[s(46) + 22, {cx: S7_X + 930, cy: 560, zoom: 1.5}],
		[s(46) + 46, {cx: S7_X + 930, cy: 590, zoom: 1.2}],
		[cue(46, 'tearLand'), {cx: S7_X + 920, cy: 572, zoom: 1.12}],
		[s(48), {cx: S7_X + 930, cy: 575, zoom: 1.1}],
		[cue(48, 'hit') - 2, {cx: S7_X + 960, cy: 680, zoom: 1.0}],
		[screen(49).endFrame + 30, {cx: S7_X + 980, cy: 670, zoom: 0.97}],
	];
};

/** 进门的那一帧：此时画面被门光铺满，镜头从门口切到第七节 */
export const doorCut = () => screen(46).startFrame + 22;

/** 第四节行走：人物 x（局部坐标）随时间匀速前进 */
export const WALK = {
	get start() {
		return screen(20).startFrame;
	},
	get stop() {
		return screen(24).endFrame - 6;
	},
	x0: 100,
	speed: 3.2,
};
export const walkX = (f: number) =>
	WALK.x0 + WALK.speed * (Math.min(Math.max(f, WALK.start), WALK.stop) - WALK.start);

/** 第六节结尾的门（局部坐标，相对 S4_X） */
export const DOOR = {x: 2379, y: 630, w: 150, h: 300};

export const camera = (f: number, full = false): Cam => {
	let c: Cam;
	if (!full) {
		c = interp(f, [...firstKeys(), ...previewTail()]);
	} else if (f < doorCut()) {
		c = interp(f, [...firstKeys(), ...restKeys()]);
	} else {
		c = interp(f, endKeys());
	}
	const shake = shakeAt(f, full);
	return {cx: c.cx + shake[0], cy: c.cy + shake[1], zoom: c.zoom};
};

/** 关键句（强档）的冲击点 */
export const strongHits = (full: boolean) =>
	full
		? [cue(3, 'titleHit'), cue(18, 'hit'), cue(27, 'hit'), cue(30, 'hit'), cue(48, 'hit')]
		: [cue(3, 'titleHit')];

/** 大字砸下时的镜头震动 */
const shakeAt = (f: number, full: boolean): [number, number] => {
	let x = 0;
	let y = 0;
	for (const h of strongHits(full)) {
		const t = f - h;
		if (t >= 0 && t < 14) {
			const a = 9 * Math.exp(-t / 4);
			x += a * Math.sin(t * 2.1);
			y += a * Math.cos(t * 2.7);
		}
	}
	return [x, y];
};

/** 冲击闪光的屏幕中心（百分比） */
const FLASH_AT: Record<number, [number, number]> = {
	3: [42, 56],
	18: [84, 48],
	27: [48, 55],
	30: [40, 50],
	48: [42, 56],
};

/** 场景光线：每节至少换一次光（开场人物光 / 顶光 / 神经光带 / 暖光 / 晨光 / 门光） */
export const lighting = (f: number, full = false) => {
	const hit = cue(3, 'titleHit');
	const s4 = screen(4).startFrame;
	const pan = cue(4, 'panEnd');
	const s = (id: number) => screen(id).startFrame;
	const base = {
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
		flash: 0,
		flashX: 42,
		flashY: 56,
		neural: 0,
		warm: 0,
		dawn: 0,
		door: 0,
		flood: 0,
	};
	const flashOf = (id: number, at: number) => {
		const t = f - at;
		if (t >= 0 && t < 24 && Math.exp(-t / 6) > base.flash) {
			base.flash = Math.exp(-t / 6);
			[base.flashX, base.flashY] = FLASH_AT[id];
		}
	};
	flashOf(3, hit);
	if (!full) {
		return base;
	}
	flashOf(18, cue(18, 'hit'));
	flashOf(27, cue(27, 'hit'));
	flashOf(30, cue(30, 'hit'));
	flashOf(48, cue(48, 'hit'));
	const cut = doorCut();
	base.spot = kf(f, [
		[s4 + 10, 0],
		[pan, 1],
		[s(9) + 20, 1],
		[s(10), 0],
	]);
	base.neural = kf(f, [
		[s(9) + 20, 0],
		[s(10) + 10, 1],
		[s(19) + 70, 1],
		[s(20) + 30, 0],
	]);
	base.stage = f < cut
		? kf(f, [
				[0, 0.85],
				[hit, 1],
				[s4 + 20, 0.2],
				[pan, 0],
				[s(20) + 10, 0],
				[s(20) + 40, 0.55],
				[s(28), 0.55],
				[s(29) + 20, 0.2],
			])
		: kf(f, [
				[cut, 0.85],
				[cue(48, 'hit'), 1],
				[screen(49).endFrame, 0.7],
			]);
	base.warm = kf(f, [
		[s(29) - 10, 0],
		[s(29) + 30, 1],
		[s(35) + 40, 1],
		[s(36) + 30, 0],
	]);
	base.dawn = kf(f, [
		[s(36), 0],
		[s(36) + 40, 1],
		[s(44), 1],
		[s(44) + 30, 0.3],
	]);
	base.door = kf(f, [
		[cue(44, 'door') - 10, 0],
		[cue(44, 'door') + 30, 1],
	]);
	base.flood = f < cut ? kf(f, [[s(46), 0], [cut, 1]], (t) => t * t) : kf(f, [[cut, 1], [cut + 26, 0]]);
	if (f >= cut) base.door = 0;
	base.under = f < cut ? kf(f, [[hit - 4, 0], [hit + 20, 1], [pan, 0.55]]) : 0.55;
	return base;
};

export const drips = () => cueList(5, 'drip');
