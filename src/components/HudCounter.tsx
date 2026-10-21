import React from 'react';
import {useCurrentFrame} from 'remotion';
import {fonts, palette} from '../theme';
import {clamp01, easeOut} from './geometry';
import {Glow} from './Glow';

/** 滚动数字（里程表式），每一位独立滚动 */
export const RollingNumber: React.FC<{value: number; digits: number; size: number; color?: string}> = ({
	value,
	digits,
	size,
	color = palette.goldHi,
}) => {
	const cols = [];
	for (let k = digits - 1; k >= 0; k--) {
		const p = 10 ** k;
		const whole = Math.floor(value / p);
		let pos = whole % 10;
		const rem = value - whole * p;
		if (k === 0) pos += value - Math.floor(value);
		else if (rem > p - 1) pos += rem - (p - 1);
		cols.push(
			<div key={k} style={{height: size, overflow: 'hidden', width: size * 0.5, position: 'relative'}}>
				<div style={{transform: `translateY(${-pos * size}px)`}}>
					{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
						<div key={i} style={{height: size, lineHeight: `${size}px`, textAlign: 'center'}}>
							{d}
						</div>
					))}
				</div>
			</div>,
		);
	}
	return (
		<div style={{display: 'flex', fontFamily: fonts.number, fontWeight: 600, fontSize: size, color, fontVariantNumeric: 'tabular-nums'}}>
			{cols}
		</div>
	);
};

/**
 * HUD 标注：左边一条竖直金色短线 + 中文名 + 小号英文 + 滚动计数器 / 状态条（屏幕坐标）
 */
export const HudCounter: React.FC<{
	x: number;
	y: number;
	label: string;
	labelEn: string;
	appear: number;
	/** 计数值（不传则不显示数字） */
	value?: number;
	digits?: number;
	numberSize?: number;
	/** 状态条 0–1（不传则不显示） */
	bar?: number;
	barColor?: string;
	opacity?: number;
	glowStrength?: number;
}> = ({x, y, label, labelEn, appear, value, digits = 2, numberSize = 64, bar, barColor = palette.goldDim, opacity = 1, glowStrength = 1}) => {
	const frame = useCurrentFrame();
	const t = clamp01((frame - appear) / 14);
	if (t <= 0 || opacity <= 0.001) return null;
	const lineH = 30 + (value !== undefined ? numberSize : 0) + (bar !== undefined ? 22 : 0);
	return (
		<div style={{position: 'absolute', left: x, top: y, opacity: t * opacity, transform: `translateY(${(1 - easeOut(t)) * 10}px)`}}>
			<div style={{position: 'absolute', left: 0, top: 2}}>
				<Glow fill={false} strength={glowStrength}>
					<div style={{width: 2, height: lineH * easeOut(t), background: palette.gold}} />
				</Glow>
			</div>
			<div style={{marginLeft: 16}}>
				<div style={{fontFamily: fonts.sansCn, fontWeight: 400, fontSize: 18, color: palette.text, letterSpacing: '0.08em'}}>{label}</div>
				<div style={{fontFamily: fonts.mono, fontSize: 11, color: palette.goldDim, letterSpacing: '0.3em', marginTop: 3}}>{labelEn}</div>
				{value !== undefined ? (
					<div style={{marginTop: 6}}>
						<Glow fill={false} strength={glowStrength}>
							<RollingNumber value={value} digits={digits} size={numberSize} />
						</Glow>
					</div>
				) : null}
				{bar !== undefined ? (
					<div style={{marginTop: 10, width: 180, height: 3, background: 'rgba(155,119,70,0.18)', position: 'relative'}}>
						<Glow fill={false} strength={glowStrength * 0.6} style={{position: 'absolute', left: 0, top: 0}}>
							<div style={{width: 180 * bar, height: 3, background: barColor}} />
						</Glow>
					</div>
				) : null}
			</div>
		</div>
	);
};
