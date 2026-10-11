/** 姿势库与插值、走路循环 */
import {Limb, Pose} from '../components/Person';
import {lerp} from './anim';

const mixLimb = (a: Limb | undefined, b: Limb | undefined, t: number): Limb | undefined => {
	if (!a && !b) return undefined;
	const A = a ?? {a: 0, b: 0, k: 1};
	const B = b ?? {a: 0, b: 0, k: 1};
	return {a: lerp(A.a, B.a, t), b: lerp(A.b, B.b, t), k: lerp(A.k ?? 1, B.k ?? 1, t)};
};

export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
	lean: lerp(a.lean ?? 0, b.lean ?? 0, t),
	head: lerp(a.head ?? 0, b.head ?? 0, t),
	bob: lerp(a.bob ?? 0, b.bob ?? 0, t),
	crouch: lerp(a.crouch ?? 0, b.crouch ?? 0, t),
	armBack: mixLimb(a.armBack ?? STAND.armBack, b.armBack ?? STAND.armBack, t),
	armFront: mixLimb(a.armFront ?? STAND.armFront, b.armFront ?? STAND.armFront, t),
	legBack: mixLimb(a.legBack ?? STAND.legBack, b.legBack ?? STAND.legBack, t),
	legFront: mixLimb(a.legFront ?? STAND.legFront, b.legFront ?? STAND.legFront, t),
});

export const STAND: Pose = {armBack: {a: -6, b: 8}, armFront: {a: 6, b: 10}, legBack: {a: -4, b: 0}, legFront: {a: 4, b: 0}};
/** 低头、双手插兜：封闭 */
export const POCKETS: Pose = {lean: -2, head: 16, armFront: {a: -4, b: 34, k: 0.5}, armBack: {a: -10, b: 30, k: 0.5}, legBack: {a: -3, b: 0}, legFront: {a: 5, b: 0}};
/** 伸手 */
export const REACH: Pose = {lean: 6, armFront: {a: 70, b: 10, k: 0.95}, armBack: {a: -16, b: 14}};
/** 小孩牵手（手举向前上方） */
export const HOLD_UP: Pose = {armFront: {a: 118, b: 6}, armBack: {a: -8, b: 10}};
/** 大人牵手（手向前下方） */
export const HOLD_DOWN: Pose = {lean: 4, head: 10, armFront: {a: 36, b: 4}, armBack: {a: -6, b: 8}};
/** 被压弯 */
export const BENT: Pose = {lean: 24, head: -10, crouch: 0.35, armFront: {a: 20, b: 40}, armBack: {a: -10, b: 30}};
/** 摆手：「我没事」 */
export const WAVE: Pose = {lean: -4, head: 4, armFront: {a: 140, b: 20, k: 0.9}, armBack: {a: -8, b: 20}};
/** 抱紧自己 */
export const HUG: Pose = {lean: 4, head: 14, armFront: {a: 40, b: 100, k: 0.55}, armBack: {a: 30, b: 100, k: 0.5}};

/** 走路循环：phase 以弧度计（可由位移换算，倒退时自然反向） */
export const walk = (phase: number, amp = 1, base: Pose = STAND): Pose => {
	const s = Math.sin(phase);
	const c = Math.cos(phase);
	return {
		...base,
		lean: (base.lean ?? 0) + 3 * amp,
		bob: -Math.abs(c) * 5 * amp,
		legFront: {a: 24 * s * amp, b: (-2 - Math.max(0, -s) * 24) * amp},
		legBack: {a: -24 * s * amp, b: (-2 - Math.max(0, s) * 24) * amp},
		armFront: base === STAND ? {a: -20 * s * amp, b: 14} : base.armFront,
		armBack: base === STAND ? {a: 20 * s * amp, b: 14} : base.armBack,
	};
};
/** 由水平位移得到走路相位 */
export const strideFor = (x: number, scale = 1.3) => x / (52 * scale);
/** 双手举起要抱 */
export const REACH_UP: Pose = {lean: 4, head: -10, armFront: {a: 128, b: 8}, armBack: {a: 118, b: 10}};
/** 背身向后伸手：推开 */
export const PUSH_BACK: Pose = {lean: 4, head: 6, armFront: {a: 40, b: 70, k: 0.8}, armBack: {a: -82, b: -6}};
/** 低头看手机 */
export const PHONE: Pose = {head: 18, armFront: {a: 38, b: 70, k: 0.8}, armBack: {a: -6, b: 8}};
/** 坐（配合椅子）：大腿水平、小腿垂直 */
export const SIT: Pose = {lean: -2, head: 4, bob: 80, legFront: {a: 88, b: -88}, legBack: {a: 82, b: -82}, armFront: {a: 30, b: 40}, armBack: {a: 20, b: 40}};
