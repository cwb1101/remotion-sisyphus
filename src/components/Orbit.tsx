import React from 'react';
import {useCurrentFrame} from 'remotion';
import {px, useCamera} from '../camera/Camera';
import {glow, palette} from '../theme';
import {arcPath, type Ellipse, TAU} from './geometry';

/**
 * 透视椭圆轨道上的一段弧（世界坐标）
 * from → to 为参数角，jitter > 0 时线变乱
 */
export const OrbitArc: React.FC<{
	e: Ellipse;
	from: number;
	to: number;
	width?: number;
	color?: string;
	opacity?: number;
	jitter?: number;
	seed?: number;
	dash?: [number, number];
}> = ({e, from, to, width = glow.coreWidth, color = palette.gold, opacity = 1, jitter = 0, seed = 1, dash}) => {
	const frame = useCurrentFrame();
	const cam = useCamera();
	if (Math.abs(to - from) < 0.002 || opacity <= 0.001) return null;
	const d = arcPath(e, from, to, {jitter, time: frame, seed});
	return (
		<path
			d={d}
			fill="none"
			stroke={color}
			strokeWidth={px(cam, width)}
			strokeLinecap="round"
			strokeLinejoin="round"
			opacity={opacity}
			pathLength={dash ? 1 : undefined}
			strokeDasharray={dash ? `${dash[0]} ${dash[1]}` : undefined}
		/>
	);
};

/** 一组同心椭圆（远景层次） */
export const OrbitRings: React.FC<{e: Ellipse; count: number; step: number; opacity?: number; color?: string}> = ({
	e,
	count,
	step,
	opacity = 0.4,
	color = palette.goldDim,
}) => (
	<>
		{new Array(count).fill(0).map((_, i) => (
			<OrbitArc
				key={i}
				e={{...e, rx: e.rx + step * (i + 1), ry: e.ry + step * (i + 1) * (e.ry / Math.max(1, e.rx))}}
				from={0}
				to={TAU}
				width={1}
				color={color}
				opacity={opacity * (1 - i / count)}
			/>
		))}
	</>
);
