import React, {useId} from 'react';
import {random} from 'remotion';
import {lerp} from '../lib/anim';
import {C, DOOR} from '../theme';

// 右侧禁字区里的门：未知的路。只有光和雾，没有字。

type Circle = {cx: number; cy: number; r: number};

export type DoorProps = {
	frame: number;
	open: number; // 0 = 一道缝，1 = 全开
	light?: number; // 门光强度 0..1
	fog?: number; // 门内雾粒子 0..1
	spill?: number; // 地面与室内的光照范围 0..1
	morph?: number; // 0 = 门，1 = 圆
	circle?: Circle;
	flip?: number;
	opacity?: number;
};

const FOG = 46;

export const Door: React.FC<DoorProps> = ({
	frame,
	open,
	light = 1,
	fog = 1,
	spill = 1,
	morph = 0,
	circle = {cx: 1260, cy: 450, r: 150},
	flip = 1,
	opacity = 1,
}) => {
	const id = useId().replace(/:/g, '');
	const dw = lerp(6, DOOR.width, open);
	const l = lerp(DOOR.cx - dw / 2, circle.cx - circle.r, morph);
	const r = lerp(DOOR.cx + dw / 2, circle.cx + circle.r, morph);
	const t = lerp(DOOR.top, circle.cy - circle.r, morph);
	const b = lerp(DOOR.floor, circle.cy + circle.r, morph);
	const w = r - l;
	const h = b - t;
	const rx = lerp(3, Math.min(w, h) / 2, morph);
	const cx = (l + r) / 2;
	const cy = (t + b) / 2;
	const doorness = 1 - morph;
	const flicker = 0.92 + 0.08 * Math.sin(frame / 9) * Math.sin(frame / 23);
	const L = light * flicker;

	return (
		<g opacity={opacity}>
			<defs>
				<linearGradient id={`fill-${id}`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor={C.cyan} stopOpacity={0.55} />
					<stop offset="50%" stopColor="#D9FBFC" stopOpacity={0.95} />
					<stop offset="100%" stopColor={C.cyan} stopOpacity={0.55} />
				</linearGradient>
				<linearGradient id={`cone-${id}`} x1="1" y1="0" x2="0" y2="0">
					<stop offset="0%" stopColor={C.cyan} stopOpacity={0.2} />
					<stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
				</linearGradient>
				<radialGradient id={`pool-${id}`} cx="100%" cy="50%" r="100%">
					<stop offset="0%" stopColor={C.cyan} stopOpacity={0.32} />
					<stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
				</radialGradient>
				<filter id={`glow-${id}`} x="-100%" y="-30%" width="300%" height="160%">
					<feGaussianBlur stdDeviation="18" />
				</filter>
				<clipPath id={`clip-${id}`}>
					<rect x={l} y={t} width={w} height={h} rx={rx} />
				</clipPath>
			</defs>

			{/* 光锥与地面光池：照向左侧 */}
			<g opacity={spill * L * doorness}>
				<polygon points={`${l},${t + 20} ${l},${b} ${l - 640 * (0.4 + 0.6 * open)},${b} ${l - 640 * (0.4 + 0.6 * open)},${t + 260}`} fill={`url(#cone-${id})`} />
				<ellipse cx={l} cy={b} rx={560 * (0.4 + 0.6 * open)} ry={46} fill={`url(#pool-${id})`} />
			</g>

			<g transform={`translate(${cx} ${cy}) scale(${flip} 1) translate(${-cx} ${-cy})`}>
				{/* 光晕 */}
				<rect x={l - 10} y={t} width={w + 20} height={h} rx={rx} fill={C.cyan} opacity={0.45 * L} filter={`url(#glow-${id})`} />
				<rect x={l} y={t} width={w} height={h} rx={rx} fill={`url(#fill-${id})`} opacity={0.35 + 0.65 * L} />
				{/* 雾：缓慢上升、左右飘 */}
				<g clipPath={`url(#clip-${id})`} opacity={fog}>
					{new Array(FOG).fill(0).map((_, i) => {
						const sx = random(`fog-x-${i}`);
						const speed = 0.4 + random(`fog-s-${i}`) * 0.9;
						const yy = b - (((frame * speed + random(`fog-y-${i}`) * h) % h) + 0);
						const xx = l + sx * w + Math.sin(frame / 30 + i) * 10;
						const rr = 10 + random(`fog-r-${i}`) * 26;
						return <circle key={i} cx={xx} cy={yy} r={rr} fill="#FFFFFF" opacity={0.12 + 0.12 * random(`fog-o-${i}`)} />;
					})}
				</g>
				<rect x={l} y={t} width={w} height={h} rx={rx} fill="none" stroke={C.cyan} strokeWidth={3} opacity={0.9} />
			</g>
		</g>
	);
};
