import React from 'react';
import {random} from 'remotion';
import {clamp, EASE, lerp} from '../lib/anim';
import {C} from '../theme';

// 房间里的道具：账本、天平、小钟、沙粒

/** 摊开的账本：左右两页，线条按进度写满 */
export const Ledger: React.FC<{x: number; y: number; open?: number; left: number; right: number; opacity?: number; scale?: number}> = ({
	x,
	y,
	open = 1,
	left,
	right,
	opacity = 1,
	scale = 1,
}) => {
	const pw = 74;
	const ph = 92;
	const lines = (side: number, amount: number) =>
		new Array(6).fill(0).map((_, i) => {
			const k = clamp(amount * 6 - i);
			const x0 = side < 0 ? -pw + 12 : 12;
			const len = (pw - 24) * (i % 3 === 2 ? 0.6 : 1) * k;
			return k > 0 ? <line key={i} x1={x0} y1={-ph / 2 + 18 + i * 13} x2={x0 + len} y2={-ph / 2 + 18 + i * 13} stroke={C.amber} strokeWidth={3} strokeLinecap="round" opacity={0.8} /> : null;
		});
	return (
		<g opacity={opacity} transform={`translate(${x} ${y}) scale(${scale})`}>
			<g transform={`scale(${lerp(0.12, 1, open)} 1)`}>
				<path d={`M 0 ${-ph / 2} L ${-pw} ${-ph / 2 + 6} L ${-pw} ${ph / 2 + 6} L 0 ${ph / 2} Z`} fill="#22252D" stroke={C.grey} strokeWidth={2.5} />
				<path d={`M 0 ${-ph / 2} L ${pw} ${-ph / 2 + 6} L ${pw} ${ph / 2 + 6} L 0 ${ph / 2} Z`} fill="#22252D" stroke={C.grey} strokeWidth={2.5} />
				{lines(-1, left)}
				{lines(1, right)}
			</g>
		</g>
	);
};

/** 天平：支点、横梁、两只托盘。theta > 0 左盘下沉 */
export const BALANCE = {x: 760, y: 600, arm: 180, hang: 70, plateW: 120};
export const plateCenter = (side: -1 | 1, theta: number) => {
	const r = (theta * Math.PI) / 180;
	const ex = BALANCE.x + side * BALANCE.arm * Math.cos(r);
	const ey = BALANCE.y - side * BALANCE.arm * Math.sin(r);
	return {x: ex, y: ey + BALANCE.hang};
};
export const Balance: React.FC<{theta: number; opacity?: number; draw?: number}> = ({theta, opacity = 1, draw = 1}) => {
	const r = (theta * Math.PI) / 180;
	const ends = [-1, 1].map((side) => ({
		side,
		x: BALANCE.x + side * BALANCE.arm * Math.cos(r),
		y: BALANCE.y - side * BALANCE.arm * Math.sin(r),
	}));
	return (
		<g opacity={opacity}>
			<line x1={BALANCE.x} y1={740} x2={BALANCE.x} y2={740 - (740 - BALANCE.y) * draw} stroke={C.grey} strokeWidth={6} strokeLinecap="round" />
			<polygon points={`${BALANCE.x - 34},740 ${BALANCE.x + 34},740 ${BALANCE.x},716`} fill={C.line} stroke={C.grey} strokeWidth={2} />
			<g opacity={clamp(draw * 2 - 1)}>
				<line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} stroke={C.grey} strokeWidth={5} strokeLinecap="round" />
				<circle cx={BALANCE.x} cy={BALANCE.y} r={7} fill={C.grey} />
				{ends.map((e) => {
					const py = e.y + BALANCE.hang;
					const hw = BALANCE.plateW / 2;
					return (
						<g key={e.side}>
							<line x1={e.x} y1={e.y} x2={e.x - hw + 8} y2={py} stroke={C.grey} strokeWidth={1.5} opacity={0.7} />
							<line x1={e.x} y1={e.y} x2={e.x + hw - 8} y2={py} stroke={C.grey} strokeWidth={1.5} opacity={0.7} />
							<rect x={e.x - hw} y={py} width={hw * 2} height={8} rx={4} fill={e.side < 0 ? C.cyan : C.amber} opacity={0.85} />
						</g>
					);
				})}
			</g>
		</g>
	);
};

/** 小钟：表盘 + 指针 */
export const MiniClock: React.FC<{x: number; y: number; r: number; angle: number; color?: string; opacity?: number}> = ({x, y, r, angle, color = C.amber, opacity = 1}) => (
	<g opacity={opacity}>
		<circle cx={x} cy={y} r={r} fill={C.bgDeep} stroke={color} strokeWidth={2.5} />
		<line x1={x} y1={y} x2={x + (r - 4) * Math.sin((angle * Math.PI) / 180)} y2={y - (r - 4) * Math.cos((angle * Math.PI) / 180)} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
	</g>
);

/** 沙粒：从 fromY 落到托盘上，越往后越密；返回已经落下的量 0..1 */
export const SandStream: React.FC<{frame: number; start: number; end: number; x: number; fromY: number; toY: number; density: number; seed: string}> = ({
	frame,
	start,
	end,
	x,
	fromY,
	toY,
	density,
	seed,
}) => {
	if (frame < start || frame > end + 40) {
		return null;
	}
	const count = Math.round(40 * density);
	return (
		<g>
			{new Array(count).fill(0).map((_, i) => {
				const life = 34;
				const born = start + ((random(`${seed}-b-${i}`) * (end - start)) | 0);
				const t = (frame - born) / life;
				if (t < 0 || t > 1) {
					return null;
				}
				const yy = lerp(fromY, toY, EASE(t) * 0.6 + t * 0.4);
				const xx = x + (random(`${seed}-x-${i}`) - 0.5) * 40;
				return <rect key={i} x={xx - 2} y={yy - 2} width={4} height={4} fill={C.amber} opacity={0.9} />;
			})}
		</g>
	);
};
