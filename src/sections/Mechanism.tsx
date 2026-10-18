// 第 5 节 机制 (屏 26-31): 平原尽头一块冷白顶光的空地, 两把椅子隔得很远
// 从观众的手机穿到主角的手机. 主角发消息求确认 -> 对方回一个字, 杯里涨一截 -> 很快漏回去
// -> 问得越来越勤, 杯旁的液面曲线锯齿越来越密 -> 对方累了 -> 你越追 对方越退 -> 杯子开裂 手一松
// 这里也放着第 6 节要用的空地环境和主角那只杯的全程状态
import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, solveSkeleton, useRenderMode, type CharacterProps} from '../components/Character';
import {Cup, cupSide, Drop} from '../components/Cup';
import {Bubble, Footprints, LevelGraph, Phone} from '../components/Props';
import {beatsBetween} from '../data/beatmap';
import {cueFrame, screenById, travel} from '../lib/timeline';
import {COLORS} from '../theme';
import {HERO_KEYS, HERO_LOOK, PARTNER_KEYS, PARTNER_LOOK, PLACES, heroState, partnerState} from './cast';
import {Chair} from './Hook';

const S = (id: number) => screenById(id);
export const MECH_START = S(26).startFrame;
export const MECH_END = S(32).startFrame;
export const TURN_END = S(41).startFrame;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
export const io = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], {...clamp, easing: ease});

export const M = {
	reply: cueFrame(S(26), 4),
	leak: S(27).startFrame,
	ask: S(28).startFrame,
	tired: S(29).startFrame,
	chase: S(30).startFrame,
	crack: S(31).startFrame,
	release: cueFrame(S(31), 2),
	smash: S(32).startFrame,
	pick: S(33).startFrame,
	mend: S(34).startFrame,
	rise: S(35).startFrame,
	hold: S(36).startFrame,
	leave: S(37).startFrame,
	back: S(38).startFrame,
	jug: cueFrame(S(38), 3),
	hug: S(39).startFrame,
	five: S(40).startFrame,
	end: TURN_END,
};

// ---------- 走位 ----------
const hx0 = PLACES.mHeroChair;
const px0 = PLACES.mPartnerChair;
export const mHeroX = (f: number): number => {
	if (f < M.chase) return hx0;
	if (f < M.smash) return travel(HERO_KEYS, f, hx0, 4140, M.chase, M.crack);
	if (f < M.leave) return 4140 - io(f, M.smash - 2, M.smash + 8, 0, 40);
	if (f < M.back) return travel(HERO_KEYS, f, 4100, 3300, M.leave, M.back);
	return travel(HERO_KEYS, f, 3300, 4120, M.back, M.hug);
};
export const mPartnerX = (f: number): number => {
	if (f < M.chase) return px0;
	// 退到 4800: 杯子落地那几个特写里, 对方的头不会进到右上角的水印区
	if (f < M.hold) return travel(PARTNER_KEYS, f, px0, 4800, M.chase, M.crack);
	if (f < M.hug) return travel(PARTNER_KEYS, f, 4800, 4290, M.hold, M.leave);
	return travel(PARTNER_KEYS, f, 4290, 4520, M.hug, M.five);
};

/** 主角那只杯的液面: 每次收到回复涨一截, 然后漏下去, 越来越快 */
export const mFill = (f: number): number => {
	if (f < M.reply) return 0.15;
	if (f < M.leak) return io(f, M.reply, M.reply + 6, 0.15, 0.62);
	if (f < M.ask) return interpolate(f, [M.leak, M.ask], [0.62, 0.1], clamp);
	if (f < M.tired) {
		// 屏 28: 每拍问一次 每半拍后收到一个 嗯, 涨得少 漏得快
		const replies = [0.5, 1.5, 2.5, 3.5].map((b) => cueFrame(S(28), b));
		let v = 0.1;
		for (const r of replies) {
			if (f >= r) v = Math.max(0.06, 0.34 - (f - r) * 0.025);
		}
		return v;
	}
	return 0.06;
};

/** 环境: 顶光 两把椅子 远处的地平线 (远景用) */
export const OpenGround: React.FC = () => {
	const f = useCurrentFrame();
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const L = PLACES.mLight;
	// 金缮之后光变暖
	const warm = io(f, M.rise, M.rise + 30, 0, 1);
	const dip = f >= M.smash && f < M.smash + 30 ? 1 - (f - M.smash) / 30 : 0;
	// 远处的山: 只在屏 37 的远景里浮现, 平时不出现在中景背后
	const hills = [
		[2700, 0], [3000, -50], [3300, -26], [3700, -80], [4100, -40], [4500, -95], [5000, -38], [5500, -70], [6100, -30], [6800, 0],
	].map(([x, y]) => [x, y * 0.9]);
	const hillsOn = io(f, M.leave - 10, M.leave + 30, 0, 1) * (1 - io(f, M.back + 10, M.back + 50, 0, 1));
	return (
		<g>
			<defs>
				<linearGradient id="m-cone" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.04} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0.17} />
				</linearGradient>
				<radialGradient id="m-pool">
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.22} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0} />
				</radialGradient>
				<radialGradient id="m-warm">
					<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.32} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</radialGradient>
				<radialGradient id="m-horizon" cx="50%" cy="100%" r="100%">
					<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.2} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={2900} y={0} width={6000} height={900} fill="#130F0B" />
			<ellipse cx={3900} cy={0} rx={3200} ry={520} fill="url(#m-horizon)" opacity={0.6 + 0.6 * warm} />
			<g opacity={hillsOn}>
				<polygon points={hills.map(([x, y]) => `${x},${y}`).join(' ')} fill="#0C0A08" />
				<polyline points={hills.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={COLORS.goldDim} strokeOpacity={0.4} strokeWidth={3} />
			</g>
			<polygon points={`${L.x - 50},${L.y} ${L.x + 50},${L.y} ${L.x + 430},0 ${L.x - 430},0`} fill="url(#m-cone)" opacity={1 - 0.5 * warm} />
			<ellipse cx={L.x} cy={6} rx={520} ry={50} fill="url(#m-pool)" opacity={1 - 0.4 * warm} />
			<ellipse cx={L.x} cy={-240} rx={620} ry={460} fill="url(#m-warm)" opacity={warm} />
			<Chair x={hx0} dir={1} />
			<Chair x={px0} dir={-1} />
			{dip > 0 ? <rect x={-2000} y={-3000} width={14000} height={6000} fill="#000" opacity={0.45 * dip} /> : null}
		</g>
	);
};

export const Mechanism: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (f < MECH_START - 2 || f >= MECH_END) return null;

	const hx = mHeroX(f);
	const px = mPartnerX(f);
	const hs = heroState(f, fps);
	const ps = partnerState(f, fps);
	const sitting = f < M.chase;
	const fill = mFill(f);

	// 坐着: 近侧手拿手机, 远侧手扶着放在大腿上的杯; 站起来后杯挂在远侧手里; 屏 31 双手捧到胸前, 开裂, 松手
	const heroPhone = {x: hx + 58, y: -262};
	const lapCup = {x: hx + 70, y: -128};
	const probe = solveSkeleton({...HERO_LOOK, x: hx, y: 0, state: hs} as CharacterProps, f, fps);
	const chest = {x: hx + 54, y: -240};
	let cup = sitting ? lapCup : {x: probe.armB.H.x + 4, y: probe.armB.H.y + 26};
	if (f >= M.crack) cup = chest;
	let tilt = 0;
	if (f >= M.release) {
		const t = interpolate(f, [M.release, M.smash], [0, 1], clamp);
		cup = {x: chest.x + 10 * t, y: chest.y + (0 - chest.y) * Math.pow(t, 2.2)};
		tilt = 70 * t * t;
	}
	const holdChest = f >= M.crack && f < M.release;
	const back = cupSide({...cup, scale: 0.82}, 1, 0.5);
	const face = cupSide({...cup, scale: 0.82}, -1, 0.45);
	const heroProps: CharacterProps = {
		...HERO_LOOK, x: hx, y: 0, state: hs, light: [0.4, -0.9], vx: hx - mHeroX(f - 1),
		ikF: sitting ? {x: heroPhone.x - 4, y: heroPhone.y + 12} : holdChest ? {x: face.x + 14, y: face.y} : null,
		ikB: sitting ? {x: back.x - 10, y: back.y} : holdChest ? {x: (back.x + face.x) / 2 - 4, y: back.y} : null,
		ikWeight: 1,
	} as CharacterProps;

	const partnerPhone = {x: px - 58, y: -262};
	const partnerSitting = f < M.chase;
	const partnerProps: CharacterProps = {
		...PARTNER_LOOK, x: px, y: 0, state: ps, light: [-0.4, -0.9], vx: px - mPartnerX(f - 1),
		rim: f >= M.tired ? 0.45 : 1,
		ikF: partnerSitting ? {x: partnerPhone.x + 4, y: partnerPhone.y + 12} : null,
		ikB: partnerSitting ? {x: partnerPhone.x + 10, y: partnerPhone.y + 16} : null,
	} as CharacterProps;

	// 液面曲线: 过去 4 秒的液面
	const hist = Array.from({length: 30}, (_, i) => mFill(f - (29 - i) * 4));
	const graphOn = interpolate(f, [M.leak, M.leak + 12, M.chase - 8, M.chase], [0, 1, 1, 0], clamp);

	// 气泡
	const bub = (at: number, len = 40) => interpolate(f, [at - 3, at + 4, at + len, at + len + 8], [0, 1, 1, 0], clamp);
	const asks = [0, 1, 2, 3].map((b) => cueFrame(S(28), b));
	const replies = [0.5, 1.5, 2.5, 3.5].map((b) => cueFrame(S(28), b));
	const ASK = ['在吗', '你在忙吗', '回我', '在不在'];

	// 漏: 屏 27 杯底往下滴
	const drips = f >= M.leak && f < M.ask ? [0, 1, 2].map((i) => ((f - M.leak + i * 21) % 63) / 63) : [];
	const steps = f >= M.chase ? beatsBetween(M.chase, Math.min(f + 1, M.crack)) : [];

	return (
		<g>
			<Footprints xs={steps.map((s) => travel(HERO_KEYS, s, hx0, 4140, M.chase, M.crack) + 30)} y={4} />
			<Character {...partnerProps} />
			{partnerSitting ? <Phone id="mp" x={partnerPhone.x} y={partnerPhone.y} light={f >= M.tired ? 0.15 : 0.6} faceDown={f >= M.tired + 10} /> : null}
			<Character
				{...heroProps}
				between={<Cup id="m-hero" {...cup} scale={0.82} tilt={tilt} fill={fill} liquid={COLORS.liquidHero} stain={1} cracks={io(f, M.crack, M.crack + 40, 0, 1)} wobble={0.4} />}
			/>
			{sitting ? <Phone id="mh" x={heroPhone.x} y={heroPhone.y} light={0.8} /> : null}
			{drips.map((t, i) => (
				<Drop key={i} x={lapCup.x + 6 - i * 8} y={lapCup.y + 6 + t * 120} r={4} />
			))}
			<LevelGraph x={hx + 120} y={-330} w={210} h={90} values={hist} opacity={graphOn} />
			<Bubble x={heroPhone.x + 40} y={-420} text="你还爱我吗" t={bub(cueFrame(S(26), 1), 70)} tail={-1} />
			<Bubble x={partnerPhone.x - 30} y={-420} text="爱" t={bub(M.reply, 50)} tail={1} gold />
			{asks.map((a, i) => (
				<Bubble key={i} x={heroPhone.x + 40} y={-410 - i * 52} text={ASK[i]} t={bub(a, 18)} tail={-1} scale={0.85} />
			))}
			{replies.map((r, i) => (
				<Bubble key={`r${i}`} x={partnerPhone.x - 20} y={-410 - i * 52} text="嗯" t={bub(r, 12)} tail={1} gold scale={0.85} />
			))}
		</g>
	);
};
