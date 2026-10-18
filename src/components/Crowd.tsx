// 群像: 复用 Character. 固定种子随机 身高 体型 衣色 发型 呼吸相位 动作时间
// 能摆出 "N 个人里 M 个在做某事": acting.count 个人用 acting.keys, 其余用 idle
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, type CharacterProps, type Hair} from './Character';
import {poseAt, type PoseKey} from '../data/poses';
import {mulberry32, range} from '../lib/random';

const TINTS = ['#0B0907', '#120E0B', '#0E0D10', '#14100B', '#0D0B09', '#110F0F', '#16110C'];
const HAIRS: Hair[] = ['short', 'crop', 'bun', 'bob', 'long', 'short', 'crop'];

export type Member = {
	i: number;
	x: number;
	y: number;
	scale: number;
	heightK: number;
	build: number;
	facing: 1 | -1;
	color: string;
	hair: Hair;
	seed: number;
	jitter: number;
	acting: boolean;
};

export type CrowdLayout = {x: number; facing?: 1 | -1; y?: number}[];

export type CrowdProps = {
	n: number;
	seed: number;
	/** 站位范围 (世界 x), 或者直接给每个人的站位 */
	x0?: number;
	x1?: number;
	layout?: CrowdLayout;
	ground?: number;
	scale?: number;
	acting?: {count: number; keys: PoseKey[]; pick?: number[]};
	idle?: PoseKey[];
	/** 动作时间的随机差异 (帧) */
	timeJitter?: number;
	light?: [number, number];
	rim?: number;
	/** 逐人覆盖属性 (比如手里拿杯子 IK) */
	override?: (m: Member, frame: number) => Partial<CharacterProps>;
	/** 在每个人之后画的东西 (比如他手里的杯子) */
	after?: (m: Member, frame: number) => React.ReactNode;
};

export const makeMembers = (p: CrowdProps): Member[] => {
	const rng = mulberry32(p.seed);
	const n = p.layout ? p.layout.length : p.n;
	const order = Array.from({length: n}, (_, i) => i);
	// 固定种子洗牌, 选出谁在做事
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	const actors = new Set(p.acting?.pick ?? order.slice(0, p.acting?.count ?? 0));
	const span = (p.x1 ?? 0) - (p.x0 ?? 0);
	return Array.from({length: n}, (_, i) => {
		const lay = p.layout?.[i];
		const slot = (p.x0 ?? 0) + (span * (i + 0.5)) / n;
		return {
			i,
			x: lay ? lay.x + range(rng, -10, 10) : slot + range(rng, -span / n / 3, span / n / 3),
			y: (p.ground ?? 0) + (lay?.y ?? range(rng, -14, 14)),
			scale: (p.scale ?? 1) * range(rng, 0.97, 1.03) * (1 + (lay?.y ?? 0) * 0.0025),
			heightK: range(rng, 0.88, 1.08),
			build: range(rng, 0.88, 1.14),
			facing: lay?.facing ?? (rng() < 0.5 ? 1 : -1),
			color: TINTS[Math.floor(rng() * TINTS.length)],
			hair: HAIRS[Math.floor(rng() * HAIRS.length)],
			seed: Math.floor(rng() * 1e6),
			jitter: Math.round(range(rng, -(p.timeJitter ?? 4), p.timeJitter ?? 4)),
			acting: actors.has(i),
		};
	});
};

export const Crowd: React.FC<CrowdProps> = (p) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const members = makeMembers(p);
	// 远的先画: y 小的在后
	const sorted = [...members].sort((a, b) => a.y - b.y);
	return (
		<g>
			{sorted.map((m) => {
				const keys = (m.acting ? p.acting?.keys : p.idle) ?? [{frame: 0, pose: 'stand' as const}];
				const shifted = keys.map((k) => ({...k, frame: k.frame + m.jitter, facing: k.facing ?? undefined}));
				const state = poseAt(shifted, frame, fps, (m.seed % 100) / 100, m.facing);
				const o = p.override?.(m, frame) ?? {};
				return (
					<g key={m.i}>
						<Character
							x={m.x}
							y={m.y}
							scale={m.scale}
							heightK={m.heightK}
							build={m.build}
							color={m.color}
							hair={m.hair}
							seed={m.seed}
							light={p.light ?? [0.3, -0.95]}
							rim={p.rim ?? 0.8}
							state={state}
							{...o}
						/>
						{p.after?.(m, frame)}
					</g>
				);
			})}
		</g>
	);
};
