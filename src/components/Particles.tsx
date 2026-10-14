import React from 'react';
import {rand} from '../lib/anim';

/** 世界空间里缓慢上浮的微光（保证画面任何时刻都在动） */
export const Motes: React.FC<{frame: number; x0: number; x1: number; count: number; seed?: number}> = ({
	frame,
	x0,
	x1,
	count,
	seed = 1,
}) => (
	<g>
		{Array.from({length: count}).map((_, i) => {
			const r1 = rand(i * 3.1 + seed);
			const r2 = rand(i * 7.7 + seed * 2);
			const r3 = rand(i * 11.3 + seed * 3);
			const x = x0 + r1 * (x1 - x0) + Math.sin(frame * 0.01 + i) * 18;
			const span = 900;
			const y = 60 + ((r2 * span - frame * (0.25 + r3 * 0.5)) % span + span) % span;
			const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame * 0.05 + i * 2.3));
			return <circle key={i} cx={x} cy={y} r={1.5 + r3 * 2.5} fill="#BFE6FF" opacity={tw * 0.6} />;
		})}
	</g>
);

/** 水面以下上浮的气泡 */
export const Bubbles: React.FC<{frame: number; x0: number; x1: number; waterY: number; count: number; opacity: number}> = ({
	frame,
	x0,
	x1,
	waterY,
	count,
	opacity,
}) => (
	<g opacity={opacity}>
		{Array.from({length: count}).map((_, i) => {
			const x = x0 + rand(i * 5.3) * (x1 - x0) + Math.sin(frame * 0.06 + i) * 6;
			const depth = 260;
			const y = waterY + 12 + (((rand(i * 9.1) * depth - frame * (0.6 + rand(i) * 0.8)) % depth) + depth) % depth;
			return (
				<circle key={i} cx={x} cy={y} r={2 + rand(i * 2.2) * 3} fill="none" stroke="#9EDFFF" strokeWidth={1.5} opacity={0.45} />
			);
		})}
	</g>
);

/** 一次性的粒子迸溅（带重力） */
export const Burst: React.FC<{frame: number; at: number; x: number; y: number; count: number; power: number; color?: string}> = ({
	frame,
	at,
	x,
	y,
	count,
	power,
	color = '#9EDFFF',
}) => {
	const t = frame - at;
	if (t < 0 || t > 50) {
		return null;
	}
	return (
		<g>
			{Array.from({length: count}).map((_, i) => {
				const a = Math.PI * (1.05 + rand(i * 1.9) * 0.9);
				const v = power * (0.4 + rand(i * 4.4) * 0.8);
				const px = x + Math.cos(a) * v * t;
				const py = y + Math.sin(a) * v * t + 0.35 * t * t;
				if (py > y + 4) {
					return null;
				}
				return <circle key={i} cx={px} cy={py} r={2 + rand(i * 6.6) * 3.5} fill={color} opacity={Math.max(0, 1 - t / 45)} />;
			})}
		</g>
	);
};
