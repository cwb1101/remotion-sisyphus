import React from 'react';
import {Easing, interpolate, random} from 'remotion';
import {colorOf, Impact} from '../data/script';
import {FONT_FAMILY, LAYOUT} from '../theme';

// 砸下来的大字：只出现在画面中部偏左（x 200–1400），不进右侧禁字带，也不压底部字幕。
// shatterAt（相对落地起点的帧数）给定时，字会碎成黑色碎片飞向 target（屏幕坐标，通常是黑石）。
type Props = {
	impact: Impact;
	// 本屏起始帧（绝对帧）
	screenStart: number;
	frame: number;
	size?: number;
	centerY?: number;
	shatterAt?: number;
	target?: {x: number; y: number};
	fadeOutAt?: number;
	glow?: boolean;
};

export const DROP = 6;

export const ImpactWord: React.FC<Props> = ({
	impact,
	screenStart,
	frame,
	size = 190,
	centerY = 430,
	shatterAt,
	target,
	fadeOutAt,
	glow = false,
}) => {
	const t0 = screenStart + impact.offset;
	const t = frame - t0;
	if (t < 0) {
		return null;
	}
	const color = colorOf(impact.color);
	const chars = impact.text.length;
	const left = LAYOUT.impactLeft + 40;
	const width = Math.min(LAYOUT.impactRight - left, chars * size * 1.04);
	const cx = left + width / 2;

	// 下落（加速）→ 落地压扁 → 回弹
	const fall = interpolate(t, [0, DROP], [-520, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.in(Easing.quad),
	});
	const squash = t >= DROP ? Math.exp(-(t - DROP) / 3) * Math.cos((t - DROP) * 1.2) : 0;
	const sy = 1 - 0.16 * squash;
	const sx = 1 + 0.1 * squash;

	let wordOpacity = interpolate(t, [0, 2], [0, 1], {extrapolateRight: 'clamp'});
	if (shatterAt !== undefined) {
		wordOpacity *= interpolate(t, [shatterAt, shatterAt + 3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	}
	if (fadeOutAt !== undefined) {
		wordOpacity *= interpolate(t, [fadeOutAt, fadeOutAt + 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	}

	// 落地冲击波（屏幕空间）
	const ringT = t - DROP;
	const ring =
		ringT >= 0 && ringT < 22 ? (
			<ellipse
				cx={cx}
				cy={centerY + size * 0.45}
				rx={width * 0.35 + ringT * 34}
				ry={18 + ringT * 6}
				fill="none"
				stroke={color}
				strokeWidth={3}
				opacity={0.55 * (1 - ringT / 22)}
			/>
		) : null;

	// 碎片
	let shards: React.ReactNode = null;
	if (shatterAt !== undefined && target && t >= shatterAt) {
		const st = t - shatterAt;
		const n = 34;
		shards = Array.from({length: n}).map((_, i) => {
			const sx0 = left + random(`${impact.text}x${i}`) * width;
			const sy0 = centerY - size * 0.45 + random(`${impact.text}y${i}`) * size * 0.9;
			const delay = random(`${impact.text}d${i}`) * 6;
			const p = interpolate(st - delay, [0, 18], [0, 1], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
				easing: Easing.in(Easing.cubic),
			});
			if (p >= 1) {
				return null;
			}
			// 先往外炸开一点，再被吸向黑石
			const burst = interpolate(st - delay, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
			const ang = random(`${impact.text}a${i}`) * Math.PI * 2;
			const bx = sx0 + Math.cos(ang) * 60 * burst;
			const by = sy0 + Math.sin(ang) * 60 * burst;
			const x = bx + (target.x - bx) * p;
			const y = by + (target.y - by) * p - Math.sin(p * Math.PI) * 80;
			const k = 14 + random(`${impact.text}k${i}`) * 26;
			const sc = 1 - p * 0.7;
			const rot = st * (6 + i) * (i % 2 ? 1 : -1);
			const fill = p < 0.25 ? color : '#060606';
			return (
				<g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`}>
					<polygon
						points={`0,${-k} ${k * 0.8},${k * 0.6} ${-k * 0.7},${k * 0.5}`}
						fill={fill}
						stroke={color}
						strokeWidth={1.5}
						strokeOpacity={0.6 * (1 - p)}
					/>
				</g>
			);
		});
	}

	return (
		<>
			<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
				{ring}
				{shards}
			</svg>
			<div
				style={{
					position: 'absolute',
					left,
					width,
					top: centerY - size * 0.62,
					height: size * 1.24,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontFamily: FONT_FAMILY,
					fontWeight: 900,
					fontSize: size,
					lineHeight: 1,
					whiteSpace: 'nowrap',
					color,
					opacity: wordOpacity,
					transform: `translateY(${fall}px) scale(${sx}, ${sy})`,
					transformOrigin: '50% 100%',
					textShadow: glow
						? `0 0 40px ${color}, 0 0 90px rgba(255,194,74,0.45), 0 6px 18px rgba(0,0,0,0.7)`
						: '0 6px 24px rgba(0,0,0,0.75)',
				}}
			>
				{impact.text}
			</div>
		</>
	);
};
