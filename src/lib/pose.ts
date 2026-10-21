import {clamp, lerp} from './anim';

// 几何人形的骨架与姿态。角度单位为度；局部坐标原点在髋部，y 向下，+x 为人物朝向。
// 手臂、大腿用绝对角（0 = 竖直向下，正值朝前摆）；肘、膝为相对上一节的弯曲。
// 躯干角：0 = 直立，正值前倾；颈角：正值低头，负值抬头。

export type Pose = {
	torso: number;
	neck: number;
	armB: number;
	elbowB: number;
	armF: number;
	elbowF: number;
	hipB: number;
	kneeB: number;
	hipF: number;
	kneeF: number;
};

export const BODY = {
	headR: 24,
	neck: 12,
	torso: 108,
	upperArm: 64,
	foreArm: 60,
	thigh: 80,
	shin: 78,
	foot: 18,
	armW: 17,
	legW: 21,
	torsoW: 42,
};

export const STAND: Pose = {torso: 0, neck: 0, armB: -4, elbowB: 10, armF: 4, elbowF: 10, hipB: -3, kneeB: 3, hipF: 3, kneeF: 3};
export const CROUCH: Pose = {torso: 44, neck: 26, armB: 12, elbowB: 30, armF: 22, elbowF: 30, hipB: 62, kneeB: 108, hipF: 66, kneeF: 110};
export const PUSH: Pose = {torso: 30, neck: 6, armB: 70, elbowB: 10, armF: 76, elbowF: 8, hipB: -22, kneeB: 6, hipF: 34, kneeF: 42};
export const HOLD: Pose = {torso: 12, neck: 34, armB: 150, elbowB: 30, armF: 160, elbowF: 30, hipB: 80, kneeB: 140, hipF: 86, kneeF: 145};
export const LOOK_UP: Pose = {...STAND, torso: -4, neck: -26, armB: -8, armF: 6};

const KEYS = Object.keys(STAND) as (keyof Pose)[];

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
	const out = {} as Pose;
	for (const k of KEYS) {
		out[k] = lerp(a[k], b[k], t);
	}
	return out;
};

/** a + (b - STAND) * k：把一个动作的“增量”叠加到底姿态上 */
export const addPose = (a: Pose, b: Pose, k = 1): Pose => {
	const out = {} as Pose;
	for (const key of KEYS) {
		out[key] = a[key] + (b[key] - STAND[key]) * k;
	}
	return out;
};

export const withPose = (a: Pose, patch: Partial<Pose>): Pose => ({...a, ...patch});

/** 走路循环；phase 每增加 π 迈一步 */
export const walkPose = (phase: number, amp = 1): Pose => {
	const s = Math.sin(phase);
	const c = Math.cos(phase);
	return {
		torso: 4 * amp,
		neck: 2,
		armB: 16 * s * amp,
		elbowB: 14,
		armF: -16 * s * amp,
		elbowF: 14,
		hipB: -22 * s * amp,
		kneeB: 5 + 30 * Math.max(0, -c) * amp,
		hipF: 22 * s * amp,
		kneeF: 5 + 30 * Math.max(0, c) * amp,
	};
};

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
type Pt = {x: number; y: number};
const along = (p: Pt, angleFromDown: number, len: number): Pt => ({
	x: p.x + Math.sin(rad(angleFromDown)) * len,
	y: p.y + Math.cos(rad(angleFromDown)) * len,
});

export type Skeleton = {
	hip: Pt;
	shoulder: Pt;
	head: Pt;
	headDir: number; // 头部朝向角（从竖直向上起算，正值朝前）
	elbowB: Pt;
	handB: Pt;
	elbowF: Pt;
	handF: Pt;
	kneeB: Pt;
	ankleB: Pt;
	kneeF: Pt;
	ankleF: Pt;
	groundOffset: number; // 髋部离地高度（局部单位）
};

/** 正向运动学；返回的局部坐标已把最低的脚踩到地面（y = groundOffset 处） */
export const solve = (p: Pose): Skeleton => {
	const hip = {x: 0, y: 0};
	const up = rad(p.torso);
	const shoulder = {x: Math.sin(up) * BODY.torso, y: -Math.cos(up) * BODY.torso};
	const headDir = p.torso + p.neck;
	const hd = rad(headDir);
	const head = {
		x: shoulder.x + Math.sin(hd) * (BODY.neck + BODY.headR),
		y: shoulder.y - Math.cos(hd) * (BODY.neck + BODY.headR),
	};
	const elbowB = along(shoulder, p.armB, BODY.upperArm);
	const handB = along(elbowB, p.armB + p.elbowB, BODY.foreArm);
	const elbowF = along(shoulder, p.armF, BODY.upperArm);
	const handF = along(elbowF, p.armF + p.elbowF, BODY.foreArm);
	const kneeB = along(hip, p.hipB, BODY.thigh);
	const ankleB = along(kneeB, p.hipB - p.kneeB, BODY.shin);
	const kneeF = along(hip, p.hipF, BODY.thigh);
	const ankleF = along(kneeF, p.hipF - p.kneeF, BODY.shin);
	const groundOffset = Math.max(ankleB.y, ankleF.y) + BODY.legW / 2;
	return {hip, shoulder, head, headDir, elbowB, handB, elbowF, handF, kneeB, ankleB, kneeF, ankleF, groundOffset};
};

/** 从脚底到头顶的高度（局部单位，不含举起的手） */
export const poseHeight = (p: Pose) => {
	const s = solve(p);
	return s.groundOffset - (s.head.y - BODY.headR);
};

/** 在 base 与 crouch 之间找到刚好低于 maxH 的姿态，用来保证人物不穿天花板 */
export const fitUnder = (base: Pose, crouch: Pose, maxH: number): Pose => {
	if (poseHeight(base) <= maxH) {
		return base;
	}
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 14; i++) {
		const mid = (lo + hi) / 2;
		if (poseHeight(mixPose(base, crouch, mid)) <= maxH) {
			hi = mid;
		} else {
			lo = mid;
		}
	}
	return mixPose(base, crouch, hi);
};

/** 两段臂的逆运动学：给定肩到目标的局部向量，返回上臂绝对角与肘弯曲 */
export const armIK = (shoulder: Pt, target: Pt) => {
	const l1 = BODY.upperArm;
	const l2 = BODY.foreArm;
	const dx = target.x - shoulder.x;
	const dy = target.y - shoulder.y;
	const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 0.5);
	const base = Math.atan2(dx, dy);
	const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
	const b = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
	return {arm: deg(base - a), elbow: deg(Math.PI - b)};
};
