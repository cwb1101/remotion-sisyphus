import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SECTIONS, TOPIC} from '../data/script';
import {fonts, palette, topicStyle} from '../theme';
import {clamp01, easeInOut} from './geometry';
import {Glow} from './Glow';

const SWITCH = 20;

/** 左上角固定主题标注：不跟镜头运动；换节时小标题平滑切换 */
export const TopicLabel: React.FC = () => {
	const frame = useCurrentFrame();
	const appear = clamp01((frame - 4) / 20);
	const idx = Math.max(
		0,
		SECTIONS.findIndex((s) => frame >= s.startFrame && frame < s.endFrame),
	);
	const cur = SECTIONS[idx];
	const prev = idx > 0 ? SECTIONS[idx - 1] : null;
	const t = easeInOut(clamp01((frame - cur.startFrame) / SWITCH));
	const row = (s: (typeof SECTIONS)[number], o: number, dy: number) => (
		<div
			key={s.id}
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				opacity: o,
				transform: `translateY(${dy}px)`,
				display: 'flex',
				alignItems: 'baseline',
				gap: 12,
				whiteSpace: 'nowrap',
			}}
		>
			<span style={{fontFamily: fonts.number, fontWeight: 600, fontSize: topicStyle.sectionSize, color: palette.goldDim}}>
				{String(s.index).padStart(2, '0')}
			</span>
			<span style={{fontFamily: fonts.sansCn, fontWeight: 400, fontSize: topicStyle.sectionSize, color: palette.gold}}>{s.title}</span>
			<span style={{fontFamily: fonts.mono, fontSize: topicStyle.enSize, color: palette.goldDim, letterSpacing: '0.3em'}}>{s.titleEn}</span>
		</div>
	);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div style={{position: 'absolute', left: topicStyle.left, top: topicStyle.top, opacity: appear * topicStyle.opacity}}>
				<div style={{position: 'absolute', left: 0, top: 3}}>
					<Glow fill={false} strength={0.7}>
						<div style={{width: 2, height: 58, background: palette.gold}} />
					</Glow>
				</div>
				<div style={{marginLeft: 16}}>
					<div style={{fontFamily: fonts.sansCn, fontWeight: 400, fontSize: topicStyle.topicSize, color: palette.text, letterSpacing: '0.06em', whiteSpace: 'nowrap'}}>
						{TOPIC}
					</div>
					<div style={{position: 'relative', height: 28, marginTop: 8}}>
						{prev && t < 1 ? row(prev, 1 - t, -10 * t) : null}
						{row(cur, prev ? t : 1, prev ? 10 * (1 - t) : 0)}
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
