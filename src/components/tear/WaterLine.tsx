import React from 'react';
import {clamp01, easeOut} from '../../lib/anim';

/** 一次落水造成的水面扰动 */
export interface Splash {
	x: number;
	frame: number;
	/** 振幅（世界像素） */
	amp: number;
	/** 是否画出水面上的椭圆涟漪 */
	rings?: boolean;
}

const WAVE_SPEED = 26; // 像素/帧
const WAVE_K = 0.045;

const splashOffset = (x: number, frame: number, s: Splash) => {
	const t = frame - s.frame;
	if (t < 0) {
		return 0;
	}
	const d = Math.abs(x - s.x);
	const front = t * WAVE_SPEED;
	if (d > front) {
		return 0;
	}
	const env = Math.exp(-t / 22) * Math.exp(-d / 700);
	return s.amp * env * Math.sin(WAVE_K * d - t * 0.55);
};

/**
 * 贯穿物件 · 水位线。泪滴落地后从落点向两侧铺开，成为贯穿全片的水平线。
 * 线在 spread 前是一条极淡的地平线。
 */
export const WaterLine: React.FC<{
	frame: number;
	y: number;
	x0: number;
	x1: number;
	/** 蓝线从 origin 开始铺开的帧与铺完的帧 */
	origin: {x: number; start: number; end: number};
	splashes: Splash[];
	/** 水面以下的水体亮度 0..1 */
	body: number;
}> = ({frame, y, x0, x1, origin, splashes, body}) => {
	const step = 10;
	const pts: string[] = [];
	for (let x = x0; x <= x1; x += step) {
		let dy = 1.6 * Math.sin(x * 0.012 + frame * 0.07) + 1.1 * Math.sin(x * 0.027 - frame * 0.05);
		for (const s of splashes) {
			dy += splashOffset(x, frame, s);
		}
		pts.push(`${x.toFixed(1)},${(y + dy).toFixed(1)}`);
	}
	const linePath = `M ${pts.join(' L ')}`;
	const spread = easeOut(clamp01((frame - origin.start) / (origin.end - origin.start)));
	const reach = Math.max(origin.x - x0, x1 - origin.x) * spread;
	const clipL = origin.x - reach;
	const clipW = reach * 2;
	return (
		<g>
			{/* 水体 */}
			<rect x={x0} y={y} width={x1 - x0} height={1400} fill="url(#waterBody)" opacity={body} />
			{/* 未铺开时的淡地平线 */}
			<path d={linePath} fill="none" stroke="#8FB3D9" strokeOpacity={0.14} strokeWidth={2} />
			<clipPath id="waterSpread">
				<rect x={clipL} y={y - 400} width={Math.max(0, clipW)} height={800} />
			</clipPath>
			<g clipPath="url(#waterSpread)">
				<path d={linePath} fill="none" stroke="#5CC8FF" strokeWidth={9} opacity={0.55} filter="url(#lineGlow)" />
				<path d={linePath} fill="none" stroke="#9EDFFF" strokeWidth={3} />
			</g>
			{splashes
				.filter((s) => s.rings && frame >= s.frame && frame < s.frame + 50)
				.map((s) => (
					<Rings key={`${s.x}-${s.frame}`} x={s.x} y={y} t={frame - s.frame} amp={s.amp} />
				))}
		</g>
	);
};

const Rings: React.FC<{x: number; y: number; t: number; amp: number}> = ({x, y, t, amp}) => {
	const scale = 0.5 + amp / 14;
	return (
		<g>
			{[0, 7, 14].map((d) => {
				const tt = t - d;
				if (tt < 0) {
					return null;
				}
				const rx = (12 + tt * 5.5) * scale;
				const op = Math.max(0, 1 - tt / 36) * 0.8;
				return (
					<ellipse
						key={d}
						cx={x}
						cy={y}
						rx={rx}
						ry={rx * 0.16}
						fill="none"
						stroke="#9EDFFF"
						strokeWidth={2.2}
						opacity={op}
					/>
				);
			})}
		</g>
	);
};
