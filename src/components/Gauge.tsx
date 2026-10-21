import React from 'react';
import {C} from '../theme';

// 承受线压力条：琥珀色液柱 + 虚线阈值

export const Gauge: React.FC<{
	x: number;
	bottom: number;
	height: number;
	value: number;
	threshold: number;
	frame: number;
	opacity?: number;
	flash?: number;
}> = ({x, bottom, height, value, threshold, frame, opacity = 1, flash = 0}) => {
	const w = 30;
	const fillH = Math.max(0, value * height);
	const ty = bottom - threshold * height;
	const shimmer = 0.85 + 0.15 * Math.sin(frame / 6);
	return (
		<g opacity={opacity}>
			<rect x={x - w / 2} y={bottom - height} width={w} height={height} rx={w / 2} fill="#191B22" stroke={C.line} strokeWidth={3} />
			<rect x={x - w / 2 + 5} y={bottom - fillH} width={w - 10} height={Math.max(0, fillH - 5)} rx={(w - 10) / 2} fill={C.amber} opacity={0.9 * shimmer} />
			<line x1={x - 46} y1={ty} x2={x + 46} y2={ty} stroke={flash > 0 ? C.amber : C.grey} strokeWidth={3} strokeDasharray="10 8" opacity={0.7 + 0.3 * flash} />
		</g>
	);
};
