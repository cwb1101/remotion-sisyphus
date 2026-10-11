/**
 * 黑色舞台：地板、聚光灯（带体积光与浮尘）、幕布、顶灯排、雾气、暗角颗粒。
 * 除雾气/暗角外均为世界坐标（地面 y=0），随全片唯一摄像机运动。
 */
import React, {useId} from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {clamp, lerp, rand} from '../lib/anim';
import {sectionRange} from '../data/script';

export const LIGHT = {warm: '#FFC58A', cold: '#9CC8FF', ice: '#BFE0FF', neutral: '#E9E4DA'};

/** 舞台地板：近处更亮的木地板横缝（伪透视） */
export const StageFloor: React.FC<{x0?: number; x1?: number; tint?: string}> = ({x0 = -3000, x1 = 12000, tint = '#141414'}) => {
	const id = useId().replace(/:/g, '');
	const lines = Array.from({length: 14}, (_, i) => 6 + i * i * 5);
	return (
		<g>
			<defs>
				<linearGradient id={`fl-${id}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={tint} />
					<stop offset="100%" stopColor="#050505" />
				</linearGradient>
			</defs>
			<rect x={x0} y={0} width={x1 - x0} height={1400} fill={`url(#fl-${id})`} />
			{lines.map((y, i) => (
				<line key={i} x1={x0} y1={y} x2={x1} y2={y} stroke="#222" strokeWidth={1.5 + i * 0.15} opacity={0.9 - i * 0.04} />
			))}
		</g>
	);
};

/** 聚光灯：从高处照到地面 x，带光柱、地面光池、浮尘 */
export const Spotlight: React.FC<{
	x: number;
	color: string;
	intensity?: number; // 0..1
	width?: number; // 地面光池宽
	topWidth?: number;
	tilt?: number; // 光源相对地面的水平偏移
	frame: number;
	dust?: boolean;
	seed?: number;
}> = ({x, color, intensity = 1, width = 520, topWidth = 160, tilt = 0, frame, dust = true, seed = 1}) => {
	const id = useId().replace(/:/g, '');
	if (intensity <= 0.01) return null;
	const top = -1900;
	const tx = x + tilt;
	const dustEls = dust
		? Array.from({length: 46}, (_, i) => {
				const t = (rand(i + seed * 13) + frame * (0.0015 + rand(i + 7) * 0.002)) % 1;
				const yy = lerp(-1300, -10, t);
				const half = lerp(topWidth, width, (yy - top) / -top) / 2;
				const xx = lerp(tx, x, (yy - top) / -top) + (rand(i * 3 + seed) - 0.5) * 2 * half * 0.85 + Math.sin(frame / 40 + i) * 6;
				return <circle key={i} cx={xx} cy={yy} r={1.2 + rand(i + 5) * 2.4} fill={color} opacity={(0.15 + rand(i + 9) * 0.45) * intensity} />;
			})
		: null;
	return (
		<g>
			<defs>
				<linearGradient id={`bm-${id}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={color} stopOpacity={0.02} />
					<stop offset="70%" stopColor={color} stopOpacity={0.18} />
					<stop offset="100%" stopColor={color} stopOpacity={0.32} />
				</linearGradient>
				<radialGradient id={`pl-${id}`}>
					<stop offset="0%" stopColor={color} stopOpacity={0.6} />
					<stop offset="60%" stopColor={color} stopOpacity={0.18} />
					<stop offset="100%" stopColor={color} stopOpacity={0} />
				</radialGradient>
				<filter id={`bl-${id}`} x="-50%" y="-10%" width="200%" height="120%">
					<feGaussianBlur stdDeviation={18} />
				</filter>
			</defs>
			<g opacity={intensity}>
				<polygon
					points={`${tx - topWidth / 2},${top} ${tx + topWidth / 2},${top} ${x + width / 2},0 ${x - width / 2},0`}
					fill={`url(#bm-${id})`}
					filter={`url(#bl-${id})`}
				/>
				<ellipse cx={x} cy={8} rx={width * 0.62} ry={width * 0.11} fill={`url(#pl-${id})`} />
			</g>
			{dustEls}
		</g>
	);
};

/** 幕布（第二节场景）：竖向褶皱，极暗 */
export const Curtain: React.FC<{x0: number; x1: number; opacity?: number; frame: number}> = ({x0, x1, opacity = 1, frame}) => {
	if (opacity <= 0.01) return null;
	const folds: React.ReactNode[] = [];
	const w = 90;
	for (let x = x0, i = 0; x < x1; x += w, i++) {
		const sway = Math.sin(frame / 50 + i * 0.7) * 3;
		folds.push(
			<rect key={i} x={x + sway} y={-1500} width={w * 0.55} height={1500} fill="#17151d" opacity={0.55 + rand(i) * 0.25} />
		);
	}
	return (
		<g opacity={opacity}>
			<rect x={x0} y={-1500} width={x1 - x0} height={1500} fill="#0b0a0f" />
			{folds}
			<rect x={x0} y={-60} width={x1 - x0} height={60} fill="#050505" opacity={0.7} />
		</g>
	);
};

/** 顶灯排（第三节场景）：一排吊灯，亮/灭可控 */
export const LampRow: React.FC<{xs: number[]; on: number[]; color: string; opacity?: number}> = ({xs, on, color, opacity = 1}) => (
	<g opacity={opacity}>
		{xs.map((x, i) => (
			<g key={i}>
				<line x1={x} y1={-1700} x2={x} y2={-930} stroke="#2a2a2a" strokeWidth={4} />
				<path d={`M ${x - 46} -870 L ${x + 46} -870 L ${x + 26} -930 L ${x - 26} -930 Z`} fill="#1d1d1d" />
				<ellipse cx={x} cy={-870} rx={44} ry={9} fill={color} opacity={0.15 + 0.85 * clamp(on[i] ?? 0)} />
			</g>
		))}
	</g>
);

/** 每节一套舞台氛围（雾色、雾量、暗角），切节时过渡 */
type Mood = {haze: string; hazeA: number; vignette: number};
const MOODS: Record<string, Mood> = {
	hook: {haze: '#3a2414', hazeA: 0.55, vignette: 0.85},
	question: {haze: '#0f1f3a', hazeA: 0.7, vignette: 0.7},
	what: {haze: '#1c1f24', hazeA: 0.5, vignette: 0.6},
};
export const moodAt = (frame: number): Mood => {
	const ids = Object.keys(MOODS);
	let m = MOODS[ids[0]];
	for (let i = 1; i < ids.length; i++) {
		const t = clamp((frame - sectionRange(ids[i]).start) / 30);
		if (t > 0) {
			const b = MOODS[ids[i]];
			m = {haze: interpolateColors(t, [0, 1], [m.haze, b.haze]), hazeA: lerp(m.hazeA, b.hazeA, t), vignette: lerp(m.vignette, b.vignette, t)};
		}
	}
	return m;
};

export const Haze: React.FC<{frame: number}> = ({frame}) => {
	const m = moodAt(frame);
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse 70% 55% at 50% 38%, ${m.haze} 0%, rgba(0,0,0,0) 100%)`,
				opacity: m.hazeA,
			}}
		/>
	);
};

export const Atmosphere: React.FC<{frame: number; flash?: number; tint?: string}> = ({frame, flash = 0, tint = '#ffffff'}) => {
	const m = moodAt(frame);
	const seed = Math.floor(frame / 2) % 50;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,${m.vignette}) 100%)`}} />
			{flash > 0.01 && <AbsoluteFill style={{background: tint, opacity: flash}} />}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.22}}>
				<filter id="grain">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width={1920} height={1080} filter="url(#grain)" />
			</svg>
		</AbsoluteFill>
	);
};
