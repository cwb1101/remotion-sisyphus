import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {BlackStone} from '../components/BlackStone';
import {camAt, camTransform, prog} from '../components/Camera';
import {Figure, lerpPose, POSES, withBreath, withWalk} from '../components/Figure';
import {ImpactWord} from '../components/ImpactWord';
import {Landscape, slopeY} from '../components/Landscape';
import {GoldDust, Motes} from '../components/Particles';
import {cue, sc} from '../data/script';
import {C} from '../theme';
import {OPENING, STONE_SEED} from './Opening';

// 第一节（第 4–9 屏）：什么是黑色生命力。
// 镜头从石头内部拉出 → 坡地上甲推石 → 冷雨 → 金边 → 再推进石头剖面，金点长出年轮。
export const S1 = {r: 120, x0: 1000};
export const stoneCY = (x: number, r: number) => slopeY(x) - r * 0.95;
const FILL_Z = (16 * OPENING.stoneR) / S1.r;

export const section1Range = () => ({from: sc(4).startFrame, to: sc(10).startFrame + 8});

// 石头在坡上的位置（随时间被推上去）
export const s1StoneX = (frame: number) => {
	const s5 = sc(5);
	const s6 = sc(6);
	const s7 = sc(7);
	const seg = (a: number, b: number, d: number) =>
		interpolate(frame, [a, b], [0, d], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
	return (
		S1.x0 +
		seg(s5.startFrame + 20, s5.startFrame + 45, 60) +
		seg(s5.startFrame + 64, s6.startFrame + 6, 40) +
		seg(s6.startFrame + 6, s6.endFrame - 4, 30) +
		seg(s7.startFrame + 12, s7.startFrame + 36, 45)
	);
};

const RainLines: React.FC<{frame: number; amount: number}> = ({frame, amount}) => {
	if (amount <= 0) {
		return null;
	}
	return (
		<g opacity={amount}>
			{Array.from({length: 90}).map((_, i) => {
				const sp = 26 + random(`rs${i}`) * 18;
				const x0 = random(`rx${i}`) * 2400;
				const y0 = random(`ry${i}`) * 1400;
				const y = ((y0 + frame * sp) % 1400) - 200;
				const x = x0 - (y + 200) * 0.35 - 200;
				const len = 50 + random(`rl${i}`) * 60;
				return (
					<line key={i} x1={x} y1={y} x2={x - len * 0.35} y2={y + len} stroke={C.blue} strokeWidth={2} opacity={0.32} strokeLinecap="round" />
				);
			})}
		</g>
	);
};

export const Section1: React.FC = () => {
	const frame = useCurrentFrame();
	const {from, to} = section1Range();
	if (frame < from || frame > to) {
		return null;
	}
	const s4 = sc(4);
	const s5 = sc(5);
	const s6 = sc(6);
	const s7 = sc(7);
	const s8 = sc(8);
	const s9 = sc(9);
	const slam = cue(4, 'impact');
	const bell7 = cue(7, 'bell');
	const arp = cue(9, 'arpUp');

	const x = s1StoneX(frame);
	const r = S1.r;
	const cy = stoneCY(x, r);
	const rot = ((x - S1.x0) / r) * (180 / Math.PI);
	// 甲在镜头拉远的过程中从左边走进画面，然后上手推石
	const walkIn = prog(frame, s4.startFrame + 40, s5.startFrame + 14, Easing.linear);
	const bentNow = prog(frame, s6.startFrame, s6.startFrame + 14) * (1 - prog(frame, s7.startFrame, s7.startFrame + 14));
	const jiaX = x - r - 70 - 14 * bentNow - 380 * (1 - walkIn);

	const xs8 = s1StoneX(s8.startFrame);
	const cys8 = stoneCY(xs8, r);
	const cam = camAt(
		[
			{f: s4.startFrame, x: S1.x0, y: stoneCY(S1.x0, r), z: FILL_Z},
			{f: s4.startFrame + 56, x: S1.x0, y: stoneCY(S1.x0, r), z: FILL_Z * 0.82},
			{f: s5.startFrame + 18, x: S1.x0 + 40, y: 600, z: 1.3},
			{f: s6.startFrame, x: S1.x0 + 90, y: 590, z: 1.32},
			{f: s7.endFrame - 2, x: s1StoneX(s7.endFrame), y: 580, z: 1.42},
			{f: s8.startFrame + 14, x: xs8, y: cys8, z: 4},
			{f: s8.startFrame + 26, x: xs8, y: cys8, z: 15},
			{f: s9.startFrame, x: xs8, y: cys8, z: 16},
			{f: s9.endFrame, x: xs8, y: cys8, z: 12},
		],
		frame,
	);

	// 甲：推 → 停下抬头 → 继续推 → 冷雨里弯腰 → 直起腰再推一步
	const walking =
		(frame > s5.startFrame + 20 && frame < s5.startFrame + 45) ||
		(frame > s5.startFrame + 64 && frame < s7.startFrame) ||
		(frame > s7.startFrame + 12 && frame < s7.startFrame + 36);
	const phase = ((x - S1.x0) / 55) * Math.PI;
	const look = prog(frame, s5.startFrame + 45, s5.startFrame + 54) * (1 - prog(frame, s5.startFrame + 60, s5.startFrame + 68));
	const bent = bentNow;
	let pose = lerpPose(POSES.push, POSES.pushLookUp, look);
	pose = lerpPose(pose, POSES.pushBent, bent);
	pose = walking ? withWalk(pose, phase, bent > 0.5 ? 0.6 : 0.85) : withBreath(pose, frame);
	if (walkIn < 1) {
		const w = withWalk(POSES.stand, (-380 * (1 - walkIn)) / 55 * Math.PI, 1, true);
		pose = lerpPose(w, pose, prog(frame, s5.startFrame + 4, s5.startFrame + 16));
	} else if (frame < s5.startFrame + 16) {
		pose = lerpPose(POSES.stand, pose, prog(frame, s5.startFrame + 4, s5.startFrame + 16));
	}

	// 光点：一粒粒亮起，第 6 屏里最远那粒被冷雨浇灭
	const dots = [
		{x: 1250, at: cue(5, 'pluck', 0)},
		{x: 1380, at: s5.startFrame + 30},
		{x: 1510, at: cue(5, 'pluck', 1)},
	];
	const dotOut = prog(frame, s6.startFrame + 18, s6.startFrame + 34);
	const dotsAlpha = 1 - prog(frame, s8.startFrame, s8.startFrame + 10);

	const rain = prog(frame, s6.startFrame, s6.startFrame + 8) * (1 - prog(frame, s7.startFrame, s7.startFrame + 12));
	const cold = rain;
	const gold = prog(frame, bell7 - 6, bell7 + 10);

	// 第 4 屏：石头填满画面时裂缝亮起、大字砸下、金尘升起
	const flash = Math.exp(-Math.max(0, frame - slam) / 10) * (frame >= slam ? 1 : 0);
	const crackGlow = Math.min(1, 0.7 + flash * 0.6);

	// 第 8–9 屏：剖面
	const core = prog(frame, s8.startFrame + 18, s8.startFrame + 28) * (1 - prog(frame, to - 18, to - 8));
	const rings = interpolate(frame, [arp, arp + 66], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const ringsShown = rings * (1 - prog(frame, s9.endFrame, s9.endFrame + 12));
	const coreGlow = 0.35 + 0.65 * rings + 0.15 * Math.sin(frame / 8);

	const sun = interpolate(frame, [s4.startFrame + 50, s5.startFrame + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (1 - rain * 0.6);
	const fadeIn = interpolate(frame, [from, from + 10], [0, 1], {extrapolateRight: 'clamp'});

	return (
		<AbsoluteFill style={{opacity: fadeIn}}>
			<svg width={1920} height={1080}>
				<Landscape cam={cam} variant="slope" sun={sun} cool={cold} />
				<Motes frame={frame} count={40} opacity={0.28} seed="s1" color="#C9BFA6" />
				<g transform={camTransform(cam)}>
					{dots.map((d, i) => {
						const on = prog(frame, d.at, d.at + 8) * (i === 2 ? 1 - dotOut * 0.9 : 1);
						return (
							<g key={i} opacity={on * dotsAlpha}>
								<circle cx={d.x} cy={slopeY(d.x) + 16} r={22} fill={C.gold} opacity={0.18} />
								<circle cx={d.x} cy={slopeY(d.x) + 16} r={6} fill={C.goldPale} />
							</g>
						);
					})}
					<BlackStone
						id="s1"
						cx={x}
						cy={cy}
						r={r}
						rot={rot}
						seed={STONE_SEED}
						crack={1}
						crackGlow={crackGlow * (1 - cold * 0.5)}
						rim={Math.max(0.7 * (1 - prog(frame, s4.endFrame, s5.startFrame + 20)), cold * 0.6, gold * 0.8)}
						rimColor={cold > 0.5 ? C.blue : C.gold}
						cold={cold}
						core={core}
						coreGlow={coreGlow}
						rings={ringsShown}
					/>
					<Figure
						x={jiaX}
						y={slopeY(jiaX)}
						pose={pose}
						color={C.jia}
						rim={gold * 0.4}
						opacity={frame >= s8.startFrame ? interpolate(cam.z, [1.7, 2.8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1}
					/>
				</g>
				<RainLines frame={frame} amount={rain} />
				<GoldDust frame={frame} start={slam} amount={1 - prog(frame, s4.endFrame - 20, s4.endFrame + 10)} area={{x0: 0, x1: 1920, y0: 380, y1: 820}} />
			</svg>
			{sc(4).impact ? (
				<ImpactWord impact={sc(4).impact!} screenStart={s4.startFrame} frame={frame} size={200} centerY={420} fadeOutAt={s4.endFrame - s4.startFrame - 20} glow />
			) : null}
		</AbsoluteFill>
	);
};
