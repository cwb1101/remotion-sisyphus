import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';

// 贯穿全片的物件：一块黑石。
// 同一个组件既能画外观（裂缝、轮廓光、冷光），也能画剖面（core > 0 时，石头内部的金点与年轮），
// 镜头推进石头、石头填满画面时把 core 渐变到 1，就能无缝切到"石头里面"。
type Props = {
	id: string;
	cx: number;
	cy: number;
	r: number;
	rot?: number;
	seed?: number;
	crack?: number;
	crackGlow?: number;
	rim?: number;
	rimColor?: string;
	cold?: number;
	core?: number;
	coreGlow?: number;
	rings?: number;
	opacity?: number;
};

const N = 16;

const outline = (seed: number) => {
	const pts: {x: number; y: number}[] = [];
	for (let i = 0; i < N; i++) {
		const a = (i / N) * Math.PI * 2;
		const k = 1 + (random(`${seed}-r-${i}`) - 0.5) * 0.16;
		// 底部略平，像压在地上的石头
		const flat = Math.sin(a) > 0.55 ? 0.94 : 1;
		pts.push({x: Math.cos(a) * k, y: Math.sin(a) * k * flat});
	}
	// Catmull-Rom → 三次贝塞尔，闭合平滑轮廓（单位半径）
	let d = `M ${pts[0].x} ${pts[0].y}`;
	for (let i = 0; i < N; i++) {
		const p0 = pts[(i - 1 + N) % N];
		const p1 = pts[i];
		const p2 = pts[(i + 1) % N];
		const p3 = pts[(i + 2) % N];
		const c1 = {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6};
		const c2 = {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6};
		d += ` C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
	}
	return `${d} Z`;
};

const crackPaths = (seed: number) => {
	const main: string[] = [];
	const n = 9;
	for (let i = 0; i <= n; i++) {
		const x = -0.92 + (1.82 * i) / n;
		const y = -0.12 + 0.24 * (i / n) + (random(`${seed}-c-${i}`) - 0.5) * 0.22;
		main.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
	}
	const branch1 = `M -0.25 ${-0.02 + (random(`${seed}-b1`) - 0.5) * 0.1} L -0.12 -0.3 L -0.18 -0.52`;
	const branch2 = `M 0.32 0.1 L 0.42 0.34 L 0.36 0.6`;
	return [main.join(' '), branch1, branch2];
};

const ring = (seed: number, k: number, rr: number) => {
	const m = 40;
	let d = '';
	for (let i = 0; i <= m; i++) {
		const a = (i / m) * Math.PI * 2;
		const w = 1 + Math.sin(a * 3 + k * 1.7) * 0.035 + Math.sin(a * 5 + seed) * 0.02;
		d += `${i === 0 ? 'M' : 'L'} ${Math.cos(a) * rr * w} ${Math.sin(a) * rr * w} `;
	}
	return `${d}Z`;
};

export const BlackStone: React.FC<Props> = ({
	id,
	cx,
	cy,
	r,
	rot = 0,
	seed = 1,
	crack = 0,
	crackGlow = 0,
	rim = 0,
	rimColor = C.gold,
	cold = 0,
	core = 0,
	coreGlow = 0,
	rings = 0,
	opacity = 1,
}) => {
	const shape = outline(seed);
	const cracks = crackPaths(seed);
	const clip = `stone-clip-${id}`;
	const grad = `stone-grad-${id}`;
	const coreGrad = `stone-core-${id}`;
	const coldGrad = `stone-cold-${id}`;
	const blur = `stone-blur-${id}`;
	const ringRadii = [0.12, 0.26, 0.42, 0.62];
	return (
		<g transform={`translate(${cx} ${cy}) scale(${r})`} opacity={opacity}>
			<defs>
				<clipPath id={clip}>
					<path d={shape} transform={`rotate(${rot})`} />
				</clipPath>
				<radialGradient id={grad} cx="-0.38" cy="-0.42" r="1.25" gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor={C.stoneHi} />
					<stop offset="0.45" stopColor="#0D0D10" />
					<stop offset="1" stopColor={C.stone} />
				</radialGradient>
				<radialGradient id={coldGrad} cx="-0.4" cy="-0.5" r="0.95" gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor={C.blue} stopOpacity={0.2} />
					<stop offset="0.6" stopColor={C.blue} stopOpacity={0.05} />
					<stop offset="1" stopColor={C.blue} stopOpacity={0} />
				</radialGradient>
				<radialGradient id={coreGrad} cx="0" cy="0" r="0.9" gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor={C.gold} stopOpacity={0.55 * coreGlow} />
					<stop offset="0.25" stopColor={C.gold} stopOpacity={0.12 * coreGlow} />
					<stop offset="1" stopColor="#000000" stopOpacity={0} />
				</radialGradient>
				<filter id={blur} x="-1" y="-1" width="3" height="3">
					<feGaussianBlur stdDeviation="0.035" />
				</filter>
			</defs>

			{rim > 0 ? (
				<path
					d={shape}
					transform={`rotate(${rot})`}
					fill="none"
					stroke={rimColor}
					strokeWidth={0.07}
					opacity={rim * 0.55}
					filter={`url(#${blur})`}
				/>
			) : null}

			<g clipPath={`url(#${clip})`}>
				<rect x={-1.3} y={-1.3} width={2.6} height={2.6} fill={`url(#${grad})`} />
				{cold > 0 ? <rect x={-1.3} y={-1.3} width={2.6} height={2.6} fill={`url(#${coldGrad})`} opacity={cold} /> : null}
				<g transform={`rotate(${rot})`}>
					{cracks.map((d, i) => (
						<g key={i}>
							<path
								d={d}
								pathLength={1}
								strokeDasharray={`${crack} 1`}
								fill="none"
								stroke={C.gold}
								strokeWidth={0.07}
								strokeLinecap="round"
								strokeLinejoin="round"
								opacity={0.75 * crackGlow}
								filter={`url(#${blur})`}
							/>
							<path
								d={d}
								pathLength={1}
								strokeDasharray={`${crack} 1`}
								fill="none"
								stroke={C.goldPale}
								strokeWidth={0.018}
								strokeLinecap="round"
								strokeLinejoin="round"
								opacity={crack > 0 ? 0.35 + 0.65 * crackGlow : 0}
							/>
						</g>
					))}
				</g>

				{core > 0 ? (
					<g opacity={core}>
						<rect x={-1.3} y={-1.3} width={2.6} height={2.6} fill="#08080A" />
						{/* 剖面上的细纹，让大面积黑色不至于死板 */}
						{[0.18, 0.33, 0.5, 0.7, 0.9].map((rr, i) => (
							<path key={i} d={ring(seed + 7, i, rr)} fill="none" stroke="#141418" strokeWidth={0.006} />
						))}
						<rect x={-1.3} y={-1.3} width={2.6} height={2.6} fill={`url(#${coreGrad})`} />
						{ringRadii.map((rr, i) => {
							const t = Math.min(1, Math.max(0, rings * ringRadii.length - i));
							if (t <= 0) {
								return null;
							}
							return (
								<g key={i} opacity={Math.min(1, t * 1.5)}>
									<path
										d={ring(seed, i, rr * (0.15 + 0.85 * t))}
										fill="none"
										stroke={C.gold}
										strokeWidth={0.016}
										opacity={0.45}
										filter={`url(#${blur})`}
									/>
									<path
										d={ring(seed, i, rr * (0.15 + 0.85 * t))}
										fill="none"
										stroke={C.goldPale}
										strokeWidth={0.004}
									/>
								</g>
							);
						})}
						<circle cx={0} cy={0} r={0.013 + 0.01 * coreGlow} fill={C.goldPale} />
						<circle cx={0} cy={0} r={0.04 + 0.03 * coreGlow} fill={C.gold} opacity={0.35} filter={`url(#${blur})`} />
					</g>
				) : null}
			</g>
		</g>
	);
};
