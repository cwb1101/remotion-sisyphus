export type Pt = {x: number; y: number};

export type Ellipse = {cx: number; cy: number; rx: number; ry: number; rot: number};

export const TAU = Math.PI * 2;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)});

export const lerpEllipse = (a: Ellipse, b: Ellipse, t: number): Ellipse => ({
	cx: lerp(a.cx, b.cx, t),
	cy: lerp(a.cy, b.cy, t),
	rx: lerp(a.rx, b.rx, t),
	ry: lerp(a.ry, b.ry, t),
	rot: lerp(a.rot, b.rot, t),
});

/** 帧区间 → 0–1 进度，可带缓动 */
export const prog = (frame: number, from: number, to: number, ease: (t: number) => number = (t) => t) =>
	ease(clamp01((frame - from) / Math.max(1, to - from)));

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeIn = (t: number) => t * t * t;

export const ellipsePoint = (e: Ellipse, th: number): Pt => {
	const c = Math.cos(th) * e.rx;
	const s = Math.sin(th) * e.ry;
	const a = (e.rot * Math.PI) / 180;
	return {x: e.cx + c * Math.cos(a) - s * Math.sin(a), y: e.cy + c * Math.sin(a) + s * Math.cos(a)};
};

/** 平滑的伪随机抖动（确定性），用于“线变乱” */
export const wobble = (seed: number, t: number) =>
	Math.sin(t * 1.7 + seed * 12.9898) * 0.5 + Math.sin(t * 3.1 + seed * 78.233) * 0.3 + Math.sin(t * 5.3 + seed * 37.719) * 0.2;

/** 椭圆弧折线；jitter 让线条变乱 */
export const arcPath = (e: Ellipse, from: number, to: number, opts: {steps?: number; jitter?: number; time?: number; seed?: number} = {}) => {
	const span = Math.abs(to - from);
	const steps = Math.max(8, Math.round((opts.steps ?? 160) * (span / TAU)));
	const jit = opts.jitter ?? 0;
	let d = '';
	for (let i = 0; i <= steps; i++) {
		const th = from + ((to - from) * i) / steps;
		const p = ellipsePoint(e, th);
		let x = p.x;
		let y = p.y;
		if (jit > 0) {
			const t = opts.time ?? 0;
			x += jit * wobble((opts.seed ?? 1) + i * 0.37, t * 0.35 + i * 0.9);
			y += jit * wobble((opts.seed ?? 1) + i * 0.53 + 3, t * 0.31 + i * 1.1);
		}
		d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
	}
	return d;
};

export const quadPoint = (p0: Pt, c: Pt, p1: Pt, t: number): Pt => ({
	x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x,
	y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y,
});

export const quadPath = (p0: Pt, c: Pt, p1: Pt) => `M${p0.x} ${p0.y} Q${c.x} ${c.y} ${p1.x} ${p1.y}`;

/** 经过三点的二次曲线控制点 */
export const quadThrough = (p0: Pt, mid: Pt, p1: Pt): Pt => ({x: 2 * mid.x - (p0.x + p1.x) / 2, y: 2 * mid.y - (p0.y + p1.y) / 2});

/** theta 单调递减时，穿过目标角（模 2π）的帧 */
export const crossings = (thetaAt: (f: number) => number, target: number, from: number, to: number) => {
	const res: number[] = [];
	const k = (f: number) => Math.floor((thetaAt(f) - target) / TAU);
	for (let f = from + 1; f <= to; f++) {
		if (k(f) < k(f - 1)) res.push(f);
	}
	return res;
};
