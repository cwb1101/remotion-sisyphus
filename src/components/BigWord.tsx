import React from 'react';
import {AbsoluteFill, spring} from 'remotion';
import {clamp, ramp, visible} from '../lib/anim';
import {FPS} from '../data/script';
import {C, FONT, SAFE} from '../theme';

// 舞台大字（屏幕坐标，不随镜头缩放）：只放在画面中部或偏左，
// 不进右侧禁字区，也不压到底部字幕区；越界直接报错，渲染会失败。

export type BigWordProps = {
	frame: number;
	text: string;
	color: string;
	left: number;
	top: number;
	size: number;
	from: number;
	to: number;
	variant?: 'slam' | 'drop';
	/** 全屏级别的冲击：压暗四周 + 一次色光闪 */
	impact?: boolean;
	/** 被一刀劈开：右半边掉落 */
	slashAt?: number;
	slashColor?: string;
};

export const BigWord: React.FC<BigWordProps> = ({
	frame,
	text,
	color,
	left,
	top,
	size,
	from,
	to,
	variant = 'drop',
	impact = false,
	slashAt,
	slashColor = C.cyan,
}) => {
	const width = text.length * size * 1.02;
	if (left < SAFE.textMinX || left + width > SAFE.textMaxX || top < SAFE.bigTextMinY || top + size * 1.2 > SAFE.bigTextMaxY) {
		throw new Error(`舞台大字「${text}」越出安全区：x ${left}–${Math.round(left + width)}, y ${top}–${Math.round(top + size * 1.2)}`);
	}
	if (frame < from || frame >= to) {
		return null;
	}
	const t = frame - from;
	const vis = visible(frame, from, to, 3, 10);
	const sp = spring({frame: t, fps: FPS, config: variant === 'slam' ? {damping: 13, stiffness: 210, mass: 0.7} : {damping: 16, stiffness: 140, mass: 0.8}});
	const scale = variant === 'slam' ? 2.1 - 1.1 * sp : 1;
	const ty = variant === 'slam' ? 0 : (1 - sp) * -70;
	const blur = variant === 'slam' ? Math.max(0, 10 * (1 - t / 6)) : Math.max(0, 6 * (1 - t / 8));
	const settle = variant === 'slam' && t > 6 ? 5 * Math.exp(-(t - 6) / 5) * Math.sin(t * 2.4) : 0;
	const exitLift = -18 * ramp(frame, to - 10, to);
	const drift = 0.012 * t; // 停住后仍在极缓慢地放大

	const slash = slashAt !== undefined ? clamp((frame - slashAt) / 6) : 0;
	const fall = slashAt !== undefined ? clamp((frame - slashAt - 4) / 22) : 0;

	const style: React.CSSProperties = {
		position: 'absolute',
		left,
		top,
		fontFamily: FONT,
		fontWeight: 900,
		fontSize: size,
		lineHeight: 1.2,
		letterSpacing: '0.02em',
		color,
		whiteSpace: 'nowrap',
		textShadow: '0 8px 36px rgba(0,0,0,0.65)',
		transformOrigin: '30% 60%',
		transform: `translate(${settle}px, ${ty + exitLift}px) scale(${scale + drift * 0.01})`,
		filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
		opacity: vis,
	};

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{impact ? (
				<>
					<AbsoluteFill style={{background: 'radial-gradient(ellipse at 40% 40%, rgba(0,0,0,0) 30%, rgba(5,6,8,0.55) 100%)', opacity: vis}} />
					<AbsoluteFill style={{backgroundColor: color, opacity: 0.2 * Math.max(0, 1 - t / 9)}} />
				</>
			) : null}
			{slashAt === undefined ? (
				<div style={style}>{text}</div>
			) : (
				<>
					<div style={{...style, clipPath: 'polygon(0 0, 54% 0, 46% 100%, 0 100%)'}}>{text}</div>
					<div
						style={{
							...style,
							clipPath: 'polygon(54% 0, 100% 0, 100% 100%, 46% 100%)',
							transform: `${style.transform} translate(${fall * 30}px, ${fall * fall * 260}px) rotate(${fall * 14}deg)`,
							opacity: vis * (1 - fall),
						}}
					>
						{text}
					</div>
					{slash > 0 ? (
						<svg style={{position: 'absolute', left: 0, top: 0}} width={1920} height={1080}>
							<line
								x1={left + width * 0.6}
								y1={top - 20}
								x2={left + width * 0.6 - (width * 0.2 + 40) * slash}
								y2={top - 20 + (size * 1.2 + 40) * slash}
								stroke={slashColor}
								strokeWidth={8}
								strokeLinecap="round"
								opacity={vis * (1 - fall * 0.8)}
							/>
						</svg>
					) : null}
				</>
			)}
		</AbsoluteFill>
	);
};
