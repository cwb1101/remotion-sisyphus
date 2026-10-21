import {Easing, random} from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const EASE = Easing.bezier(0.45, 0, 0.2, 1);
export const EASE_OUT = Easing.bezier(0.15, 0.7, 0.25, 1);
export const EASE_IN = Easing.bezier(0.5, 0, 0.9, 0.4);
/** 落下后轻微回弹 */
export const DROP = Easing.out(Easing.back(1.8));

/** f0→f1 之间 0→1 */
export const ramp = (f: number, f0: number, f1: number, ease: (t: number) => number = EASE) => {
	if (f1 <= f0) {
		return f >= f1 ? 1 : 0;
	}
	return ease(clamp((f - f0) / (f1 - f0)));
};

/** 关键帧插值：[帧, 值, 进入这一帧所用的缓动] */
export type Key = [number, number, ((t: number) => number)?];
export const track = (f: number, keys: Key[]): number => {
	if (f <= keys[0][0]) {
		return keys[0][1];
	}
	for (let i = 1; i < keys.length; i++) {
		const [f1, v1, ease] = keys[i];
		const [f0, v0] = keys[i - 1];
		if (f <= f1) {
			const t = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
			return lerp(v0, v1, (ease ?? EASE)(t));
		}
	}
	return keys[keys.length - 1][1];
};

/** [a, b) 内淡入淡出的可见度 */
export const visible = (f: number, a: number, b: number, fin = 8, fout = 8) =>
	Math.min(ramp(f, a, a + fin), 1 - ramp(f, b - fout, b));

/** 平滑的伪随机摆动，-1..1 */
export const wobble = (seed: string, t: number) => {
	const p1 = random(`${seed}-a`) * Math.PI * 2;
	const p2 = random(`${seed}-b`) * Math.PI * 2;
	return 0.6 * Math.sin(t * 1.3 + p1) + 0.4 * Math.sin(t * 2.9 + p2);
};
