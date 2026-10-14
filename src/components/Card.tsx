import React from 'react';
import {C, FONT} from '../theme';
import {mixColor} from '../lib/anim';

export const CARD_W = 380;
export const CARD_H = 210;

/** 圆角标签卡片（第二节“排除法”用），(x, y) 为中心 */
export const Card: React.FC<{
	x: number;
	y: number;
	label: string;
	icon?: 'knot' | 'brain' | 'none';
	/** 描边绘制进度 0..1 */
	draw?: number;
	/** 填充出现 0..1 */
	fill?: number;
	/** 变灰程度 0..1 */
	gray?: number;
	opacity?: number;
	labelOpacity?: number;
}> = ({x, y, label, icon = 'none', draw = 1, fill = 1, gray = 0, opacity = 1, labelOpacity = 1}) => {
	const per = 2 * (CARD_W + CARD_H);
	const stroke = mixColor(C.figureRim, C.muted, gray);
	const text = mixColor(C.white, C.muted, gray);
	const iconY = -42;
	return (
		<g transform={`translate(${x},${y})`} opacity={opacity}>
			<rect
				x={-CARD_W / 2}
				y={-CARD_H / 2}
				width={CARD_W}
				height={CARD_H}
				rx={24}
				fill={C.cardFill}
				fillOpacity={0.88 * fill}
			/>
			<rect
				x={-CARD_W / 2}
				y={-CARD_H / 2}
				width={CARD_W}
				height={CARD_H}
				rx={24}
				fill="none"
				stroke={stroke}
				strokeWidth={3}
				strokeOpacity={0.8}
				strokeDasharray={per}
				strokeDashoffset={per * (1 - draw)}
			/>
			<g opacity={labelOpacity}>
				{icon === 'knot' ? (
					<path
						d={`M -80 ${iconY} L -18 ${iconY} C -2 ${iconY - 34}, 26 ${iconY - 18}, 10 ${iconY} C -4 ${iconY + 16}, 22 ${iconY + 16}, 26 ${iconY} L 80 ${iconY}`}
						fill="none"
						stroke={stroke}
						strokeWidth={5}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				) : null}
				{icon === 'brain' ? (
					<g fill="none" stroke={stroke} strokeWidth={4.5}>
						<ellipse cx={-17} cy={iconY} rx={27} ry={21} />
						<ellipse cx={17} cy={iconY} rx={27} ry={21} />
						<path d={`M 6 ${iconY + 20} q 4 12 14 16`} strokeLinecap="round" />
					</g>
				) : null}
				<text
					x={0}
					y={icon === 'none' ? 18 : 58}
					textAnchor="middle"
					fontFamily={FONT}
					fontWeight={700}
					fontSize={50}
					fill={text}
				>
					{label}
				</text>
			</g>
		</g>
	);
};
