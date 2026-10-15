import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {BlackStone} from '../components/BlackStone';
import {camAt, camTransform, kf, prog, worldToScreen} from '../components/Camera';
import {Figure, lerpColor, POSES, poseTrack, withBreath, withWalk} from '../components/Figure';
import {ImpactWord} from '../components/ImpactWord';
import {FLAT_Y, Landscape, SLOPE, slopeY} from '../components/Landscape';
import {LightRays} from '../components/Overlays';
import {GoldDust, Motes} from '../components/Particles';
import {cue, FULL_DURATION, sc} from '../data/script';
import {C} from '../theme';
import {OPENING} from './Opening';
import {S5_END, tiltKeys, YI} from './Section5';

// 第六节（第 41–48 屏 + 片尾）：世界是灰的。
// 镜头抬到天上：左黑右白两块，分界线化开成灰 → 落回坡底，甲把散落的黑吸进身体，变成深色剪影 →
// 镜头推进甲的身体，拉出来时回到开头的构图（同一片平地、同样左乙右甲、同一块石头落在乙面前）：
// 这一次乙没有往下沉，而是转身看清它、把手放上去——回答开头"差别到底在哪里"。
const SHADOW = '#26262C';
const GRAY = '#8C8983';

export const section6Range = () => ({from: sc(40).endFrame, to: FULL_DURATION});

const Blocks: React.FC<{frame: number}> = ({frame}) => {
	const s41 = sc(41);
	const s42 = sc(42);
	const s43 = sc(43);
	const slide = prog(frame, s41.startFrame, s41.startFrame + 16, Easing.out(Easing.cubic));
	const blend = prog(frame, s42.startFrame, s42.endFrame - 6);
	const out = prog(frame, s43.startFrame, s43.startFrame + 18);
	if (slide <= 0 || out >= 1) return null;
	const left = lerpColor('#060608', GRAY, blend);
	const right = lerpColor('#D9D6CF', GRAY, blend);
	const mix = blend * 1920;
	return (
		<g opacity={1 - out}>
			<defs>
				<linearGradient id="blend" x1="0" x2="1" y1="0" y2="0">
					<stop offset="0" stopColor={left} />
					<stop offset="1" stopColor={right} />
				</linearGradient>
			</defs>
			<rect x={-960 + 960 * slide} y={120} width={960} height={640} fill={left} />
			<rect x={1920 - 960 * slide} y={120} width={960} height={640} fill={right} />
			{blend > 0 ? <rect x={960 - mix / 2} y={120} width={mix} height={640} fill="url(#blend)" /> : null}
			<line x1={960} y1={120} x2={960} y2={760} stroke="#FFFFFF" strokeOpacity={0.5 * (1 - blend) * slide} strokeWidth={2} />
		</g>
	);
};

export const Section6: React.FC = () => {
	const frame = useCurrentFrame();
	const {from, to} = section6Range();
	if (frame < from || frame > to) return null;
	const s41 = sc(41);
	const s42 = sc(42);
	const s43 = sc(43);
	const s44 = sc(44);
	const s45 = sc(45);
	const s46 = sc(46);
	const s47 = sc(47);
	const s48 = sc(48);
	const swap = s44.endFrame - 6;

	// ============ A：坡底（第 41–44 屏）============
	const yiX = kf(frame, [
		[s41.startFrame, S5_END.yiX],
		[s42.endFrame, 230],
	]);
	const jiaX = kf(frame, [
		[s41.startFrame, S5_END.jiaX],
		[s42.endFrame, 400],
	]);
	const faceA = kf(frame, [
		[s41.startFrame, -1],
		[s41.startFrame + 4, 1],
	]);
	const absorb = prog(frame, s44.startFrame + 10, s44.endFrame - 18);
	const jiaPoseA = withBreath(
		poseTrack(frame, [
			[from, POSES.stand],
			[s44.startFrame + 4, POSES.stand],
			[s44.startFrame + 26, POSES.armsOpen],
			[s44.startFrame + 54, POSES.armsOpen],
			[s44.endFrame - 8, POSES.stand],
		]),
		frame,
	);
	const yiPoseA = withBreath(poseTrack(frame, [[from, POSES.stand], [s44.startFrame + 30, {...POSES.stand, head: -14}]]), frame + 9);
	const gray = prog(frame, s42.startFrame, s43.startFrame + 30) * 0.7 + absorb * 0.3;
	const chestA = {x: jiaX + 10, y: slopeY(jiaX) - 175};
	const camA = camAt(
		[
			{f: sc(40).endFrame - 6, x: 330, y: 720, z: 1.3},
			...tiltKeys(),
			{f: s43.startFrame, x: 330, y: 0, z: 1.0},
			{f: s43.startFrame + 28, x: 330, y: 640, z: 1.15},
			{f: s44.endFrame - 22, x: 330, y: 640, z: 1.15},
			{f: swap + 10, ...chestA, z: 50},
		],
		frame,
	);
	const chestScreen = worldToScreen(camA, chestA);

	// ============ B：回到开头的平地（第 45–48 屏 + 片尾）============
	const land = cue(45, 'thud');
	const yiBase = OPENING.leftStoneX - OPENING.stoneR - 92;
	const jiaBase = OPENING.rightStoneX - OPENING.stoneR - 92;
	const r = OPENING.stoneR;
	const restY = FLAT_Y - r * 0.93;
	const drop = prog(frame, land - 26, land, Easing.inOut(Easing.quad));
	const stoneY = -260 + (restY + 260) * drop;
	const step = prog(frame, land + 2, land + 14) * (1 - prog(frame, s47.startFrame + 8, s47.startFrame + 22));
	const yiXB = yiBase - 30 * step;
	const crackCue = cue(47, 'bell');
	const glowCue = cue(48, 'impact');
	const crack = 0.35 * prog(frame, crackCue - 4, crackCue + 10) + 0.65 * prog(frame, glowCue, glowCue + 16);
	const glow = prog(frame, glowCue, glowCue + 20);
	const yiPoseB = withBreath(
		poseTrack(frame, [
			[swap, POSES.stand],
			[land, POSES.stand],
			[land + 8, {...POSES.stand, torso: -8, head: -4}],
			[s46.startFrame + 6, POSES.stand],
			[s46.startFrame + 20, POSES.lookDown],
			[s46.startFrame + 40, POSES.lookDown],
			[s47.startFrame + 8, POSES.stand],
			[s47.startFrame + 30, POSES.handOnStone],
			[s48.startFrame + 60, POSES.handOnStone],
			[s48.startFrame + 78, {...POSES.handOnStone, head: -28, torso: 0}],
		]),
		frame,
	);
	const walkB = prog(frame, s48.startFrame + 8, s48.startFrame + 48, Easing.inOut(Easing.sin));
	const besideX = OPENING.leftStoneX + r + 92;
	const jiaXB = jiaBase + (besideX - jiaBase) * walkB;
	const faceB = kf(frame, [
		[s48.startFrame + 2, 1],
		[s48.startFrame + 10, -1],
	]);
	let jiaPoseB = poseTrack(frame, [
		[swap, POSES.stand],
		[s48.startFrame + 48, POSES.stand],
		[s48.startFrame + 60, POSES.handOnStone],
		[s48.startFrame + 64, POSES.handOnStone],
		[s48.startFrame + 82, {...POSES.handOnStone, head: -28, torso: 0}],
	]);
	jiaPoseB = walkB > 0 && walkB < 1 ? withWalk(jiaPoseB, (jiaXB / 55) * Math.PI, 0.85, true) : withBreath(jiaPoseB, frame);
	const jiaChestB = {x: jiaBase + 10, y: FLAT_Y - 175};
	const camB = camAt(
		[
			{f: swap, ...jiaChestB, z: 50},
			{f: s45.startFrame + 26, x: 960, y: 540, z: 1},
			{f: s48.startFrame + 40, x: 960, y: 540, z: 1},
			{f: to, x: 930, y: 520, z: 0.92},
		],
		frame,
	);
	const box = prog(frame, s46.startFrame + 6, s46.startFrame + 18) * (1 - prog(frame, s46.startFrame + 34, s46.startFrame + 54));
	const showB = frame >= swap;
	const bIn = interpolate(frame, [swap, swap + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	const fadeIn = interpolate(frame, [from, from + 12], [0, 1], {extrapolateRight: 'clamp'});
	const endFade = interpolate(frame, [to - 20, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	// 第 44 屏：散落的黑粒子（屏幕各处，含右侧竖带）被吸进甲的身体
	const absorbDots =
		frame >= s43.startFrame + 20 && frame < swap + 10
			? Array.from({length: 120}).map((_, i) => {
					const x0 = random(`ab${i}`) * 1920;
					const y0 = 80 + random(`ac${i}`) * 900;
					const d = random(`ad${i}`) * 0.4;
					const p = Math.min(1, Math.max(0, (absorb - d) / (1 - d)));
					const e = p * p * (3 - 2 * p);
					const x = x0 + (chestScreen.x - x0) * e + Math.sin(frame / 10 + i) * 6 * (1 - e);
					const y = y0 + (chestScreen.y - y0) * e + Math.cos(frame / 12 + i) * 6 * (1 - e);
					const rr = (3 + random(`ae${i}`) * 5) * (1 - e * 0.7);
					return (
						<g key={i} opacity={Math.min(1, (frame - s43.startFrame - 20) / 16) * (p >= 1 ? 0 : 1)}>
							<circle cx={x} cy={y} r={rr + 2} fill={C.blue} opacity={0.15} />
							<circle cx={x} cy={y} r={rr} fill="#030305" />
						</g>
					);
			  })
			: null;

	return (
		<AbsoluteFill style={{opacity: fadeIn}}>
			{/* A：坡底 */}
			<AbsoluteFill style={{opacity: showB ? 1 - bIn : 1}}>
				<svg width={1920} height={1080}>
					<Landscape cam={camA} variant="slope" sun={1} dark={0.25 * (1 - gray)} gray={gray} />
					<Blocks frame={frame} />
					<GoldDust frame={frame} start={s42.startFrame} amount={prog(frame, s42.startFrame, s42.startFrame + 10) * (1 - prog(frame, s43.startFrame + 10, s43.startFrame + 30))} area={{x0: 200, x1: 1700, y0: 200, y1: 700}} seed="s6g" />
					<Motes frame={frame} count={40} opacity={0.3} seed="s6" color="#E1DCD0" />
					<g transform={camTransform(camA)}>
						<ellipse cx={YI.pool} cy={SLOPE.bottomY} rx={105} ry={13} fill="#030306" opacity={1 - gray} />
						<Figure
							x={yiX}
							y={SLOPE.bottomY}
							pose={yiPoseA}
							color={C.yi}
							heart={1}
							opacity={interpolate(camA.z, [1.4, 2.0], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
						/>
						<Figure
							x={jiaX}
							y={slopeY(jiaX)}
							pose={jiaPoseA}
							facing={faceA}
							color={lerpColor(C.jia, SHADOW, absorb)}
							heart={1 + absorb * 0.5}
							rim={0.25 + absorb * 0.6}
						/>
					</g>
					{absorbDots}
				</svg>
			</AbsoluteFill>

			{/* B：开头的平地 */}
			{showB ? (
				<AbsoluteFill style={{opacity: bIn}}>
					<svg width={1920} height={1080}>
						<Landscape cam={camB} variant="flat" sun={0.6 + 0.4 * glow} gray={0.55} />
						<Motes frame={frame} count={40} opacity={0.3} seed="s6b" color="#E1DCD0" />
						<g transform={camTransform(camB)}>
							<LightRays cx={OPENING.leftStoneX} cy={restY} amount={glow * 0.8} frame={frame} len={1300} />
							{box > 0 ? (
								<rect
									x={yiXB - 150}
									y={FLAT_Y - 170}
									width={150}
									height={170}
									fill="none"
									stroke="#B9B4AA"
									strokeWidth={3}
									strokeDasharray="14 10"
									opacity={box * 0.8}
								/>
							) : null}
							{drop > 0 ? (
								<BlackStone id="s6" cx={OPENING.leftStoneX} cy={stoneY} r={r} seed={3} crack={crack} crackGlow={0.4 + 0.6 * glow} rim={0.2 + 0.7 * glow} />
							) : null}
							<Figure x={yiXB} y={FLAT_Y} pose={yiPoseB} color={C.yi} heart={1} rim={0.5 * glow} />
							<Figure x={jiaXB} y={FLAT_Y} pose={jiaPoseB} facing={faceB} color={SHADOW} heart={1.5} rim={0.85} />
						</g>
					</svg>
					{s48.impact ? <ImpactWord impact={s48.impact} screenStart={s48.startFrame} frame={frame} size={190} centerY={320} glow /> : null}
				</AbsoluteFill>
			) : null}
			<AbsoluteFill style={{backgroundColor: '#000000', opacity: endFade}} />
		</AbsoluteFill>
	);
};
