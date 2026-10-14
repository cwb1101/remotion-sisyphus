import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Screen, SCREENS} from '../data/script';
import {C, FONT, SAFE} from '../theme';

const FADE_IN = 4;
const FADE_OUT = 4;

/** 与下一屏首尾相接时直接换字，不淡出，避免两屏之间出现空白 */
const joinsNext = (s: Screen, lastFrame: number) =>
	SCREENS.some((n) => n.startFrame === s.endFrame && n.endFrame <= lastFrame);
const joinsPrev = (s: Screen) => SCREENS.some((p) => p.endFrame === s.startFrame);

const splitHighlights = (s: Screen) => {
	type Part = {text: string; color: string};
	let parts: Part[] = [{text: s.text, color: C.white}];
	for (const h of s.highlights) {
		const next: Part[] = [];
		for (const p of parts) {
			if (p.color !== C.white || !p.text.includes(h.word)) {
				next.push(p);
				continue;
			}
			const i = p.text.indexOf(h.word);
			if (i > 0) next.push({text: p.text.slice(0, i), color: C.white});
			next.push({text: h.word, color: h.color});
			const rest = p.text.slice(i + h.word.length);
			if (rest) next.push({text: rest, color: C.white});
		}
		parts = next;
	}
	return parts;
};

/**
 * 主字幕：固定在画面底部居中，不受镜头影响。
 * 字幕块 x 360–1560、底边距画面底部 80px、最多两行。
 */
export const Subtitles: React.FC<{lastFrame: number}> = ({lastFrame}) => {
	const frame = useCurrentFrame();
	const active = SCREENS.find(
		(s) => s.endFrame <= lastFrame && frame >= s.startFrame && frame < s.endFrame,
	);
	const visible = SCREENS.some((s) => s.endFrame <= lastFrame && frame >= s.startFrame - 10 && frame < s.endFrame + 10);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* 底部暗色渐变带：保证亮背景上白字可读 */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					height: 330,
					background:
						'linear-gradient(to bottom, rgba(6,12,22,0) 0%, rgba(6,12,22,0.38) 45%, rgba(6,12,22,0.62) 100%)',
					opacity: visible ? 1 : 0,
				}}
			/>
			{active ? <Line s={active} frame={frame} lastFrame={lastFrame} /> : null}
		</AbsoluteFill>
	);
};

const Line: React.FC<{s: Screen; frame: number; lastFrame: number}> = ({s, frame, lastFrame}) => {
	// 片头第一屏从第 0 帧就完整显示（封面帧有字）
	const inFrom = s.startFrame === 0 ? 1 : joinsPrev(s) ? 0.55 : 0;
	const outTo = joinsNext(s, lastFrame) ? 1 : 0;
	const opacity = interpolate(
		frame,
		[s.startFrame, s.startFrame + FADE_IN, s.endFrame - FADE_OUT, s.endFrame],
		[inFrom, 1, 1, outTo],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	const rise = interpolate(frame, [s.startFrame, s.startFrame + FADE_IN + 3], [s.startFrame === 0 ? 0 : 10, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<div
			data-subtitle={s.id}
			style={{
				position: 'absolute',
				left: SAFE.subLeft,
				width: SAFE.subWidth,
				bottom: SAFE.subBottom,
				display: 'flex',
				justifyContent: 'center',
				opacity,
				transform: `translateY(${rise}px)`,
			}}
		>
			<div
				style={{
					maxWidth: SAFE.subWidth,
					textAlign: 'center',
					fontFamily: FONT,
					fontWeight: 700,
					fontSize: 66,
					lineHeight: 1.36,
					maxHeight: 66 * 1.36 * 2,
					overflow: 'hidden',
					color: C.white,
					textShadow: '0 2px 6px rgba(0,0,0,0.75), 0 0 18px rgba(0,0,0,0.45)',
					wordBreak: 'break-all',
				}}
			>
				{splitHighlights(s).map((p, i) => (
					<span key={i} style={{color: p.color}}>
						{p.text}
					</span>
				))}
			</div>
		</div>
	);
};
