import React from 'react';
import {random} from 'remotion';
import {clamp, EASE, lerp} from '../lib/anim';

// 确定性粒子：同一帧永远画出同一结果

/** 室内浮尘：缓慢漂移、明暗呼吸 */
export const Dust: React.FC<{
	frame: number;
	box: {l: number; t: number; r: number; b: number};
	count?: number;
	color: string;
	opacity?: number;
	seed: string;
}> = ({frame, box, count = 26, color, opacity = 1, seed}) => (
	<g opacity={opacity}>
		{new Array(count).fill(0).map((_, i) => {
			const w = box.r - box.l;
			const h = box.b - box.t;
			const vx = (random(`${seed}-vx-${i}`) - 0.5) * 0.5;
			const vy = -0.15 - random(`${seed}-vy-${i}`) * 0.35;
			const x = box.l + ((((random(`${seed}-x-${i}`) * w + frame * vx) % w) + w) % w);
			const y = box.t + ((((random(`${seed}-y-${i}`) * h + frame * vy) % h) + h) % h);
			const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / (20 + i) + i));
			return <circle key={i} cx={x} cy={y} r={1.5 + random(`${seed}-r-${i}`) * 2.2} fill={color} opacity={0.5 * tw} />;
		})}
	</g>
);

/** 碎屑：从一条线上崩落，受重力落到地面后淡出 */
export const Debris: React.FC<{
	frame: number;
	start: number;
	from: {l: number; r: number; y: number};
	floor: number;
	count?: number;
	color: string;
	seed: string;
}> = ({frame, start, from, floor, count = 40, color, seed}) => {
	const t = frame - start;
	if (t < 0 || t > 90) {
		return null;
	}
	return (
		<g>
			{new Array(count).fill(0).map((_, i) => {
				const delay = random(`${seed}-d-${i}`) * 10;
				const tt = Math.max(0, t - delay);
				const x0 = lerp(from.l, from.r, random(`${seed}-x-${i}`));
				const vx = (random(`${seed}-vx-${i}`) - 0.5) * 3;
				const vy = random(`${seed}-vy-${i}`) * 2;
				const y = Math.min(floor - 3, from.y + vy * tt + 0.35 * tt * tt);
				const x = x0 + vx * tt;
				const landed = y >= floor - 3.5;
				const size = 2 + random(`${seed}-s-${i}`) * 4;
				const fade = 1 - clamp((t - 40) / 40);
				return (
					<rect
						key={i}
						x={x - size / 2}
						y={y - size / 2}
						width={size}
						height={size}
						fill={color}
						opacity={(tt > 0 ? 1 : 0) * fade * (landed ? 0.5 : 0.9)}
						transform={`rotate(${tt * 9 * (i % 2 ? 1 : -1)} ${x} ${y})`}
					/>
				);
			})}
		</g>
	);
};

/** 从圆散开、飘向目标区域的粒子 */
export const Scatter: React.FC<{
	frame: number;
	start: number;
	end: number;
	from: {cx: number; cy: number; r: number};
	to: {l: number; t: number; r: number; b: number};
	count?: number;
	color: string;
	seed: string;
}> = ({frame, start, end, from, to, count = 70, color, seed}) => {
	if (frame < start || frame > end + 20) {
		return null;
	}
	return (
		<g>
			{new Array(count).fill(0).map((_, i) => {
				const lag = random(`${seed}-lag-${i}`) * 0.35;
				const p = EASE(clamp((frame - start) / (end - start) - lag, 0, 1) / (1 - lag));
				const a = random(`${seed}-a-${i}`) * Math.PI * 2;
				const rr = Math.sqrt(random(`${seed}-r-${i}`)) * from.r;
				const x0 = from.cx + Math.cos(a) * rr;
				const y0 = from.cy + Math.sin(a) * rr;
				const x1 = lerp(to.l, to.r, random(`${seed}-tx-${i}`));
				const y1 = lerp(to.t, to.b, random(`${seed}-ty-${i}`));
				const arc = Math.sin(p * Math.PI) * (random(`${seed}-arc-${i}`) - 0.5) * 160;
				const fadeOut = 1 - clamp((frame - end) / 20);
				return (
					<circle
						key={i}
						cx={lerp(x0, x1, p)}
						cy={lerp(y0, y1, p) + arc}
						r={2 + random(`${seed}-s-${i}`) * 4}
						fill={color}
						opacity={0.85 * fadeOut}
					/>
				);
			})}
		</g>
	);
};
