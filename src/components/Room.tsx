import React, {useId} from 'react';
import {lerp} from '../lib/anim';
import {C, ROOM} from '../theme';

// 贯穿全片的物件：一间会变窄的房间。
// 天花板下沉、墙往里收、可以变形成圆（天平的一端）、右墙下半段可以“打开”。

type Circle = {cx: number; cy: number; r: number};

export type RoomProps = {
	frame: number;
	ceiling: number; // 天花板下沉量（px）；天花板下沿 y = top + ceiling
	squeeze?: number; // 两侧墙向内收（px）
	morph?: number; // 0 = 房间，1 = 圆
	circle?: Circle;
	flip?: number; // 翻面时的水平缩放（1 正常）
	warmth?: number; // 室内暖光 0..1.5
	ceilingGlow?: number;
	draw?: number; // 线框描出进度 0..1
	crack?: number; // 裂缝 0..1
	wallOpen?: number; // 右墙下半段打开 0..1
	icon?: number; // 圆形背面显示的“小房间”图标 0..1
	opacity?: number;
	stroke?: string;
	outline2?: {color: string; amount: number}; // 额外描边（例如青色）
};

export const roomCeilingY = (ceiling: number) => ROOM.top + ceiling;

export const Room: React.FC<RoomProps> = ({
	frame,
	ceiling,
	squeeze = 0,
	morph = 0,
	circle = {cx: 660, cy: 450, r: 150},
	flip = 1,
	warmth = 1,
	ceilingGlow = 0,
	draw = 1,
	crack = 0,
	wallOpen = 0,
	icon = 0,
	opacity = 1,
	stroke = C.amber,
	outline2,
}) => {
	const id = useId().replace(/:/g, '');
	const l = lerp(ROOM.left + squeeze, circle.cx - circle.r, morph);
	const r = lerp(ROOM.right - squeeze, circle.cx + circle.r, morph);
	const t = lerp(ROOM.top, circle.cy - circle.r, morph);
	const b = lerp(ROOM.floor, circle.cy + circle.r, morph);
	const w = r - l;
	const h = b - t;
	const rx = lerp(14, Math.min(w, h) / 2, morph);
	const cx = (l + r) / 2;
	const cy = (t + b) / 2;
	const roomness = 1 - morph;
	const ceilY = roomCeilingY(ceiling);
	const breathe = 1 + 0.04 * Math.sin(frame / 22);

	const crackLen = 1 - crack;

	return (
		<g opacity={opacity} transform={`translate(${cx} ${cy}) scale(${flip} 1) translate(${-cx} ${-cy})`}>
			<defs>
				<radialGradient id={`warm-${id}`} cx="50%" cy="78%" r="70%">
					<stop offset="0%" stopColor={C.amber} stopOpacity={0.26 * warmth * breathe} />
					<stop offset="55%" stopColor={C.amber} stopOpacity={0.08 * warmth} />
					<stop offset="100%" stopColor={C.amber} stopOpacity={0} />
				</radialGradient>
				<pattern id={`hatch-${id}`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2="18" stroke={C.amber} strokeOpacity="0.09" strokeWidth="2" />
				</pattern>
				<clipPath id={`clip-${id}`}>
					<rect x={l} y={t} width={w} height={h} rx={rx} />
				</clipPath>
				<mask id={`mask-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
					<rect x="-500" y="-500" width="3000" height="2200" fill="white" />
					<rect x={r - 12} y={ceilY + 2} width="24" height={b - ceilY - 2 + 12} fill="black" opacity={wallOpen * roomness} />
				</mask>
				<filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="9" />
				</filter>
			</defs>

			{/* 外发光 */}
			<rect x={l} y={t} width={w} height={h} rx={rx} fill="none" stroke={stroke} strokeWidth={16} opacity={0.16 * draw} filter={`url(#glow-${id})`} />
			{/* 室内 */}
			<rect x={l} y={t} width={w} height={h} rx={rx} fill="#17181D" opacity={draw} />
			<rect x={l} y={t} width={w} height={h} rx={rx} fill={`url(#warm-${id})`} opacity={draw} />

			<g clipPath={`url(#clip-${id})`} opacity={roomness * draw}>
				{/* 被压缩掉的空间 */}
				<rect x={l} y={t} width={w} height={Math.max(0, ceilY - 26 - t)} fill={C.bgDeep} opacity={0.88} />
				<rect x={l} y={t} width={w} height={Math.max(0, ceilY - 26 - t)} fill={`url(#hatch-${id})`} />
				{/* 天花板 */}
				<rect x={l} y={ceilY - 26} width={w} height={26} fill={C.slab} />
				<line x1={l} y1={ceilY} x2={r} y2={ceilY} stroke={stroke} strokeWidth={3} />
				<line x1={l} y1={ceilY} x2={r} y2={ceilY} stroke={stroke} strokeWidth={14} opacity={0.35 * ceilingGlow} filter={`url(#glow-${id})`} />
				{/* 裂缝 */}
				{crack > 0 ? (
					<g fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
						<path d={`M ${l + 4} ${ceilY + 2} l 34 26 l -8 30 l 26 34 l -6 28`} pathLength={1} strokeDasharray="1" strokeDashoffset={crackLen} />
						<path d={`M ${r - 4} ${ceilY + 2} l -28 22 l 10 34 l -30 26`} pathLength={1} strokeDasharray="1" strokeDashoffset={crackLen} />
						<path d={`M ${cx + 60} ${ceilY} l 8 22 l -14 18`} pathLength={1} strokeDasharray="1" strokeDashoffset={crackLen} />
					</g>
				) : null}
			</g>

			{/* 背面图标：一个小房间 */}
			{icon > 0 ? (
				<g opacity={icon} stroke={stroke} strokeWidth={4} fill="none">
					<rect x={cx - 56} y={cy - 46} width={112} height={92} rx={8} />
					<line x1={cx - 56} y1={cy - 6} x2={cx + 56} y2={cy - 6} />
					<rect x={cx - 56} y={cy - 46} width={112} height={40} rx={8} fill={C.amber} fillOpacity={0.12} stroke="none" />
				</g>
			) : null}

			{/* 线框 */}
			<g mask={`url(#mask-${id})`}>
				<rect x={l} y={t} width={w} height={h} rx={rx} fill="none" stroke={stroke} strokeWidth={3.5} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
			</g>
			{wallOpen > 0 && roomness > 0 ? (
				<line x1={r} y1={ceilY + 6} x2={r} y2={b} stroke={stroke} strokeWidth={3} strokeDasharray="10 12" opacity={0.5 * wallOpen * roomness} />
			) : null}
			{outline2 && outline2.amount > 0 ? (
				<rect x={l - 10} y={t - 10} width={w + 20} height={h + 20} rx={rx + 10} fill="none" stroke={outline2.color} strokeWidth={3} opacity={outline2.amount} />
			) : null}
		</g>
	);
};
