import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT_FAMILY, LAYOUT} from '../theme';
import {slopeY} from './Landscape';

// 左上角的研究/出处标签（屏幕空间，远离右侧禁字带和水印区）
export const Label: React.FC<{text: string; sub?: string; frame: number; start: number; end: number; subStart?: number}> = ({
	text,
	sub,
	frame,
	start,
	end,
	subStart,
}) => {
	const o = interpolate(frame, [start, start + 10, end - 10, end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	if (o <= 0) return null;
	const so = sub && subStart !== undefined ? interpolate(frame, [subStart, subStart + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
	const slide = (1 - Math.min(1, (frame - start) / 10)) * -24;
	return (
		<div
			style={{
				position: 'absolute',
				left: 120,
				top: 110,
				maxWidth: LAYOUT.impactRight - 120,
				opacity: o,
				transform: `translateX(${slide}px)`,
				fontFamily: FONT_FAMILY,
				color: '#FFFFFF',
				textShadow: '0 2px 10px rgba(0,0,0,0.7)',
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 32, fontWeight: 700, letterSpacing: 1}}>
				<div style={{width: 5, height: 34, background: C.gold, borderRadius: 3}} />
				{text}
			</div>
			{sub ? <div style={{marginTop: 10, marginLeft: 19, fontSize: 28, fontWeight: 700, opacity: so * 0.9}}>{sub}</div> : null}
		</div>
	);
};

// 右上角固定水印：在镜头运动之外，全程同一位置，不随镜头缩放
export const Watermark: React.FC = () => (
	<div
		style={{
			position: 'absolute',
			top: 36,
			right: 44,
			padding: '5px 12px',
			border: '1px solid #FFFFFF',
			color: '#FFFFFF',
			fontFamily: FONT_FAMILY,
			fontWeight: 700,
			fontSize: 22,
			lineHeight: 1.2,
			letterSpacing: 2,
			opacity: 0.35,
			pointerEvents: 'none',
		}}
	>
		肆号静匣Logos
	</div>
);

// 沿坡面蔓延的黑：从 x0 漫到 front，顶面微微起伏（世界坐标）
export const BlackFlood: React.FC<{x0: number; front: number; frame: number; depth?: number; opacity?: number}> = ({
	x0,
	front,
	frame,
	depth = 16,
	opacity = 1,
}) => {
	if (front <= x0 + 2) return null;
	const pts: string[] = [];
	const n = Math.max(4, Math.ceil((front - x0) / 30));
	for (let i = 0; i <= n; i++) {
		const x = x0 + ((front - x0) * i) / n;
		const edge = Math.min(1, (front - x) / 60);
		const y = slopeY(x) - depth * edge - Math.sin(x / 40 + frame / 9) * 3 * edge;
		pts.push(`${x},${y}`);
	}
	// 只是贴在坡面上的一层黑，不往地面以下画（否则在深色地面上会像一块黑砖）
	const bottom = [`${front},${slopeY(front) + 4}`, `${x0},${slopeY(x0) + 4}`];
	return (
		<g opacity={opacity}>
			<polygon points={[...pts, ...bottom].join(' ')} fill="#020204" />
			<polyline points={pts.join(' ')} fill="none" stroke={C.blue} strokeWidth={2} opacity={0.25} />
		</g>
	);
};

// 从石头裂缝里射出的光束（世界坐标，围绕 cx, cy 缓慢旋转）
export const LightRays: React.FC<{cx: number; cy: number; amount: number; frame: number; len?: number}> = ({cx, cy, amount, frame, len = 1400}) => {
	if (amount <= 0) return null;
	return (
		<g opacity={amount}>
			{Array.from({length: 14}).map((_, i) => {
				const a = (i / 14) * Math.PI * 2 + frame / 240 + random(`ray${i}`) * 0.3;
				const w = 0.035 + random(`rw${i}`) * 0.05;
				const l = len * (0.6 + random(`rl${i}`) * 0.4);
				const p1 = `${cx + Math.cos(a - w) * l},${cy + Math.sin(a - w) * l}`;
				const p2 = `${cx + Math.cos(a + w) * l},${cy + Math.sin(a + w) * l}`;
				return <polygon key={i} points={`${cx},${cy} ${p1} ${p2}`} fill={C.gold} opacity={0.1 + random(`ro${i}`) * 0.1} />;
			})}
			<circle cx={cx} cy={cy} r={len * 0.18} fill={C.gold} opacity={0.18} />
		</g>
	);
};

// 一群黑色粒子：从 from 区域出发，绕着 center 打转；freeze 后停住；fall 后落地消失（世界坐标）
export const Swarm: React.FC<{
	frame: number;
	start: number;
	from: {x: number; y: number};
	center: {x: number; y: number};
	freezeAt?: number;
	fallAt?: number;
	groundY?: number;
	count?: number;
	seed?: string;
}> = ({frame, start, from, center, freezeAt = 1e9, fallAt = 1e9, groundY = 900, count = 90, seed = 'sw'}) => {
	if (frame < start) return null;
	const tf = Math.min(frame, freezeAt) - start;
	return (
		<g>
			{Array.from({length: count}).map((_, i) => {
				const d = random(`${seed}d${i}`) * 26;
				const p = Math.min(1, Math.max(0, (tf - d) / 36));
				const ease = 1 - Math.pow(1 - p, 3);
				const ang = random(`${seed}a${i}`) * Math.PI * 2 + tf * (0.03 + random(`${seed}s${i}`) * 0.05) * (i % 2 ? 1 : -1);
				const rad = 70 + random(`${seed}r${i}`) * 170;
				const ox = from.x + (random(`${seed}x${i}`) - 0.5) * 300;
				const oy = from.y + (random(`${seed}y${i}`) - 0.5) * 60;
				let x = ox + (center.x + Math.cos(ang) * rad - ox) * ease;
				let y = oy + (center.y + Math.sin(ang) * rad * 0.7 - oy) * ease;
				if (frame >= freezeAt) {
					x += Math.sin(frame / 7 + i) * 1.5;
					y += Math.cos(frame / 9 + i) * 1.5;
				}
				let o = Math.min(1, p * 3);
				if (frame >= fallAt) {
					const ft = Math.min(1, (frame - fallAt) / 16);
					y += (groundY - y) * ft * ft;
					o *= 1 - ft;
				}
				const r = 4 + random(`${seed}z${i}`) * 7;
				return (
					<g key={i} opacity={o}>
						<circle cx={x} cy={y} r={r + 2} fill={C.blue} opacity={0.18} />
						<circle cx={x} cy={y} r={r} fill="#020205" />
					</g>
				);
			})}
		</g>
	);
};
