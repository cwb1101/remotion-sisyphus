/**
 * 全片只有一台摄像机：世界坐标里的点 (x,y) 以缩放 z 出现在屏幕点 (sx,sy)。
 * 各节导出自己的关键帧（帧号取自 script.json），在这里合并成连续镜头。
 * 另外叠加：常驻轻微漂移（保证画面不静止）+ 重击时的震屏。
 */
import {clamp, easeInOut, lerp, noise1} from './anim';
import {screens, cue} from '../data/script';

export type CamKey = {
	f: number;
	x: number;
	y: number;
	z: number;
	sx?: number;
	sy?: number;
	rot?: number;
	ease?: (t: number) => number;
};
export type Cam = {x: number; y: number; z: number; sx: number; sy: number; rot: number};

let KEYS: CamKey[] = [];
export const registerCamera = (keys: CamKey[]) => {
	KEYS = [...keys].sort((a, b) => a.f - b.f);
};

const full = (k: CamKey): Cam => ({x: k.x, y: k.y, z: k.z, sx: k.sx ?? 960, sy: k.sy ?? 540, rot: k.rot ?? 0});

const baseCam = (f: number): Cam => {
	if (KEYS.length === 0) return {x: 0, y: 0, z: 1, sx: 960, sy: 540, rot: 0};
	if (f <= KEYS[0].f) return full(KEYS[0]);
	for (let i = 0; i < KEYS.length - 1; i++) {
		const a = KEYS[i];
		const b = KEYS[i + 1];
		if (f <= b.f) {
			const e = (b.ease ?? easeInOut)(clamp((f - a.f) / Math.max(1e-6, b.f - a.f)));
			const A = full(a);
			const B = full(b);
			return {
				x: lerp(A.x, B.x, e),
				y: lerp(A.y, B.y, e),
				z: Math.exp(lerp(Math.log(A.z), Math.log(B.z), e)),
				sx: lerp(A.sx, B.sx, e),
				sy: lerp(A.sy, B.sy, e),
				rot: lerp(A.rot, B.rot, e),
			};
		}
	}
	return full(KEYS[KEYS.length - 1]);
};

/** 重击震屏：取自 script.json 中 slam/title 屏的 hit/hit2/boom 音效帧 */
const SHAKES: {f: number; amp: number}[] = screens.flatMap((s) =>
	(s.sfx ?? [])
		.filter((c) => c.name === 'hit' || c.name === 'hit2' || c.name === 'boom' || c.name === 'thud')
		.map((c) => ({
			f: s.start + c.at,
			amp: c.name === 'boom' ? 26 : c.name === 'hit' ? 18 : c.name === 'hit2' ? 11 : 5,
		}))
);

export const shakeAt = (f: number) => {
	let dx = 0;
	let dy = 0;
	let dr = 0;
	for (const s of SHAKES) {
		const dt = f - s.f;
		if (dt < 0 || dt > 18) continue;
		const k = s.amp * Math.exp(-dt / 4.5);
		dx += noise1(dt * 1.7, s.f) * k;
		dy += noise1(dt * 1.9, s.f + 9) * k;
		dr += noise1(dt * 1.3, s.f + 3) * k * 0.04;
	}
	return {dx, dy, dr};
};

export const cameraAt = (f: number): Cam => {
	const c = baseCam(f);
	const sh = shakeAt(f);
	return {
		...c,
		sx: c.sx + Math.sin(f / 47) * 5 + sh.dx,
		sy: c.sy + Math.cos(f / 61) * 4 + sh.dy,
		rot: c.rot + Math.sin(f / 83) * 0.35 + sh.dr,
		z: c.z * (1 + Math.sin(f / 71) * 0.008),
	};
};

export const camTransform = (c: Cam) =>
	`translate(${c.sx} ${c.sy}) rotate(${c.rot}) scale(${c.z}) translate(${-c.x} ${-c.y})`;

/** 世界坐标 → 屏幕坐标 */
export const project = (c: Cam, wx: number, wy: number) => {
	const r = (c.rot * Math.PI) / 180;
	const dx = (wx - c.x) * c.z;
	const dy = (wy - c.y) * c.z;
	return {x: c.sx + dx * Math.cos(r) - dy * Math.sin(r), y: c.sy + dx * Math.sin(r) + dy * Math.cos(r)};
};

/** 摄像机水平速度（屏幕像素/帧），用于甩镜头时的运动模糊 */
export const camSpeed = (f: number) => {
	const a = baseCam(f - 1);
	const b = baseCam(f);
	return {vx: (b.x - a.x) * b.z, vy: (b.y - a.y) * b.z, vz: Math.abs(Math.log(b.z / a.z))};
};

export {cue};
