/**
 * 背景层：纸底色 + 光（聚光/侧光）+ 暗角 + 世界空间网格与浮尘 + 颗粒噪点。
 * 每节一套「场景光」，切节时随镜头运动过渡（底色、光线、网格至少变一样）。
 */
import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {C} from '../theme';
import {Cam, camTransform} from '../lib/camera';
import {clamp, lerp, rand} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {sectionRange} from '../data/script';

export type Look = {
	base: string;
	vignette: number; // 暗角强度
	spotX: number; // 聚光中心（屏幕比例）
	spotY: number;
	spotR: number; // 聚光半径（屏幕宽比例）
	spotA: number; // 聚光亮度
	side: number; // 左侧侧光
	grid: number; // 世界网格可见度
	dust: number; // 浮尘
	redPulse: number; // 心跳带动的暖红暗角
};

const LOOKS: Record<string, Look> = {
	hook: {base: '#E3DBCD', vignette: 0.82, spotX: 0.5, spotY: 0.36, spotR: 0.36, spotA: 0.75, side: 0, grid: 0, dust: 1, redPulse: 1},
	question: {base: C.paper, vignette: 0.32, spotX: 0.5, spotY: 0.22, spotR: 0.75, spotA: 0.5, side: 0, grid: 0, dust: 0.6, redPulse: 0.2},
	what: {base: C.paperCool, vignette: 0.16, spotX: 0.2, spotY: 0.3, spotR: 0.9, spotA: 0.25, side: 1, grid: 1, dust: 0, redPulse: 0},
};

const mixLook = (a: Look, b: Look, t: number): Look => ({
	base: interpolateColors(t, [0, 1], [a.base, b.base]),
	vignette: lerp(a.vignette, b.vignette, t),
	spotX: lerp(a.spotX, b.spotX, t),
	spotY: lerp(a.spotY, b.spotY, t),
	spotR: lerp(a.spotR, b.spotR, t),
	spotA: lerp(a.spotA, b.spotA, t),
	side: lerp(a.side, b.side, t),
	grid: lerp(a.grid, b.grid, t),
	dust: lerp(a.dust, b.dust, t),
	redPulse: lerp(a.redPulse, b.redPulse, t),
});

const TRANSITION = 30;
export const lookAt = (frame: number): Look => {
	const order = Object.keys(LOOKS);
	let look = LOOKS[order[0]];
	for (let i = 1; i < order.length; i++) {
		const start = sectionRange(order[i]).start;
		const t = clamp((frame - start) / TRANSITION);
		if (t > 0) look = mixLook(look, LOOKS[order[i]], t * t * (3 - 2 * t));
	}
	return look;
};

const Grid: React.FC<{cam: Cam; alpha: number}> = ({cam, alpha}) => {
	if (alpha < 0.01) return null;
	const lines: React.ReactNode[] = [];
	const step = 120;
	for (let x = 2400; x <= 8400; x += step)
		lines.push(<line key={`x${x}`} x1={x} y1={-1400} x2={x} y2={1400} />);
	for (let y = -1400; y <= 1400; y += step) lines.push(<line key={`y${y}`} x1={2400} y1={y} x2={8400} y2={y} />);
	return (
		<g stroke={C.ink} strokeWidth={1.2 / cam.z} opacity={0.075 * alpha} transform={camTransform(cam)}>
			{lines}
		</g>
	);
};

const Dust: React.FC<{cam: Cam; frame: number; alpha: number}> = ({cam, frame, alpha}) => {
	if (alpha < 0.01) return null;
	const els: React.ReactNode[] = [];
	for (let i = 0; i < 70; i++) {
		const x = -1400 + rand(i) * 2800 + Math.sin(frame / (60 + rand(i + 1) * 80) + i) * 30;
		const y = -900 + ((rand(i + 2) * 1800 - frame * (0.25 + rand(i + 3) * 0.4)) % 1800 + 1800) % 1800;
		const r = 1 + rand(i + 4) * 2.5;
		els.push(<circle key={i} cx={x} cy={y} r={r} fill={C.ink} opacity={(0.08 + rand(i + 5) * 0.14) * alpha} />);
	}
	return <g transform={camTransform(cam)}>{els}</g>;
};

export const Backdrop: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	const L = lookAt(frame);
	const beat = pulseAt(frame) * L.redPulse;
	return (
		<AbsoluteFill style={{background: L.base}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(circle at ${L.spotX * 100}% ${L.spotY * 100}%, rgba(255,250,240,${L.spotA}) 0%, rgba(255,250,240,0) ${L.spotR * 100}%)`,
				}}
			/>
			{L.side > 0.01 && (
				<AbsoluteFill
					style={{
						background: `linear-gradient(100deg, rgba(255,252,246,${0.55 * L.side}) 0%, rgba(255,252,246,0) 55%)`,
					}}
				/>
			)}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<Grid cam={cam} alpha={L.grid} />
				<Dust cam={cam} frame={frame} alpha={L.dust} />
			</svg>
		</AbsoluteFill>
	);
};

/** 前景暗角与颗粒（盖在物件之上、字幕之下） */
export const Atmosphere: React.FC<{frame: number}> = ({frame}) => {
	const L = lookAt(frame);
	const beat = pulseAt(frame) * L.redPulse;
	const seed = Math.floor(frame / 2) % 50;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 38%, rgba(30,26,22,${0.55 * L.vignette}) 100%)`,
				}}
			/>
			{beat > 0.01 && (
				<AbsoluteFill
					style={{
						background: `radial-gradient(ellipse at 50% 50%, rgba(224,65,47,0) 45%, rgba(224,65,47,${0.16 * beat}) 100%)`,
					}}
				/>
			)}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.3}}>
				<filter id="grain">
					<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width={1920} height={1080} filter="url(#grain)" />
			</svg>
		</AbsoluteFill>
	);
};
