import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CHAPTERS, SCRIPT, chapterAt} from '../data/script';
import {easeIn, easeOut, lerp} from '../lib/anim';
import {COLORS, FONTS, LAYOUT} from '../theme';

const FLIP = 5;

// 左上角主题角标 期号 本期主题 当前章节名 换章时章节名翻牌
export const TopicBadge: React.FC = () => {
	const frame = useCurrentFrame();
	const chapter = chapterAt(frame);
	const prev = chapter.index > 0 ? CHAPTERS[chapter.index - 1] : undefined;
	const local = frame - chapter.start;
	const outAngle = lerp(local, 0, FLIP, 0, -90, easeIn);
	const inAngle = lerp(local, FLIP, FLIP * 2, 90, 0, easeOut);
	const showOld = prev && local < FLIP;
	const intro = lerp(frame, 0, 8, 0, 1);
	const name = (text: string, angle: number) => (
		<div
			className="txt"
			style={{
				fontFamily: FONTS.sansHeavy,
				fontSize: 36,
				lineHeight: '44px',
				color: COLORS.text,
				letterSpacing: 4,
				transform: `perspective(500px) rotateX(${angle}deg)`,
				transformOrigin: '50% 50%',
				backfaceVisibility: 'hidden',
			}}
		>
			{text}
		</div>
	);
	return (
		<div
			style={{
				position: 'absolute',
				left: LAYOUT.badge.left,
				top: LAYOUT.badge.top,
				width: 640,
				height: 80,
				opacity: intro,
				transform: `translateX(${(1 - intro) * -24}px)`,
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', gap: 12, height: 30}}>
				<span
					className="txt"
					style={{
						fontFamily: FONTS.smiley,
						fontSize: 22,
						color: COLORS.warm,
						border: `1px solid ${COLORS.warm}`,
						padding: '0 8px',
						lineHeight: '26px',
					}}
				>
					{SCRIPT.meta.episode}
				</span>
				<span
					className="txt"
					style={{fontFamily: FONTS.sans, fontSize: 24, color: 'rgba(255,255,255,0.82)', letterSpacing: 2}}
				>
					{SCRIPT.meta.title}
				</span>
			</div>
			<div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, height: 46}}>
				<div
					style={{
						width: 5,
						height: 34,
						background: COLORS.warm,
						transform: `scaleY(${showOld ? 1 - local / FLIP : lerp(local, FLIP, FLIP * 2, 0.2, 1)})`,
					}}
				/>
				{showOld ? name(prev.name, outAngle) : name(chapter.name, prev ? inAngle : 0)}
			</div>
		</div>
	);
};
