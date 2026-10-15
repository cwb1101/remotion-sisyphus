import {Easing, interpolate} from 'remotion';

export type Cam = {x: number; y: number; z: number};
export type CamKey = Cam & {f: number};

const ease = Easing.inOut(Easing.cubic);

// 关键帧之间用缓动插值；缩放在对数空间插值，推近/拉远速度更均匀
export const camAt = (keys: CamKey[], frame: number): Cam => {
	if (frame <= keys[0].f) {
		return keys[0];
	}
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (frame <= b.f) {
			const t = ease((frame - a.f) / Math.max(1, b.f - a.f));
			return {
				x: a.x + (b.x - a.x) * t,
				y: a.y + (b.y - a.y) * t,
				z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t),
			};
		}
	}
	return keys[keys.length - 1];
};

// parallax < 1 的图层（远山）移动和缩放都更少
export const camTransform = (cam: Cam, parallax = 1): string => {
	const z = 1 + (cam.z - 1) * parallax;
	const x = 960 + (cam.x - 960) * parallax;
	const y = 540 + (cam.y - 540) * parallax;
	return `translate(960 540) scale(${z}) translate(${-x} ${-y})`;
};

export const worldToScreen = (cam: Cam, p: {x: number; y: number}) => ({
	x: 960 + (p.x - cam.x) * cam.z,
	y: 540 + (p.y - cam.y) * cam.z,
});

// 落地冲击引起的镜头震动：衰减正弦，确定性
export const shakeAt = (frame: number, hits: number[], amp = 10) => {
	let dx = 0;
	let dy = 0;
	for (const h of hits) {
		const t = frame - h;
		if (t >= 0 && t < 14) {
			const k = Math.exp(-t / 4) * amp;
			dx += Math.sin(t * 2.3) * k * 0.6;
			dy += Math.sin(t * 3.1 + 1) * k;
		}
	}
	return {dx, dy};
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const prog = (
	frame: number,
	start: number,
	end: number,
	easing: (t: number) => number = ease,
) =>
	interpolate(frame, [start, end], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});
