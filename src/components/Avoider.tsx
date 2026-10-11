/**
 * 贯穿全片的物件：主角 TA 本人 + 胸口的心跳 + 脚下的冰环（防御）。
 * - 冰环可以：一圈圈弹出、结霜、加厚、炸开铺满舞台（spread）、升起成冰墙（rise）、收紧（tighten）
 * - 人物可以：从小孩长大（age）、转身（facing）、换姿势（pose）
 * - 心跳强度来自共享节拍轨（画面与心跳音效同步）
 * 世界坐标，地面 y=0。
 */
import React from 'react';
import {Person, Pose, Face, PAL, Palette} from './Person';
import {LIGHT} from './Stage';
import {clamp, lerp, rand} from '../lib/anim';

export type RingState = {
	count: number; // 圈数（可为小数，弹出过程）
	r?: number; // 第一圈半径（世界单位）
	gap?: number; // 圈距
	frost?: number; // 霜 0..1
	thick?: number; // 线宽
	rise?: number; // 升起成冰墙 0..1
	riseH?: number; // 冰墙高度
	spread?: number; // 炸开倍数
	tighten?: number; // 收紧到脚下 0..1
	opacity?: number;
	spin?: number; // 缺口旋转（帧相关）
};

const RY = 0.2; // 地面椭圆的纵横比（伪透视）

const ringGeom = (R: RingState, i: number) => {
	const r = R.r ?? 150;
	const gap = R.gap ?? 42;
	const nominal = (r + gap * i) * (R.spread ?? 1);
	const tight = lerp(nominal, r * 0.55 + i * 10, R.tighten ?? 0);
	const appear = clamp(R.count - i);
	const rx = tight * lerp(1.4, 1, appear);
	return {rx, ry: rx * RY, appear};
};

export const IceRings: React.FC<{x: number; R: RingState; half: 'back' | 'front'; frame: number}> = ({x, R, half, frame}) => {
	const n = Math.ceil(R.count);
	const els: React.ReactNode[] = [];
	const op = R.opacity ?? 1;
	if (op <= 0.01 || n <= 0) return null;
	for (let i = 0; i < n; i++) {
		const {rx, ry, appear} = ringGeom(R, i);
		if (appear <= 0) continue;
		const a = appear * op * (1 - i * 0.14);
		const w = (R.thick ?? 4) * (1 - i * 0.15);
		const d = half === 'back' ? `M ${x - rx} 0 A ${rx} ${ry} 0 0 1 ${x + rx} 0` : `M ${x + rx} 0 A ${rx} ${ry} 0 0 1 ${x - rx} 0`;
		const circ = Math.PI * rx;
		const dashOff = ((R.spin ?? 0) * (i % 2 ? -1 : 1) * (1 + i * 0.4)) % (circ * 2);
		els.push(
			<g key={i}>
				{/* 柔光底 */}
				<path d={d} fill="none" stroke={LIGHT.ice} strokeWidth={w * 5} opacity={a * 0.12} strokeLinecap="round" />
				<path
					d={d}
					fill="none"
					stroke={LIGHT.ice}
					strokeWidth={w}
					opacity={a * 0.85}
					strokeLinecap="round"
					strokeDasharray={i === 0 ? undefined : `${circ * 0.42} ${circ * 0.08}`}
					strokeDashoffset={dashOff}
				/>
			</g>
		);
		// 霜：环外侧的短刺
		const frost = (R.frost ?? 0) * appear;
		if (frost > 0.02 && i === n - 1) {
			for (let k = 0; k < 40; k++) {
				const t = (k / 40) * Math.PI * 2 + rand(k) * 0.08;
				const s = Math.sin(t);
				if ((half === 'back') !== s < 0) continue;
				const len = (10 + rand(k + 3) * 18) * frost;
				const px = x + Math.cos(t) * (rx + 6);
				const py = s * (ry + 2);
				els.push(
					<line key={`f${k}`} x1={px} y1={py} x2={px + Math.cos(t) * len * 0.6} y2={py - len} stroke={LIGHT.ice} strokeWidth={2} opacity={frost * op * 0.6} strokeLinecap="round" />
				);
			}
		}
		// 冰墙（只在前景画一次半透明面，避免遮挡关系错乱）
		const rise = R.rise ?? 0;
		if (rise > 0.01 && half === 'front') {
			const H = (R.riseH ?? 520) * rise * (1 - i * 0.08);
			els.push(
				<g key={`w${i}`} opacity={a}>
					<defs>
						<linearGradient id={`wall-${i}`} x1="0" y1="1" x2="0" y2="0">
							<stop offset="0%" stopColor={LIGHT.ice} stopOpacity={0.22} />
							<stop offset="100%" stopColor={LIGHT.ice} stopOpacity={0} />
						</linearGradient>
					</defs>
					<rect x={x - rx} y={-H} width={rx * 2} height={H} fill={`url(#wall-${i})`} />
					<line x1={x - rx} y1={0} x2={x - rx} y2={-H} stroke={LIGHT.ice} strokeWidth={w * 0.8} opacity={0.5} />
					<line x1={x + rx} y1={0} x2={x + rx} y2={-H} stroke={LIGHT.ice} strokeWidth={w * 0.8} opacity={0.5} />
					<ellipse cx={x} cy={-H} rx={rx} ry={ry} fill="none" stroke={LIGHT.ice} strokeWidth={w * 0.6} opacity={0.35} />
				</g>
			);
		}
	}
	return <g>{els}</g>;
};

export type AvoiderProps = {
	x: number;
	frame: number;
	beat: number;
	age?: number;
	scale?: number;
	facing?: number;
	pose?: Pose;
	face?: Face;
	heartGlow?: number;
	heartScale?: number;
	opacity?: number;
	rings?: RingState;
	reflection?: boolean;
	palette?: Palette;
};

export const Avoider: React.FC<AvoiderProps> = ({
	x,
	frame,
	beat,
	age = 1,
	scale = 1.3,
	facing = 1,
	pose,
	face = 'neutral',
	heartGlow = 1,
	heartScale = 1,
	opacity = 1,
	rings = {count: 0},
	reflection = true,
	palette = PAL.cool,
}) => {
	const pal = age < 0.5 ? PAL.kid : palette;
	return (
		<g opacity={opacity}>
			{reflection && (
				<g transform="scale(1 -1)" opacity={0.13}>
					<Person x={x} scale={scale} facing={facing} pose={pose} palette={pal} age={age} face="none" heart={-1} />
				</g>
			)}
			<IceRings x={x} R={rings} half="back" frame={frame} />
			<Person x={x} scale={scale} facing={facing} pose={pose} palette={pal} age={age} face={face} heart={beat} heartGlow={heartGlow} heartScale={heartScale} />
			<IceRings x={x} R={rings} half="front" frame={frame} />
		</g>
	);
};

/** 配角（妈妈 / 想靠近的人），带倒影 */
export const Actor: React.FC<React.ComponentProps<typeof Person> & {reflection?: boolean}> = ({reflection = true, ...p}) => (
	<g opacity={p.opacity ?? 1}>
		{reflection && (
			<g transform="scale(1 -1)" opacity={0.13}>
				<Person {...p} opacity={1} face="none" heart={-1} />
			</g>
		)}
		<Person {...p} opacity={1} />
	</g>
);
