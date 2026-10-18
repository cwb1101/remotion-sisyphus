// 贯穿全片的物件: 一只白瓷杯
// 杯里的液体始终保持水平 (杯子倾斜时液面不跟着歪), 可以 满 空 溢出 晃动 带附着标签 金光
// 以后的节会用到 cracks (裂纹) kintsugi (金缮) 这两个参数
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../theme';
import {useRenderMode} from './Character';

export const CUP = {h: 70, top: 64, bottom: 48};

export type CupProps = {
	id: string;
	/** 杯底中心 (世界坐标) */
	x: number;
	y: number;
	scale?: number;
	/** 倾斜角度 (度), 正 = 往右倒 */
	tilt?: number;
	/** 液面高度 0..1 */
	fill?: number;
	liquid?: string;
	/** 液面晃动幅度 0..1 */
	wobble?: number;
	/** 空杯内壁留下的一圈痕 */
	stain?: number;
	label?: string;
	labelSize?: number;
	/** 金色闪光 0..1 */
	glint?: number;
	opacity?: number;
	cracks?: number;
	kintsugi?: number;
};

const rot = (x: number, y: number, deg: number) => {
	const a = (deg * Math.PI) / 180;
	return {x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a)};
};

/** 杯口 (倾倒时液体流出的那一侧) 的世界坐标 */
export const cupLip = (c: Pick<CupProps, 'x' | 'y' | 'scale' | 'tilt'>) => {
	const s = c.scale ?? 1;
	const tilt = c.tilt ?? 0;
	const side = tilt >= 0 ? 1 : -1;
	const p = rot((side * CUP.top) / 2, -CUP.h, tilt);
	return {x: c.x + p.x * s, y: c.y + p.y * s};
};

/** 杯身正中 (世界坐标), 手扶杯子时用 */
export const cupSide = (c: Pick<CupProps, 'x' | 'y' | 'scale' | 'tilt'>, side: 1 | -1, height = 0.45) => {
	const s = c.scale ?? 1;
	const w = CUP.bottom / 2 + ((CUP.top - CUP.bottom) / 2) * height;
	const p = rot(side * (w + 4), -CUP.h * height, c.tilt ?? 0);
	return {x: c.x + p.x * s, y: c.y + p.y * s};
};

export const Cup: React.FC<CupProps> = (c) => {
	const frame = useCurrentFrame();
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const s = c.scale ?? 1;
	const tilt = c.tilt ?? 0;
	const fill = Math.max(0, Math.min(1.08, c.fill ?? 0));
	const {h, top, bottom} = CUP;
	const wall = 4;

	// 杯身轮廓 (本地坐标, 杯底中心为原点, 往上为负)
	const body = `M ${-bottom / 2} 0 Q ${-bottom / 2 - 2} ${-h * 0.5} ${-top / 2} ${-h} L ${top / 2} ${-h} Q ${bottom / 2 + 2} ${-h * 0.5} ${bottom / 2} 0 Q 0 6 ${-bottom / 2} 0 Z`;
	const inner = `M ${-bottom / 2 + wall} ${-wall} Q ${-bottom / 2 + wall - 2} ${-h * 0.5} ${-top / 2 + wall} ${-h + 2} L ${top / 2 - wall} ${-h + 2} Q ${bottom / 2 - wall + 2} ${-h * 0.5} ${bottom / 2 - wall} ${-wall} Z`;

	// 液面: 世界里是水平的. 杯子倾斜时, 液面到杯底中心的竖直距离按 cos 缩
	const innerH = h - wall - 2;
	const levelLocal = innerH * fill;
	const tiltRad = (tilt * Math.PI) / 180;
	const surfaceY = -(levelLocal + wall) * Math.cos(tiltRad);
	const wob = (c.wobble ?? 0) * 6;
	const waves: string[] = [];
	for (let i = 0; i <= 16; i++) {
		const x = -80 + i * 10;
		const y = surfaceY + Math.sin(frame * 0.35 + i * 0.9) * wob * (0.4 + 0.6 * Math.sin(i * 0.5) ** 2);
		waves.push(`${x},${y}`);
	}
	const liquidPath = `M -80 40 L ${waves.join(' L ')} L 80 40 Z`;
	const liquid = c.liquid ?? COLORS.liquidHero;
	const clipId = `cup-clip-${c.id}`;

	return (
		<g transform={`translate(${c.x} ${c.y}) scale(${s})`} opacity={c.opacity ?? 1}>
			<defs>
				<clipPath id={clipId}>
					<path d={inner} transform={`rotate(${tilt})`} />
				</clipPath>
				<linearGradient id={`${clipId}-shade`} x1="0" x2="1" y1="0" y2="0">
					<stop offset="0" stopColor={COLORS.cupShade} />
					<stop offset="0.35" stopColor={COLORS.cup} />
					<stop offset="1" stopColor="#8F887C" />
				</linearGradient>
			</defs>
			{c.glint ? <circle cx={0} cy={-h / 2} r={60 + 40 * c.glint} fill={COLORS.gold} opacity={0.18 * c.glint} /> : null}
			<g transform={`rotate(${tilt})`}>
				<path d={body} fill={`url(#${clipId}-shade)`} />
				<path d={inner} fill="#3A332B" />
			</g>
			{fill > 0.001 ? <path d={liquidPath} fill={liquid} clipPath={`url(#${clipId})`} /> : null}
			{c.stain ? (
				<g transform={`rotate(${tilt})`} opacity={c.stain}>
					<path d={`M ${-top / 2 + wall + 2} ${-h * 0.55} Q 0 ${-h * 0.52} ${top / 2 - wall - 2} ${-h * 0.55}`} stroke={liquid} strokeWidth={2.5} fill="none" opacity={0.7} />
				</g>
			) : null}
			<g transform={`rotate(${tilt})`}>
				<ellipse cx={0} cy={-h} rx={top / 2} ry={5} fill="none" stroke={COLORS.ivory} strokeWidth={2.2} />
				<path d={`M ${-top / 2 + 6} ${-h + 10} Q ${-bottom / 2 + 2} ${-h * 0.45} ${-bottom / 2 + 6} -8`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3} fill="none" />
				{c.label ? (
					<text
						x={0}
						y={-h * 0.36}
						textAnchor="middle"
						fontFamily={FONTS.sans}
						fontWeight={500}
						fontSize={c.labelSize ?? 15}
						fill="#5C4A33"
					>
						{c.label}
					</text>
				) : null}
			</g>
			{c.glint ? (
				<g transform={`translate(${top / 2 - 6} ${-h - 4}) scale(${c.glint})`} fill={COLORS.gold}>
					<path d="M 0 -14 L 3 -3 L 14 0 L 3 3 L 0 14 L -3 3 L -14 0 L -3 -3 Z" />
				</g>
			) : null}
		</g>
	);
};

/** 倒水的液柱: 从 from 到 to 的一道抛物线, 粗细随流量变 */
export const PourStream: React.FC<{from: {x: number; y: number}; to: {x: number; y: number}; flow: number; color?: string}> = ({from, to, flow, color}) => {
	const frame = useCurrentFrame();
	const mode = useRenderMode();
	if (mode !== 'normal' || flow <= 0.01) return null;
	const cx = from.x + (to.x - from.x) * 0.25;
	const cy = from.y - 12;
	const w = 2 + 6 * flow;
	const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
	return (
		<g>
			<path d={d} stroke={color ?? COLORS.liquidHero} strokeWidth={w} fill="none" strokeLinecap="round" />
			<path d={d} stroke="#F2A58F" strokeOpacity={0.5} strokeWidth={w * 0.3} fill="none" strokeDasharray="10 16" strokeDashoffset={-frame * 6} />
		</g>
	);
};

/** 一滴液体 */
export const Drop: React.FC<{x: number; y: number; r?: number; color?: string}> = ({x, y, r = 5, color}) => {
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	return <path d={`M ${x} ${y - r * 1.8} Q ${x + r} ${y - r * 0.2} ${x} ${y + r} Q ${x - r} ${y - r * 0.2} ${x} ${y - r * 1.8} Z`} fill={color ?? COLORS.liquidHero} />;
};
