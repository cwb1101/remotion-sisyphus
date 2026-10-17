import React, {useMemo} from 'react';
import {rand} from '../lib/anim';
import {COLORS} from '../theme';

export type BoulderProps = {
	x: number;
	y: number;
	// 半径 px
	size: number;
	seed?: number;
	// 外轮廓顶点数 越多切面越碎
	facets?: number;
	rotation?: number;
	// 赭金外发光 0 到 1
	glow?: number;
	// 赭金裂纹亮度 0 到 1
	crack?: number;
	// 青瓷电路纹 绘制进度 0 到 1
	circuit?: number;
	// 电路光点流动相位
	circuitPhase?: number;
	// 过热 0 到 1 外缘变亮并冒热气
	heat?: number;
	// 岩层圈数 0 到 12
	strata?: number;
	// 纵向压扁 落地时用
	squash?: number;
	opacity?: number;
	coolLight?: number;
};

type Pt = [number, number];

const ring = (n: number, seed: number): Pt[] =>
	Array.from({length: n}, (_, i) => {
		const a = (i / n) * Math.PI * 2 + (rand(seed + i * 3.1) - 0.5) * 0.35;
		const r = 0.84 + rand(seed + i * 7.7) * 0.16;
		return [Math.cos(a) * r, Math.sin(a) * r * 0.9];
	});

const mix = (a: string, b: string, t: number) => {
	const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
	const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
	return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

// 贯穿全片的巨石 低面多边形 各节通过参数让它长大 变形 发光
export const Boulder: React.FC<BoulderProps> = ({
	x,
	y,
	size,
	seed = 7,
	facets = 9,
	rotation = 0,
	glow = 0,
	crack = 0,
	circuit = 0,
	circuitPhase = 0,
	heat = 0,
	strata = 0,
	squash = 1,
	opacity = 1,
	coolLight = 0,
}) => {
	const pts = useMemo(() => ring(Math.round(facets), seed), [facets, seed]);
	const core: Pt = [-0.18, -0.22];
	const light = [-0.6, -0.8];
	const path = pts.map((p) => p.join(',')).join(' ');
	const id = `b${seed}${Math.round(facets)}`;
	// 外圈和内圈两层顶点 做成真正的低面多边形 避免从中心放射的辐条感
	const inner: Pt[] = pts
		.filter((_, i) => i % 2 === 0)
		.map((p, i) => [p[0] * 0.48 + core[0] * 0.5 + (rand(seed + i * 19) - 0.5) * 0.1, p[1] * 0.48 + core[1] * 0.5 + (rand(seed + i * 23) - 0.5) * 0.1]);
	const shadeOf = (a: Pt, b: Pt, c: Pt, k: number) => {
		const cx = (a[0] + b[0] + c[0]) / 3;
		const cy = (a[1] + b[1] + c[1]) / 3;
		const len = Math.hypot(cx, cy) || 1;
		const lit = Math.max(0, (cx * light[0] + cy * light[1]) / len) * Math.min(1, len * 1.6);
		const tone = 0.22 + lit * 0.62 + (rand(seed + k * 1.3) - 0.5) * 0.16;
		return mix(COLORS.inkDark.slice(1), COLORS.inkLight.slice(1), Math.max(0, Math.min(1, tone)));
	};
	const tris: {pts: Pt[]; fill: string}[] = [];
	pts.forEach((p, i) => {
		const q = pts[(i + 1) % pts.length];
		const a = inner[Math.floor(i / 2) % inner.length];
		const b = inner[Math.floor((i + 1) / 2) % inner.length];
		tris.push({pts: [p, q, b], fill: shadeOf(p, q, b, i)});
		if (a !== b) tris.push({pts: [p, b, a], fill: shadeOf(p, b, a, i + 40)});
	});
	inner.forEach((a, i) => {
		const b = inner[(i + 1) % inner.length];
		tris.push({pts: [a, b, core], fill: shadeOf(a, b, [core[0] * 0.5, core[1] * 0.5], i + 80)});
	});
	// 裂纹是几条折线 沿表面走 不从中心发散
	const cracks = [0, 1, 2].map((k) => {
		const a = pts[(k * 3 + 1) % pts.length];
		const steps = 4;
		let d = `M${(a[0] * 0.9).toFixed(3)},${(a[1] * 0.9).toFixed(3)}`;
		for (let i = 1; i <= steps; i++) {
			const t = i / steps;
			const px = a[0] * 0.9 * (1 - t * 0.55) + (rand(seed + k * 31 + i) - 0.5) * 0.18;
			const py = a[1] * 0.9 * (1 - t * 0.55) + (rand(seed + k * 37 + i) - 0.5) * 0.18;
			d += ` L${px.toFixed(3)},${py.toFixed(3)}`;
		}
		return d;
	});
	const circuitPaths = Array.from({length: 7}, (_, i) => {
		const y0 = -0.6 + i * 0.2;
		const x0 = -0.75 + rand(seed + i * 11) * 0.2;
		const x1 = x0 + 0.35 + rand(seed + i * 13) * 0.3;
		const x2 = x1 + 0.12;
		const y1 = y0 + (rand(seed + i * 17) > 0.5 ? 0.1 : -0.1);
		return `M${x0},${y0} H${x1} L${x2},${y1} H${0.75}`;
	});
	const layerCount = Math.floor(strata);
	return (
		<svg
			width={size * 3}
			height={size * 3}
			viewBox="-1.5 -1.5 3 3"
			style={{
				position: 'absolute',
				left: x - size * 1.5,
				top: y - size * 1.5,
				overflow: 'visible',
				opacity,
			}}
		>
			<defs>
				<radialGradient id={`${id}g`}>
					<stop offset="0%" stopColor={COLORS.warm} stopOpacity={Math.min(1, 0.95 * glow)} />
					<stop offset="40%" stopColor={COLORS.warm} stopOpacity={0.32 * glow} />
					<stop offset="100%" stopColor={COLORS.warm} stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`${id}c`}>
					<stop offset="0%" stopColor={COLORS.cool} stopOpacity={0.5 * coolLight} />
					<stop offset="100%" stopColor={COLORS.cool} stopOpacity={0} />
				</radialGradient>
				<clipPath id={`${id}clip`}>
					<polygon points={path} />
				</clipPath>
			</defs>
			{glow > 0 ? <circle r={1.5} fill={`url(#${id}g)`} /> : null}
			{coolLight > 0 ? <circle r={1.5} fill={`url(#${id}c)`} /> : null}
			<g transform={`rotate(${rotation}) scale(1 ${squash})`}>
				{tris.map((t, i) => (
					<polygon key={i} points={t.pts.map((v) => v.join(',')).join(' ')} fill={t.fill} stroke={t.fill} strokeWidth={0.006} strokeLinejoin="round" />
				))}
				<g clipPath={`url(#${id}clip)`}>
					{Array.from({length: layerCount}, (_, i) => {
						const r = 0.95 - i * 0.07;
						return (
							<ellipse
								key={i}
								rx={r}
								ry={r * 0.82}
								cy={0.05}
								fill="none"
								stroke={i % 2 ? COLORS.inkDark : '#6A5F51'}
								strokeWidth={0.022}
								opacity={0.75}
							/>
						);
					})}
					{circuit > 0
						? circuitPaths.map((d, i) => (
								<g key={i}>
									<path
										d={d}
										fill="none"
										stroke={COLORS.cool}
										strokeWidth={0.018}
										pathLength={1}
										strokeDasharray={1}
										strokeDashoffset={1 - Math.min(1, circuit * 1.4 - i * 0.06)}
										opacity={0.85}
									/>
									<path
										d={d}
										fill="none"
										stroke="#E8FFF8"
										strokeWidth={0.03}
										pathLength={1}
										strokeDasharray="0.06 0.94"
										strokeDashoffset={-((circuitPhase + i * 0.17) % 1)}
										opacity={circuit >= 1 ? 0.9 : 0}
										strokeLinecap="round"
									/>
								</g>
							))
						: null}
				</g>
				{crack > 0
					? cracks.map((d, i) => (
							<g key={i}>
								<path d={d} fill="none" stroke={COLORS.warm} strokeWidth={0.05} opacity={0.25 * crack} />
								<path d={d} fill="none" stroke="#FFE2B0" strokeWidth={0.014} opacity={crack} />
							</g>
						))
					: null}
				{heat > 0 ? (
					<polygon
						points={path}
						fill="none"
						stroke={COLORS.cool}
						strokeWidth={0.02 + heat * 0.05}
						opacity={0.35 + heat * 0.5}
					/>
				) : null}
				<polygon points={path} fill="none" stroke="#7A6C5A" strokeWidth={0.012} opacity={0.7} />
			</g>
		</svg>
	);
};
