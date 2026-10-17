import {Easing, interpolate} from 'remotion';

// 快进慢出 所有元素入场都用这个
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.55, 0, 0.9, 0.4);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const clampOpts = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const lerp = (
	frame: number,
	from: number,
	to: number,
	a: number,
	b: number,
	easing: (t: number) => number = easeOut,
) => interpolate(frame, [from, to], [a, b], {...clampOpts, easing});

export type Key = [frame: number, value: number, easing?: (t: number) => number];

// 关键帧轨道 每段可单独指定缓动 默认快进慢出
export const track = (frame: number, keys: Key[]): number => {
	if (frame <= keys[0][0]) return keys[0][1];
	for (let i = 1; i < keys.length; i++) {
		const [f1, v1, e] = keys[i];
		const [f0, v0] = keys[i - 1];
		if (frame <= f1) return lerp(frame, f0, f1, v0, v1, e ?? easeOut);
	}
	return keys[keys.length - 1][1];
};

// 入场 0 到 1 默认 8 帧
export const enter = (frame: number, at: number, dur = 8) => lerp(frame, at, at + dur, 0, 1);

// 在某帧之后衰减的脉冲 用于冲击 发光
export const pulse = (frame: number, at: number, dur = 12) => {
	if (frame < at || frame > at + dur) return 0;
	const t = (frame - at) / dur;
	return Math.pow(1 - t, 2);
};

// 确定性的伪随机 同一个种子永远返回同一串数
export const rand = (seed: number) => {
	const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
	return x - Math.floor(x);
};

// 冲击后的画面抖动
export const shake = (frame: number, at: number, dur: number, amp: number) => {
	const p = pulse(frame, at, dur);
	if (!p) return {x: 0, y: 0};
	return {
		x: (rand(frame * 1.7 + at) - 0.5) * 2 * amp * p,
		y: (rand(frame * 2.3 + at + 9) - 0.5) * 2 * amp * p,
	};
};

// 落地弹跳 返回 0 到 1 的高度系数
export const bounce = (frame: number, at: number, dur = 14, height = 1) => {
	if (frame < at || frame > at + dur) return 0;
	const t = (frame - at) / dur;
	return Math.abs(Math.sin(t * Math.PI * 2)) * Math.pow(1 - t, 2) * height;
};
