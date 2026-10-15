import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {BlackStone} from '../components/BlackStone';
import {camAt, camTransform, prog, shakeAt} from '../components/Camera';
import {Figure, lerpPose, POSES, withBreath} from '../components/Figure';
import {FLAT_Y, Landscape} from '../components/Landscape';
import {Motes} from '../components/Particles';
import {cue, sc} from '../data/script';
import {C} from '../theme';

// 开头（第 1–3 屏）：左右两个人被同样的黑石砸倒，一个越陷越深，一个站起来；
// 镜头随后推进右边那块石头，直到石头填满画面，接到第一节。
export const STONE_SEED = 7;
export const OPENING = {
	stoneR: 110,
	leftStoneX: 700,
	rightStoneX: 1400,
};
const R = OPENING.stoneR;
const restY = FLAT_Y - R * 0.93;
const yiX = OPENING.leftStoneX - R - 92;
const jiaX = OPENING.rightStoneX - R - 92;

export const openingRange = () => ({from: 0, to: sc(4).startFrame + 13});

export const openingCam = (frame: number) => {
	const s2 = sc(2);
	const s3 = sc(3);
	const s4 = sc(4);
	return camAt(
		[
			{f: 0, x: 960, y: 540, z: 1},
			{f: s2.startFrame, x: 960, y: 548, z: 1.02},
			{f: s3.startFrame + 6, x: 1000, y: 560, z: 1.06},
			{f: s3.endFrame, x: OPENING.rightStoneX - 40, y: restY - 10, z: 1.9},
			{f: s4.startFrame + 6, x: OPENING.rightStoneX, y: restY, z: 16},
		],
		frame,
	);
};

export const Opening: React.FC = () => {
	const frame = useCurrentFrame();
	const {from, to} = openingRange();
	if (frame < from || frame > to) {
		return null;
	}
	const s2 = sc(2);
	const s3 = sc(3);
	const land = cue(1, 'impact');
	const slideCue = cue(2, 'slideDown');
	const bellCue = cue(2, 'bell');
	const beatCue = cue(3, 'heartbeat');

	const cam0 = openingCam(frame);
	const sh = shakeAt(frame, [land], 12);
	const cam = {...cam0, x: cam0.x - sh.dx / cam0.z, y: cam0.y - sh.dy / cam0.z};

	// 石头自由落体
	const fall = interpolate(frame, [0, land], [0, 1], {extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
	const stoneY = -260 + (restY + 260) * fall;
	const bounce = frame > land ? Math.exp(-(frame - land) / 3) * Math.sin((frame - land) * 1.4) * -6 : 0;

	// 被砸倒：站 → 跪
	const knock = prog(frame, land, land + 9, Easing.out(Easing.cubic));
	const yiSink = interpolate(frame, [slideCue, slideCue + 60], [0, 26], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const yiDroop = prog(frame, slideCue, slideCue + 50);
	let yiPose = lerpPose(POSES.stand, POSES.kneel, knock);
	yiPose = lerpPose(yiPose, {...POSES.kneel, head: 42, torso: 28, shF: 40, shB: 34}, yiDroop);

	const rise = prog(frame, bellCue - 4, bellCue + 22);
	let jiaPose = lerpPose(POSES.stand, POSES.kneel, knock);
	jiaPose = lerpPose(jiaPose, POSES.handOnStone, rise);

	// 第 3 屏：画面压暗、人物定格，只剩裂缝的金光
	const freeze = frame >= s3.startFrame;
	const breathFrame = freeze ? s3.startFrame : frame;
	yiPose = withBreath(yiPose, breathFrame, knock < 1 ? 0 : 0.6);
	jiaPose = withBreath(jiaPose, breathFrame, knock < 1 ? 0 : 0.6);
	const dim = prog(frame, s3.startFrame, s3.startFrame + 14);

	const pool = prog(frame, slideCue, slideCue + 64, Easing.out(Easing.quad));
	const poolRx = 320 * pool;
	const poolX = yiX + 80;

	const crack = prog(frame, bellCue - 10, bellCue + 18);
	const beat = Math.exp(-Math.abs(frame - beatCue - 3) / 4) * (frame >= beatCue ? 1 : 0);
	const crackGlow = Math.min(1, crack * 0.85 + beat * 0.5 + dim * 0.2);

	const fadeOut = interpolate(frame, [to - 10, to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	// 落地扬起的尘
	const dust = (x: number, key: string) =>
		frame >= land && frame < land + 30
			? Array.from({length: 18}).map((_, i) => {
					const t = (frame - land) / 30;
					const a = Math.PI + (random(`${key}a${i}`) * Math.PI);
					const sp = 60 + random(`${key}s${i}`) * 140;
					return (
						<circle
							key={`${key}${i}`}
							cx={x + Math.cos(a) * sp * t * 1.6}
							cy={FLAT_Y + Math.sin(a) * sp * t * 0.6 + 40 * t * t}
							r={4 + random(`${key}r${i}`) * 6}
							fill="#3A3F55"
							opacity={(1 - t) * 0.7}
						/>
					);
			  })
			: null;

	return (
		<AbsoluteFill style={{opacity: fadeOut}}>
			<svg width={1920} height={1080}>
				<Landscape cam={cam} variant="flat" />
				<Motes frame={frame} count={36} opacity={0.3} seed="op" />
				<rect x={0} y={0} width={1920} height={1080} fill="#000" opacity={dim * 0.45} />
				<g transform={camTransform(cam)}>
					<defs>
						<filter id="pool-glow" x="-0.5" y="-2" width="2" height="5">
							<feGaussianBlur stdDeviation="10" />
						</filter>
					</defs>
					{/* 左：一摊越扩越大的黑，边缘泛冷蓝 */}
					{poolRx > 1 ? (
						<>
							<ellipse cx={poolX} cy={FLAT_Y} rx={poolRx + 10} ry={poolRx * 0.12 + 6} fill={C.blue} opacity={0.35} filter="url(#pool-glow)" />
							<ellipse cx={poolX} cy={FLAT_Y} rx={poolRx} ry={poolRx * 0.12} fill="#030306" />
						</>
					) : null}
					<g opacity={1 - dim * 0.35}>
						<BlackStone id="op-l" cx={OPENING.leftStoneX} cy={stoneY + bounce + yiSink * 0.7} r={R} seed={3} cold={pool * 0.8} rim={pool * 0.5} rimColor={C.blue} />
						<Figure x={yiX} y={FLAT_Y} pose={yiPose} color={C.yi} sink={yiSink} />
					</g>
					{/* 池子的前沿盖住陷进去的脚 */}
					{poolRx > 1 ? (
						<path
							d={`M ${poolX - poolRx} ${FLAT_Y} A ${poolRx} ${poolRx * 0.12} 0 0 0 ${poolX + poolRx} ${FLAT_Y} Z`}
							fill="#030306"
						/>
					) : null}
					<BlackStone
						id="op-r"
						cx={OPENING.rightStoneX}
						cy={stoneY + bounce}
						r={R}
						seed={STONE_SEED}
						crack={crack}
						crackGlow={crackGlow}
						rim={crack * 0.7}
					/>
					<g opacity={1 - dim * 0.3}>
						<Figure x={jiaX} y={FLAT_Y} pose={jiaPose} color={C.jia} rim={rise * 0.35} />
					</g>
					{dust(OPENING.leftStoneX, 'dl')}
					{dust(OPENING.rightStoneX, 'dr')}
				</g>
			</svg>
		</AbsoluteFill>
	);
};
