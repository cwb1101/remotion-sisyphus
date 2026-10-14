import {Easing, interpolate} from 'remotion';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const easeInOut = Easing.inOut(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.quad);

/** 区间进度 0..1（带缓动） */
export const prog = (
	frame: number,
	from: number,
	to: number,
	easing: (t: number) => number = easeInOut,
) =>
	interpolate(frame, [from, to], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 分段关键帧插值：keys = [[frame, value], ...] */
export const kf = (
	frame: number,
	keys: [number, number][],
	easing: (t: number) => number = easeInOut,
): number => {
	if (frame <= keys[0][0]) {
		return keys[0][1];
	}
	for (let i = 0; i < keys.length - 1; i++) {
		const [f0, v0] = keys[i];
		const [f1, v1] = keys[i + 1];
		if (frame <= f1) {
			return lerp(v0, v1, easing(clamp01((frame - f0) / (f1 - f0))));
		}
	}
	return keys[keys.length - 1][1];
};

/** 确定性伪随机 */
export const rand = (seed: number) => {
	const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

export const mixColor = (a: string, b: string, t: number) => {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	const c = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp01(t))));
	return `rgb(${c[0]},${c[1]},${c[2]})`;
};
