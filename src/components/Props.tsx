/**
 * 后半片用到的道具：转场色块、信号波纹、碎片、眼泪、椅子、时钟环、任务卡片、监测墙、仪表、出处小字、水印。
 * 除特别说明外均为世界坐标（地面 y=0）。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, easeOut, lerp, rand} from '../lib/anim';
import {FONT_SANS} from '../theme';
import {WATERMARK} from '../data/script';

/** 屏幕空间：满屏色块（穿过心脏 / 闪光转场，不用黑场） */
export const Flood: React.FC<{color: string; alpha: number}> = ({color, alpha}) =>
	alpha <= 0.001 ? null : (
		<AbsoluteFill
			style={{
				background: `radial-gradient(circle at 50% 35%, #ffffff 0%, ${color} 38%, ${color} 100%)`,
				opacity: alpha,
			}}
		/>
	);

/** 信号波纹：从 (x,y) 朝 dir 方向扩散的弧，t∈[0,1] */
export const Ripple: React.FC<{x: number; y: number; t: number; maxR: number; dir?: number; color?: string; width?: number; spread?: number}> = ({
	x,
	y,
	t,
	maxR,
	dir = 1,
	color = '#FF4433',
	width = 7,
	spread = 50,
}) => {
	if (t <= 0 || t >= 1) return null;
	const r = lerp(18, maxR, easeOut(t));
	const a = (spread * Math.PI) / 180;
	const x1 = x + dir * r * Math.cos(a);
	const y1 = y - r * Math.sin(a);
	const y2 = y + r * Math.sin(a);
	const d = `M ${x1} ${y1} A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${x1} ${y2}`;
	const op = 1 - t * t;
	return (
		<g opacity={op}>
			<path d={d} fill="none" stroke={color} strokeWidth={width * 3.5} opacity={0.18} strokeLinecap="round" />
			<path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
		</g>
	);
};

/** 碎片：在 (x,y) 炸开后受重力下落，dt 为炸开后的帧数 */
export const Shards: React.FC<{x: number; y: number; dt: number; seed?: number; color?: string; n?: number}> = ({x, y, dt, seed = 1, color = '#9aa3b0', n = 22}) => {
	if (dt < 0 || dt > 40) return null;
	return (
		<g opacity={1 - dt / 40}>
			{Array.from({length: n}, (_, i) => {
				const vx = (rand(i + seed * 7) - 0.65) * 9;
				const vy = (rand(i * 3 + seed) - 0.7) * 10;
				const px = x + vx * dt;
				const py = y + vy * dt + 0.35 * dt * dt;
				const s = 4 + rand(i + seed) * 7;
				return <rect key={i} x={px - s / 2} y={py - s / 2} width={s} height={s * 0.6} fill={color} transform={`rotate(${dt * 20 + i * 40} ${px} ${py})`} />;
			})}
		</g>
	);
};

/** 眼泪：从眼角不断滴落 */
export const Tears: React.FC<{x: number; y: number; frame: number; on: number}> = ({x, y, frame, on}) =>
	on <= 0.01 ? null : (
		<g opacity={on}>
			{[0, 1].map((k) => {
				const t = ((frame + k * 11) % 22) / 22;
				return <ellipse key={k} cx={x + k * 3} cy={y + t * 46} rx={3.4} ry={5} fill="#9fd0ff" opacity={1 - t} />;
			})}
		</g>
	);

/** 椅子（侧面），x 为座面中心，facing 决定靠背在哪一侧 */
export const Chair: React.FC<{x: number; facing: number; scale?: number; opacity?: number}> = ({x, facing, scale = 1.3, opacity = 1}) => {
	const seatY = -78 * scale;
	const w = 46 * scale;
	const back = -facing * w;
	return (
		<g opacity={opacity} stroke="#4a3a30" strokeWidth={7 * scale * 0.8} strokeLinecap="round">
			<line x1={x - w} y1={seatY} x2={x + w} y2={seatY} strokeWidth={9 * scale} />
			<line x1={x - w * 0.8} y1={seatY} x2={x - w * 0.8} y2={0} />
			<line x1={x + w * 0.8} y1={seatY} x2={x + w * 0.8} y2={0} />
			<line x1={x + back} y1={seatY} x2={x + back * 1.05} y2={seatY - 110 * scale} strokeWidth={8 * scale} />
		</g>
	);
};

/** 时钟环：p∈[0,1] 进度 */
export const ClockRing: React.FC<{x: number; y: number; r: number; p: number; opacity?: number; color?: string}> = ({x, y, r, p, opacity = 1, color = '#FFC58A'}) => {
	if (opacity <= 0.01) return null;
	const c = 2 * Math.PI * r;
	return (
		<g opacity={opacity}>
			<circle cx={x} cy={y} r={r} fill="rgba(0,0,0,0.35)" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={6} />
			<circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={9} strokeDasharray={`${c * clamp(p)} ${c}`} transform={`rotate(-90 ${x} ${y})`} strokeLinecap="round" />
			<line x1={x} y1={y} x2={x} y2={y - r * 0.62} stroke="#ffffff" strokeWidth={6} strokeLinecap="round" transform={`rotate(${p * 360} ${x} ${y})`} />
			<line x1={x} y1={y} x2={x + r * 0.42} y2={y} stroke="#ffffff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
			<circle cx={x} cy={y} r={6} fill="#ffffff" />
		</g>
	);
};

/** 一张待办卡片 */
export const TaskCard: React.FC<{x: number; y: number; rot: number; s?: number; opacity?: number}> = ({x, y, rot, s = 1, opacity = 1}) => (
	<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={opacity}>
		<rect x={-36} y={-24} width={72} height={48} rx={5} fill="#dcd6c8" />
		<rect x={-36} y={-24} width={72} height={10} rx={4} fill="#c9b79a" />
		{[0, 1, 2].map((i) => (
			<line key={i} x1={-26} y1={-4 + i * 9} x2={lerp(10, 26, rand(i + x))} y2={-4 + i * 9} stroke="#7b7568" strokeWidth={3} strokeLinecap="round" />
		))}
	</g>
);

/** 监测墙（第五节场景）：深色网格面板 + 闪烁指示灯 */
export const MonitorWall: React.FC<{x0: number; x1: number; frame: number; opacity?: number}> = ({x0, x1, frame, opacity = 1}) => {
	if (opacity <= 0.01) return null;
	const top = -1250;
	const bottom = -420;
	const cols = Math.floor((x1 - x0) / 80);
	return (
		<g opacity={opacity}>
			<rect x={x0} y={top} width={x1 - x0} height={bottom - top} fill="#0b1416" stroke="#1f3a3e" strokeWidth={6} />
			{Array.from({length: cols}, (_, i) => (
				<line key={`c${i}`} x1={x0 + i * 80} y1={top} x2={x0 + i * 80} y2={bottom} stroke="#1a3236" strokeWidth={2} />
			))}
			{Array.from({length: 10}, (_, i) => (
				<line key={`r${i}`} x1={x0} y1={top + i * 83} x2={x1} y2={top + i * 83} stroke="#1a3236" strokeWidth={2} />
			))}
			{Array.from({length: 26}, (_, i) => {
				const on = Math.sin(frame / (6 + rand(i) * 10) + i * 3) > 0.3;
				return <circle key={`l${i}`} cx={x0 + 40 + rand(i + 2) * (x1 - x0 - 80)} cy={top + 40 + rand(i + 5) * (bottom - top - 80)} r={5} fill={i % 4 === 0 ? '#ff6a55' : '#5fe0c8'} opacity={on ? 0.9 : 0.15} />;
			})}
			{/* 墙上的小示波线 */}
			<polyline
				points={Array.from({length: 60}, (_, i) => `${x0 + 60 + i * ((x1 - x0 - 120) / 59)},${-800 + Math.sin(i * 0.6 + frame * 0.25) * 22 * Math.sin(i * 0.11)}`).join(' ')}
				fill="none"
				stroke="#5fe0c8"
				strokeWidth={3}
				opacity={0.45}
			/>
		</g>
	);
};

/** 屏幕空间：竖向仪表（压力激素） */
export const Gauge: React.FC<{x: number; y0: number; y1: number; v: number; opacity: number}> = ({x, y0, y1, v, opacity}) => {
	if (opacity <= 0.01) return null;
	const h = y1 - y0;
	const fillH = h * clamp(v);
	const col = v > 0.6 ? '#FF5A45' : v > 0.4 ? '#FFA24C' : '#FFD27A';
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}} opacity={opacity}>
			<rect x={x - 22} y={y0 - 6} width={44} height={h + 12} rx={22} fill="rgba(0,0,0,0.5)" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={3} />
			<rect x={x - 13} y={y1 - fillH} width={26} height={fillH} rx={13} fill={col} />
			<circle cx={x} cy={y1 + 34} r={30} fill={col} />
			{Array.from({length: 6}, (_, i) => (
				<line key={i} x1={x + 26} y1={y0 + (h / 5) * i} x2={x + 40} y2={y0 + (h / 5) * i} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={3} />
			))}
		</svg>
	);
};

/** 屏幕空间：研究出处小字（底部居中） */
export const Citation: React.FC<{text: string; opacity: number; bottom?: number}> = ({text, opacity, bottom = 34}) =>
	opacity <= 0.01 ? null : (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				bottom,
				textAlign: 'center',
				fontFamily: FONT_SANS,
				fontWeight: 400,
				fontSize: 24,
				letterSpacing: '0.04em',
				color: 'rgba(220,226,235,0.75)',
				opacity,
				textShadow: '0 0 8px rgba(0,0,0,0.9)',
			}}
		>
			{text}
		</div>
	);

/** 屏幕空间：右上角固定水印（细空心方框 + 文字），不随镜头变化 */
export const Watermark: React.FC = () => (
	<div
		style={{
			position: 'absolute',
			top: 34,
			right: 40,
			padding: '8px 16px 9px',
			border: '1.5px solid rgba(255,255,255,0.32)',
			fontFamily: FONT_SANS,
			fontWeight: 400,
			fontSize: 26,
			letterSpacing: '0.12em',
			color: 'rgba(255,255,255,0.4)',
			lineHeight: 1.2,
			pointerEvents: 'none',
		}}
	>
		{WATERMARK}
	</div>
);

/** 幕布后升起的暖光（第七节「天亮」） */
export const SunGlow: React.FC<{x: number; y: number; r: number; a: number; id: string}> = ({x, y, r, a, id}) =>
	a <= 0.01 ? null : (
		<g>
			<defs>
				<radialGradient id={`sun-${id}`}>
					<stop offset="0%" stopColor="#FFD9A0" stopOpacity={0.85} />
					<stop offset="35%" stopColor="#FFB26B" stopOpacity={0.35} />
					<stop offset="100%" stopColor="#FF9A5A" stopOpacity={0} />
				</radialGradient>
			</defs>
			<circle cx={x} cy={y} r={r} fill={`url(#sun-${id})`} opacity={a} />
		</g>
	);
