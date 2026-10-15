import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Bear, Bell, Bubble, Panel, pop, TimerRing} from '../components/Abstract';
import {BlackStone} from '../components/BlackStone';
import {camAt, camTransform, kf, prog, worldToScreen} from '../components/Camera';
import {DarkBox} from '../components/DarkBox';
import {Figure, POSES, poseTrack, withBreath, withWalk} from '../components/Figure';
import {Landscape, SLOPE, slopeY} from '../components/Landscape';
import {BlackFlood, Label} from '../components/Overlays';
import {Motes} from '../components/Particles';
import {cue, onscreen, sc} from '../data/script';
import {C, FONT_FAMILY} from '../theme';
import {STONE_SEED} from './Opening';
import {Clouds, S2_END, s2JiaX} from './Section2';
import {S1, stoneCY} from './Section1';

// 第三节（第 16–23 屏）：压下去。
// 甲起身，用后背把黑石顶进升起的暗盒，拍拍手走开；镜头推进暗盒前板，进入"白熊实验"示意图；
// 再拉出来：暗盒缝隙渗黑、被撑得鼓起，黑沿坡面漫上来，漫过甲的脚踝。
export const BOX = {x: 120, bottom: SLOPE.bottomY, w: 460, h: 420};
export const S3_END = {jiaX: 620, flood: 680, sink: 18, cam: {x: 560, y: 640, z: 0.75}};

export const section3Range = () => ({from: sc(16).startFrame - 8, to: sc(24).startFrame});

const rotOf = (x: number) => ((x - S1.x0) / S1.r) * (180 / Math.PI);

export const s3StoneX = (frame: number) => {
	const roll = cue(16, 'roll');
	return interpolate(frame, [roll, roll + 34], [S2_END.stoneX, BOX.x], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.inOut(Easing.sin),
	});
};

export const Section3: React.FC = () => {
	const frame = useCurrentFrame();
	const {from, to} = section3Range();
	if (frame < from || frame > to) return null;
	const s16 = sc(16);
	const s17 = sc(17);
	const s18 = sc(18);
	const s19 = sc(19);
	const s20 = sc(20);
	const s21 = sc(21);
	const s22 = sc(22);
	const s23 = sc(23);
	const close = cue(17, 'thud');
	const r = S2_END.r;

	// —— 世界（坡底）——
	const stoneX = s3StoneX(frame);
	const stoneY = stoneCY(stoneX, r);
	const rise = prog(frame, cue(16, 'slideDown'), cue(16, 'slideDown') + 36);
	const front = prog(frame, close - 14, close);
	const bulge = prog(frame, s23.startFrame + 2, s23.startFrame + 30) * (frame > s23.endFrame ? 0.9 : 1);
	const leak = Math.min(1, prog(frame, s22.startFrame + 10, s22.endFrame) + bulge * 0.6);
	const pool = 1 - prog(frame, close - 10, close + 26);
	const flood = kf(frame, [
		[s23.startFrame + 5, -400],
		[s23.startFrame + 6, BOX.x + BOX.w / 2],
		[s23.startFrame + 62, S3_END.flood],
	]);

	// 甲：起身 → 走下坡 → 背对石头用后背顶 → 拍手 → 走开 → 被漫上来的黑困住
	const jiaStart = s2JiaX();
	const pushX = S2_END.stoneX + r + 50;
	const walkDown = prog(frame, s16.startFrame + 22, s16.startFrame + 56, Easing.inOut(Easing.sin));
	const roll = cue(16, 'roll');
	let jiaX = jiaStart + (pushX - jiaStart) * walkDown;
	if (frame >= roll - 6) jiaX = stoneX + r + 50;
	const leave = prog(frame, close + 22, s18.startFrame + 40, Easing.inOut(Easing.sin));
	jiaX += (S3_END.jiaX - (BOX.x + r + 50)) * leave;
	const fore = S2_END.jiaFore * (1 - prog(frame, s16.startFrame, s16.startFrame + 22));
	const scale = 1 + (S2_END.jiaScale - 1) * (1 - prog(frame, s16.startFrame, s16.startFrame + 22));
	const facing = kf(frame, [
		[s16.startFrame + 18, 1],
		[s16.startFrame + 26, -1],
		[s16.startFrame + 56, -1],
		[s16.startFrame + 64, 1],
	]);
	let pose = poseTrack(frame, [
		[s16.startFrame, {...POSES.sitFallen, head: -30, torso: -26}],
		[s16.startFrame + 20, POSES.stand],
		[s16.startFrame + 58, POSES.stand],
		[roll - 2, POSES.backPush],
		[roll + 34, POSES.backPush],
		[close - 4, POSES.stand],
		[close + 4, POSES.dustHands],
		[close + 20, POSES.dustHands],
		[close + 26, POSES.stand],
		[s23.startFrame + 40, POSES.stand],
		[s23.startFrame + 54, POSES.lookDown],
	]);
	if (frame > close + 4 && frame < close + 20) pose = {...pose, elF: pose.elF + Math.sin(frame * 1.3) * 18, elB: pose.elB - Math.sin(frame * 1.3) * 18};
	const walking = (walkDown > 0 && walkDown < 1) || (frame > roll && frame < roll + 34) || (leave > 0 && leave < 1);
	if (walking) pose = withWalk(pose, (jiaX / 55) * Math.PI, 0.8, frame < roll);
	else pose = withBreath(pose, frame);
	// 黑漫到脚边：想抬脚抬不起来
	const stuck = prog(frame, s23.startFrame + 56, s23.endFrame);
	if (stuck > 0 && frame <= s23.endFrame) {
		const k = Math.max(0, Math.sin(frame / 4)) * 14 * stuck;
		pose = {...pose, knF: pose.knF + k, hipF: pose.hipF + k * 0.5};
	}
	const sink = S3_END.sink * stuck;

	// —— 镜头 ——
	const boxFront = {x: BOX.x, y: BOX.bottom - BOX.h / 2};
	const cam = camAt(
		[
			{f: from, ...S2_END.cam},
			{f: s16.startFrame + 40, x: 430, y: 650, z: 1.05},
			{f: s17.endFrame - 6, x: 300, y: 660, z: 1.1},
			{f: s18.startFrame + 16, ...boxFront, z: 9},
			{f: s22.startFrame, ...boxFront, z: 9},
			{f: s22.startFrame + 30, ...boxFront, z: 2.2},
			{f: s23.startFrame, ...boxFront, z: 2.0},
			{f: s23.startFrame + 40, ...S3_END.cam},
		],
		frame,
	);

	const sun = 0.6 - 0.45 * prog(frame, s16.startFrame, s16.startFrame + 40);
	const panel = prog(frame, s18.startFrame + 8, s18.startFrame + 18) * (1 - prog(frame, s22.startFrame, s22.startFrame + 14));
	const fadeIn = interpolate(frame, [from, from + 8], [0, 1], {extrapolateRight: 'clamp'});

	// —— 白熊实验示意 ——
	const os = onscreen(21);
	const mainR = 230 * pop(frame, s18.startFrame + 14, 14) * (1 - prog(frame, s21.startFrame, s21.startFrame + 14) * 0.26);
	const split = prog(frame, s21.startFrame, s21.startFrame + 16);
	const mainX = 980 + (620 - 980) * split;
	const mainY = 420 + 20 * split;
	const bear0 = pop(frame, s19.startFrame + 4, 12);
	const cross = prog(frame, s19.startFrame + 17, s19.startFrame + 27);
	const bellCues = [0, 1, 2].map((i) => cue(20, 'bell', i));
	const bellCues21 = [0, 1, 2].map((i) => cue(21, 'bell', i));
	const glow = [...bellCues, ...bellCues21].reduce((g, c) => g + (frame >= c ? Math.exp(-(frame - c) / 8) : 0), 0);
	const popSpots = [
		{x: -90, y: -70},
		{x: 100, y: -20},
		{x: -20, y: 105},
	];
	const rightPops = [...bellCues21, s21.startFrame + 46, s21.startFrame + 58, s21.startFrame + 70, s21.startFrame + 82];
	const rightSpots = [
		{x: -70, y: -60},
		{x: 60, y: -70},
		{x: 0, y: 0},
		{x: -80, y: 55},
		{x: 75, y: 50},
		{x: -15, y: -95},
		{x: 20, y: 95},
	];
	const leftPops = [s21.startFrame + 22, s21.startFrame + 54, s21.startFrame + 86];
	const leftSpots = [
		{x: -50, y: -40},
		{x: 55, y: 10},
		{x: -10, y: 70},
	];
	const rightBubble = pop(frame, s21.startFrame + 6, 14);
	// 示意图整体缓慢推近，两个气泡各自上下浮动，避免长时间静止
	const drift = 1 + 0.06 * prog(frame, s18.startFrame, s21.endFrame, Easing.linear);
	const bobL = Math.sin(frame / 14) * 10 * split;
	const bobR = Math.sin(frame / 17 + 1.3) * 10 * rightBubble;
	const bubbleLabels = os.bubbles ?? [];

	const jiaScreen = worldToScreen(cam, {x: jiaX, y: slopeY(jiaX)});
	const showJia = jiaScreen.x > -200 && jiaScreen.x < 2200;
	// 推进暗盒 / 从暗盒拉出时，人物不以巨大半身入画
	const jiaAlpha = interpolate(cam.z, [1.3, 1.9], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<AbsoluteFill style={{opacity: fadeIn}}>
			<svg width={1920} height={1080}>
				<Landscape cam={cam} variant="slope" sun={sun} dark={0.85 + bulge * 0.1} />
				<Clouds frame={frame} amount={1} />
				<Motes frame={frame} count={40} opacity={0.3} seed="s3" color="#6E7697" rise={-0.2} />
				<g transform={camTransform(cam)}>
					<defs>
						<filter id="pool3-glow" x="-0.5" y="-2" width="2" height="5">
							<feGaussianBlur stdDeviation="12" />
						</filter>
					</defs>
					{pool > 0.01 ? (
						<>
							<ellipse cx={120} cy={SLOPE.bottomY} rx={330 * pool} ry={42 * pool} fill={C.blue} opacity={0.3 * pool} filter="url(#pool3-glow)" />
							<ellipse cx={120} cy={SLOPE.bottomY} rx={320 * pool} ry={36 * pool} fill="#030306" />
						</>
					) : null}
					<DarkBox layer="back" x={BOX.x} bottom={BOX.bottom} w={BOX.w} h={BOX.h} frame={frame} rise={rise} bulge={bulge} />
					<BlackStone id="s3" cx={stoneX} cy={stoneY} r={r} rot={rotOf(stoneX)} seed={STONE_SEED} crack={1} crackGlow={0.25} rim={0.2} cold={0.5} />
					<DarkBox layer="front" x={BOX.x} bottom={BOX.bottom} w={BOX.w} h={BOX.h} frame={frame} rise={rise} front={front} bulge={bulge} leak={leak} />
					{showJia ? <Figure x={jiaX} y={slopeY(jiaX) + fore} pose={pose} facing={facing} color={C.jia} scale={scale} sink={sink} opacity={jiaAlpha} /> : null}
					<BlackFlood x0={-400} front={flood} frame={frame} depth={26 + stuck * 8} />
				</g>
			</svg>

			{panel > 0 ? (
				<AbsoluteFill style={{opacity: panel}}>
					<Panel frame={frame} />
					<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, transform: `scale(${drift})`, transformOrigin: '930px 440px'}}>
						<Bubble cx={mainX} cy={mainY + bobL} r={Math.max(0, mainR)} tail={split < 0.5} />
						{bear0 > 0 && split < 1 ? <Bear x={mainX} y={mainY} s={1.3 * bear0 * (1 - split * 0.6)} crossed={cross} opacity={1 - 0.65 * prog(frame, s19.startFrame + 30, s19.startFrame + 44) - split * 0.3} /> : null}
						{bellCues.map((c, i) =>
							frame >= c ? <Bear key={i} x={mainX + popSpots[i].x * (1 - split * 0.26)} y={mainY + bobL + popSpots[i].y * (1 - split * 0.26)} s={0.6 * pop(frame, c, 8) * (1 - split * 0.4)} crossed={1} opacity={0.85} /> : null,
						)}
						{leftPops.map((c, i) =>
							frame >= c ? <Bear key={`l${i}`} x={620 + leftSpots[i].x} y={440 + bobL + leftSpots[i].y} s={0.38 * pop(frame, c, 8)} crossed={1} opacity={0.8} /> : null,
						)}
						{rightBubble > 0 ? <Bubble cx={1240} cy={440 + bobR} r={170 * rightBubble} color={C.blue} tail={false} /> : null}
						{rightPops.map((c, i) =>
							frame >= c ? <Bear key={`r${i}`} x={1240 + rightSpots[i].x} y={440 + bobR + rightSpots[i].y} s={0.38 * pop(frame, c, 8)} crossed={1} opacity={0.85} /> : null,
						)}
						<TimerRing x={600} y={430} r={64} progress={prog(frame, s19.startFrame + 20, s20.endFrame, Easing.linear)} opacity={prog(frame, s19.startFrame + 10, s19.startFrame + 20) * (1 - split)} />
						<g opacity={prog(frame, s20.startFrame, s20.startFrame + 8) * (1 - split)}>
							<Bell x={1310} y={250} glow={Math.min(1, glow)} swing={Math.sin(frame / 2) * 18 * Math.min(1, glow)} />
						</g>
					</svg>
					{bubbleLabels.map((t, i) => (
						<div
							key={t}
							style={{
								position: 'absolute',
								left: 930 + ((i === 0 ? 620 : 1240) - 930) * drift - 150,
								width: 300,
								top: 440 + (200 + (i === 0 ? bobL : bobR) - 440) * drift,
								textAlign: 'center',
								fontFamily: FONT_FAMILY,
								fontWeight: 700,
								fontSize: 36,
								color: '#FFFFFF',
								opacity: i === 0 ? split : rightBubble,
								textShadow: '0 2px 10px rgba(0,0,0,0.6)',
							}}
						>
							{t}
						</div>
					))}
					<Label
						text={onscreen(18).label ?? ''}
						frame={frame}
						start={s18.startFrame + 14}
						end={s21.endFrame + 4}
					/>
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};
