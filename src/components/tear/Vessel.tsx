import React from 'react';
import {C, FONT} from '../../theme';

/**
 * 贯穿物件 · 容器形态：泪滴汇成的水装进透明容器，
 * 侧壁的小孔就是“门槛”——水位一到孔的高度，眼泪就从孔里流出来。
 * (cx, bottom) 为底边中点。level / hole 都是 0..1 的相对高度。
 */
export const Vessel: React.FC<{
	frame: number;
	cx: number;
	bottom: number;
	width: number;
	height: number;
	level: number;
	hole: number;
	/** 门槛虚线与孔的出现程度 0..1 */
	marks: number;
	/** 门槛闪光 0..1 */
	flash?: number;
	label?: string;
	dim?: number;
	opacity?: number;
	clipId: string;
	/** 底部轮子（推车水箱） */
	wheels?: boolean;
	/** 侧壁底部的放水阀：出现程度 0..1 与转角 */
	valve?: {show: number; angle: number};
	valveSide?: 'left' | 'right';
	/** 水面晃动幅度倍数 */
	slosh?: number;
}> = ({
	frame,
	cx,
	bottom,
	width,
	height,
	level,
	hole,
	marks,
	flash = 0,
	label,
	dim = 0,
	opacity = 1,
	clipId,
	wheels = false,
	valve,
	valveSide = 'right',
	slosh = 1,
}) => {
	const left = cx - width / 2;
	const top = bottom - height;
	const waterTop = bottom - height * level;
	const holeY = bottom - height * hole;
	const wave = (x: number) =>
		slosh * (3 * Math.sin(x * 0.05 + frame * 0.18) + 2 * Math.sin(x * 0.09 - frame * 0.11));
	const surf: string[] = [];
	for (let x = left; x <= left + width; x += 8) {
		surf.push(`${x},${waterTop + wave(x)}`);
	}
	const waterPath = `M ${left} ${bottom} L ${surf.join(' L ')} L ${left + width} ${bottom} Z`;
	const stroke = dim ? '#6F8AA6' : C.figureRim;
	return (
		<g opacity={opacity}>
			<clipPath id={clipId}>
				<rect x={left} y={top} width={width} height={height} rx={18} />
			</clipPath>
			{/* 玻璃 */}
			<rect x={left} y={top} width={width} height={height} rx={18} fill="#FFFFFF" fillOpacity={0.04} />
			{level > 0.005 ? (
				<g clipPath={`url(#${clipId})`}>
					<path d={waterPath} fill="url(#vesselWater)" />
					<path
						d={`M ${surf.join(' L ')}`}
						fill="none"
						stroke="#BFEAFF"
						strokeWidth={3}
						opacity={0.9}
					/>
				</g>
			) : null}
			<rect
				x={left}
				y={top}
				width={width}
				height={height}
				rx={18}
				fill="none"
				stroke={stroke}
				strokeWidth={3.5}
				strokeOpacity={0.85}
			/>
			{/* 玻璃高光 */}
			<rect x={left + 16} y={top + 24} width={7} height={height * 0.55} rx={3.5} fill="#FFFFFF" opacity={0.18} />
			{wheels ? (
				<g>
					{[left + 26, left + width - 26].map((wx) => (
						<g key={wx} transform={`translate(${wx},${bottom + 11}) rotate(${frame * 6})`}>
							<circle r={11} fill={C.bg} stroke={stroke} strokeWidth={3} />
							<line x1={-7} x2={7} y1={0} y2={0} stroke={stroke} strokeWidth={2} />
						</g>
					))}
				</g>
			) : null}
			{valve && valve.show > 0 ? (
				<g
					transform={`translate(${valveSide === 'left' ? left - 4 : left + width + 4},${bottom - 26}) scale(${(valveSide === 'left' ? -1 : 1) * valve.show},${valve.show})`}
				>
					<rect x={0} y={-6} width={18} height={12} rx={3} fill={stroke} />
					<g transform={`translate(26,0) rotate(${valve.angle})`}>
						<circle r={13} fill={C.bg} stroke={C.figureRim} strokeWidth={3} />
						<line x1={-13} x2={13} y1={0} y2={0} stroke={C.figureRim} strokeWidth={3} />
						<line x1={0} x2={0} y1={-13} y2={13} stroke={C.figureRim} strokeWidth={3} />
					</g>
				</g>
			) : null}
			{/* 门槛：虚线 + 侧壁小孔 */}
			<g opacity={marks}>
				<line
					x1={left + 10}
					x2={left + width - 10}
					y1={holeY}
					y2={holeY}
					stroke={flash > 0 ? C.blue : '#FFFFFF'}
					strokeOpacity={0.55 + 0.45 * flash}
					strokeWidth={3 + 3 * flash}
					strokeDasharray="14 10"
					strokeDashoffset={-frame * 0.8}
				/>
				{flash > 0 ? (
					<line
						x1={left}
						x2={left + width}
						y1={holeY}
						y2={holeY}
						stroke={C.blue}
						strokeWidth={14}
						opacity={0.6 * flash}
						filter="url(#lineGlow)"
					/>
				) : null}
				<circle cx={left + width} cy={holeY} r={7} fill={C.bg} stroke={stroke} strokeWidth={3} />
				{label ? (
					<text
						x={left - 22}
						y={holeY + 11}
						textAnchor="end"
						fontFamily={FONT}
						fontWeight={700}
						fontSize={32}
						fill="#FFFFFF"
						fillOpacity={0.85}
					>
						{label}
					</text>
				) : null}
			</g>
		</g>
	);
};
