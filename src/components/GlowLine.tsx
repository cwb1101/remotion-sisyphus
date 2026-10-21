import React from 'react';
import {px, useCamera} from '../camera/Camera';
import {glow, palette} from '../theme';

const dashedProgress = (p: number, dash: number, gap: number) => {
	const out: number[] = [];
	let acc = 0;
	while (acc < p) {
		const d = Math.min(dash, p - acc);
		out.push(d, gap);
		acc += dash + gap;
	}
	out.push(0, 2);
	return out.join(' ');
};

/**
 * 发光线条（世界坐标，放在 WorldSvg 里，由外层 Glow 提供光晕）
 * progress 控制描边动画：线条逐段画出来
 */
export const GlowLine: React.FC<{
	d: string;
	progress?: number;
	/** 从末端往回收（0–1），用于“缩回” */
	retract?: number;
	width?: number;
	color?: string;
	opacity?: number;
	dash?: [number, number];
}> = ({d, progress = 1, retract = 0, width = glow.coreWidth, color = palette.gold, opacity = 1, dash}) => {
	const cam = useCamera();
	const p = Math.max(0, progress - retract);
	if (p <= 0.0005 || opacity <= 0.001) return null;
	const dasharray = dash ? dashedProgress(p, dash[0], dash[1]) : `${p} 2`;
	return (
		<path
			d={d}
			pathLength={1}
			fill="none"
			stroke={color}
			strokeWidth={px(cam, width)}
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeDasharray={dasharray}
			opacity={opacity}
		/>
	);
};
