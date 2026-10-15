import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {BlackStone} from '../components/BlackStone';
import {camAt, camTransform, kf, prog, worldToScreen} from '../components/Camera';
import {Figure, POSES, poseTrack, withBreath, withWalk} from '../components/Figure';
import {ImpactWord} from '../components/ImpactWord';
import {Landscape, SLOPE, slopeY} from '../components/Landscape';
import {LightRays} from '../components/Overlays';
import {GoldDust, Motes} from '../components/Particles';
import {cue, sc} from '../data/script';
import {C} from '../theme';
import {STONE_SEED} from './Opening';
import {S1, stoneCY} from './Section1';
import {S4_END, s4StoneX, SUMMIT_X} from './Section4';

// 第五节（第 35–40 屏）：见过黑暗，仍然点灯。
// 坡顶黑石裂开透光（"光"砸下）→ 拉成大全景回望坡底，黑里坐着乙 → 推回坡顶，掰下一片光 →
// 全景里捧光下坡、留下金色脚印 → 坡底蹲下把光递给乙 → 光落进乙胸口，黑退开，两人站起来面对面。
export const YI = {x: 180, pool: 150};
export const S5_END = {yiX: 180, jiaX: 440};
// 第 41 屏前的空档：镜头从坡底抬到天上（第五、六节共用这两组关键帧，交接处画面一致）
export const tiltKeys = () => [
	{f: sc(40).endFrame - 6, x: 330, y: 720, z: 1.3},
	{f: sc(41).startFrame + 6, x: 330, y: 0, z: 1.0},
];

export const section5Range = () => ({from: sc(35).startFrame, to: sc(40).endFrame + 14});

const rotOf = (x: number) => ((x - S1.x0) / S1.r) * (180 / Math.PI);

export const Section5: React.FC = () => {
	const frame = useCurrentFrame();
	const {from, to} = section5Range();
	if (frame < from || frame > to) return null;
	const s34 = sc(34);
	const s35 = sc(35);
	const s36 = sc(36);
	const s37 = sc(37);
	const s38 = sc(38);
	const s39 = sc(39);
	const s40 = sc(40);
	const burst = cue(35, 'impact');
	const r = S4_END.r;

	const stoneX = s4StoneX(frame);
	const stoneY = stoneX > SLOPE.topX ? SLOPE.topY - r * 0.95 : stoneCY(stoneX, r);
	const groundY = (x: number) => (x > SLOPE.topX ? SLOPE.topY : slopeY(x));

	// —— 甲 ——
	const topX = SUMMIT_X - r - 75;
	let jiaX = Math.min(stoneX - r - 75, topX);
	jiaX -= 30 * prog(frame, burst, burst + 12);
	const down = prog(frame, s38.startFrame + 6, s39.startFrame + 40, Easing.inOut(Easing.sin));
	jiaX += (S5_END.jiaX - (topX - 30)) * down;
	const facing = kf(frame, [
		[s36.startFrame + 4, 1],
		[s36.startFrame + 14, -1],
		[s37.startFrame + 2, -1],
		[s37.startFrame + 12, 1],
		[s38.startFrame, 1],
		[s38.startFrame + 8, -1],
	]);
	const take = cue(37, 'bell');
	let pose = poseTrack(frame, [
		[from, POSES.push],
		[from + 10, POSES.push],
		[burst + 6, POSES.lookUp],
		[s36.startFrame + 4, POSES.lookUp],
		[s36.startFrame + 18, POSES.lookDown],
		[s37.startFrame + 12, POSES.stand],
		[take + 10, POSES.handOnStone],
		[take + 22, POSES.holdLight],
		[s39.startFrame + 46, POSES.holdLight],
		[s39.startFrame + 62, POSES.crouchOffer],
		[s40.startFrame + 20, POSES.crouchOffer],
		[s40.startFrame + 42, POSES.stand],
	]);
	const walking = frame < from + 10 || (down > 0 && down < 1);
	pose = walking ? withWalk(pose, frame < from + 10 ? frame * 0.7 : frame * 0.55, 0.9) : withBreath(pose, frame);

	// —— 乙 ——
	const yiUp = prog(frame, s40.startFrame + 18, s40.startFrame + 44);
	const yiPose = poseTrack(frame, [
		[from, POSES.sitHug],
		[s39.startFrame + 62, POSES.sitHug],
		[s39.startFrame + 80, {...POSES.sitHug, head: -6, torso: 6}],
		[s40.startFrame + 18, {...POSES.sitHug, head: -6, torso: 6}],
		[s40.startFrame + 44, POSES.stand],
	]);
	const yiHeart = prog(frame, s40.startFrame + 18, s40.startFrame + 26);
	const pool = 1 - 0.65 * prog(frame, s40.startFrame + 16, s40.startFrame + 46);

	// —— 光片：第 37 屏从裂缝剥落 → 甲手里 → 递到乙胸口 ——
	const chest = (x: number, y: number, f: number, crouch: number) => ({x: x + f * 46, y: y - 168 + crouch * 70});
	const crouchK = prog(frame, s39.startFrame + 46, s39.startFrame + 62) * (1 - prog(frame, s40.startFrame + 20, s40.startFrame + 42));
	const hands = chest(jiaX, groundY(jiaX), facing, crouchK);
	const crackPt = {x: stoneX - r * 0.2, y: stoneY - r * 0.05};
	const toHands = prog(frame, take, take + 24, Easing.inOut(Easing.cubic));
	const toYi = prog(frame, s40.startFrame + 4, s40.startFrame + 20, Easing.inOut(Easing.cubic));
	const yiChest = {x: YI.x + 18, y: slopeY(YI.x) - 150 + (1 - yiUp) * 60};
	let shard = {x: crackPt.x + (hands.x - crackPt.x) * toHands, y: crackPt.y + (hands.y - crackPt.y) * toHands};
	shard = {x: shard.x + (yiChest.x - shard.x) * toYi, y: shard.y + (yiChest.y - shard.y) * toYi};
	const shardOn = frame >= take && toYi < 1;

	// 金色脚印：下坡时每 6 帧留一个，慢慢淡去
	const steps: {x: number; o: number}[] = [];
	for (let f = s38.startFrame + 6; f <= Math.min(frame, s39.startFrame + 40); f += 6) {
		const p = prog(f, s38.startFrame + 6, s39.startFrame + 40, Easing.inOut(Easing.sin));
		const x = topX - 30 + (S5_END.jiaX - (topX - 30)) * p;
		steps.push({x, o: 1 - Math.min(1, (frame - f) / 80)});
	}

	// —— 镜头 ——
	const a = s34.endFrame - 26;
	const sxA = s4StoneX(a);
	const wide = {x: 1500, y: 600, z: 0.5};
	const cam = camAt(
		[
			{f: a, x: sxA + 60, y: stoneCY(sxA, r) - 40, z: 1.15},
			{f: s35.startFrame + 12, x: SUMMIT_X - 100, y: SLOPE.topY - 120, z: 1.0},
			{f: s35.endFrame, x: SUMMIT_X - 140, y: SLOPE.topY - 110, z: 1.1},
			{f: s36.startFrame + 40, ...wide},
			{f: s37.startFrame, ...wide, x: 1520},
			{f: s37.startFrame + 30, x: SUMMIT_X - 160, y: SLOPE.topY - 100, z: 1.25},
			{f: s38.startFrame, x: SUMMIT_X - 170, y: SLOPE.topY - 100, z: 1.25},
			{f: s38.startFrame + 26, x: 1500, y: 620, z: 0.55},
			{f: s39.startFrame + 10, x: 1300, y: 640, z: 0.6},
			{f: s39.startFrame + 46, x: 320, y: 720, z: 1.3},
			...tiltKeys(),
		],
		frame,
	);

	const flash = frame >= burst ? Math.exp(-(frame - burst) / 9) : 0;
	const rays = prog(frame, burst, burst + 14);
	const fadeIn = interpolate(frame, [from, from + 12], [0, 1], {extrapolateRight: 'clamp'});
	const shardScreen = worldToScreen(cam, shard);

	return (
		<AbsoluteFill style={{opacity: fadeIn}}>
			<svg width={1920} height={1080}>
				<Landscape cam={cam} variant="slope" sun={1} dark={0.25} />
				<Motes frame={frame} count={44} opacity={0.32} seed="s5" color="#C9BFA6" />
				<g transform={camTransform(cam)}>
					<defs>
						<filter id="pool5-glow" x="-0.5" y="-2" width="2" height="5">
							<feGaussianBlur stdDeviation="12" />
						</filter>
						<filter id="shard-glow" x="-2" y="-2" width="5" height="5">
							<feGaussianBlur stdDeviation="10" />
						</filter>
					</defs>
					<LightRays cx={stoneX} cy={stoneY} amount={rays * 0.9} frame={frame} len={1500} />
					{/* 坡底：乙坐着的那摊黑 */}
					<ellipse cx={YI.pool} cy={SLOPE.bottomY} rx={300 * pool + 10} ry={40 * pool + 4} fill={C.blue} opacity={0.3} filter="url(#pool5-glow)" />
					<ellipse cx={YI.pool} cy={SLOPE.bottomY} rx={300 * pool} ry={36 * pool} fill="#030306" />
					{yiUp > 0 && yiUp < 1 ? (
						<ellipse cx={YI.pool} cy={SLOPE.bottomY} rx={300 * pool + 40 * yiUp} ry={36 * pool + 6} fill="none" stroke={C.gold} strokeWidth={3} opacity={1 - yiUp} />
					) : null}
					{steps.map((st, i) =>
						st.o > 0 ? <ellipse key={i} cx={st.x} cy={groundY(st.x) + 4} rx={12} ry={4} fill={C.gold} opacity={st.o * 0.8} /> : null,
					)}
					<BlackStone id="s5" cx={stoneX} cy={stoneY} r={r} rot={rotOf(stoneX)} seed={STONE_SEED} crack={1} crackGlow={0.8 + 0.2 * rays} rim={0.8} rimColor={C.gold} />
					<Figure x={YI.x} y={SLOPE.bottomY} pose={yiPose} color={C.yi} heart={yiHeart} rim={yiHeart * 0.4} />
					{shardOn && frame > s39.startFrame + 30 ? (
						<ellipse cx={shard.x} cy={groundY(shard.x) + 4} rx={160} ry={22} fill={C.gold} opacity={0.18} />
					) : null}
					<Figure x={jiaX} y={groundY(jiaX)} pose={pose} facing={facing} color={C.jia} heart={1} rim={0.3 + 0.5 * flash} />
					{shardOn ? (
						<g>
							<circle cx={shard.x} cy={shard.y} r={34} fill={C.gold} opacity={0.45} filter="url(#shard-glow)" />
							<polygon
								points={`${shard.x - 14},${shard.y - 4} ${shard.x - 2},${shard.y - 20} ${shard.x + 15},${shard.y - 6} ${shard.x + 8},${shard.y + 16} ${shard.x - 10},${shard.y + 12}`}
								fill={C.goldPale}
							/>
						</g>
					) : null}
				</g>
				<GoldDust frame={frame} start={burst} amount={1 - prog(frame, s35.endFrame, s36.startFrame + 30)} area={{x0: 300, x1: 1900, y0: 200, y1: 760}} seed="s5g" />
				<rect width={1920} height={1080} fill={C.gold} opacity={flash * 0.35} />
				{frame > s39.startFrame + 30 && shardOn ? <circle cx={shardScreen.x} cy={shardScreen.y} r={90} fill={C.gold} opacity={0.08} /> : null}
			</svg>
			{s35.impact ? <ImpactWord impact={s35.impact} screenStart={s35.startFrame} frame={frame} size={200} centerY={400} glow fadeOutAt={s35.endFrame - s35.startFrame} /> : null}
		</AbsoluteFill>
	);
};
