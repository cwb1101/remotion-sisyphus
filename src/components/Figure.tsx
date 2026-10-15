import React from 'react';

// 人物：扁平几何人形（圆头 + 梯形躯干 + 圆头矩形四肢），不画五官。
// 所有四肢角度都是相对竖直向下的绝对角度（度），正值 = 朝人物面向的方向。
// 躯干 torso 正值 = 前倾；头 head 正值 = 低头，负值 = 抬头。
// F = 靠近镜头的一侧肢体，B = 远侧（颜色略深）。
export type Pose = {
	torso: number;
	head: number;
	shF: number;
	elF: number;
	shB: number;
	elB: number;
	hipF: number;
	knF: number;
	hipB: number;
	knB: number;
};

const P = (p: Pose) => p;

export const POSES = {
	stand: P({torso: 2, head: 0, shF: -4, elF: 8, shB: 6, elB: 8, hipF: 4, knF: 3, hipB: -4, knB: 3}),
	lookUp: P({torso: -4, head: -30, shF: -6, elF: 10, shB: 4, elB: 10, hipF: 4, knF: 3, hipB: -4, knB: 3}),
	handOnStone: P({torso: 6, head: 4, shF: 78, elF: 6, shB: 10, elB: 12, hipF: 8, knF: 5, hipB: -6, knB: 4}),
	push: P({torso: 30, head: -12, shF: 84, elF: 8, shB: 78, elB: 12, hipF: 20, knF: 26, hipB: -26, knB: 6}),
	pushLookUp: P({torso: 22, head: -34, shF: 80, elF: 8, shB: 74, elB: 12, hipF: 14, knF: 18, hipB: -20, knB: 6}),
	pushBent: P({torso: 46, head: 14, shF: 92, elF: 22, shB: 84, elB: 26, hipF: 30, knF: 42, hipB: -22, knB: 12}),
	recoil: P({torso: -10, head: -8, shF: 50, elF: 30, shB: 40, elB: 34, hipF: 16, knF: 14, hipB: -16, knB: 10}),
	kneel: P({torso: 18, head: 22, shF: 62, elF: 10, shB: 54, elB: 14, hipF: 88, knF: 86, hipB: -6, knB: 86}),
	sitFallen: P({torso: -22, head: 10, shF: -34, elF: 0, shB: -38, elB: 0, hipF: 100, knF: 25, hipB: 92, knB: 10}),
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
	const o = {} as Pose;
	(Object.keys(a) as (keyof Pose)[]).forEach((k) => {
		o[k] = a[k] + (b[k] - a[k]) * t;
	});
	return o;
};

// 走路循环：在给定姿态上叠加腿的摆动（phase 单位为弧度）
export const withWalk = (base: Pose, phase: number, stride = 1, swingArms = false): Pose => {
	const s = Math.sin(phase);
	const c = Math.cos(phase);
	return {
		...base,
		hipF: base.hipF + 22 * stride * s,
		hipB: base.hipB - 22 * stride * s,
		knF: base.knF + 30 * stride * Math.max(0, c),
		knB: base.knB + 30 * stride * Math.max(0, -c),
		shF: swingArms ? base.shF - 18 * stride * s : base.shF,
		shB: swingArms ? base.shB + 18 * stride * s : base.shB,
	};
};

// 呼吸：躯干轻微起伏，保证人物静止时画面也在动
export const withBreath = (base: Pose, frame: number, amount = 1): Pose => ({
	...base,
	torso: base.torso + Math.sin(frame / 18) * 1.2 * amount,
	head: base.head + Math.sin(frame / 18 - 0.6) * 1.5 * amount,
});

const L = {thigh: 72, shin: 70, foot: 20, torso: 104, neck: 12, headR: 23, upper: 62, fore: 58};
const rad = (d: number) => (d * Math.PI) / 180;
const down = (a: number) => ({x: Math.sin(rad(a)), y: Math.cos(rad(a))});
const add = (p: {x: number; y: number}, d: {x: number; y: number}, len: number) => ({
	x: p.x + d.x * len,
	y: p.y + d.y * len,
});

const shade = (hex: string, k: number) => {
	const n = parseInt(hex.slice(1), 16);
	const r = Math.round(((n >> 16) & 255) * k);
	const g = Math.round(((n >> 8) & 255) * k);
	const b = Math.round((n & 255) * k);
	return `rgb(${r},${g},${b})`;
};

export const rgba = (hex: string, a: number) => {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const solveFigure =(pose: Pose) => {
	const hip = {x: 0, y: 0};
	const leg = (hipA: number, knee: number) => {
		const k = add(hip, down(hipA), L.thigh);
		const shinA = hipA - knee;
		const a = add(k, down(shinA), L.shin);
		// 脚掌垂直于小腿、朝前
		const footDir = {x: Math.cos(rad(shinA)), y: -Math.sin(rad(shinA))};
		const t = add(a, footDir, L.foot);
		return {knee: k, ankle: a, toe: t};
	};
	const up = {x: Math.sin(rad(pose.torso)), y: -Math.cos(rad(pose.torso))};
	const shoulder = add(hip, up, L.torso - 6);
	const neck = add(hip, up, L.torso);
	const headDir = {x: Math.sin(rad(pose.torso + pose.head)), y: -Math.cos(rad(pose.torso + pose.head))};
	const head = add(neck, headDir, L.neck + L.headR);
	const arm = (sh: number, el: number) => {
		const e = add(shoulder, down(sh), L.upper);
		const h = add(e, down(sh + el), L.fore);
		return {elbow: e, hand: h};
	};
	const legF = leg(pose.hipF, pose.knF);
	const legB = leg(pose.hipB, pose.knB);
	const armF = arm(pose.shF, pose.elF);
	const armB = arm(pose.shB, pose.elB);
	// 最低点贴地：取所有关节（含线宽半径）的最大 y
	const lows = [
		legF.knee.y + 10, legF.ankle.y + 9, legF.toe.y + 6,
		legB.knee.y + 10, legB.ankle.y + 9, legB.toe.y + 6,
		armF.hand.y + 7, armB.hand.y + 7, hip.y + 16,
	];
	const lowest = Math.max(...lows);
	return {hip, shoulder, neck, head, up, headDir, legF, legB, armF, armB, lowest};
};

type FigureProps = {
	x: number;
	// 脚下地面的 y
	y: number;
	pose: Pose;
	facing?: 1 | -1;
	scale?: number;
	color?: string;
	opacity?: number;
	// 陷进地面的深度（px，人物坐标）
	sink?: number;
	// 轮廓光，0–1
	rim?: number;
	rimColor?: string;
};

export const Figure: React.FC<FigureProps> = ({
	x,
	y,
	pose,
	facing = 1,
	scale = 1,
	color = '#E8E1D2',
	opacity = 1,
	sink = 0,
	rim = 0,
	rimColor = '#FFC24A',
}) => {
	const s = solveFigure(pose);
	const far = shade(color, 0.78);
	const line = (a: {x: number; y: number}, b: {x: number; y: number}, w: number, col: string) => (
		<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth={w} strokeLinecap="round" />
	);
	// 躯干：髋部窄、肩部宽的圆角梯形
	const perp = {x: -s.up.y, y: s.up.x};
	const hipW = 15;
	const shW = 21;
	const torsoPts = [
		add(s.hip, perp, hipW),
		add(s.neck, perp, shW),
		add(s.neck, perp, -shW),
		add(s.hip, perp, -hipW),
	]
		.map((p) => `${p.x},${p.y}`)
		.join(' ');
	// 后脑的发帽（只是一块弧形色块，用来区分朝向，不画五官）
	const hd = s.headDir;
	const back = {x: -hd.y, y: hd.x};
	const capA = add(s.head, {x: hd.x * 0.2 - back.x * 0.98, y: hd.y * 0.2 - back.y * 0.98}, L.headR);
	const capB = add(s.head, {x: hd.x * 0.95 + back.x * 0.3, y: hd.y * 0.95 + back.y * 0.3}, L.headR);

	const body = (
		<>
			{line(s.hip, s.legB.knee, 22, far)}
			{line(s.legB.knee, s.legB.ankle, 18, far)}
			{line(s.legB.ankle, s.legB.toe, 12, far)}
			{line(s.shoulder, s.armB.elbow, 16, far)}
			{line(s.armB.elbow, s.armB.hand, 14, far)}
			<polygon points={torsoPts} fill={color} stroke={color} strokeWidth={14} strokeLinejoin="round" />
			{line(s.neck, add(s.neck, s.headDir, L.neck + 4), 14, color)}
			<circle cx={s.head.x} cy={s.head.y} r={L.headR} fill={color} />
			<path
				d={`M ${capA.x} ${capA.y} A ${L.headR} ${L.headR} 0 0 1 ${capB.x} ${capB.y} Z`}
				fill={shade(color, 0.62)}
			/>
			{line(s.hip, s.legF.knee, 22, color)}
			{line(s.legF.knee, s.legF.ankle, 18, color)}
			{line(s.legF.ankle, s.legF.toe, 12, color)}
			{line(s.shoulder, s.armF.elbow, 16, color)}
			{line(s.armF.elbow, s.armF.hand, 14, color)}
		</>
	);

	const lift = -s.lowest + sink;
	return (
		<g
			transform={`translate(${x} ${y}) scale(${scale * facing} ${scale}) translate(0 ${lift})`}
			opacity={opacity}
		>
			<g style={rim > 0 ? {filter: `drop-shadow(0 0 ${4 + 6 * rim}px ${rgba(rimColor, rim)})`} : undefined}>
				{body}
			</g>
		</g>
	);
};
