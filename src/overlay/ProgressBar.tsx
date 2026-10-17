import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CHAPTERS, FILM_END, STRONG_FRAMES, chapterAt} from '../data/script';
import {lerp, pulse} from '../lib/anim';
import {COLORS, FONTS, LAYOUT} from '../theme';

const {left, right, y, height, gap} = LAYOUT.progress;
const usable = right - left - gap * (CHAPTERS.length - 1);
const LABEL_HOLD = 45;
const LABEL_FADE = 8;

const segments = (() => {
	let x = left;
	return CHAPTERS.map((c) => {
		const w = ((c.end - c.start) / FILM_END) * usable;
		const seg = {...c, x, w};
		x += w + gap;
		return seg;
	});
})();

// 底部章节进度条 固定在镜头之外 按章节分段
export const ProgressBar: React.FC = () => {
	const frame = useCurrentFrame();
	const current = chapterAt(frame);
	const seg = segments[current.index];
	const headX = seg.x + seg.w * Math.min(1, (frame - seg.start) / (seg.end - seg.start));
	const beat = Math.max(0, ...STRONG_FRAMES.map((f) => pulse(frame, f, 12)));

	const local = frame - current.start;
	const labelIn = lerp(local, 0, 6, 0, 1);
	const labelOut = lerp(local, LABEL_HOLD, LABEL_HOLD + LABEL_FADE, 1, 0);
	const labelOpacity = Math.min(labelIn, labelOut);
	// 标签宽度按 20px 字号估算 靠近右侧时改为向左对齐 不进禁字区
	const labelW = current.name.length * 22 + 28;
	const nearRight = headX + labelW / 2 > LAYOUT.noTextX - 20;
	const labelLeft = nearRight
		? Math.min(headX, LAYOUT.noTextX - 20) - labelW
		: Math.max(left, headX - labelW / 2);

	return (
		<>
			{segments.map((s) => {
				const isCurrent = s.index === current.index;
				const played = frame >= s.end ? 1 : isCurrent ? (frame - s.start) / (s.end - s.start) : 0;
				const h = isCurrent ? height + 2 + beat * 3 : height;
				return (
					<div
						key={s.index}
						style={{
							position: 'absolute',
							left: s.x,
							top: y - h / 2,
							width: s.w,
							height: h,
							borderRadius: h / 2,
							background: isCurrent ? 'rgba(255,255,255,0.3)' : COLORS.dim,
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								width: `${played * 100}%`,
								height: '100%',
								background: COLORS.warm,
								boxShadow: isCurrent ? `0 0 ${8 + beat * 16}px ${COLORS.warm}` : 'none',
								filter: isCurrent ? `brightness(${1.12 + beat * 0.4})` : 'none',
							}}
						/>
					</div>
				);
			})}
			<div
				style={{
					position: 'absolute',
					left: headX - 7 - beat * 3,
					top: y - 7 - beat * 3,
					width: 14 + beat * 6,
					height: 14 + beat * 6,
					borderRadius: '50%',
					background: '#FFF6E8',
					boxShadow: `0 0 ${12 + beat * 18}px ${4 + beat * 6}px ${COLORS.warm}`,
				}}
			/>
			{labelOpacity > 0 ? (
				<div
					className="txt"
					style={{
						position: 'absolute',
						left: labelLeft,
						top: y - 44 + (1 - labelIn) * 8,
						width: labelW,
						height: 30,
						lineHeight: '30px',
						textAlign: 'center',
						fontFamily: FONTS.sans,
						fontSize: 20,
						letterSpacing: 2,
						color: COLORS.text,
						background: 'rgba(20,18,15,0.78)',
						border: `1px solid ${COLORS.warm}88`,
						borderRadius: 15,
						opacity: labelOpacity,
					}}
				>
					{current.name}
				</div>
			) : null}
		</>
	);
};
