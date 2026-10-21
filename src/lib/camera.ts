import {cue, screen} from '../data/script';
import {EASE, EASE_OUT, lerp, ramp, wobble} from './anim';

// 全片一个连续镜头：所有景别变化都是这条关键帧轨道上的推、拉、摇。

export type Cam = {x: number; y: number; z: number};
type CamKey = {f: number; cam: Cam; ease?: (t: number) => number};

const s = screen;

const KEYS: CamKey[] = [
	// 开头：贴近房间，缓慢推近
	{f: 0, cam: {x: 760, y: 560, z: 1.24}},
	{f: s(3).start, cam: {x: 770, y: 560, z: 1.32}},
	{f: s(4).start, cam: {x: 775, y: 560, z: 1.36}},
	// 第一节：拉远，露出右侧的门
	{f: s(4).start + 50, cam: {x: 960, y: 540, z: 1.0}},
	{f: s(5).start, cam: {x: 930, y: 540, z: 1.02}},
	{f: s(6).start, cam: {x: 880, y: 540, z: 1.05}},
	// 摇向左侧压力条，大字砸下
	{f: s(6).start + 22, cam: {x: 650, y: 520, z: 1.16}, ease: EASE_OUT},
	{f: s(7).start, cam: {x: 690, y: 520, z: 1.14}},
	// 第二节：拉到全景，房间与门变成天平两端
	{f: s(7).start + 40, cam: {x: 960, y: 520, z: 0.95}},
	{f: s(9).start, cam: {x: 985, y: 525, z: 0.97}},
	{f: s(9).start + 24, cam: {x: 960, y: 540, z: 1.0}},
	{f: s(10).start, cam: {x: 975, y: 540, z: 1.01}},
	{f: s(11).start, cam: {x: 900, y: 550, z: 1.06}},
	// 推近房间内部
	{f: s(11).start + 45, cam: {x: 790, y: 560, z: 1.32}},
	{f: s(11).end + 30, cam: {x: 760, y: 565, z: 1.4}},
];

/** 震动：[起始帧, 幅度 px, 衰减帧数] */
const SHAKES: [number, number, number][] = [
	[cue(3, 'slam'), 16, 20],
	[cue(6, 'slam'), 6, 12],
];

export const cameraAt = (frame: number): Cam & {sx: number; sy: number} => {
	let cam = KEYS[KEYS.length - 1].cam;
	if (frame <= KEYS[0].f) {
		cam = KEYS[0].cam;
	} else {
		for (let i = 1; i < KEYS.length; i++) {
			if (frame <= KEYS[i].f) {
				const a = KEYS[i - 1];
				const b = KEYS[i];
				const t = ramp(frame, a.f, b.f, b.ease ?? EASE);
				cam = {x: lerp(a.cam.x, b.cam.x, t), y: lerp(a.cam.y, b.cam.y, t), z: lerp(a.cam.z, b.cam.z, t)};
				break;
			}
		}
	}
	// 手持感：极轻的漂移，保证画面永远不完全静止
	const drift = 3;
	let sx = drift * wobble('cam-x', frame / 40);
	let sy = drift * wobble('cam-y', frame / 47);
	for (const [f0, amp, len] of SHAKES) {
		const t = frame - f0;
		if (t >= 0 && t < len) {
			const k = amp * (1 - t / len) ** 2;
			sx += k * Math.sin(t * 2.3);
			sy += k * Math.cos(t * 3.1);
		}
	}
	return {...cam, sx, sy};
};

export const cameraTransform = (frame: number) => {
	const c = cameraAt(frame);
	return `translate(${960 + c.sx} ${540 + c.sy}) scale(${c.z}) translate(${-c.x} ${-c.y})`;
};

export const worldToScreen = (frame: number, wx: number, wy: number) => {
	const c = cameraAt(frame);
	return {x: 960 + c.sx + (wx - c.x) * c.z, y: 540 + c.sy + (wy - c.y) * c.z};
};
