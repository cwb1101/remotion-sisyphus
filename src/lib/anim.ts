import {Easing, spring} from 'remotion';
import {FPS} from '../data/script';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeInOut = Easing.inOut(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);

/** frame 在 [a,b] 内的进度（0..1），可带缓动 */
export const prog = (frame: number, a: number, b: number, ease: (t: number) => number = easeInOut) =>
	ease(clamp((frame - a) / Math.max(1e-6, b - a)));

/** 从 at 帧开始的弹簧（0→1，可过冲） */
export const springAt = (
	frame: number,
	at: number,
	config: {damping?: number; stiffness?: number; mass?: number} = {damping: 14, stiffness: 160}
) => (frame < at ? 0 : spring({frame: frame - at, fps: FPS, config}));

/** 简易确定性伪随机 */
export const rand = (seed: number) => {
	const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

/** 平滑噪声（用于抖动、漂移） */
export const noise1 = (t: number, seed = 0) => {
	const i = Math.floor(t);
	const f = t - i;
	const u = f * f * (3 - 2 * f);
	return lerp(rand(i + seed * 57), rand(i + 1 + seed * 57), u) * 2 - 1;
};

/** 关键帧插值：keys 按 f 升序 */
export const keyed = (
	frame: number,
	keys: {f: number; v: number}[],
	ease: (t: number) => number = easeInOut
) => {
	if (frame <= keys[0].f) return keys[0].v;
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (frame <= b.f) return lerp(a.v, b.v, ease(clamp((frame - a.f) / Math.max(1e-6, b.f - a.f))));
	}
	return keys[keys.length - 1].v;
};
