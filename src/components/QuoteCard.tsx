import React from 'react';
import {useCurrentFrame} from 'remotion';
import {fonts, palette} from '../theme';
import {clamp01, easeIn, easeOut} from './geometry';
import {Glow} from './Glow';

/** 砸下来的大字：加速下落放大 → 落地瞬间光晕爆亮再回落 */
export const SlamText: React.FC<{
	text: string;
	impact: number;
	size: number;
	color?: string;
	font?: string;
	weight?: number;
	fall?: number;
	glowStrength?: number;
	outer?: boolean;
	opacity?: number;
	letterSpacing?: string;
}> = ({text, impact, size, color = palette.gold, font = fonts.titleCn, weight = 700, fall = 9, glowStrength = 1, outer = true, opacity = 1, letterSpacing = '0.06em'}) => {
	const frame = useCurrentFrame();
	const dt = frame - impact;
	if (dt < -fall || opacity <= 0.001) return null;
	let scale = 1;
	let o = 1;
	let blur = 0;
	let y = 0;
	let flash = 0;
	if (dt < 0) {
		const t = easeIn(1 + dt / fall);
		scale = 2.3 - 1.3 * t;
		o = t;
		blur = (1 - t) * 10;
		y = -(1 - t) * 50;
	} else {
		// 落地：轻微压扁回弹 + 光晕闪亮衰减
		scale = 1 - 0.035 * Math.exp(-dt / 4) * Math.cos(dt * 0.55);
		flash = Math.exp(-dt / 10);
	}
	return (
		<div style={{transform: `translateY(${y}px) scale(${scale})`, opacity: o * opacity, filter: blur > 0.2 ? `blur(${blur}px)` : undefined}}>
			<Glow fill={false} strength={glowStrength} outer={outer} inner={0.3} spread={1 + flash * 0.9}>
				<div style={{fontFamily: font, fontWeight: weight, fontSize: size, color, letterSpacing, whiteSpace: 'nowrap', lineHeight: 1.1}}>{text}</div>
			</Glow>
		</div>
	);
};

/** 中间亮、两端渐隐的分割线，从中心向两侧画出 */
export const Divider: React.FC<{width: number; progress: number; opacity?: number}> = ({width, progress, opacity = 1}) => {
	const w = width * easeOut(clamp01(progress));
	if (w < 1) return null;
	return (
		<Glow fill={false} opacity={opacity}>
			<div
				style={{
					width: w,
					height: 1.5,
					background: `linear-gradient(90deg, rgba(212,167,106,0) 0%, ${palette.gold} 35%, ${palette.goldHi} 50%, ${palette.gold} 65%, rgba(212,167,106,0) 100%)`,
				}}
			/>
		</Glow>
	);
};

/** 极小的等宽英文大写注释，逐字打出 */
export const MonoType: React.FC<{text: string; start: number; cps?: number; size?: number; color?: string; opacity?: number}> = ({
	text,
	start,
	cps = 1.1,
	size = 14,
	color = palette.goldDim,
	opacity = 1,
}) => {
	const frame = useCurrentFrame();
	const n = Math.max(0, Math.min(text.length, Math.floor((frame - start) * cps)));
	if (n <= 0) return null;
	const cursor = n < text.length && Math.floor(frame / 4) % 2 === 0;
	return (
		<div style={{fontFamily: fonts.mono, fontSize: size, color, letterSpacing: '0.34em', whiteSpace: 'pre', opacity}}>
			{text.slice(0, n)}
			<span
				style={{
					display: 'inline-block',
					width: size * 0.6,
					height: size * 0.95,
					marginLeft: 2,
					verticalAlign: 'middle',
					background: color,
					opacity: cursor ? 0.8 : 0,
				}}
			/>
		</div>
	);
};

/** 打字音效的帧（非空格字符，隔一个取一个，避免太密） */
export const monoTypeFrames = (text: string, start: number, cps = 1.1) => {
	const out: number[] = [];
	let last = -99;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === ' ') continue;
		const f = start + Math.ceil(i / cps);
		if (f - last >= 3) {
			out.push(f);
			last = f;
		}
	}
	return out;
};

/**
 * 引言卡：金色宋体标题 / 等宽英文注释 / 暖白衬线斜体引文 / 渐隐分割线
 * 由外部用 WorldHtml 钉在世界坐标上
 */
export const QuoteCard: React.FC<{
	title: string;
	en: string;
	quote: string;
	slam: number;
	typeStart: number;
	quoteStart: number;
	dividerStart: number;
	titleSize?: number;
	opacity?: number;
}> = ({title, en, quote, slam, typeStart, quoteStart, dividerStart, titleSize = 168, opacity = 1}) => {
	const frame = useCurrentFrame();
	const q = clamp01((frame - quoteStart) / 18);
	return (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', opacity}}>
			<SlamText text={title} impact={slam} size={titleSize} />
			<div style={{height: 26}} />
			<Divider width={640} progress={(frame - dividerStart) / 30} />
			<div style={{height: 26}} />
			<div style={{height: 20}}>
				<MonoType text={en} start={typeStart} />
			</div>
			<div style={{height: 22}} />
			<div
				style={{
					fontFamily: fonts.quote,
					fontStyle: 'italic',
					fontSize: 30,
					color: palette.text,
					opacity: q * 0.92,
					transform: `translateY(${(1 - easeOut(q)) * 8}px)`,
					letterSpacing: '0.02em',
					whiteSpace: 'nowrap',
				}}
			>
				{quote}
			</div>
		</div>
	);
};
