import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT_FAMILY} from '../theme';

// 第三、四节里的"示意图"元素：思绪泡、几何白熊、小铃、计时圆环、情绪波纹、词卡。全部是屏幕坐标。

export const pop = (frame: number, at: number, len = 10) => {
	const t = (frame - at) / len;
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	return 1 + Math.sin(t * Math.PI) * 0.25 * (1 - t) - (1 - t) * (1 - t);
};

export const Bubble: React.FC<{cx: number; cy: number; r: number; color?: string; opacity?: number; tail?: boolean}> = ({
	cx,
	cy,
	r,
	color = '#FFFFFF',
	opacity = 1,
	tail = true,
}) => (
	<g opacity={opacity}>
		<circle cx={cx} cy={cy} r={r} fill="#FFFFFF" fillOpacity={0.03} stroke={color} strokeWidth={3} strokeOpacity={0.7} />
		{tail ? (
			<>
				<circle cx={cx - r * 0.78} cy={cy + r * 0.95} r={r * 0.1} fill="none" stroke={color} strokeWidth={3} strokeOpacity={0.6} />
				<circle cx={cx - r * 1.02} cy={cy + r * 1.22} r={r * 0.06} fill="none" stroke={color} strokeWidth={3} strokeOpacity={0.5} />
			</>
		) : null}
	</g>
);

// 几何白熊（圆头、圆耳、椭圆身子），crossed = 被划掉
export const Bear: React.FC<{x: number; y: number; s: number; crossed?: number; opacity?: number}> = ({x, y, s, crossed = 0, opacity = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
		<ellipse cx={0} cy={34} rx={42} ry={30} fill="#E6E8EF" />
		<circle cx={-26} cy={-30} r={13} fill="#E6E8EF" />
		<circle cx={26} cy={-30} r={13} fill="#E6E8EF" />
		<circle cx={0} cy={-6} r={34} fill="#E6E8EF" />
		<ellipse cx={0} cy={6} rx={12} ry={9} fill="#C9CCD6" />
		<circle cx={0} cy={2} r={4} fill="#2A2D38" />
		{crossed > 0 ? (
			<line x1={-56} y1={58} x2={-56 + 112 * crossed} y2={58 - 112 * crossed} stroke={C.blue} strokeWidth={8} strokeLinecap="round" />
		) : null}
	</g>
);

export const Bell: React.FC<{x: number; y: number; glow: number; swing: number}> = ({x, y, glow, swing}) => (
	<g transform={`translate(${x} ${y}) rotate(${swing})`}>
		<circle cx={0} cy={6} r={34} fill={C.gold} opacity={0.25 * glow} />
		<path d="M -20 14 Q -20 -22 0 -24 Q 20 -22 20 14 L 26 20 L -26 20 Z" fill={glow > 0.05 ? C.gold : '#5A6078'} opacity={0.5 + 0.5 * glow} />
		<circle cx={0} cy={25} r={5} fill={glow > 0.05 ? C.gold : '#5A6078'} />
		<line x1={0} y1={-24} x2={0} y2={-32} stroke="#5A6078" strokeWidth={3} />
	</g>
);

export const TimerRing: React.FC<{x: number; y: number; r: number; progress: number; opacity?: number}> = ({x, y, r, progress, opacity = 1}) => {
	const a = progress * Math.PI * 2 - Math.PI / 2;
	const large = progress > 0.5 ? 1 : 0;
	return (
		<g opacity={opacity}>
			<circle cx={x} cy={y} r={r} fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={8} />
			{progress > 0.001 ? (
				<path
					d={`M ${x} ${y - r} A ${r} ${r} 0 ${large} 1 ${x + Math.cos(a) * r} ${y + Math.sin(a) * r}`}
					fill="none"
					stroke="#FFFFFF"
					strokeOpacity={0.75}
					strokeWidth={8}
					strokeLinecap="round"
				/>
			) : null}
			<line x1={x} y1={y} x2={x + Math.cos(a) * r * 0.6} y2={y + Math.sin(a) * r * 0.6} stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
		</g>
	);
};

// 情绪"警报"波纹：从中心不断外扩。calm 0→1：幅度变小、变慢、颜色从冷蓝褪成中性灰
export const Ripples: React.FC<{x: number; y: number; frame: number; calm: number; maxR?: number}> = ({x, y, frame, calm, maxR = 440}) => {
	const period = 22 + calm * 30;
	const R = maxR * (1 - calm * 0.65);
	const col = calm < 0.5 ? C.blue : '#8C8983';
	return (
		<g>
			{Array.from({length: 7}).map((_, i) => {
				const ph = ((frame / period + i / 7) % 1 + 1) % 1;
				return (
					<circle
						key={i}
						cx={x}
						cy={y}
						r={30 + ph * R}
						fill="none"
						stroke={calm < 0.5 ? C.blue : col}
						strokeWidth={4 - ph * 2.5}
						opacity={(1 - ph) * (0.75 - calm * 0.35)}
					/>
				);
			})}
			<circle cx={x} cy={y} r={26 - calm * 8} fill={calm < 0.5 ? C.blue : col} opacity={0.5 - calm * 0.2} />
		</g>
	);
};

export const WordCard: React.FC<{text: string; x: number; y: number; scale?: number; opacity?: number; rot?: number}> = ({
	text,
	x,
	y,
	scale = 1,
	opacity = 1,
	rot = 0,
}) => (
	<div
		style={{
			position: 'absolute',
			left: x - 110,
			top: y - 52,
			width: 220,
			height: 104,
			borderRadius: 16,
			background: '#F4F1EA',
			color: '#14161E',
			fontFamily: FONT_FAMILY,
			fontWeight: 900,
			fontSize: 56,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			letterSpacing: 4,
			opacity,
			transform: `scale(${scale}) rotate(${rot}deg)`,
			boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
		}}
	>
		{text}
	</div>
);

// 屏幕空间的抽象面板底色（暗盒/石头内部），带轻微的网格感和暗角
export const Panel: React.FC<{color?: string; opacity?: number; frame: number}> = ({color = '#0C0F18', opacity = 1, frame}) => (
	<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity}}>
		<defs>
			<radialGradient id="panel-vig" cx="50%" cy="45%" r="75%">
				<stop offset="0" stopColor="#FFFFFF" stopOpacity={0.05} />
				<stop offset="1" stopColor="#000000" stopOpacity={0.5} />
			</radialGradient>
		</defs>
		<rect width={1920} height={1080} fill={color} />
		{Array.from({length: 22}).map((_, i) => (
			<line key={i} x1={(i * 96 + frame * 0.3) % 1920} y1={0} x2={(i * 96 + frame * 0.3) % 1920} y2={1080} stroke="#FFFFFF" strokeOpacity={0.025} />
		))}
		<rect width={1920} height={1080} fill="url(#panel-vig)" />
		{Array.from({length: 30}).map((_, i) => (
			<circle
				key={`d${i}`}
				cx={(random(`pd${i}`) * 1920 + frame * 0.4 * (0.5 + random(`ps${i}`))) % 1920}
				cy={(random(`py${i}`) * 1080 - frame * 0.3 + 1080) % 1080}
				r={1.5}
				fill="#AEB7D6"
				opacity={0.25}
			/>
		))}
	</svg>
);

export const clampI = (f: number, a: number, b: number, v0: number, v1: number) =>
	interpolate(f, [a, b], [v0, v1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
