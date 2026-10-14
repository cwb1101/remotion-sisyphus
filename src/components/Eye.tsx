import React from 'react';
import {C} from '../theme';

/** 几何眼睛：杏仁形轮廓 + 虹膜圆环，只有形状，没有睫毛等细节 */
export const Eye: React.FC<{
	x: number;
	y: number;
	w: number;
	h: number;
	opacity?: number;
	/** 眼面水膜亮度 0..1 */
	film?: number;
	/** 泪腺（外上方）亮度 0..1 */
	gland?: number;
	frame: number;
}> = ({x, y, w, h, opacity = 1, film = 0, gland = 0, frame}) => {
	const d = `M ${-w / 2} 0 Q 0 ${-h} ${w / 2} 0 Q 0 ${h} ${-w / 2} 0 Z`;
	return (
		<g transform={`translate(${x},${y})`} opacity={opacity}>
			<path d={d} fill="#13263D" stroke={C.figureRim} strokeWidth={3.5} strokeLinejoin="round" />
			<circle r={h * 0.32} fill="none" stroke={C.figureRim} strokeWidth={3} opacity={0.85} />
			<circle r={h * 0.12} fill={C.figureRim} opacity={0.6} />
			{film > 0 ? (
				<path
					d={`M ${-w / 2 + 6} -2 Q 0 ${-h + 6} ${w / 2 - 6} -2`}
					fill="none"
					stroke={C.blue}
					strokeWidth={6}
					strokeLinecap="round"
					opacity={film * (0.6 + 0.3 * Math.sin(frame * 0.15))}
					filter="url(#softGlow)"
				/>
			) : null}
			{film > 0 ? (
				<path d={d} fill={C.blue} opacity={film * 0.14} />
			) : null}
			{gland > 0 ? (
				<ellipse cx={w * 0.3} cy={-h * 0.62} rx={w * 0.12} ry={h * 0.14} fill={C.blue} opacity={gland * 0.9} filter="url(#softGlow)" />
			) : null}
		</g>
	);
};
