import React from 'react';
import {clamp01, easeInOut, lerp} from '../lib/anim';

/**
 * 几何扁平人形（侧身），不画五官。
 * 局部坐标：脚底为原点，身高 100 个单位，向上为 -y；facing=1 面朝右。
 * 角度单位为度：手臂/腿 0 = 竖直向下，正值 = 向前摆；
 * 膝盖正值 = 小腿向后弯；手肘正值 = 前臂向前弯；
 * lean 正值 = 上身前倾；pitch 正值 = 低头，负值 = 抬头。
 */
export interface Pose {
	lean: number;
	pitch: number;
	shoulderF: number;
	elbowF: number;
	shoulderB: number;
	elbowB: number;
	hipF: number;
	kneeF: number;
	hipB: number;
	kneeB: number;
}

export const NEUTRAL: Pose = {
	lean: 0,
	pitch: 4,
	shoulderF: 4,
	elbowF: 8,
	shoulderB: -4,
	elbowB: 8,
	hipF: 2,
	kneeF: 2,
	hipB: -2,
	kneeB: 2,
};

export const pose = (p: Partial<Pose>): Pose => ({...NEUTRAL, ...p});

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
	const out = {} as Pose;
	(Object.keys(a) as (keyof Pose)[]).forEach((k) => {
		out[k] = lerp(a[k], b[k], t);
	});
	return out;
};

/** 关节角度关键帧插值 */
export const poseAt = (
	frame: number,
	keys: [number, Pose][],
	easing: (t: number) => number = easeInOut,
): Pose => {
	if (frame <= keys[0][0]) {
		return keys[0][1];
	}
	for (let i = 0; i < keys.length - 1; i++) {
		const [f0, p0] = keys[i];
		const [f1, p1] = keys[i + 1];
		if (frame <= f1) {
			return lerpPose(p0, p1, easing(clamp01((frame - f0) / (f1 - f0))));
		}
	}
	return keys[keys.length - 1][1];
};

const HIP_Y = -46;
const THIGH = 23;
const SHIN = 23;
const TORSO = 36;
const UPPER_ARM = 17;
const FOREARM = 16;
const NECK = 11;
const HEAD_R = 9.5;

export interface FigureProps {
	x: number;
	y: number;
	height: number;
	/** 1 = 面朝右，-1 = 面朝左；中间值用于转身（纸片式翻转） */
	facing?: number;
	pose: Pose;
	color?: string;
	backColor?: string;
	rim?: string;
	opacity?: number;
	/** 呼吸起伏 0..1 */
	breath?: number;
}

const rot = (vx: number, vy: number, deg: number): [number, number] => {
	const a = (deg * Math.PI) / 180;
	return [vx * Math.cos(a) - vy * Math.sin(a), vx * Math.sin(a) + vy * Math.cos(a)];
};

/** 头部中心的世界坐标（用于让泪滴、气泡跟着头走） */
export const headCenter = (
	p: Pick<FigureProps, 'x' | 'y' | 'height' | 'facing'>,
	ps: Pose,
): [number, number] => {
	const s = p.height / 100;
	const f = p.facing ?? 1;
	const [sx, sy] = rot(0, -TORSO, ps.lean);
	const [hx, hy] = rot(0, -NECK, ps.lean + ps.pitch);
	return [p.x + f * (sx + hx) * s, p.y + (HIP_Y + sy + hy) * s];
};

/** 前手（靠近观众那只手）末端的世界坐标，用于让人物拿卡片、拧阀门 */
export const handPosition = (
	p: Pick<FigureProps, 'x' | 'y' | 'height' | 'facing'>,
	ps: Pose,
): [number, number] => {
	const s = p.height / 100;
	const f = p.facing ?? 1;
	const [ex, ey] = rot(0, FOREARM, -ps.elbowF);
	const [ax, ay] = rot(0 + ex, UPPER_ARM + ey, -ps.shoulderF);
	const [bx, by] = rot(ax, -TORSO + 3 + ay, ps.lean);
	return [p.x + f * bx * s, p.y + (HIP_Y + by) * s];
};

/** 走路姿态：phase 每增加 1 走一步 */
export const walkPose = (phase: number, base: Partial<Pose> = {}, stride = 1): Pose => {
	const a = Math.sin(phase * Math.PI);
	const b = Math.sin(phase * Math.PI + Math.PI);
	const lift = (v: number) => Math.max(0, -v);
	return pose({
		...base,
		hipF: (base.hipF ?? 0) + 20 * a * stride,
		kneeF: (base.kneeF ?? 0) + 6 + 26 * lift(a) * stride,
		hipB: (base.hipB ?? 0) + 20 * b * stride,
		kneeB: (base.kneeB ?? 0) + 6 + 26 * lift(b) * stride,
	});
};

/** 坐在地上：髋关节在地面高度，腿向前伸。配合 y = 地面 + SIT_DROP * 身高 使用 */
export const SIT_DROP = 0.4;
export const SIT: Partial<Pose> = {hipF: 84, kneeF: 18, hipB: 80, kneeB: 24, lean: 6};

const Leg: React.FC<{hip: number; knee: number; color: string; dx: number}> = ({
	hip,
	knee,
	color,
	dx,
}) => (
	<g transform={`translate(${dx},0) rotate(${-hip})`}>
		<line x1={0} y1={0} x2={0} y2={THIGH} stroke={color} strokeWidth={7.5} strokeLinecap="round" />
		<g transform={`translate(0,${THIGH}) rotate(${knee})`}>
			<line x1={0} y1={0} x2={0} y2={SHIN} stroke={color} strokeWidth={6.5} strokeLinecap="round" />
			<line x1={0} y1={SHIN} x2={5.5} y2={SHIN} stroke={color} strokeWidth={5} strokeLinecap="round" />
		</g>
	</g>
);

const Arm: React.FC<{shoulder: number; elbow: number; color: string}> = ({
	shoulder,
	elbow,
	color,
}) => (
	<g transform={`translate(0,${-TORSO + 3}) rotate(${-shoulder})`}>
		<line x1={0} y1={0} x2={0} y2={UPPER_ARM} stroke={color} strokeWidth={5.6} strokeLinecap="round" />
		<g transform={`translate(0,${UPPER_ARM}) rotate(${-elbow})`}>
			<line x1={0} y1={0} x2={0} y2={FOREARM} stroke={color} strokeWidth={5} strokeLinecap="round" />
		</g>
	</g>
);

const Body: React.FC<{ps: Pose; color: string; back: string; visor?: string}> = ({
	ps,
	color,
	back,
	visor,
}) => {
	const va = (a: number) => [
		Math.cos((a * Math.PI) / 180) * (HEAD_R - 1.8),
		-NECK + Math.sin((a * Math.PI) / 180) * (HEAD_R - 1.8),
	];
	const [v0x, v0y] = va(-55);
	const [v1x, v1y] = va(35);
	return (
		<g transform={`translate(0,${HIP_Y})`}>
			<Leg hip={ps.hipB} knee={ps.kneeB} color={back} dx={-1.5} />
			<g transform={`rotate(${ps.lean})`}>
				<Arm shoulder={ps.shoulderB} elbow={ps.elbowB} color={back} />
				<path
					d={`M -7 1 L 7 1 L 9.5 ${-TORSO + 8} Q 9 ${-TORSO + 1} 5 ${-TORSO} L -5 ${-TORSO} Q -9 ${-TORSO + 1} -9.5 ${-TORSO + 8} Z`}
					fill={color}
					stroke={color}
					strokeWidth={3}
					strokeLinejoin="round"
				/>
			</g>
			<Leg hip={ps.hipF} knee={ps.kneeF} color={color} dx={1.5} />
			<g transform={`rotate(${ps.lean})`}>
				<g transform={`translate(0,${-TORSO}) rotate(${ps.pitch})`}>
					<line x1={0} y1={2} x2={0} y2={-NECK + HEAD_R} stroke={color} strokeWidth={5} />
					<circle cx={0} cy={-NECK} r={HEAD_R} fill={color} />
					{visor ? (
						<path
							d={`M ${v0x} ${v0y} A ${HEAD_R - 1.8} ${HEAD_R - 1.8} 0 0 1 ${v1x} ${v1y}`}
							fill="none"
							stroke={visor}
							strokeWidth={1.5}
							strokeLinecap="round"
							opacity={0.75}
						/>
					) : null}
				</g>
				<Arm shoulder={ps.shoulderF} elbow={ps.elbowF} color={color} />
			</g>
		</g>
	);
};

export const Figure: React.FC<FigureProps> = ({
	x,
	y,
	height,
	facing = 1,
	pose: ps,
	color = '#2F4A6B',
	backColor,
	rim = '#8FB3D9',
	opacity = 1,
	breath = 0,
}) => {
	const s = height / 100;
	const sy = s * (1 + 0.008 * Math.sin(breath * Math.PI * 2));
	const back = backColor ?? color;
	return (
		<g transform={`translate(${x},${y}) scale(${facing * s},${sy})`} opacity={opacity}>
			{/* 逆光轮廓：同形状描一层亮色，向后上方错开 */}
			<g transform="translate(-1.2,-0.8)">
				<Body ps={ps} color={rim} back={rim} />
			</g>
			<Body ps={ps} color={color} back={back} visor={rim} />
		</g>
	);
};
