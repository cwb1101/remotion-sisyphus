import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COLORS, DATA, Highlight, splitLines} from '../data/script';
import {ramp} from '../lib/anim';
import {C, FONT, SAFE} from '../theme';

// 主字幕：固定在画面下方居中，不跟镜头。正文白色，重点词用强调色。

const renderLine = (line: string, highlights: Highlight[]) => {
	const parts: React.ReactNode[] = [];
	let rest = line;
	let key = 0;
	while (rest.length) {
		let hit: {i: number; h: Highlight} | null = null;
		for (const h of highlights) {
			const i = rest.indexOf(h.word);
			if (i >= 0 && (!hit || i < hit.i)) {
				hit = {i, h};
			}
		}
		if (!hit) {
			parts.push(<span key={key++}>{rest}</span>);
			break;
		}
		if (hit.i > 0) {
			parts.push(<span key={key++}>{rest.slice(0, hit.i)}</span>);
		}
		parts.push(
			<span key={key++} style={{color: COLORS[hit.h.color]}}>
				{hit.h.word}
			</span>,
		);
		rest = rest.slice(hit.i + hit.h.word.length);
	}
	return parts;
};

export const Subtitle: React.FC<{frame: number}> = ({frame}) => {
	const s = DATA.screens.find((x) => frame >= x.start && frame < x.end);
	const {left, width, bottom, fontSize, lineHeight} = SAFE.subtitle;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* 底部暗色渐变带 */}
			<AbsoluteFill
				style={{
					top: 700,
					background: 'linear-gradient(180deg, rgba(8,9,12,0) 0%, rgba(8,9,12,0.55) 45%, rgba(8,9,12,0.78) 100%)',
				}}
			/>
			{s ? (
				<div
					style={{
						position: 'absolute',
						left,
						width,
						bottom,
						textAlign: 'center',
						fontFamily: FONT,
						fontWeight: 700,
						fontSize,
						lineHeight,
						letterSpacing: '0.02em',
						color: C.text,
						textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7)',
						opacity: Math.min(ramp(frame, s.start, s.start + 5), 1 - ramp(frame, s.end - 4, s.end)),
						transform: `translateY(${10 * (1 - ramp(frame, s.start, s.start + 7))}px)`,
					}}
				>
					{splitLines(s.text).map((line, i) => (
						<div key={i} style={{whiteSpace: 'nowrap'}}>
							{renderLine(line, s.highlights)}
						</div>
					))}
				</div>
			) : null}
		</AbsoluteFill>
	);
};
