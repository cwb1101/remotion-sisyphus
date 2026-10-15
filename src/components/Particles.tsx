import React from 'react';
import {random} from 'remotion';

// 屏幕空间的漂浮微尘：让任何"静止"镜头里都有缓慢的运动
export const Motes: React.FC<{
	frame: number;
	count?: number;
	color?: string;
	opacity?: number;
	seed?: string;
	rise?: number;
}> = ({frame, count = 40, color = '#AEB7D6', opacity = 0.35, seed = 'm', rise = 0.4}) => (
	<g>
		{Array.from({length: count}).map((_, i) => {
			const x0 = random(`${seed}x${i}`) * 1920;
			const y0 = random(`${seed}y${i}`) * 1080;
			const sp = 0.3 + random(`${seed}s${i}`) * 0.8;
			const x = (x0 + Math.sin(frame / 50 + i) * 30 + frame * 0.25 * sp + 1920) % 1920;
			const y = (((y0 - frame * rise * sp) % 1080) + 1080) % 1080;
			const r = 1 + random(`${seed}r${i}`) * 2.2;
			const tw = 0.5 + 0.5 * Math.sin(frame / 20 + i * 1.3);
			return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={opacity * (0.4 + 0.6 * tw)} />;
		})}
	</g>
);

// 金色光尘：从一条线（例如裂缝）附近升起
export const GoldDust: React.FC<{
	frame: number;
	start: number;
	count?: number;
	color?: string;
	amount?: number;
	area?: {x0: number; x1: number; y0: number; y1: number};
	seed?: string;
}> = ({frame, start, count = 90, color = '#FFC24A', amount = 1, area = {x0: 0, x1: 1920, y0: 400, y1: 700}, seed = 'g'}) => {
	if (frame < start || amount <= 0) {
		return null;
	}
	const t = frame - start;
	return (
		<g>
			{Array.from({length: count}).map((_, i) => {
				const delay = random(`${seed}d${i}`) * 40;
				const life = 50 + random(`${seed}l${i}`) * 50;
				const lt = (t - delay) / life;
				if (lt < 0 || lt > 1) {
					return null;
				}
				const x = area.x0 + random(`${seed}x${i}`) * (area.x1 - area.x0) + Math.sin(t / 14 + i) * 12;
				const y = area.y0 + random(`${seed}y${i}`) * (area.y1 - area.y0) - lt * (120 + random(`${seed}v${i}`) * 220);
				const r = 1.5 + random(`${seed}r${i}`) * 3;
				const o = Math.sin(lt * Math.PI) * amount;
				return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={o * 0.9} />;
			})}
		</g>
	);
};
