import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {BlackStone} from '../components/BlackStone';
import {camAt, camTransform, prog, shakeAt, worldToScreen} from '../components/Camera';
import {Figure, lerpPose, POSES, withBreath} from '../components/Figure';
import {ImpactWord} from '../components/ImpactWord';
import {Landscape, SLOPE, slopeY} from '../components/Landscape';
import {Motes} from '../components/Particles';
import {cue, PREVIEW_DURATION, sc} from '../data/script';
import {C} from '../theme';
import {STONE_SEED} from './Opening';
import {S1, s1StoneX, stoneCY} from './Section1';

// 第二节（预览只做到第 13 屏）：被击垮的时刻。
// 天色压暗、乌云盖住坡顶的光；"失恋""被诬陷""击垮"三个大字砸下，碎片被黑石吸收，
// 黑石越长越大，最后滚下坡，甲被带倒坐在地上。
export const section2Range = () => ({from: sc(10).startFrame - 4, to: PREVIEW_DURATION});

const Clouds: React.FC<{frame: number; amount: number}> = ({frame, amount}) => (
	<g opacity={amount}>
		{Array.from({length: 7}).map((_, i) => {
			const w = 260 + random(`cw${i}`) * 260;
			const h = 60 + random(`ch${i}`) * 50;
			const x0 = 1100 + random(`cx${i}`) * 900;
			const y = 120 + random(`cy${i}`) * 260;
			// 从右往左慢慢盖过坡顶的光
			const x = x0 + 700 * (1 - amount) - frame * 0.15 * (0.5 + random(`cs${i}`));
			return <rect key={i} x={x} y={y} width={w} height={h} rx={h / 2} fill="#0B0E18" opacity={0.85} />;
		})}
	</g>
);

export const Section2: React.FC = () => {
	const frame = useCurrentFrame();
	const {from, to} = section2Range();
	if (frame < from || frame > to) {
		return null;
	}
	const s10 = sc(10);
	const s11 = sc(11);
	const s12 = sc(12);
	const s13 = sc(13);
	const land11 = cue(11, 'thud');
	const land12 = cue(12, 'thud');
	const land13 = cue(13, 'thud', 0);
	const shatter = [cue(11, 'grain'), cue(12, 'grain'), cue(13, 'grain')];
	const rollStart = cue(13, 'roll');
	const crash = cue(13, 'impact');

	// 碎片飞行约 24 帧后被石头吸收，石头长大一圈
	const grow = (at: number, d: number) => prog(frame, at + 16, at + 26, Easing.out(Easing.back(2))) * d;
	const r = S1.r + grow(shatter[0], 18) + grow(shatter[1], 20) + grow(shatter[2], 22);

	const xStart = s1StoneX(sc(9).endFrame);
	const pushedBack = interpolate(frame, [shatter[1] + 20, shatter[1] + 40], [0, -16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const rollP = interpolate(frame, [rollStart, crash], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
	const restX = SLOPE.bottomX + 40;
	const x = xStart + pushedBack + (restX - (xStart + pushedBack)) * rollP;
	const settle = frame > crash ? Math.exp(-(frame - crash) / 4) * Math.sin((frame - crash) * 1.3) * -10 : 0;
	const cy = stoneCY(x, r) + settle;
	const rot = ((x - S1.x0) / S1.r) * (180 / Math.PI);

	// 甲
	const knocked = prog(frame, rollStart, rollStart + 10, Easing.out(Easing.cubic));
	const baseJia = xStart - S1.r - 70;
	const recoils = [land11, land12].map((l) => prog(frame, l, l + 6) * (1 - prog(frame, l + 10, l + 26)));
	const jiaX =
		baseJia -
		interpolate(frame, [land11, land11 + 8], [0, 22], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) -
		interpolate(frame, [shatter[1] + 20, shatter[1] + 40], [0, 18], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) -
		knocked * 50;
	const lookUp = prog(frame, s10.startFrame + 18, s10.startFrame + 34) * (1 - prog(frame, land11 - 6, land11));
	let pose = lerpPose(POSES.push, POSES.pushLookUp, lookUp);
	pose = lerpPose(pose, POSES.recoil, Math.max(...recoils));
	pose = lerpPose(pose, POSES.pushBent, prog(frame, land12 + 14, land12 + 26) * (1 - knocked));
	pose = lerpPose(pose, POSES.sitFallen, knocked);
	pose = withBreath(pose, frame, 1 - knocked * 0.5);
	// 被带倒时往镜头这侧（前景）跌坐，石头从他身后滚过
	const jiaFore = knocked * 100;

	const sh = shakeAt(frame, [land11, land12, land13], 8);
	const sh2 = shakeAt(frame, [crash], 14);
	const cam0 = camAt(
		[
			{f: from, x: xStart, y: stoneCY(xStart, S1.r), z: 12},
			{f: s10.startFrame + 30, x: xStart + 60, y: 500, z: 1.25},
			{f: s11.startFrame + 2, x: xStart - 200, y: 560, z: 1.0},
			{f: rollStart, x: xStart - 220, y: 600, z: 1.0},
			{f: crash, x: 700, y: 660, z: 0.92},
			{f: to, x: 680, y: 670, z: 0.96},
		],
		frame,
	);
	const cam = {...cam0, x: cam0.x - (sh.dx + sh2.dx) / cam0.z, y: cam0.y - (sh.dy + sh2.dy) / cam0.z};

	const dark = prog(frame, s10.startFrame, s11.startFrame + 10);
	const target = worldToScreen(cam, {x, y: cy});
	const impacts = [s11, s12, s13];

	// 落地扬尘
	const dust =
		frame >= crash && frame < crash + 34
			? Array.from({length: 24}).map((_, i) => {
					const t = (frame - crash) / 34;
					const a = Math.PI + random(`cd${i}`) * Math.PI;
					const sp = 80 + random(`cs${i}`) * 200;
					return (
						<circle
							key={i}
							cx={restX + Math.cos(a) * sp * t * 1.5}
							cy={SLOPE.bottomY + Math.sin(a) * sp * t * 0.5 + 50 * t * t}
							r={5 + random(`cr${i}`) * 7}
							fill="#2E3348"
							opacity={(1 - t) * 0.75}
						/>
					);
			  })
			: null;

	const fadeIn = interpolate(frame, [from + 4, from + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<AbsoluteFill style={{opacity: fadeIn}}>
			<svg width={1920} height={1080}>
				<Landscape cam={cam} variant="slope" sun={1 - dark * 0.85} dark={dark} />
				<Clouds frame={frame} amount={dark} />
				<Motes frame={frame} count={46} opacity={0.22 + dark * 0.15} seed="s2" color="#6E7697" rise={-0.3} />
				<g transform={camTransform(cam)}>
					<defs>
						<filter id="pool2-glow" x="-0.5" y="-2" width="2" height="5">
							<feGaussianBlur stdDeviation="12" />
						</filter>
					</defs>
					{/* 坡底那摊黑（开头里乙陷进去的那种黑） */}
					<ellipse cx={120} cy={SLOPE.bottomY} rx={330} ry={42} fill={C.blue} opacity={0.3 + 0.15 * Math.sin(frame / 12)} filter="url(#pool2-glow)" />
					<ellipse cx={120} cy={SLOPE.bottomY} rx={320} ry={36} fill="#030306" />
					<BlackStone
						id="s2"
						cx={x}
						cy={cy}
						r={r}
						rot={rot}
						seed={STONE_SEED}
						crack={1}
						crackGlow={0.7 * (1 - dark * 0.7)}
						rim={0.8 * (1 - dark * 0.75)}
						cold={dark * 0.5}
					/>
					{/* 接地阴影：让跌坐在前景的甲和身后滚过的石头拉开前后层次 */}
					<ellipse cx={jiaX + 40} cy={slopeY(jiaX) + jiaFore + 4} rx={110 * knocked} ry={14 * knocked} fill="#000" opacity={0.45} />
					<Figure
						x={jiaX}
						y={slopeY(jiaX) + jiaFore}
						pose={pose}
						color={C.jia}
						scale={1 + knocked * 0.08}
					/>
					{dust}
				</g>
			</svg>
			{impacts.map((s, i) =>
				s.impact ? (
					<ImpactWord
						key={s.id}
						impact={s.impact}
						screenStart={s.startFrame}
						frame={frame}
						size={190}
						centerY={400}
						shatterAt={shatter[i] - (s.startFrame + s.impact.offset)}
						target={target}
					/>
				) : null,
			)}
		</AbsoluteFill>
	);
};

