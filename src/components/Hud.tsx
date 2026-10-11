/**
 * 屏幕空间的常驻信息：章节角标（主题词砸下后飞到左上角）。
 */
import React from 'react';
import {S} from '../data/script';
import {C, FONT_SERIF, SUB} from '../theme';
import {easeInOut, lerp, prog} from '../lib/anim';

const title = S(9);

export const ChapterTag: React.FC<{frame: number}> = ({frame}) => {
	if (frame < title.end) return null;
	const t = prog(frame, title.end, title.end + 26, easeInOut);
	const size = SUB.titleSize;
	const w = Array.from(title.text).length * size * 1.08;
	const startX = 960 - w / 2 + size * 0.04;
	const startY = SUB.slamY - size * 0.68;
	const k = lerp(1, 42 / size, t);
	const x = lerp(startX, 78, t);
	const y = lerp(startY, 44, t);
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				transform: `translate(${x}px, ${y}px) scale(${k})`,
				transformOrigin: 'left top',
				fontFamily: FONT_SERIF,
				fontWeight: 900,
				fontSize: size,
				lineHeight: 1.36,
				letterSpacing: '0.08em',
				whiteSpace: 'nowrap',
				color: C.ink,
				opacity: lerp(1, 0.85, t),
			}}
		>
			{Array.from(title.text).map((ch, i) => (
				<span key={i} style={{color: i >= 3 ? C.red : C.ink}}>
					{ch}
				</span>
			))}
			<span
				style={{
					display: 'inline-block',
					width: size * 2.2,
					height: size * 0.07,
					marginLeft: size * 0.3,
					verticalAlign: 'middle',
					background: C.ink,
					opacity: t * 0.5,
					transform: `scaleX(${t})`,
					transformOrigin: 'left center',
				}}
			/>
		</div>
	);
};
