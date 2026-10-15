import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Screen, colorOf} from '../data/script';
import {FONT_FAMILY, LAYOUT} from '../theme';

// 把一屏字幕切成普通段和高亮段
export const splitHighlights = (s: Screen) => {
	type Seg = {text: string; color?: string};
	let segs: Seg[] = [{text: s.text}];
	for (const h of s.highlights) {
		const next: Seg[] = [];
		for (const seg of segs) {
			if (seg.color) {
				next.push(seg);
				continue;
			}
			const idx = seg.text.indexOf(h.word);
			if (idx < 0) {
				next.push(seg);
				continue;
			}
			if (idx > 0) next.push({text: seg.text.slice(0, idx)});
			next.push({text: h.word, color: colorOf(h.color)});
			if (idx + h.word.length < seg.text.length) next.push({text: seg.text.slice(idx + h.word.length)});
		}
		segs = next;
	}
	return segs;
};

const FADE = 4;

// 字幕层：固定在画面底部，不受镜头缩放/平移影响
export const Subtitles: React.FC<{screens: Screen[]}> = ({screens}) => {
	const frame = useCurrentFrame();
	const s = screens.find((x) => frame >= x.startFrame && frame < x.endFrame);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* 底部暗色渐变带：亮背景下也能看清白字 */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					height: 360,
					background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.55) 100%)',
				}}
			/>
			{s ? (
				<div
					key={s.id}
					style={{
						position: 'absolute',
						left: LAYOUT.subtitleLeft,
						width: LAYOUT.subtitleWidth,
						bottom: LAYOUT.subtitleBottom,
						textAlign: 'center',
						fontFamily: FONT_FAMILY,
						fontWeight: 700,
						fontSize: LAYOUT.subtitleFontSize,
						lineHeight: LAYOUT.subtitleLineHeight,
						color: colorOf('text'),
						letterSpacing: 2,
						textShadow: '0 2px 12px rgba(0,0,0,0.65), 0 0 3px rgba(0,0,0,0.85)',
						opacity: interpolate(
							frame,
							[s.startFrame, s.startFrame + FADE, s.endFrame - FADE, s.endFrame],
							[0, 1, 1, 0],
							{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
						),
						transform: `translateY(${interpolate(frame, [s.startFrame, s.startFrame + FADE + 2], [10, 0], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						})}px)`,
						// 最多两行
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					}}
				>
					{splitHighlights(s).map((seg, i) => (
						<span key={i} style={seg.color ? {color: seg.color} : undefined}>
							{seg.text}
						</span>
					))}
				</div>
			) : null}
		</AbsoluteFill>
	);
};
