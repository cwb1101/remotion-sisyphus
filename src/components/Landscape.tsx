import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';
import {Cam, camTransform} from './Camera';

// 坡地：x < 200 是坡底平地，200–3000 是 0.2 的缓坡，3000 之后是坡顶平台
export const SLOPE = {bottomX: 200, bottomY: 900, topX: 3000, topY: 340};

export const slopeY = (x: number) => {
	if (x <= SLOPE.bottomX) {
		return SLOPE.bottomY;
	}
	if (x >= SLOPE.topX) {
		return SLOPE.topY;
	}
	return SLOPE.bottomY - ((x - SLOPE.bottomX) * (SLOPE.bottomY - SLOPE.topY)) / (SLOPE.topX - SLOPE.bottomX);
};

export const SLOPE_ANGLE = (Math.atan((SLOPE.bottomY - SLOPE.topY) / (SLOPE.topX - SLOPE.bottomX)) * 180) / Math.PI;

export const FLAT_Y = 790;

const hills = (seed: number, baseY: number, amp: number, x0: number, x1: number) => {
	let d = `M ${x0} 2400 L ${x0} ${baseY}`;
	for (let x = x0; x <= x1; x += 120) {
		const y = baseY - amp * (0.5 + 0.5 * Math.sin(x / 410 + seed)) - amp * 0.4 * random(`${seed}-${x}`);
		d += ` L ${x} ${y}`;
	}
	return `${d} L ${x1} 2400 Z`;
};

type Props = {
	cam: Cam;
	variant: 'flat' | 'slope';
	// 坡顶暖光（右侧禁字带里的光源）0–1
	sun?: number;
	// 天色压暗 0–1
	dark?: number;
	// 冷色调 0–1
	cool?: number;
	// 天色褪成"精致的灰" 0–1（第六节）
	gray?: number;
};

export const Sky: React.FC<{sun?: number; dark?: number; cool?: number; gray?: number}> = ({sun = 0, dark = 0, cool = 0, gray = 0}) => (
	<>
		<defs>
			<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor={C.skyTop} />
				<stop offset="0.75" stopColor={C.skyBottom} />
				<stop offset="1" stopColor="#30344A" />
			</linearGradient>
			<linearGradient id="sky-gray" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#4C4D55" />
				<stop offset="1" stopColor="#8C8983" />
			</linearGradient>
			<radialGradient id="sun" cx="1720" cy="250" r="900" gradientUnits="userSpaceOnUse">
				<stop offset="0" stopColor={C.gold} stopOpacity={0.55} />
				<stop offset="0.18" stopColor={C.gold} stopOpacity={0.22} />
				<stop offset="0.55" stopColor="#C98A5A" stopOpacity={0.06} />
				<stop offset="1" stopColor="#000000" stopOpacity={0} />
			</radialGradient>
		</defs>
		<rect x={0} y={0} width={1920} height={1080} fill="url(#sky)" />
		{gray > 0 ? <rect x={0} y={0} width={1920} height={1080} fill="url(#sky-gray)" opacity={gray} /> : null}
		<rect x={0} y={0} width={1920} height={1080} fill="url(#sun)" opacity={sun} />
		<rect x={0} y={0} width={1920} height={1080} fill={C.blue} opacity={cool * 0.08} />
		<rect x={0} y={0} width={1920} height={1080} fill="#05060A" opacity={dark * 0.6} />
	</>
);

export const Landscape: React.FC<Props> = ({cam, variant, sun = 0, dark = 0, cool = 0, gray = 0}) => {
	const slopePath =
		variant === 'flat'
			? `M -3000 ${FLAT_Y} L 6000 ${FLAT_Y} L 6000 4000 L -3000 4000 Z`
			: `M -3000 ${SLOPE.bottomY} L ${SLOPE.bottomX} ${SLOPE.bottomY} L ${SLOPE.topX} ${SLOPE.topY} L 6000 ${SLOPE.topY} L 6000 4000 L -3000 4000 Z`;
	const edgePath =
		variant === 'flat'
			? `M -3000 ${FLAT_Y} L 6000 ${FLAT_Y}`
			: `M -3000 ${SLOPE.bottomY} L ${SLOPE.bottomX} ${SLOPE.bottomY} L ${SLOPE.topX} ${SLOPE.topY} L 6000 ${SLOPE.topY}`;
	return (
		<>
			<Sky sun={sun} dark={dark} cool={cool} gray={gray} />
			<g transform={camTransform(cam, 0.25)}>
				<path d={hills(3, variant === 'flat' ? 700 : 620, 140, -2000, 4600)} fill={C.hillFar} opacity={1 - dark * 0.4} />
			</g>
			<g transform={camTransform(cam, 0.5)}>
				<path d={hills(9, variant === 'flat' ? 760 : 700, 110, -2000, 4600)} fill={C.hillNear} />
			</g>
			<g transform={camTransform(cam)}>
				<defs>
					<linearGradient id={`ground-${variant}`} x1="0" y1="300" x2="0" y2="1300" gradientUnits="userSpaceOnUse">
						<stop offset="0" stopColor={C.slope} />
						<stop offset="1" stopColor={C.slopeDeep} />
					</linearGradient>
				</defs>
				<path d={slopePath} fill={`url(#ground-${variant})`} />
				<path d={edgePath} fill="none" stroke={C.slopeEdge} strokeWidth={2.5} opacity={0.85 - dark * 0.4} />
			</g>
		</>
	);
};
