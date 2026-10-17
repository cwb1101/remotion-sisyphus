import React from 'react';
import {rand} from '../lib/anim';
import {COLORS} from '../theme';

// 缓慢漂浮的尘埃 让画面一直有细微运动
export const Dust: React.FC<{frame: number; seed?: number; count?: number; color?: string; area?: {x: number; y: number; w: number; h: number}; opacity?: number}> = ({
	frame,
	seed = 1,
	count = 60,
	color = COLORS.warm,
	area = {x: -200, y: -100, w: 2320, h: 1280},
	opacity = 1,
}) => (
	<svg width={10} height={10} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity}}>
		{Array.from({length: count}, (_, i) => {
			const sp = 0.15 + rand(seed + i * 3) * 0.5;
			const x = area.x + ((rand(seed + i) * area.w + frame * sp * (rand(seed + i * 9) - 0.3)) % area.w + area.w) % area.w;
			const y = area.y + ((rand(seed + i * 5) * area.h - frame * sp * 0.6) % area.h + area.h) % area.h;
			const r = 1 + rand(seed + i * 7) * 2.4;
			const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame / (10 + rand(seed + i) * 20) + i));
			return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={tw} />;
		})}
	</svg>
);

// 冲击时向两侧飞散的尘土 带重力
export const Burst: React.FC<{frame: number; at: number; x: number; y: number; seed?: number; count?: number; spread?: number; color?: string}> = ({
	frame,
	at,
	x,
	y,
	seed = 3,
	count = 46,
	spread = 1,
	color = '#B8A58A',
}) => {
	const t = frame - at;
	if (t < 0 || t > 34) return null;
	return (
		<svg width={10} height={10} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
			{Array.from({length: count}, (_, i) => {
				const dir = rand(seed + i) > 0.5 ? 1 : -1;
				const vx = dir * (4 + rand(seed + i * 3) * 18) * spread;
				const vy = -(2 + rand(seed + i * 5) * 9) * spread;
				const px = x + (rand(seed + i * 11) - 0.5) * 240 * spread + vx * t;
				const py = y + vy * t + 0.42 * t * t;
				const r = 1.5 + rand(seed + i * 7) * 3.5;
				return <circle key={i} cx={px} cy={py} r={r} fill={color} opacity={Math.max(0, 1 - t / 34) * 0.85} />;
			})}
		</svg>
	);
};

// 冲击波光环
// flat 是椭圆的高宽比 压扁一些 避免光环扫进字幕区
export const Shockwave: React.FC<{frame: number; at: number; x: number; y: number; color?: string; size?: number; flat?: number}> = ({frame, at, x, y, color = COLORS.warm, size = 900, flat = 0.24}) => {
	const t = frame - at;
	if (t < 0 || t > 20) return null;
	const k = 1 - Math.pow(1 - t / 20, 3);
	return (
		<div
			style={{
				position: 'absolute',
				left: x - size / 2,
				top: y - (size * flat) / 2,
				width: size,
				height: size * flat,
				borderRadius: '50%',
				border: `3px solid ${color}`,
				transform: `scale(${0.1 + k * 1.6})`,
				opacity: (1 - k) * 0.7,
				boxShadow: `0 0 30px ${color}`,
			}}
		/>
	);
};
