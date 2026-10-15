import React from 'react';
import {C} from '../theme';

// 暗盒：压抑的象征。分前后两层画，黑石可以夹在中间（被"关进去"）。
// rise：从地面升起；front：前板合上；bulge：被撑得鼓起；leak：缝隙渗出黑线；fall：四壁向外倒下。
type Props = {
	layer: 'back' | 'front';
	x: number;
	bottom: number;
	w: number;
	h: number;
	frame: number;
	rise?: number;
	front?: number;
	bulge?: number;
	leak?: number;
	fall?: number;
	opacity?: number;
};

const EDGE = C.slopeEdge;

export const DarkBox: React.FC<Props> = ({layer, x, bottom, w, h, frame, rise = 1, front = 0, bulge = 0, leak = 0, fall = 0, opacity = 1}) => {
	const hh = h * rise;
	if (hh < 1) return null;
	const left = x - w / 2;
	const top = bottom - hh;
	// 鼓起：两侧边和顶边向外弯，带一点脉动
	const b = bulge * (18 + 6 * Math.sin(frame / 5));
	const shape = `M ${left} ${bottom} L ${left} ${top} Q ${x} ${top - b * 1.4} ${left + w} ${top} L ${left + w} ${bottom} Z`;
	const sides = `M ${left} ${bottom} Q ${left - b} ${bottom - hh / 2} ${left} ${top} M ${left + w} ${bottom} Q ${left + w + b} ${bottom - hh / 2} ${left + w} ${top}`;
	const fallA = fall * 88;

	if (layer === 'back') {
		return (
			<g opacity={opacity * (1 - fall * 0.9)}>
				<path d={shape} fill="#090B12" opacity={0.92} />
				<path d={shape} fill="none" stroke={EDGE} strokeWidth={2} opacity={0.7} />
			</g>
		);
	}

	const fh = hh * front;
	const leaks =
		leak > 0
			? Array.from({length: 9}).map((_, i) => {
					const sx = i < 3 ? left : i < 6 ? left + w : left + ((i - 6 + 0.5) / 3) * w;
					const sy = i < 3 ? top + ((i + 0.5) / 3) * hh : i < 6 ? top + ((i - 3 + 0.5) / 3) * hh : top;
					const dir = i < 3 ? -1 : i < 6 ? 1 : 0;
					const len = leak * (60 + (i % 3) * 30);
					const wob = Math.sin(frame / 6 + i) * 10;
					const ex = sx + dir * len;
					const ey = dir === 0 ? sy - len : sy + wob;
					return (
						<path
							key={i}
							d={`M ${sx} ${sy} Q ${(sx + ex) / 2 + wob} ${(sy + ey) / 2 - wob} ${ex} ${ey}`}
							stroke="#000"
							strokeWidth={4}
							fill="none"
							strokeLinecap="round"
							opacity={0.9}
						/>
					);
			  })
			: null;

	return (
		<g opacity={opacity}>
			{fh > 0.5 ? (
				<g
					transform={fall > 0 ? `translate(${x} ${bottom}) scale(1 ${1 - fall * 0.9}) translate(${-x} ${-bottom})` : undefined}
					opacity={1 - fall}
				>
					<path
						d={`M ${left} ${bottom} L ${left} ${bottom - fh} ${fh >= hh - 0.5 ? `Q ${x} ${top - b * 1.4} ${left + w} ${top}` : `L ${left + w} ${bottom - fh}`} L ${left + w} ${bottom} Z`}
						fill="#0C0F18"
						stroke={EDGE}
						strokeWidth={2.5}
					/>
					<line x1={left + 14} y1={bottom - fh + 14} x2={left + w - 14} y2={bottom - fh + 14} stroke={EDGE} strokeWidth={1} opacity={0.5} />
				</g>
			) : null}
			{bulge > 0 ? <path d={sides} stroke={EDGE} strokeWidth={2.5} fill="none" opacity={0.8} /> : null}
			{fall > 0 ? (
				<>
					<rect x={left - 6} y={top} width={6} height={hh} fill={EDGE} transform={`rotate(${-fallA} ${left} ${bottom})`} opacity={1 - fall * 0.6} />
					<rect x={left + w} y={top} width={6} height={hh} fill={EDGE} transform={`rotate(${fallA} ${left + w} ${bottom})`} opacity={1 - fall * 0.6} />
				</>
			) : null}
			{leaks}
		</g>
	);
};
