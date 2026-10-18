// 第 6 节 转折与答案 (屏 32-41)
// 主 drop: 杯子落地摔碎, 主角跌坐 -> 一片片捡起 -> 金缮拼回 -> 举起 (依赖本身没有错)
// -> 对方双手托住杯底 -> 主角转身独自走远 跑起来 (远景) -> 跑回来, 只有对方在往杯里倒
// -> 老朋友拥抱 倒一点 -> 搭子击掌 倒一点 -> 从杯里的反光穿回卧室, 主角给自己倒到七分满
import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, solveSkeleton, useRenderMode, type CharacterProps} from '../components/Character';
import {Cup, cupLip, cupSide, PourStream, shardRest, shardShape, Shards} from '../components/Cup';
import {Jug, Phone, Teapot, spoutOf} from '../components/Props';
import {poseAt} from '../data/poses';
import {cueFrame, screenById, travel} from '../lib/timeline';
import {COLORS} from '../theme';
import {BUDDY_KEYS, BUDDY_LOOK, FRIEND_KEYS, FRIEND_LOOK, HERO_LOOK, PARTNER_LOOK, PLACES, heroState, partnerState} from './cast';
import {M, MECH_END, io, mHeroX, mPartnerX} from './Mechanism';

const S = (id: number) => screenById(id);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const IMPACT_X = 4196;
const PICKED = [1, 3, 0, 5];
export const BED_SELF = S(41).startFrame;

/** 主角这只杯在第 6 节的液面 */
const turnFill = (f: number) => {
	if (f < M.jug + 6) return 0;
	if (f < M.hug) return io(f, M.jug + 6, M.hug, 0, 0.3);
	if (f < M.five) return io(f, cueFrame(S(39), 1.5), cueFrame(S(39), 3.5), 0.3, 0.45);
	return io(f, cueFrame(S(40), 2), cueFrame(S(40), 3.5), 0.45, 0.6);
};

const friendX = (f: number) => travel(FRIEND_KEYS, f, 3640, 4000, M.back, M.five);
const buddyX = (f: number) => travel(BUDDY_KEYS, f, 4760, 4265, M.hug, M.end);

export const Turn: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const mode = useRenderMode();
	if (f < MECH_END - 2 || f >= S(42).startFrame) return null;
	const inBed = f >= BED_SELF;

	const hs = heroState(f, fps);
	const ps = partnerState(f, fps);
	const hx = inBed ? PLACES.bedEdge : mHeroX(f);
	const px = mPartnerX(f);
	const facing = hs.facing >= 0 ? 1 : -1;
	const front = (dy = -250) => ({x: hx + facing * 54, y: dy});
	const probe = solveSkeleton({...HERO_LOOK, x: hx, y: 0, state: hs} as CharacterProps, f, fps);

	// ---------- 杯子在哪 ----------
	let cup: {x: number; y: number} | null = null;
	let ik: 'both' | 'none' = 'none';
	let kintsugi = 0;
	let opacity = 1;
	if (f >= M.mend) {
		kintsugi = io(f, cueFrame(S(34), 3), cueFrame(S(34), 7), 0, 1);
		const t = io(f, M.mend, cueFrame(S(34), 3), 0, 1);
		opacity = t;
		cup = front(-168);
		ik = 'both';
	}
	if (f >= M.rise) {
		// 举起: 杯子跟着近侧手
		cup = {x: probe.armF.H.x + facing * 2, y: probe.armF.H.y + 18};
		ik = 'none';
		if (f >= M.hold) {
			cup = front(-262);
			ik = 'both';
		}
	}
	const carryBack = (f >= M.leave + 4 && f < M.jug) || (f >= M.hug && f < cueFrame(S(39), 2)) || (f >= M.five && f < cueFrame(S(40), 2));
	const hugging = f >= M.hug && f < cueFrame(S(39), 2);
	if (hugging) {
		// 拥抱时近侧手搂着朋友, 远侧手把杯子拿在腰边
		cup = {x: hx - facing * 26, y: -150};
		ik = 'none';
	} else if (carryBack) {
		cup = {x: probe.armB.H.x + 4, y: probe.armB.H.y + 26};
		ik = 'none';
	} else if (f >= M.jug && !inBed) {
		cup = front(-255);
		ik = 'both';
	}
	if (inBed) {
		cup = {x: hx + 58, y: -132};
		ik = 'both';
	}
	const fill = inBed ? io(f, cueFrame(S(41), 0.5), cueFrame(S(41), 4), 0.6, 0.72) : turnFill(f);

	const sideF = cup ? cupSide({...cup, scale: 0.82}, facing === 1 ? -1 : 1, 0.45) : null;
	const sideB = cup ? cupSide({...cup, scale: 0.82}, facing === 1 ? 1 : -1, 0.5) : null;
	// 屏 33: 每拍伸手去捡一片
	const picking = f >= M.pick && f < M.mend;
	const pickIdx = picking ? Math.min(3, Math.floor((f - M.pick) / ((M.mend - M.pick) / 4))) : -1;
	const pickTarget = pickIdx >= 0 ? shardRest(PICKED[pickIdx], IMPACT_X, 0) : null;
	// 卧室: 远侧手扶着腿上的杯, 近侧手提着茶壶倒
	const pot = {x: hx + 102, y: -232};
	const potTilt = inBed ? interpolate(f, [cueFrame(S(41), 0.3), cueFrame(S(41), 1), cueFrame(S(41), 4), cueFrame(S(41), 5)], [0, -38, -38, 0], clamp) : 0;

	const heroProps: CharacterProps = {
		...HERO_LOOK, x: hx, y: 0, state: hs, light: inBed ? [0.6, -0.8] : [0.4, -0.9], vx: inBed ? 0 : hx - mHeroX(f - 1),
		ikF: inBed ? {x: pot.x - 18, y: pot.y + 6} : ik === 'both' && sideF ? {x: sideF.x + facing * 14, y: sideF.y} : pickTarget ? {x: pickTarget.x, y: pickTarget.y - 4} : null,
		ikB: ik === 'both' && sideB && sideF ? {x: (sideB.x + sideF.x) / 2 - facing * 4, y: sideB.y} : hugging && cup ? {x: cup.x + facing * 4, y: cup.y - 30} : null,
		ikWeight: 1,
	} as CharacterProps;

	// ---------- 对方 ----------
	const offering = f >= cueFrame(S(36), 2) && f < M.leave + 6;
	const pouring = f >= M.jug && f < M.hug;
	// 壶在杯子右上方, 不挡主角的脸
	const jugAt = cup ? {x: cup.x + 74, y: cup.y - 70} : {x: px - 60, y: -300};
	const partnerProps: CharacterProps = {
		...PARTNER_LOOK, x: px, y: 0, state: ps, light: [-0.4, -0.9], vx: px - mPartnerX(f - 1),
		ikF: offering && cup ? {x: cup.x + 12, y: cup.y + 12} : pouring ? {x: jugAt.x + 14, y: jugAt.y - 24} : null,
		ikB: offering && cup ? {x: cup.x - 8, y: cup.y + 14} : null,
		ikWeight: 1,
	} as CharacterProps;

	// ---------- 朋友 ----------
	const fx = friendX(f);
	const friendState = poseAt(FRIEND_KEYS, f, fps, 0.4, 1);
	const friendCup = {x: fx + 56, y: -258};
	const friendPour = f >= cueFrame(S(39), 1.5) && f < cueFrame(S(39), 3.5);
	const friendProps: CharacterProps = {
		...FRIEND_LOOK, x: fx, y: 0, state: friendState, light: [0.4, -0.9], vx: fx - friendX(f - 1),
		ikF: f >= cueFrame(S(39), 1) ? {x: friendCup.x - 12, y: friendCup.y - 8} : null,
	} as CharacterProps;
	const bx = buddyX(f);
	const buddyState = poseAt(BUDDY_KEYS, f, fps, 0.7, -1);
	const buddyCup = {x: bx - 56, y: -262};
	const buddyPour = f >= cueFrame(S(40), 2) && f < cueFrame(S(40), 3.5);
	const buddyProps: CharacterProps = {
		...BUDDY_LOOK, x: bx, y: 0, state: buddyState, light: [-0.4, -0.9], vx: bx - buddyX(f - 1),
		ikF: f >= cueFrame(S(40), 1.5) ? {x: buddyCup.x + 12, y: buddyCup.y - 8} : null,
	} as CharacterProps;

	const since = f - M.smash;
	const rays = f >= M.rise && f < M.rise + 45 ? 1 - (f - M.rise) / 45 : 0;
	const heroCupNode = cup ? (
		<Cup id="turn-cup" {...cup} scale={0.82} fill={fill} liquid={COLORS.liquidHero} kintsugi={kintsugi} opacity={opacity} glint={rays * 0.8} wobble={0.3} />
	) : null;

	return (
		<g>
			{!inBed ? (
				<>
					<Shards x={IMPACT_X} ground={0} since={f < M.mend ? since : -1} picked={0} />
					{/* 被捡起的碎片: 先飞到手里, 屏 34 所有碎片聚回杯子的形状 */}
					{f >= M.pick && f < cueFrame(S(34), 3)
						? PICKED.map((idx, i) => {
								const at = M.pick + ((M.mend - M.pick) / 4) * i;
								if (f < at + 6) return null;
								const rest = shardRest(idx, IMPACT_X, 0);
								const hand = {x: probe.armB.H.x, y: probe.armB.H.y};
								const goal = f >= M.mend ? front(-168) : hand;
								const t = f >= M.mend ? io(f, M.mend, cueFrame(S(34), 3), 0, 1) : io(f, at + 6, at + 14, 0, 1);
								const from = f >= M.mend ? hand : rest;
								return (
									<g key={idx} transform={`translate(${from.x + (goal.x - from.x) * t} ${from.y + (goal.y - from.y) * t - 10 * i})`}>
										<polygon points={shardShape(idx).map((q) => q.join(',')).join(' ')} fill={COLORS.cup} stroke={COLORS.gold} strokeWidth={1.2} />
									</g>
								);
							})
						: null}
					{f >= M.mend && f < cueFrame(S(34), 3)
						? Array.from({length: 14}, (_, idx) => {
								if (PICKED.includes(idx)) return null;
								const rest = shardRest(idx, IMPACT_X, 0);
								const goal = front(-168);
								const t = io(f, M.mend + idx, cueFrame(S(34), 3), 0, 1);
								return (
									<g key={`g${idx}`} transform={`translate(${rest.x + (goal.x - rest.x) * t} ${rest.y + (goal.y - rest.y) * t}) rotate(${(1 - t) * 90})`}>
										<polygon points={shardShape(idx).map((q) => q.join(',')).join(' ')} fill={COLORS.cup} stroke={COLORS.gold} strokeWidth={1.2} />
									</g>
								);
							})
						: null}
				</>
			) : null}
			{rays > 0 && cup && mode === 'normal' ? (
				<g opacity={rays}>
					{Array.from({length: 14}, (_, i) => {
						const a = (i / 14) * Math.PI * 2;
						const r0 = 40 + (1 - rays) * 160;
						const r1 = r0 + 260;
						return <line key={i} x1={cup!.x + Math.cos(a) * r0} y1={cup!.y - 30 + Math.sin(a) * r0} x2={cup!.x + Math.cos(a) * r1} y2={cup!.y - 30 + Math.sin(a) * r1} stroke={COLORS.gold} strokeWidth={6} strokeLinecap="round" />;
					})}
				</g>
			) : null}
			{!inBed ? <Character {...partnerProps} /> : null}
			{!inBed && pouring ? (
				<>
					<Jug x={jugAt.x} y={jugAt.y} tilt={-55} flip />
					{cup ? <PourStream from={spoutOf('jug', jugAt.x, jugAt.y, -55, true)} to={{x: cup.x + 6, y: cup.y - 52}} flow={io(f, M.jug + 2, M.jug + 10, 0, 0.7)} color={COLORS.liquidPartner} /> : null}
				</>
			) : null}
			{!inBed && f >= M.back ? (
				<>
					<Character {...friendProps} between={f >= cueFrame(S(39), 1) ? <Cup id="friend-cup" {...friendCup} scale={0.7} fill={0.5} liquid={COLORS.ivory} tilt={friendPour ? -60 : 0} /> : null} />
					{friendPour && cup ? <PourStream from={cupLip({...friendCup, scale: 0.7, tilt: -60})} to={{x: cup.x, y: cup.y - 52}} flow={0.6} color={COLORS.ivory} /> : null}
				</>
			) : null}
			{!inBed && f >= M.hug ? (
				<>
					<Character {...buddyProps} between={f >= cueFrame(S(40), 1.5) ? <Cup id="buddy-cup" {...buddyCup} scale={0.7} fill={0.5} liquid={COLORS.gold} tilt={buddyPour ? 60 : 0} /> : null} />
					{buddyPour && cup ? <PourStream from={cupLip({...buddyCup, scale: 0.7, tilt: 60})} to={{x: cup.x, y: cup.y - 52}} flow={0.6} color={COLORS.liquidPartner} /> : null}
				</>
			) : null}
			<Character {...heroProps} between={ik === 'both' ? heroCupNode : null} />
			{ik !== 'both' ? heroCupNode : null}
			{inBed ? (
				<>
					<Phone id="bed-phone" x={PLACES.nightstand.x - 4} y={PLACES.nightstand.top - 4} rot={90} faceDown light={0} />
					<Teapot x={pot.x} y={pot.y} tilt={potTilt} flip />
					{potTilt < -20 && cup ? <PourStream from={spoutOf('teapot', pot.x, pot.y, potTilt, true)} to={{x: cup.x + 4, y: cup.y - 52}} flow={0.6} color={COLORS.liquidHero} /> : null}
				</>
			) : null}
		</g>
	);
};

