import React, {useMemo} from 'react';
import {random, useCurrentFrame} from 'remotion';
import {px, useCamera} from '../camera/Camera';
import {palette} from '../theme';
import {clamp01, type Ellipse, TAU, wobble} from './geometry';
import {OrbitArc} from './Orbit';

/** 冲击波：一圈向外扩散、逐渐变淡的透视椭圆（世界坐标） */
export const Shockwave: React.FC<{e: Ellipse; f0: number; dur?: number; grow?: number; color?: string; width?: number}> = ({
	e,
	f0,
	dur = 34,
	grow = 3,
	color = palette.gold,
	width = 1.6,
}) => {
	const frame = useCurrentFrame();
	const t = (frame - f0) / dur;
	if (t < 0 || t > 1) return null;
	const k = 1 + (grow - 1) * (1 - (1 - t) ** 3);
	return (
		<>
			<OrbitArc e={{...e, rx: e.rx * k, ry: e.ry * k}} from={0} to={TAU} color={color} width={width * (1 - t * 0.5)} opacity={(1 - t) ** 2} />
			<OrbitArc
				e={{...e, rx: e.rx * k * 0.86, ry: e.ry * k * 0.86}}
				from={0}
				to={TAU}
				color={palette.goldDim}
				width={1}
				opacity={0.6 * (1 - t) ** 2}
			/>
		</>
	);
};

/**
 * 粒子散开 / 聚拢（世界坐标）
 * mode = 'burst'：从矩形区域散开淡出；'gather'：从四周聚拢到矩形区域
 */
export const ParticleBurst: React.FC<{
	x: number;
	y: number;
	w: number;
	h: number;
	f0: number;
	life?: number;
	count?: number;
	speed?: number;
	mode?: 'burst' | 'gather';
	color?: string;
	seed?: string;
	size?: number;
}> = ({x, y, w, h, f0, life = 26, count = 46, speed = 2.4, mode = 'burst', color = palette.gold, seed = 'pb', size = 1.6}) => {
	const frame = useCurrentFrame();
	const cam = useCamera();
	const parts = useMemo(
		() =>
			new Array(count).fill(0).map((_, i) => {
				const a = random(`${seed}a${i}`) * TAU;
				return {
					x: x + (random(`${seed}x${i}`) - 0.5) * w,
					y: y + (random(`${seed}y${i}`) - 0.5) * h,
					vx: Math.cos(a) * speed * (0.4 + random(`${seed}v${i}`)),
					vy: Math.sin(a) * speed * (0.4 + random(`${seed}w${i}`)) - 0.4,
					s: 0.6 + random(`${seed}s${i}`) * 0.9,
					d: random(`${seed}d${i}`) * 6,
				};
			}),
		[x, y, w, h, count, speed, seed],
	);
	const t0 = frame - f0;
	if (t0 < 0 || t0 > life + 8) return null;
	return (
		<g>
			{parts.map((p, i) => {
				const tt = clamp01((t0 - p.d) / life);
				if (tt <= 0 || tt >= 1) return null;
				const k = mode === 'burst' ? tt : 1 - tt;
				const travel = (1 - (1 - k) ** 2) * life;
				const a = mode === 'burst' ? (1 - tt) ** 1.5 : tt ** 0.7 * (1 - Math.max(0, tt - 0.85) / 0.15);
				return (
					<circle
						key={i}
						cx={p.x + p.vx * travel}
						cy={p.y + p.vy * travel}
						r={px(cam, size * p.s, 0.3)}
						fill={i % 3 === 0 ? palette.goldHi : color}
						opacity={a}
					/>
				);
			})}
		</g>
	);
};

/** 未知区：一团无规律漂移的暗粒子云（不加外层光晕） */
export const UnknownCloud: React.FC<{x: number; y: number; w: number; h: number; opacity: number; chaos?: number; count?: number; seed?: string}> = ({
	x,
	y,
	w,
	h,
	opacity,
	chaos = 1,
	count = 70,
	seed = 'uc',
}) => {
	const frame = useCurrentFrame();
	const cam = useCamera();
	const parts = useMemo(
		() =>
			new Array(count).fill(0).map((_, i) => ({
				x: (random(`${seed}x${i}`) - 0.5) * w,
				y: (random(`${seed}y${i}`) - 0.5) * h,
				s: 0.5 + random(`${seed}s${i}`) * 1.2,
				a: 0.25 + random(`${seed}a${i}`) * 0.6,
				k: random(`${seed}k${i}`) * 100,
			})),
		[count, w, h, seed],
	);
	if (opacity <= 0.001) return null;
	return (
		<g opacity={opacity}>
			{parts.map((p, i) => {
				const jx = wobble(p.k, frame * 0.09 * chaos) * 26 * chaos;
				const jy = wobble(p.k + 9, frame * 0.08 * chaos) * 20 * chaos;
				const blink = 0.6 + 0.4 * Math.sin(frame * 0.07 + p.k);
				return <circle key={i} cx={x + p.x + jx} cy={y + p.y + jy} r={px(cam, p.s, 0.3)} fill={palette.goldDim} opacity={p.a * blink} />;
			})}
		</g>
	);
};
