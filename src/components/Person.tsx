import React, {useId} from 'react';
import {lerp} from '../lib/anim';
import {armIK, BODY, Pose, solve} from '../lib/pose';
import {C} from '../theme';

// 扁平几何人形（SVG）：圆头、圆角躯干、胶囊四肢，不画五官。
// 姿态由关节角给出，动作靠在姿态之间插值；手可以用逆运动学够到世界坐标里的目标点。

type Pt = {x: number; y: number};
type Reach = Pt & {w: number};

export type PersonProps = {
	x: number; // 髋部的世界 x
	groundY: number; // 脚底所在的世界 y
	pose: Pose;
	facing?: number; // 1 朝右，-1 朝左；中间值用于转身
	scale?: number;
	color?: string;
	backColor?: string;
	opacity?: number;
	/** 手部目标（世界坐标）与权重 w，用于推墙、托天花板等与物件的接触 */
	reachF?: Reach | null;
	reachB?: Reach | null;
	/** 侧光：颜色、强度 0..1、来自哪一侧（1 = 右侧） */
	rim?: {color: string; strength: number; side: number};
};

const Limb: React.FC<{a: Pt; b: Pt; c: Pt; w: number; color: string}> = ({a, b, c, w, color}) => (
	<polyline
		points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
		fill="none"
		stroke={color}
		strokeWidth={w}
		strokeLinecap="round"
		strokeLinejoin="round"
	/>
);

export const Person: React.FC<PersonProps> = ({
	x,
	groundY,
	pose,
	facing = 1,
	scale = 1,
	color = C.person,
	backColor = C.personBack,
	opacity = 1,
	reachF,
	reachB,
	rim,
}) => {
	const id = useId().replace(/:/g, '');
	const dir = facing >= 0 ? 1 : -1;
	const sx = Math.max(Math.abs(facing), 0.06) * dir * scale;

	// 先解一次得到离地高度，再把世界目标换算到局部坐标做 IK
	let p = pose;
	const pre = solve(p);
	const hipY = groundY - pre.groundOffset * scale;
	const toLocal = (t: Pt): Pt => ({x: (t.x - x) / (dir * scale), y: (t.y - hipY) / scale});
	if (reachF && reachF.w > 0) {
		const ik = armIK(pre.shoulder, toLocal(reachF));
		p = {...p, armF: lerp(p.armF, ik.arm, reachF.w), elbowF: lerp(p.elbowF, ik.elbow, reachF.w)};
	}
	if (reachB && reachB.w > 0) {
		const ik = armIK(pre.shoulder, toLocal(reachB));
		p = {...p, armB: lerp(p.armB, ik.arm, reachB.w), elbowB: lerp(p.elbowB, ik.elbow, reachB.w)};
	}
	const s = solve(p);
	const footB = {x: s.ankleB.x + BODY.foot, y: s.ankleB.y};
	const footF = {x: s.ankleF.x + BODY.foot, y: s.ankleF.y};
	const hd = (s.headDir * Math.PI) / 180;

	const body = (front: string, back: string) => (
		<>
			<Limb a={s.shoulder} b={s.elbowB} c={s.handB} w={BODY.armW} color={back} />
			<Limb a={s.hip} b={s.kneeB} c={s.ankleB} w={BODY.legW} color={back} />
			<line x1={s.ankleB.x} y1={s.ankleB.y} x2={footB.x} y2={footB.y} stroke={back} strokeWidth={BODY.legW - 4} strokeLinecap="round" />
			<line x1={s.hip.x} y1={s.hip.y} x2={s.shoulder.x} y2={s.shoulder.y} stroke={front} strokeWidth={BODY.torsoW} strokeLinecap="round" />
			<circle cx={s.head.x} cy={s.head.y} r={BODY.headR} fill={front} />
			<Limb a={s.hip} b={s.kneeF} c={s.ankleF} w={BODY.legW} color={front} />
			<line x1={s.ankleF.x} y1={s.ankleF.y} x2={footF.x} y2={footF.y} stroke={front} strokeWidth={BODY.legW - 4} strokeLinecap="round" />
			<Limb a={s.shoulder} b={s.elbowF} c={s.handF} w={BODY.armW} color={front} />
		</>
	);

	// 头部朝向用一道浅色弧线暗示（不画五官）
	const arcR = BODY.headR - 5;
	const a0 = hd - 0.2;
	const a1 = hd + 1.1;
	const arc = `M ${s.head.x + Math.sin(a0) * arcR} ${s.head.y - Math.cos(a0) * arcR} A ${arcR} ${arcR} 0 0 1 ${s.head.x + Math.sin(a1) * arcR} ${s.head.y - Math.cos(a1) * arcR}`;

	const rimDx = rim ? (rim.side * 5) / (dir * scale) : 0;

	return (
		<g opacity={opacity} transform={`translate(${x} ${hipY}) scale(${sx} ${scale})`}>
			{rim && rim.strength > 0.01 ? (
				<g transform={`translate(${rimDx} -1)`} opacity={rim.strength}>
					<g filter={`url(#rim-${id})`}>{body(rim.color, rim.color)}</g>
				</g>
			) : null}
			{rim ? (
				<defs>
					<filter id={`rim-${id}`} x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation="2.5" />
					</filter>
				</defs>
			) : null}
			{body(color, backColor)}
			<path d={arc} fill="none" stroke={C.personLight} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
		</g>
	);
};
