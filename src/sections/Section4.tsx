import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Panel, Ripples, WordCard} from '../components/Abstract';
import {BlackStone} from '../components/BlackStone';
import {camAt, camTransform, kf, prog, worldToScreen} from '../components/Camera';
import {DarkBox} from '../components/DarkBox';
import {Figure, POSES, poseTrack, withBreath, withWalk} from '../components/Figure';
import {ImpactWord} from '../components/ImpactWord';
import {Landscape, SLOPE, slopeY} from '../components/Landscape';
import {BlackFlood, Label} from '../components/Overlays';
import {Motes} from '../components/Particles';
import {cue, onscreen, sc} from '../data/script';
import {C, FONT_FAMILY} from '../theme';
import {STONE_SEED} from './Opening';
import {Clouds, S2_END} from './Section2';
import {BOX, S3_END} from './Section3';
import {S1, stoneCY} from './Section1';

// 第四节（第 24–34 屏）：转身，看清它。
// 甲胸口亮起金点 → "转过身"砸下，暗盒四壁倒下 → 手按黑石，"失望""悲痛"浮出 →
// 推进石头里看情绪波纹被"说出来"安抚 → 拉出来，字沉进石纹，黑退回石头 →
// 绕到石头下坡一侧，推石上山（西西弗）→ 抬头看光 → 加速推到坡顶。
export const SUMMIT_X = 3080;
export const S4_END = {stoneX: SUMMIT_X, r: 150};

export const section4Range = () => ({from: sc(24).startFrame - 12, to: sc(35).startFrame + 12});

const rotOf = (x: number) => ((x - S1.x0) / S1.r) * (180 / Math.PI);

// 黑石被推上坡的位置
export const s4StoneX = (frame: number) => {
	const s31 = sc(31);
	const s32 = sc(32);
	const s33 = sc(33);
	const s34 = sc(34);
	const back = cue(33, 'roll');
	return kf(
		frame,
		[
			[s31.endFrame - 14, BOX.x],
			[s31.endFrame, BOX.x + 24],
			[s32.startFrame + 4, BOX.x + 24],
			[s32.startFrame + 28, BOX.x + 150],
			[s32.startFrame + 34, BOX.x + 150],
			[s32.endFrame, BOX.x + 400],
			[s33.startFrame + 30, BOX.x + 520],
			[back + 10, BOX.x + 470],
			[back + 20, BOX.x + 470],
			[s33.endFrame, BOX.x + 620],
			[s34.startFrame + 14, BOX.x + 660],
			[s34.startFrame + 44, BOX.x + 660],
			[s34.endFrame - 26, BOX.x + 760],
			[sc(35).startFrame + 10, SUMMIT_X],
		],
		Easing.inOut(Easing.sin),
	);
};

export const Section4: React.FC = () => {
	const frame = useCurrentFrame();
	const {from, to} = section4Range();
	if (frame < from || frame > to) return null;
	const s24 = sc(24);
	const s25 = sc(25);
	const s26 = sc(26);
	const s27 = sc(27);
	const s28 = sc(28);
	const s29 = sc(29);
	const s30 = sc(30);
	const s31 = sc(31);
	const s32 = sc(32);
	const s33 = sc(33);
	const s34 = sc(34);
	const turn = cue(25, 'impact');

	// —— 黑石 ——
	const shrink = prog(frame, s31.startFrame + 4, s31.endFrame - 10);
	const r = S2_END.r + (S4_END.r - S2_END.r) * shrink;
	const stoneX = s4StoneX(frame);
	const onSummit = stoneX > SLOPE.topX;
	const stoneY = onSummit ? SLOPE.topY - r * 0.95 : stoneCY(stoneX, r);
	const fall = prog(frame, turn, turn + 18);
	const flood = kf(frame, [
		[s31.startFrame + 4, S3_END.flood],
		[s31.endFrame - 6, -400],
	]);
	const warm = shrink;

	// —— 甲 ——
	const besideX = BOX.x + S2_END.r + 75;
	const walkTo = prog(frame, turn + 14, turn + 48, Easing.inOut(Easing.sin));
	let jiaX = S3_END.jiaX + (besideX - S3_END.jiaX) * walkTo;
	// 第 31 屏：从石头前面（前景）绕到下坡一侧
	const around = prog(frame, s31.startFrame + 10, s31.startFrame + 50, Easing.inOut(Easing.sin));
	const leftX = BOX.x - S4_END.r - 75;
	jiaX += (leftX - besideX) * around;
	// 绕到石头另一侧：从石头后方（远处）走过，被石头遮住
	const aroundFore = -Math.sin(around * Math.PI) * 36;
	const behind = around > 0 && around < 1;
	if (frame >= s31.endFrame - 14) jiaX = stoneX - r - 75;
	const facing = kf(frame, [
		[turn + 2, 1],
		[turn + 12, -1],
		[s31.startFrame + 52, -1],
		[s31.startFrame + 62, 1],
	]);
	const heart = prog(frame, s24.startFrame + 10, s24.startFrame + 26);
	const beat = cue(24, 'heartbeat');
	const heartPulse = heart + (frame >= beat ? 0.6 * Math.exp(-(frame - beat) / 6) : 0);
	const sink = S3_END.sink * (1 - prog(frame, turn, turn + 12));
	let pose = poseTrack(frame, [
		[from, POSES.lookDown],
		[s24.startFrame + 30, {...POSES.stand, head: 6}],
		[turn, {...POSES.stand, head: 6}],
		[turn + 12, POSES.stand],
		[turn + 48, POSES.stand],
		[s26.startFrame + 8, POSES.handOnStone],
		[s30.startFrame + 10, POSES.handOnStone],
		[s30.startFrame + 30, {...POSES.handOnStone, head: 26}],
		[s31.startFrame + 8, POSES.stand],
		[s31.startFrame + 52, POSES.stand],
		[s31.endFrame - 6, POSES.push],
		[s34.startFrame + 14, POSES.push],
		[s34.startFrame + 24, POSES.pushLookUp],
		[s34.startFrame + 40, POSES.pushLookUp],
		[s34.startFrame + 48, POSES.push],
	]);
	const back = cue(33, 'roll');
	if (frame > back && frame < back + 30) pose = {...pose, ...POSES.pushBent, head: 0};
	const moving =
		(walkTo > 0 && walkTo < 1) ||
		(around > 0 && around < 1) ||
		(frame > s32.startFrame && frame < s34.startFrame + 14) ||
		frame > s34.startFrame + 48;
	const lapse = frame > s34.endFrame - 26;
	const phase = lapse ? frame * 0.7 : (jiaX / 55) * Math.PI;
	pose = moving ? withWalk(pose, phase, 0.85, around > 0 && around < 1) : withBreath(pose, frame, 1.6);
	const groundY = (x: number) => (x > SLOPE.topX ? SLOPE.topY : slopeY(x));

	// —— 镜头 ——
	const cam = camAt(
		[
			{f: from, ...S3_END.cam},
			{f: s24.startFrame + 40, x: S3_END.jiaX - 120, y: 620, z: 1.05},
			{f: s24.endFrame, x: S3_END.jiaX - 60, y: 600, z: 1.35},
			{f: turn - 2, x: 420, y: 560, z: 1.0},
			{f: s26.startFrame + 10, x: 330, y: 600, z: 1.15},
			{f: s27.startFrame + 4, x: 330, y: 610, z: 1.2},
			{f: s27.startFrame + 18, x: BOX.x, y: stoneCY(BOX.x, S2_END.r), z: 10},
			{f: s30.startFrame, x: BOX.x, y: stoneCY(BOX.x, S2_END.r), z: 10},
			{f: s30.startFrame + 30, x: 260, y: 620, z: 1.25},
			{f: s31.endFrame, x: 200, y: 640, z: 1.1},
			...[s32.startFrame + 20, s32.endFrame, s33.startFrame + 40, s33.endFrame, s34.startFrame + 30, s34.endFrame - 26].map((f) => {
				const sx = s4StoneX(f);
				return {f, x: sx + 60, y: stoneCY(sx, S4_END.r) - 40, z: 1.15};
			}),
			{f: to, x: SUMMIT_X - 100, y: SLOPE.topY - 120, z: 1.0},
		],
		frame,
	);

	// —— 天光：第 32 屏起云散、光变强 ——
	const clear = prog(frame, s32.startFrame, s34.startFrame + 20);
	const sun = 0.15 + 0.85 * clear;
	const dark = (0.94 - 0.09 * prog(frame, s24.startFrame, s25.startFrame)) * (1 - clear * 0.7);
	const ghosts = prog(frame, s33.startFrame, s33.startFrame + 14) * (1 - prog(frame, s34.startFrame, s34.startFrame + 20));
	const rays = prog(frame, s34.startFrame, s34.startFrame + 30);

	// —— 示意图（石头内部）——
	const panel = prog(frame, s27.startFrame + 12, s27.startFrame + 20) * (1 - prog(frame, s30.startFrame, s30.startFrame + 10));
	const card = cue(28, 'pluck');
	const cardP = prog(frame, card - 14, card, Easing.out(Easing.cubic));
	const calm = prog(frame, s29.startFrame, s29.endFrame - 10);

	// —— 石面浮字：第 26 屏浮出，第 30 屏沉进石纹 ——
	const words = onscreen(26).words ?? [];
	const wordCues = [cue(26, 'bell', 0), cue(26, 'bell', 1)];
	const engrave = prog(frame, s30.startFrame + 10, s30.endFrame - 10);
	const wordSpots = [
		{x: -0.42, y: -0.28},
		{x: 0.12, y: 0.22},
	];
	const showWords = frame >= wordCues[0] && frame < s31.startFrame + 30;

	const fadeIn = interpolate(frame, [from, from + 12], [0, 1], {extrapolateRight: 'clamp'});
	const jiaFore = aroundFore;
	// 推进石头 / 拉出石头时：人物淡出、石面浮字隐藏，避免巨大半身入画或压住字幕
	const nearAlpha = interpolate(cam.z, [1.5, 2.2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<AbsoluteFill style={{opacity: fadeIn}}>
			<svg width={1920} height={1080}>
				<Landscape cam={cam} variant="slope" sun={sun} dark={dark} />
				<Clouds frame={frame} amount={1 - clear} />
				{rays > 0 ? (
					<g opacity={rays * 0.6}>
						{Array.from({length: 9}).map((_, i) => {
							const a = Math.PI * (0.55 + i * 0.06) + Math.sin(frame / 60 + i) * 0.02;
							return (
								<polygon
									key={i}
									points={`1720,250 ${1720 + Math.cos(a - 0.03) * 2200},${250 + Math.sin(a - 0.03) * 2200} ${1720 + Math.cos(a + 0.03) * 2200},${250 + Math.sin(a + 0.03) * 2200}`}
									fill={C.gold}
									opacity={0.06}
								/>
							);
						})}
					</g>
				) : null}
				<Motes frame={frame} count={40} opacity={0.3} seed="s4" color={clear > 0.5 ? '#C9BFA6' : '#6E7697'} />
				<g transform={camTransform(cam)}>
					{ghosts > 0
						? [1, 2, 3].map((k) => {
								const gx = stoneX - k * 300;
								return (
									<g key={k} opacity={ghosts * (0.22 - k * 0.05)}>
										<BlackStone id={`g${k}`} cx={gx} cy={stoneCY(gx, r)} r={r} rot={rotOf(gx)} seed={STONE_SEED} crack={1} crackGlow={0.4} />
										<Figure x={gx - r - 75} y={slopeY(gx - r - 75)} pose={POSES.push} color={C.jia} />
									</g>
								);
						  })
						: null}
					{lapse
						? [1, 2, 3].map((k) => {
								const v = stoneX - s4StoneX(frame - k * 2);
								const gx = stoneX - v * 1.2;
								return (
									<g key={`t${k}`} opacity={Math.min(0.35, v / 120) / k}>
										<BlackStone id={`t${k}`} cx={gx} cy={gx > SLOPE.topX ? SLOPE.topY - r * 0.95 : stoneCY(gx, r)} r={r} rot={rotOf(gx)} seed={STONE_SEED} crack={1} crackGlow={0.6} />
									</g>
								);
						  })
						: null}
					{sink <= 0.5 ? <BlackFlood x0={-400} front={flood} frame={frame} depth={16} /> : null}
					{behind ? (
						<Figure x={jiaX} y={groundY(jiaX) + jiaFore} pose={pose} facing={facing} color={C.jia} heart={Math.min(1.4, heartPulse)} scale={1 + aroundFore / 500} opacity={nearAlpha} />
					) : null}
					{fall < 1 ? <DarkBox layer="back" x={BOX.x} bottom={BOX.bottom} w={BOX.w} h={BOX.h} frame={frame} bulge={0.9 * (1 - fall)} /> : null}
					<BlackStone
						id="s4"
						cx={stoneX}
						cy={stoneY}
						r={r}
						rot={rotOf(stoneX)}
						seed={STONE_SEED}
						crack={1}
						crackGlow={0.3 + 0.5 * warm + 0.2 * clear}
						rim={0.2 + 0.6 * warm}
						rimColor={C.gold}
						cold={0.5 * (1 - warm)}
					/>
					{fall < 1 ? <DarkBox layer="front" x={BOX.x} bottom={BOX.bottom} w={BOX.w} h={BOX.h} frame={frame} front={1} bulge={0.9 * (1 - fall)} leak={1 - fall} fall={fall} /> : null}
					{behind ? null : (
					<Figure
						x={jiaX}
						y={groundY(jiaX) + jiaFore}
						pose={pose}
						facing={facing}
						color={C.jia}
						sink={sink}
						heart={Math.min(1.4, heartPulse)}
						rim={0.35 * clear}
						scale={1 + aroundFore / 500}
						opacity={nearAlpha}
					/>
					)}
					{sink > 0.5 ? <BlackFlood x0={-400} front={flood} frame={frame} depth={18 * (1 - prog(frame, turn, turn + 20)) + 16} /> : null}
				</g>
			</svg>

			{showWords
				? words.map((w, i) => {
						const p = worldToScreen(cam, {x: BOX.x + wordSpots[i].x * S2_END.r, y: stoneCY(BOX.x, S2_END.r) + wordSpots[i].y * S2_END.r});
						const o = prog(frame, wordCues[i], wordCues[i] + 10) * (1 - prog(frame, s31.startFrame + 10, s31.startFrame + 30));
						const lift = (1 - prog(frame, wordCues[i], wordCues[i] + 14, Easing.out(Easing.cubic))) * 30;
						const col = engrave > 0 ? `rgba(${Math.round(255 - 120 * engrave)},${Math.round(255 - 125 * engrave)},${Math.round(255 - 130 * engrave)},1)` : '#FFFFFF';
						return (
							<div
								key={w}
								style={{
									position: 'absolute',
									left: p.x - 100,
									top: p.y - 40 + lift,
									width: 200,
									textAlign: 'center',
									fontFamily: FONT_FAMILY,
									fontWeight: 900,
									fontSize: 60 * Math.min(1.3, cam.z / 1.15),
									letterSpacing: 4,
									color: col,
									opacity: o * nearAlpha,
									textShadow: engrave > 0 ? 'none' : '0 0 18px rgba(255,255,255,0.35)',
								}}
							>
								{w}
							</div>
						);
				  })
				: null}

			{panel > 0 ? (
				<AbsoluteFill style={{opacity: panel}}>
					<Panel frame={frame} color="#07090F" />
					<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
						<Ripples x={960} y={440} frame={frame} calm={calm} />
					</svg>
					{frame >= card - 14 ? (
						<WordCard
							text={onscreen(28).card ?? ''}
							x={-200 + (960 + 200) * cardP}
							y={440}
							scale={0.8 + 0.2 * cardP}
							rot={(1 - cardP) * -20}
							opacity={Math.min(1, cardP * 2)}
						/>
					) : null}
					<Label
						text={onscreen(27).label ?? ''}
						sub={onscreen(29).sublabel}
						subStart={s29.startFrame + 20}
						frame={frame}
						start={s27.startFrame + 18}
						end={s29.endFrame + 4}
					/>
				</AbsoluteFill>
			) : null}

			<Label text={onscreen(33).label ?? ''} frame={frame} start={s33.startFrame + 4} end={s34.endFrame - 6} />
			{s25.impact ? <ImpactWord impact={s25.impact} screenStart={s25.startFrame} frame={frame} size={190} centerY={400} glow fadeOutAt={s25.endFrame - s25.startFrame} /> : null}
		</AbsoluteFill>
	);
};
