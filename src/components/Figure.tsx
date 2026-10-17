import React from 'react';
import {easeInOut, lerp} from '../lib/anim';
import {COLORS} from '../theme';

// 关节角度 单位度 0 表示肢体竖直向下 正值表示朝面向的一侧抬起
export type Pose = {
	torso: number;
	head: number;
	shoulderL: number;
	elbowL: number;
	shoulderR: number;
	elbowR: number;
	hipL: number;
	kneeL: number;
	hipR: number;
	kneeR: number;
};

export const POSES = {
	stand: {torso: 0, head: 0, shoulderL: -6, elbowL: 8, shoulderR: 6, elbowR: 10, hipL: -4, kneeL: 2, hipR: 4, kneeR: 2},
	holdUp: {torso: 0, head: 6, shoulderL: -8, elbowL: 10, shoulderR: 40, elbowR: 80, hipL: -4, kneeL: 2, hipR: 4, kneeR: 2},
	lookDown: {torso: 4, head: 28, shoulderL: -8, elbowL: 12, shoulderR: 44, elbowR: 86, hipL: -4, kneeL: 2, hipR: 4, kneeR: 2},
	heavy: {torso: -4, head: 18, shoulderL: -10, elbowL: 6, shoulderR: 26, elbowR: 46, hipL: -8, kneeL: 6, hipR: 8, kneeR: 8},
	walkA: {torso: 6, head: 2, shoulderL: 24, elbowL: 20, shoulderR: -22, elbowR: 14, hipL: -22, kneeL: 6, hipR: 24, kneeR: 30},
	walkB: {torso: 6, head: 2, shoulderL: -22, elbowL: 14, shoulderR: 24, elbowR: 20, hipL: 24, kneeL: 30, hipR: -22, kneeR: 6},
} satisfies Record<string, Pose>;

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
	const out = {} as Pose;
	for (const k of Object.keys(a) as (keyof Pose)[]) out[k] = a[k] + (b[k] - a[k]) * t;
	return out;
};

export type PoseKey = [frame: number, pose: Pose, dur?: number];

// 姿态关键帧 到达每个关键帧之前用 dur 帧插值 默认 8 帧
export const poseAt = (frame: number, keys: PoseKey[]): Pose => {
	let pose = keys[0][1];
	for (let i = 1; i < keys.length; i++) {
		const [f, next, dur = 8] = keys[i];
		if (frame < f - dur) break;
		pose = mixPose(pose, next, lerp(frame, f - dur, f, 0, 1, easeInOut));
	}
	return pose;
};

// 以 100 为身高的骨骼长度
const BONE = {torso: 36, neck: 4, head: 9, upperArm: 17, foreArm: 16, thigh: 25, shin: 25};

type Vec = {x: number; y: number};
const step = (from: Vec, deg: number, len: number, facing: number): Vec => {
	const r = (deg * Math.PI) / 180;
	return {x: from.x + Math.sin(r) * len * facing, y: from.y + Math.cos(r) * len};
};

export type FigureOpts = {
	x: number;
	// 脚底所在的 y
	y: number;
	height: number;
	facing?: 1 | -1;
	pose: Pose;
	// 整体下蹲 0 到 1 坐下时用
	crouch?: number;
};

// 正向运动学 返回各关节在画面上的坐标 方便把石头放到手上
export const joints = ({x, y, height, facing = 1, pose, crouch = 0}: FigureOpts) => {
	const k = height / 100;
	const hipY = -(BONE.thigh + BONE.shin) * (1 - crouch * 0.35);
	const hip = {x: 0, y: hipY};
	const neck = step(hip, 180 + pose.torso, BONE.torso, facing);
	const head = step(neck, 180 + pose.torso + pose.head * 0.3, BONE.neck + BONE.head, facing);
	const shoulder = step(hip, 180 + pose.torso, BONE.torso - 3, facing);
	const arm = (s: number, e: number) => {
		const elbow = step(shoulder, s + pose.torso, BONE.upperArm, facing);
		const hand = step(elbow, s + e + pose.torso, BONE.foreArm, facing);
		return {elbow, hand};
	};
	const leg = (h: number, kn: number) => {
		const knee = step(hip, h + crouch * 60, BONE.thigh, facing);
		const foot = step(knee, h - kn + crouch * 10, BONE.shin, facing);
		return {knee, foot};
	};
	const toWorld = (v: Vec) => ({x: x + v.x * k, y: y + v.y * k});
	const l = arm(pose.shoulderL, pose.elbowL);
	const r = arm(pose.shoulderR, pose.elbowR);
	const ll = leg(pose.hipL, pose.kneeL);
	const lr = leg(pose.hipR, pose.kneeR);
	return {
		k,
		local: {hip, neck, head, shoulder, l, r, ll, lr},
		handR: toWorld(r.hand),
		handL: toWorld(l.hand),
		head: toWorld(head),
	};
};

export type FigureProps = FigureOpts & {
	color?: string;
	rim?: string;
	rimAmount?: number;
	opacity?: number;
	// 光从哪一侧来 -1 左 1 右 轮廓光出现在这一侧
	lightFrom?: -1 | 1;
};

// 扁平几何人物 胶囊身体 圆头 没有五官 动作完全靠关节角度
// 远侧的手脚颜色更深 近侧的手脚压在身体上面 这样侧身时四肢也分得清
export const Figure: React.FC<FigureProps> = (props) => {
	const {color = '#3A352E', rim = COLORS.warm, rimAmount = 1, opacity = 1} = props;
	const j = joints(props);
	const {hip, neck, head, shoulder, l, r, ll, lr} = j.local;
	const facing = props.facing ?? 1;
	const limb = (a: Vec, b: Vec, c: Vec) => `M${a.x},${a.y} L${b.x},${b.y} L${c.x},${c.y}`;
	const foot = (f: Vec) => `M${f.x - 1 * facing},${f.y - 1} L${f.x + 6 * facing},${f.y - 1}`;
	const far = '#25211C';
	const parts = (fill: string, farFill: string) => (
		<>
			<path d={limb(shoulder, l.elbow, l.hand)} stroke={farFill} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
			<path d={limb(hip, ll.knee, ll.foot) + foot(ll.foot)} stroke={farFill} strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
			<path d={`M${hip.x},${hip.y} L${neck.x},${neck.y}`} stroke={fill} strokeWidth={14} strokeLinecap="round" fill="none" />
			<circle cx={head.x} cy={head.y} r={8.5} fill={fill} />
			<path d={limb(hip, lr.knee, lr.foot) + foot(lr.foot)} stroke={fill} strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
			<path d={limb(shoulder, r.elbow, r.hand)} stroke={fill} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
		</>
	);
	const lx = (props.lightFrom ?? -1) * 1.8;
	return (
		<svg width={10} height={10} style={{position: 'absolute', left: props.x, top: props.y, overflow: 'visible', opacity}}>
			<g transform={`scale(${j.k})`}>
				<ellipse cx={0} cy={1} rx={20} ry={3} fill="#000000" opacity={0.4} />
				{rimAmount > 0 ? <g opacity={rimAmount} transform={`translate(${lx},-1)`}>{parts(rim, rim)}</g> : null}
				{parts(color, far)}
			</g>
		</svg>
	);
};
