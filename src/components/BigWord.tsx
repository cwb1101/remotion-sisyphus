import React from 'react';
import {clamp01, easeIn, prog} from '../lib/anim';
import {FONT} from '../theme';

/**
 * 关键句大字：从画面上方加速砸下，落地时压扁回弹。
 * (x, baseline) 为世界坐标；只允许放在画面中部或偏左，不进右侧禁字区（由调用方保证）。
 */
export const BigWord: React.FC<{
	frame: number;
	text: string;
	color: string;
	x: number;
	baseline: number;
	size: number;
	dropAt: number;
	hitAt: number;
	/** 开始淡出的帧与时长 */
	outAt?: number;
	outDur?: number;
	/** 淡出时往下沉的距离 */
	sink?: number;
}> = ({frame: f, text, color, x, baseline, size, dropAt, hitAt, outAt, outDur = 20, sink = 0}) => {
	if (f < dropAt) return null;
	const out = outAt === undefined ? 0 : prog(f, outAt, outAt + outDur);
	if (out >= 1) return null;
	const dy = f >= hitAt ? 0 : -760 * (1 - easeIn(prog(f, dropAt, hitAt, (t) => t)));
	const t = f - hitAt;
	const squash = t >= 0 && t < 14 ? 1 - 0.12 * Math.exp(-t / 3) * Math.cos(t * 0.9) : 1;
	return (
		<g
			transform={`translate(${x},${baseline + dy + sink * out}) scale(${1 + (1 - squash) * 0.5},${squash})`}
			opacity={1 - out}
		>
			<text
				textAnchor="middle"
				fontFamily={FONT}
				fontWeight={900}
				fontSize={size}
				fill={color}
				opacity={0.55 * clamp01(t >= 0 ? 1 : 0.3)}
				filter="url(#bigGlow)"
			>
				{text}
			</text>
			<text textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={size} fill={color}>
				{text}
			</text>
		</g>
	);
};
