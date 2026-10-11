/**
 * 心率线（屏幕空间的「仪器层」），波形来自共享节拍轨，与心跳音效同步。
 * 线从 anchor（红点在屏幕上的位置）出发，落到基线后向右推进。
 */
import React from 'react';
import {C} from '../theme';
import {ecgAt} from '../lib/pulse';
import {clamp} from '../lib/anim';

type Props = {
	frame: number;
	startFrame: number;
	baseY: number;
	x0?: number;
	x1?: number;
	amp: number;
	speed?: number;
	anchor?: {x: number; y: number};
	opacity?: number;
	strokeWidth?: number;
	color?: string;
};

export const HeartLine: React.FC<Props> = ({
	frame,
	startFrame,
	baseY,
	x0 = 120,
	x1 = 1800,
	amp,
	speed = 26,
	anchor,
	opacity = 1,
	strokeWidth = 5,
	color = C.red,
}) => {
	if (frame < startFrame || opacity <= 0.001) return null;
	const head = Math.min(x1, x0 + (frame - startFrame) * speed);
	const pts: string[] = [];
	for (let x = x0; x <= head; x += 3) {
		const t = frame - (head - x) / speed;
		const v = ecgAt(t);
		pts.push(`${x.toFixed(1)},${(baseY - v * amp).toFixed(1)}`);
	}
	const vHead = ecgAt(frame);
	const tail = clamp((head - x0) / 220);
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}} opacity={opacity}>
			<defs>
				<linearGradient id="hl-fade" x1={x0} x2={x1} y1={0} y2={0} gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={color} stopOpacity={0.15} />
					<stop offset="25%" stopColor={color} stopOpacity={1} />
					<stop offset="100%" stopColor={color} stopOpacity={1} />
				</linearGradient>
			</defs>
			{anchor && (
				<path
					d={`M ${anchor.x} ${anchor.y} C ${anchor.x} ${(anchor.y + baseY) / 2}, ${x0} ${baseY - 40}, ${x0} ${baseY}`}
					stroke={color}
					strokeWidth={strokeWidth * 0.6}
					fill="none"
					opacity={0.35 * tail}
					strokeDasharray="4 10"
				/>
			)}
			<polyline
				points={pts.join(' ')}
				fill="none"
				stroke="url(#hl-fade)"
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<circle cx={head} cy={baseY - vHead * amp} r={strokeWidth * 1.8} fill={color} />
			<circle cx={head} cy={baseY - vHead * amp} r={strokeWidth * 5} fill={color} opacity={0.15} />
		</svg>
	);
};
