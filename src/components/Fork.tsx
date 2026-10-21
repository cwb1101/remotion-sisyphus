import React, {useMemo} from 'react';
import {random, useCurrentFrame} from 'remotion';
import {palette} from '../theme';
import {clamp01, type Pt, quadPath} from './geometry';
import {GlowLine} from './GlowLine';
import {LightNode} from './LightNode';

type Seg = {d: string; level: number; end: Pt; id: number};

/** 从一个点分叉生长的结构（确定性随机），可一直长成密集线网 */
export const buildFork = (o: {origin: Pt; angle: number; length: number; depth: number; spread: number; shrink: number; seed: string}) => {
	const segs: Seg[] = [];
	let id = 0;
	const grow = (p: Pt, ang: number, len: number, level: number) => {
		if (level >= o.depth) return;
		const a = (ang * Math.PI) / 180;
		const end = {x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len};
		const bend = (random(`${o.seed}b${id}`) - 0.5) * len * 0.35;
		const c = {x: (p.x + end.x) / 2 - Math.sin(a) * bend, y: (p.y + end.y) / 2 + Math.cos(a) * bend};
		segs.push({d: quadPath(p, c, end), level, end, id: id++});
		const n = random(`${o.seed}n${id}`) < 0.3 ? 3 : 2;
		for (let k = 0; k < n; k++) {
			const off = n === 2 ? (k === 0 ? -1 : 1) : k - 1;
			const jitter = (random(`${o.seed}j${id}${k}`) - 0.5) * o.spread * 0.5;
			grow(end, ang + off * o.spread + jitter, len * o.shrink * (0.8 + random(`${o.seed}l${id}${k}`) * 0.4), level + 1);
		}
	};
	grow(o.origin, o.angle, o.length, 0);
	return segs;
};

export const ForkTree: React.FC<{
	origin: Pt;
	angle: number;
	length: number;
	depth: number;
	spread?: number;
	shrink?: number;
	seed?: string;
	/** 0–1：按层逐级生长 */
	progress: number;
	/** 0–1：从末梢开始熄灭 */
	dissolve?: number;
	color?: string;
	nodeColor?: string;
	opacity?: number;
	width?: number;
	nodes?: boolean;
	dash?: [number, number];
	/** 节点点亮的起始帧（按层错开） */
	nodeAppear?: number;
	nodeStep?: number;
}> = ({
	origin,
	angle,
	length,
	depth,
	spread = 26,
	shrink = 0.72,
	seed = 'fork',
	progress,
	dissolve = 0,
	color = palette.gold,
	nodeColor,
	opacity = 1,
	width = 1.3,
	nodes = true,
	dash,
	nodeAppear,
	nodeStep = 6,
}) => {
	const frame = useCurrentFrame();
	const segs = useMemo(
		() => buildFork({origin, angle, length, depth, spread, shrink, seed}),
		[origin.x, origin.y, angle, length, depth, spread, shrink, seed],
	);
	return (
		<g opacity={opacity}>
			{segs.map((s) => {
				const p = clamp01(progress * depth - s.level);
				const fade = clamp01(1 - (dissolve * (depth + 1) - (depth - 1 - s.level)));
				if (p <= 0 || fade <= 0) return null;
				return (
					<g key={s.id} opacity={fade * (1 - s.level * 0.12)}>
						<GlowLine d={s.d} progress={p} width={width * (1 - s.level * 0.1)} color={color} dash={dash} />
						{nodes && p >= 1 ? (
							<LightNode
								x={s.end.x}
								y={s.end.y}
								r={2.6 - s.level * 0.3}
								appear={nodeAppear !== undefined ? nodeAppear + s.level * nodeStep : frame - 20}
								color={nodeColor ?? color}
								core={nodeColor ?? palette.goldHi}
							/>
						) : null}
					</g>
				);
			})}
		</g>
	);
};
