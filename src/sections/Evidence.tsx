// 第 2 节 实证 (屏 10-13): 房间外的冷白聚光舞台 -> 拉远成一片平原上的人群
// 屏 10-11: 主角每拍递一只写着需要的杯子, 对方抱着越摞越高的杯塔被压弯 (Finkel 2014 理论)
// 屏 12-13: 14 个人: 左边 4 对 杯子只在两人之间来回; 右边 6 人互相传杯, 更亮 更开心 (Cheung 2015)
import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, solveSkeleton, useRenderMode, type CharacterProps} from '../components/Character';
import {Crowd, makeMembers, type CrowdLayout, type CrowdProps} from '../components/Crowd';
import {Cup} from '../components/Cup';
import {beatAt} from '../data/beatmap';
import type {PoseKey} from '../data/poses';
import {poseAt} from '../data/poses';
import {cueFrame, keysFor, screenById} from '../lib/timeline';
import {COLORS} from '../theme';
import {HOOK_END, heroCup} from './Hook';
import {HERO_LOOK, PARTNER_LOOK, PLACES, heroState, heroVx, heroX, lightFor, partnerState, partnerVx, partnerX} from './cast';

const S = (id: number) => screenById(id);
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const clamp01 = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const NEEDS = ['陪伴', '倾听', '安全感', '成长', '意义', '理解', '回应', '全部'];
const HAND_OFFS = [...[3, 4, 5, 6, 7].map((b) => cueFrame(S(10), b)), ...[0, 1, 2].map((b) => cueFrame(S(11), b))];
const STACK_CUP = 0.64;
const STACK_STEP = 70 * STACK_CUP - 4;

const Stage: React.FC<{f: number}> = ({f}) => {
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const spot = PLACES.spot;
	const on = interpolate(f, [S(9).startFrame + 40, S(10).startFrame], [0.3, 1], clamp01);
	const darken = interpolate(f, [S(11).startFrame, S(12).startFrame], [1, 0.75], clamp01);
	const plain = interpolate(f, [S(12).startFrame - 10, S(12).startFrame + 40], [0, 1], clamp01);
	const bright = interpolate(f, [S(13).startFrame - 2, S(13).startFrame + 10], [0, 1], clamp01);
	// 屏 14 起人群那边的暖光一起暗下去
	const away = interpolate(f, [S(14).startFrame, S(14).startFrame + 36], [1, 0], clamp01);
	return (
		<g>
			<defs>
				<linearGradient id="spot-cone" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.05} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0.2} />
				</linearGradient>
				<radialGradient id="spot-pool">
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.28} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0} />
				</radialGradient>
				<radialGradient id="haze" cx="50%" cy="60%" r="50%">
					<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.22} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</radialGradient>
				<linearGradient id="plain-floor" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor="#1C150E" />
					<stop offset="1" stopColor="#0B0806" />
				</linearGradient>
			</defs>
			<rect x={640} y={0} width={3600} height={900} fill="url(#plain-floor)" />
			<ellipse cx={2150} cy={-60} rx={1700} ry={420} fill="url(#haze)" opacity={away * plain * 0.7} />
			{/* 右边 6 人脚下的一片暖光, 屏 13 变亮; 左边 4 对留在暗处 */}
			<ellipse cx={2620} cy={10} rx={460} ry={70} fill="url(#haze)" opacity={away * plain * (0.6 + 1.2 * bright)} />
			<ellipse cx={2620} cy={-200} rx={420} ry={330} fill="url(#haze)" opacity={away * plain * (0.15 + 0.5 * bright)} />
			<line x1={640} x2={4200} y1={0} y2={0} stroke={COLORS.goldDim} strokeOpacity={0.25 * plain} strokeWidth={2} />
			<polygon points={`${spot.x - 40},${spot.y} ${spot.x + 40},${spot.y} ${spot.x + 300},0 ${spot.x - 300},0`} fill="url(#spot-cone)" opacity={on * darken} />
			<ellipse cx={spot.x - 60} cy={6} rx={380} ry={46} fill="url(#spot-pool)" opacity={on * darken} />
		</g>
	);
};

// ---------- 人群站位 ----------
// 前后错开 (y 越大越靠近镜头, 人也略大), 不排成一条直线
// 每对两人隔 165: 递杯的手臂刚好够到对方胸前, 不会穿进对方身体
const PAIRS: CrowdLayout = [
	{x: 1310, y: 34}, {x: 1520, y: -30}, {x: 1730, y: 22}, {x: 1940, y: -18},
].flatMap(({x, y}) => [
	{x, facing: 1 as const, y},
	{x: x + 165, facing: -1 as const, y: y + 6},
]);
const RIGHT: CrowdLayout = [
	{x: 2290, facing: 1, y: 26},
	{x: 2420, facing: -1, y: -34},
	{x: 2545, facing: 1, y: 10},
	{x: 2690, facing: -1, y: 40},
	{x: 2815, facing: 1, y: -26},
	{x: 2950, facing: -1, y: 18},
];

const leftKeys = keysFor('crowdLeft');
const rightKeys = keysFor('crowdRight');
// 屏 13 只有中间两人击掌, 其余四人继续传杯并露出笑容
const rightOthers: PoseKey[] = rightKeys.map((k) => (k.pose === 'highFive' ? {...k, pose: 'pass', speed: 'normal', lead: 0} : k));
// 递杯的人: 每两拍伸一次手, 每个人错开一拍, 都从屏 12 的起点数
const passKeys = (i: number): PoseKey[] => {
	const s12 = S(12).startFrame;
	const keys: PoseKey[] = [{frame: 0, pose: 'stand'}];
	for (let b = i % 2; b < 16; b += 2) {
		keys.push({frame: cueFrame(S(12), b), pose: 'pass', expr: b >= 8 ? 'smile' : undefined});
		keys.push({frame: cueFrame(S(12), b + 1), pose: 'stand'});
	}
	return keys.filter((k) => k.frame === 0 || k.frame >= s12);
};

const crowdBase = (f: number): Partial<CrowdProps> => {
	const t = interpolate(f, [S(12).startFrame - 6, S(12).startFrame + 30], [0, 1], clamp01);
	return {light: [0.2, -0.98], rim: 0.25 + 0.75 * t, timeJitter: 4, seed: 0, n: 0};
};

export const Evidence: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	// 从屏 14 起主角和对方交给第 3 节 (Fusion) 去画; 人群在屏 14 里暗下去
	const showCast = f >= HOOK_END && f < S(14).startFrame;
	const crowdOn =
		interpolate(f, [S(12).startFrame - 8, S(12).startFrame + 24], [0, 1], clamp01) *
		interpolate(f, [S(14).startFrame, S(14).startFrame + 36], [1, 0], clamp01);
	const happy = interpolate(f, [S(13).startFrame - 2, S(13).startFrame + 12], [0, 1], clamp01);

	const hx = heroX(f);
	const px = partnerX(f);
	const hs = heroState(f, fps);
	const ps = partnerState(f, fps);
	const staggerOn = interpolate(f, [cueFrame(S(11), 2) - 4, cueFrame(S(11), 2) + 20], [0, 1], clamp01);

	const heroProps: CharacterProps = {...HERO_LOOK, x: hx, y: 0, state: hs, light: lightFor(hx), vx: heroVx(f)} as CharacterProps;
	const partnerProps: CharacterProps = {
		...PARTNER_LOOK, x: px, y: 0, state: ps, light: lightFor(px), vx: partnerVx(f), shake: staggerOn * 0.8,
	} as CharacterProps;
	const heroSk = solveSkeleton(heroProps, f, fps);
	const partnerSk = solveSkeleton(partnerProps, f, fps);

	// 杯塔: 底座在对方两只手腕的中点
	const handed = HAND_OFFS.filter((h) => f >= h + 7).length;
	const base = {
		x: (partnerSk.armF.W.x + partnerSk.armB.W.x) / 2 + (partnerSk.sign > 0 ? 10 : -10),
		y: (partnerSk.armF.W.y + partnerSk.armB.W.y) / 2 + 8,
	};
	const sway = (i: number) => (Math.pow(i / 7, 1.4) * (6 + 22 * staggerOn)) * Math.sin(f * 0.19 + i * 0.25);
	const slot = (i: number) => ({x: base.x + sway(i), y: base.y - i * STACK_STEP});

	const right = makeMembers({...crowdBase(f), layout: RIGHT, seed: 31, n: 6} as CrowdProps);
	const pairs = makeMembers({...crowdBase(f), layout: PAIRS, seed: 17, n: 8} as CrowdProps);
	const handOf = (m: (typeof right)[number], keys: PoseKey[], seedOffset = 0) => {
		const state = poseAt(keys.map((k) => ({...k, frame: k.frame + m.jitter})), f, fps, (m.seed % 100) / 100, m.facing);
		return solveSkeleton({x: m.x, y: m.y, scale: m.scale, heightK: m.heightK, build: m.build, seed: m.seed + seedOffset, state}, f, fps).armF.H;
	};

	return (
		<g>
			<Stage f={f} />
			{crowdOn > 0 ? (
				<g opacity={crowdOn}>
					{/* 左边 4 对: 每对里一人只把杯递给另一人, 杯子在两人之间来回 */}
					<Crowd
						{...(crowdBase(f) as CrowdProps)}
						n={8}
						seed={17}
						layout={PAIRS}
						acting={{count: 4, keys: leftKeys, pick: [0, 2, 4, 6]}}
						idle={[{frame: 0, pose: 'holdCup'}]}
						after={(m) => {
							if (m.i % 2 === 1) return null;
							const giver = handOf(m, leftKeys);
							const recv = pairs[m.i + 1];
							const recvHand = handOf(recv, [{frame: 0, pose: 'holdCup'}]);
							const b = beatAt(f) + m.i * 0.25;
							const t = 0.5 - 0.5 * Math.cos(Math.PI * b * 0.5);
							return <Cup id={`pair-${m.i}`} x={giver.x + (recvHand.x - giver.x) * t} y={giver.y + 24 + (recvHand.y - giver.y) * t} scale={0.7} fill={0.6} liquid={COLORS.liquidHero} />;
						}}
					/>
					{/* 右边 6 人: 杯子在彼此之间流动, 屏 13 中间两人击掌 */}
					<Crowd
						{...(crowdBase(f) as CrowdProps)}
						n={6}
						seed={31}
						layout={RIGHT}
						rim={(crowdBase(f).rim ?? 1) * (1 + 0.9 * happy)}
						acting={{count: 2, keys: rightKeys, pick: [2, 3]}}
						idle={rightOthers}
						override={(m, fr) =>
							m.i === 2 || m.i === 3
								? {}
								: {state: poseAt(passKeys(m.i).map((k) => ({...k, frame: k.frame + m.jitter})), fr, fps, 0, m.facing)}
						}
					/>
					{[0, 3].map((startAt) => {
						const b = beatAt(f);
						const hop = Math.floor(b) + startAt;
						const t = b - Math.floor(b);
						const from = right[hop % 6];
						const to = right[(hop + 1) % 6];
						const a = handOf(from, from.i === 2 || from.i === 3 ? rightKeys : passKeys(from.i));
						const c = handOf(to, to.i === 2 || to.i === 3 ? rightKeys : passKeys(to.i));
						const k = ease(Math.min(1, t * 1.6));
						const x = a.x + (c.x - a.x) * k;
						const y = a.y + (c.y - a.y) * k - Math.sin(Math.PI * k) * 70 + 28;
						return <Cup key={startAt} id={`pass-${startAt}`} x={x} y={y} scale={0.7} fill={0.55} liquid={COLORS.gold} />;
					})}
				</g>
			) : null}
			{showCast ? (
				<>
					<Character
						{...partnerProps}
						between={Array.from({length: handed}, (_, i) => (
							<Cup key={i} id={`stack-${i}`} {...slot(i)} tilt={sway(i) * 0.4} scale={STACK_CUP} fill={0} label={NEEDS[i]} labelSize={22} />
						))}
					/>
					<Character {...heroProps} />
					<Cup id="hero-carry" {...heroCup(f, heroSk.armB.H)} liquid={COLORS.liquidHero} />
					{HAND_OFFS.map((h, i) => {
						if (f < h - 5 || f >= h + 7) return null;
						const hand = heroSk.armF.H;
						const target = slot(i);
						const t = interpolate(f, [h, h + 7], [0, 1], {...clamp01, easing: ease});
						const glint = interpolate(f, [h - 5, h, h + 4], [0, 1, 0], clamp01);
						return (
							<Cup
								key={`fly-${i}`}
								id={`fly-${i}`}
								x={hand.x + (target.x - hand.x) * t}
								y={hand.y + 30 + (target.y - hand.y - 30) * t - Math.sin(Math.PI * t) * 40}
								scale={STACK_CUP}
								fill={0}
								label={NEEDS[i]}
								labelSize={22}
								glint={glint}
							/>
						);
					})}
				</>
			) : null}
		</g>
	);
};

export const EVIDENCE_END = S(14).startFrame;
