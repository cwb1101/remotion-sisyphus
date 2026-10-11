/**
 * 第三节 · 它长什么样（屏 10–17）
 * 场景：一排顶灯下的「观察区」，冷白中性光。镜头沿舞台甩到一个个站点，
 * 每站一盏灯、一段小戏：降温 / 我没事 / 自己扛 / 消失。
 * 然后一张「标签」砸到 TA 身上，被拉成地上的一条光轴——轴上站满了人，TA只是其中之一。
 */
import React from 'react';
import {AbsoluteFill, Easing, interpolateColors} from 'remotion';
import {S, cue, cues, sectionRange} from '../data/script';
import {C} from '../theme';
import {Cam, CamKey} from '../lib/camera';
import {clamp, easeIn, easeInOut, easeOut, lerp, prog, rand, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {BENT, POCKETS, REACH, STAND, WAVE, mixPose, strideFor, walk} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL, Person, Pose} from '../components/Person';
import {World} from '../components/World';
import {LIGHT, LampRow, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';
import {ADULT_RING_R, ADULT_SCALE, QUESTION_END} from './Question';

const R = sectionRange('what');
const [s10, s11, s12, s13, s14, s15, s16, s17] = [10, 11, 12, 13, 14, 15, 16, 17].map(S);

const ST = [3200, 4400, 5600, 6800, 8000];
const AX = 8840; // 光轴中心
const OFF = 620; // 两人距站点中心（中间留给字幕：最长一句约 1020px 宽）
const DOLLY = 16;
const RING_R = 130;
const whip = Easing.inOut(Easing.poly(4));

const LAMP_S10 = cue(10, 'lamp', 18);
const TICKS = cues(10, 'tick');
const HISS = cue(11, 'hiss_down', 20);
const ASKS = cues(12, 'pluck');
const THUDS = cues(13, 'thud');
const ZAP = cue(14, 'zap', 26);
const LIGHT_OFF = cue(14, 'lamp_off', 50);
const TAG_LAND = cue(15, 'thud', 16);
const TAG_MORPH = cue(15, 'whoosh_up', 32);
const CUT = cue(17, 'lock', 18);

const STATION_SCREENS = [s11, s12, s13, s14];

export const whatCamera: CamKey[] = [
	{f: s10.start, x: QUESTION_END.x, y: 0, z: 0.63, sy: 960},
	{f: s10.start + 28, x: ST[0], y: 0, z: 0.92, sy: 880, ease: whip},
	{f: s10.end, x: ST[0], y: 0, z: 0.96, sy: 880},
	...STATION_SCREENS.flatMap((s, i) => [
		{f: s.start + DOLLY, x: ST[i + 1], y: 0, z: 0.92, sy: 880, ease: whip},
		{f: s.end, x: ST[i + 1] + (i === 3 ? 140 : 0), y: 0, z: 0.97, sy: 880},
	]),
	{f: s15.start + 20, x: AX, y: 0, z: 0.95, sy: 880},
	{f: TAG_MORPH, x: AX, y: 0, z: 1.0, sy: 880},
	{f: s15.end - 2, x: AX, y: 0, z: 0.9, sy: 885},
	{f: s16.start + 8, x: AX, y: 0, z: 0.52, sy: 900, ease: easeOut},
	{f: s16.end - 6, x: AX, y: 0, z: 0.5, sy: 900},
	{f: s17.start + 10, x: AX, y: 0, z: 1.0, sy: 880, ease: whip},
	{f: R.end + 40, x: AX, y: 0, z: 1.06, sy: 880},
];

/** 当前站点中心（含甩镜头过渡） */
const stationX = (f: number) => {
	let x = lerp(QUESTION_END.x - OFF, ST[0], prog(f, s10.start, s10.start + 28, whip));
	STATION_SCREENS.forEach((s, i) => {
		x = lerp(x, ST[i + 1], prog(f, s.start, s.start + DOLLY, whip));
	});
	return x;
};

/** 顶部进度灯 */
const ProgressLamps: React.FC<{frame: number}> = ({frame}) => {
	const out = prog(frame, s15.start, s15.start + 12);
	if (frame < s10.start || out >= 1) return null;
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}} opacity={1 - out}>
			<defs>
				<radialGradient id="pl-glow">
					<stop offset="0%" stopColor={LIGHT.warm} stopOpacity={0.9} />
					<stop offset="100%" stopColor={LIGHT.warm} stopOpacity={0} />
				</radialGradient>
			</defs>
			{[0, 1, 2, 3].map((i) => {
				const appear = clamp(springAt(frame, TICKS[i] ?? s10.start + 30 + i * 5, {damping: 12, stiffness: 220}), 0, 1.2);
				const lit = clamp(springAt(frame, STATION_SCREENS[i].start + DOLLY, {damping: 10, stiffness: 200}));
				const cx = 960 + (i - 1.5) * 90;
				return (
					<g key={i} transform={`translate(${cx} 150) scale(${appear})`}>
						<line x1={0} y1={-90} x2={0} y2={-26} stroke="#555" strokeWidth={2} />
						<path d="M -22 0 L 22 0 L 12 -26 L -12 -26 Z" fill={lit > 0.5 ? '#3a3a3a' : '#262626'} />
						<circle cx={0} cy={8} r={34 * lit} fill="url(#pl-glow)" />
						<ellipse cx={0} cy={0} rx={20} ry={4} fill={lit > 0.1 ? LIGHT.warm : '#444'} opacity={0.4 + 0.6 * lit} />
					</g>
				);
			})}
		</svg>
	);
};

export const WhatItLooksLike: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame > R.end + 40) return null;
	const beat = pulseAt(frame);
	const st = stationX(frame);
	const arrive = prog(frame, s10.start, s10.start + 28, whip);

	// ====== TA ======
	let taX = st + OFF;
	let facing = -1;
	let pose: Pose = POCKETS;
	let face: 'neutral' | 'down' | 'flat' | 'sad' = 'neutral';
	let heartGlow = 1.1;

	// 屏 11：降温——转身、低头、结霜、下雪
	const ice = prog(frame, HISS, HISS + 26, easeOut) * (1 - prog(frame, s12.start, s12.start + DOLLY));
	if (frame >= s11.start && frame < s12.start) {
		facing = lerp(-1, 1, prog(frame, HISS, HISS + 8, easeInOut));
		pose = {...POCKETS, head: lerp(16, 28, ice)};
		face = 'down';
	}
	// 屏 12：「我没事」——摆手，面无表情，心却在跳
	if (frame >= s12.start && frame < s13.start) {
		const w = prog(frame, ASKS[2] + 6, ASKS[2] + 14) * (1 - prog(frame, s12.end - 14, s12.end - 4));
		const waveArm = {...WAVE.armFront!, b: 20 + 28 * Math.sin((frame - ASKS[2]) * 0.7)};
		pose = mixPose(POCKETS, {...WAVE, armFront: waveArm}, w);
		face = 'flat';
		heartGlow = 1.7;
	}
	// 屏 13：重物一件件压上来；伸出一半的手又缩回
	let bend = 0;
	THUDS.forEach((t) => (bend += prog(frame, t, t + 8, easeOut) / THUDS.length));
	if (frame >= s14.start) bend *= 1 - prog(frame, s14.start, s14.start + DOLLY);
	const reachOut = prog(frame, THUDS[2] + 14, THUDS[2] + 22, easeOut) * (1 - prog(frame, THUDS[2] + 26, s13.end - 6, easeIn));
	if (frame >= s13.start && frame < s14.start) {
		pose = mixPose(POCKETS, BENT, bend);
		if (reachOut > 0) pose = {...pose, armFront: {a: lerp(20, 64, reachOut), b: lerp(40, 6, reachOut), k: 0.95}};
		face = 'down';
	}
	// 屏 14：吵完转身走出光圈，灯灭
	const leave = prog(frame, ZAP + 22, s14.end + 6, easeIn);
	if (frame >= s14.start) {
		const tTurn = prog(frame, ZAP + 14, ZAP + 22, easeInOut);
		facing = lerp(-1, 1, tTurn);
		pose = STAND;
		face = 'down';
		const dx = leave * 640;
		taX = ST[4] + OFF + dx;
		if (dx > 1) pose = walk(strideFor(dx), clamp(dx / 40));
	}
	// 屏 15：走进新的光里，标签砸下
	const toAx = prog(frame, s15.start, TAG_LAND + 2, easeOut);
	if (frame >= s15.start) {
		const x0 = ST[4] + OFF + 640;
		taX = lerp(x0, AX + OFF, toAx);
		facing = 1;
		pose = toAx < 1 ? walk(strideFor(taX), 1 - toAx) : STAND;
		face = 'neutral';
		const hitK = frame >= TAG_LAND ? Math.exp(-(frame - TAG_LAND) / 5) : 0;
		pose = {...pose, crouch: hitK * 0.25, head: hitK * 10};
	}
	// 屏 16：在人群里沿着光轴走
	if (frame >= s16.start) {
		const ramp = prog(frame, s16.start, s16.start + 14);
		const t = (frame - s16.start) / 18;
		const base = lerp(AX + OFF, AX, ramp);
		taX = base + Math.sin(t) * 500 * ramp;
		facing = clamp(Math.cos(t) * 3, -1, 1);
		pose = walk(strideFor(taX), 0.9);
	}
	// 屏 17：走到左边，面向右边那个「另一个概念」
	if (frame >= s17.start) {
		const xEnd16 = AX + Math.sin((s17.start - s16.start) / 18) * 500;
		const k = prog(frame, s17.start, s17.start + 24, easeInOut);
		taX = lerp(xEnd16, AX - 620, k);
		facing = lerp(-1, 1, prog(frame, s17.start + 20, s17.start + 28, easeInOut));
		pose = k < 1 ? walk(strideFor(taX), 1 - k) : STAND;
	}

	// 冰环：从标题的冰墙收回成一圈
	const rings = {
		count: lerp(QUESTION_END.rings, 1, arrive) + clamp(springAt(frame, HISS + 6, {damping: 12, stiffness: 180})) * (1 - prog(frame, s12.start, s12.start + DOLLY)),
		r: lerp(ADULT_RING_R, RING_R, arrive),
		gap: 40,
		spread: lerp(QUESTION_END.spread, 1, arrive),
		rise: lerp(QUESTION_END.rise, 0, arrive),
		riseH: 560,
		frost: lerp(QUESTION_END.frost, 0.15, arrive) + ice * 0.85,
		thick: lerp(QUESTION_END.thick, 4, arrive) + ice * 2,
		spin: frame * 1.2,
		opacity: 1 - prog(frame, TAG_MORPH, TAG_MORPH + 10) * (1 - prog(frame, s17.start, s17.start + 20)),
	};

	// ====== 想靠近的人 ======
	let pX = st - OFF;
	const pIn = prog(frame, s10.start + 12, s10.end - 6, easeOut);
	if (frame < s11.start) pX = lerp(st - OFF - 700, st - OFF, pIn);
	const pStep = prog(frame, HISS + 4, s11.end - 6, easeInOut) * (1 - prog(frame, s12.start, s12.start + DOLLY));
	pX += pStep * 60;
	let pPose: Pose = STAND;
	const pMoving = (frame < s11.start && pIn > 0 && pIn < 1) || (pStep > 0 && pStep < 1);
	if (pMoving) pPose = walk(strideFor(pX), 1);
	let pFace: 'smile' | 'neutral' | 'sad' = 'smile';
	if (frame >= s12.start && frame < s13.start) pPose = {...STAND, lean: 2, head: -8};
	const pReach = prog(frame, THUDS[2] + 4, THUDS[2] + 14, easeOut) * (frame < s14.start ? 1 : 0);
	if (frame >= s13.start && frame < s14.start) pPose = mixPose(STAND, REACH, pReach);
	if (frame >= s14.start) {
		pFace = frame > ZAP ? 'sad' : 'neutral';
		pPose = {...STAND, head: frame > ZAP + 20 ? 18 : 0};
	}
	if (frame >= s14.start) pX = ST[4] - OFF;
	const pOpacity = clamp(pIn * 3) * (1 - prog(frame, s15.start + 10, s15.start + 30));

	// ====== 光 ======
	const lampOn = prog(frame, LAMP_S10, LAMP_S10 + 4);
	const iceColor = interpolateColors(ice, [0, 1], [LIGHT.neutral, LIGHT.ice]);
	const taSpotX = frame < s15.start ? (frame >= LIGHT_OFF ? ST[4] + OFF : taX) : AX + OFF;
	const taSpotI = frame < s15.start ? lampOn * (1 - prog(frame, LIGHT_OFF, LIGHT_OFF + 4)) : prog(frame, s15.start + 8, s15.start + 16);
	const taSpotFinal = frame >= s16.start ? {x: taX, i: 1} : {x: taSpotX, i: taSpotI};
	const pSpotI = lampOn * (1 - prog(frame, s15.start + 4, s15.start + 20));
	const spots = [
		{x: pX, width: 600, intensity: pSpotI},
		{x: taSpotFinal.x, width: lerp(520, 380, ice), intensity: taSpotFinal.i},
	];
	const lampXs = ST.flatMap((s) => [s - OFF, s + OFF]);
	const curStation = Math.round((st - ST[0]) / (ST[1] - ST[0]));
	const lampLevels = lampXs.map((_, i) => {
		const k = Math.floor(i / 2);
		const isTa = i % 2 === 1;
		if (k !== curStation) return 0.05;
		if (isTa && frame >= LIGHT_OFF && k === 4) return 0.05;
		return lampOn;
	});

	// ====== 小道具 ======
	// 屏 11：TA光柱里下雪
	const snow =
		ice > 0.01
			? Array.from({length: 50}, (_, i) => {
					const y = ((rand(i) * 1300 + frame * (3 + rand(i + 2) * 3)) % 1300) - 1300;
					const x = taX + (rand(i + 5) - 0.5) * 360 + Math.sin(frame / 15 + i) * 10;
					return <circle key={i} cx={x} cy={y} r={2 + rand(i + 9) * 3} fill="#EAF4FF" opacity={ice * (0.4 + rand(i + 1) * 0.5)} />;
				})
			: null;
	// 屏 12：询问的弧线（从对方头部飘向 TA）
	const asks = ASKS.map((t, i) => {
		const k = clamp((frame - t) / 24);
		if (frame < t || k >= 1) return null;
		const x = lerp(pX + 80, taX - 160, easeOut(k));
		const rr = lerp(40, 95, k);
		return (
			<g key={i} opacity={(1 - k * k) * 0.95}>
				<path d={`M ${x} ${-420 - rr} A ${rr * 1.1} ${rr} 0 0 1 ${x} ${-420 + rr}`} fill="none" stroke={LIGHT.warm} strokeWidth={22} strokeLinecap="round" opacity={0.18} />
				<path d={`M ${x} ${-420 - rr} A ${rr * 1.1} ${rr} 0 0 1 ${x} ${-420 + rr}`} fill="none" stroke={LIGHT.warm} strokeWidth={8} strokeLinecap="round" />
			</g>
		);
	});
	// 屏 13：箱子
	// 箱子落在弯下去的后背上
	const backPoint = (h: number) => {
		const lean = ((BENT.lean! * h) * Math.PI) / 180;
		const leg = 158 * (1 - 0.28 * BENT.crouch! * h);
		const along = 118 * 0.72;
		return {
			x: (Math.sin(lean) * along - 26) * ADULT_SCALE,
			y: -(leg + Math.cos(lean) * along + 22) * ADULT_SCALE,
		};
	};
	const boxes =
		frame >= s13.start && frame < s14.start + DOLLY
			? THUDS.map((t, i) => {
					const fall = clamp((frame - (t - 10)) / 10);
					if (frame < t - 10) return null;
					const bp = backPoint(bend);
					const restY = bp.y - 30 - i * 64;
					const restX = taX + facing * bp.x + (i - 1) * 8;
					const y = frame < t ? lerp(restY - 900, restY, easeIn(fall)) : restY;
					const gone = prog(frame, s14.start, s14.start + 10);
					return (
						<g key={i} transform={`translate(${restX} ${y}) rotate(${(i - 1) * 6})`} opacity={1 - gone}>
							<rect x={-34} y={-32} width={68} height={64} rx={4} fill="#B9875A" />
							<rect x={-34} y={-32} width={68} height={14} fill="#A47448" />
							<rect x={-6} y={-32} width={12} height={64} fill="#D9B48A" opacity={0.7} />
						</g>
					);
				})
			: null;
	// 屏 14：争吵的锯齿
	const zapOn = frame >= ZAP && frame < ZAP + 18;
	const zap = zapOn
		? Array.from({length: 11}, (_, i) => {
				const x = lerp(pX + 60, taX - 60, i / 10);
				const y = -430 + (i === 0 || i === 10 ? 0 : (rand(i + Math.floor(frame / 2) * 17) - 0.5) * 90);
				return `${x},${y}`;
			}).join(' ')
		: '';

	// 屏 15：标签砸下 → 被拉成光轴
	const tagFall = clamp((frame - (TAG_LAND - 10)) / 10);
	const tagSp = springAt(frame, TAG_LAND, {damping: 9, stiffness: 240});
	const morph = prog(frame, TAG_MORPH, TAG_MORPH + 16, easeInOut);
	const tagCx = lerp(AX + OFF, AX, morph);
	const tagW = lerp(250, 5400, morph);
	const tagH = lerp(130, 6, morph);
	const tagY = frame < TAG_LAND ? lerp(-1500, -300, easeIn(tagFall)) : lerp(-300 + (1 - tagSp) * -16, 0, morph);
	const axisOut = prog(frame, s17.start, s17.start + 16);
	const tagVisible = frame >= TAG_LAND - 10 && axisOut < 1;

	// 屏 16：人群
	const N = 30;
	const crowd =
		frame >= s16.start && axisOut < 1
			? Array.from({length: N}, (_, i) => {
					const x = AX + (i / (N - 1) - 0.5) * 3800 + (rand(i) - 0.5) * 60;
					const pop = clamp(springAt(frame, s16.start + 4 + Math.abs(i - N / 2) * 1.3, {damping: 12, stiffness: 160}), 0, 1.15);
					const sink = 1 - axisOut;
					const tone = ['#2b3039', '#363c47', '#424955', '#30353f'][i % 4];
					const p: Pose = i % 3 === 0 ? POCKETS : i % 3 === 1 ? STAND : {...STAND, head: 10};
					return (
						<g key={i} transform={`translate(${x} 0) scale(1 ${pop * sink}) translate(${-x} 0)`}>
							<ellipse cx={x} cy={6} rx={70} ry={12} fill="#9aa3b0" opacity={0.08} />
							<Person x={x} scale={ADULT_SCALE * (0.92 + rand(i + 3) * 0.16)} facing={rand(i + 7) > 0.5 ? 1 : -1} pose={p} palette={PAL.cool} tone={tone} heart={-1} />
						</g>
					);
				})
			: null;

	// 屏 17：另一个概念（幽灵般的人形）+ 落下的光幕
	const ghostIn = prog(frame, s17.start + 10, s17.start + 30);
	const ghostAway = prog(frame, CUT + 26, R.end - 4, easeIn);
	const cutK = clamp((frame - (CUT - 8)) / 8);
	const gapTop = (495 - cam.sy) / cam.z;
	const gapBottom = (630 - cam.sy) / cam.z;
	const curtainBottom = lerp(-1400, 0, easeIn(cutK));

	return (
		<AbsoluteFill>
			<World cam={cam} frame={frame}>
				<StageFloor tint="#121417" x0={1200} x1={12000} />
				<LampRow xs={lampXs} on={lampLevels} color={LIGHT.warm} opacity={1 - prog(frame, s15.start, s15.start + 20)} />
				{/* 地上的站位标记 */}
				{lampXs.map((x, i) => (
					<g key={i} stroke="#d8d2c4" strokeWidth={4} opacity={0.18}>
						<line x1={x - 22} y1={10} x2={x + 22} y2={22} />
						<line x1={x + 22} y1={10} x2={x - 22} y2={22} />
					</g>
				))}
				<Spotlight x={pX} color={LIGHT.warm} intensity={pSpotI} width={600} topWidth={160} frame={frame} seed={5} />
				<Spotlight x={spots[1].x} color={frame >= s16.start ? LIGHT.cold : iceColor} intensity={spots[1].intensity} width={spots[1].width} topWidth={140} frame={frame} seed={6} />
				{snow}
				{tagVisible && morph > 0.5 && (
					<g opacity={1 - axisOut}>
						<line x1={AX - 2700} y1={4} x2={AX + 2700} y2={4} stroke="#EAF2FF" strokeWidth={26} opacity={0.12} />
						<line x1={AX - 2700} y1={4} x2={AX + 2700} y2={4} stroke="#EAF2FF" strokeWidth={5} opacity={0.85} />
					</g>
				)}
				{crowd}
				{/* 对方 */}
				<Lit level={lightAt(pX, spots)}>
					<Actor x={pX} scale={ADULT_SCALE} facing={1} pose={pPose} palette={PAL.warm} face={pFace} heart={0.5} opacity={pOpacity} />
				</Lit>
				{asks}
				{zapOn && <polyline points={zap} fill="none" stroke="#FF4433" strokeWidth={8} strokeLinejoin="miter" />}
				{/* 幽灵 */}
				{frame >= s17.start && (
					<g opacity={ghostIn * (1 - ghostAway)}>
						<Spotlight x={AX + 620 + ghostAway * 300} color="#d9e6f7" intensity={0.5} width={420} topWidth={120} frame={frame} dust={false} />
						<ellipse cx={AX + 620 + ghostAway * 300} cy={6} rx={130} ry={26} fill="none" stroke="#cfe0f5" strokeWidth={3} strokeDasharray="12 12" opacity={0.6} />
						<Person x={AX + 620 + ghostAway * 300} scale={ADULT_SCALE} facing={-1} pose={STAND} palette={PAL.cool} tone="#cfe0f5" opacity={0.28} />
					</g>
				)}
				<Lit level={lightAt(taX, spots)}>
					<Avoider x={taX} frame={frame} beat={beat} scale={ADULT_SCALE} facing={facing} pose={pose} face={face} heartGlow={heartGlow} rings={rings} />
				</Lit>
				{boxes}
				{/* 标签（变形前） */}
				{tagVisible && morph <= 0.5 && (
					<g transform={`translate(${tagCx} ${tagY})`}>
						<path d={`M ${-tagW / 2 + 40} 0 C ${-tagW / 2 - 10} -60, ${-tagW / 2 + 10} -200, ${-tagW / 2 + 60} -260`} fill="none" stroke="#d8d2c4" strokeWidth={4} opacity={1 - morph * 2} />
						<rect x={-tagW / 2} y={-tagH / 2} width={tagW} height={tagH} rx={Math.min(tagH / 2, 26)} fill="#E9E4DA" stroke="#bdb6aa" strokeWidth={4} />
						<circle cx={-tagW / 2 + 40} cy={0} r={13 * (1 - morph * 2)} fill="#121417" />
					</g>
				)}
				{/* 光幕：一刀两断（在字幕带断开） */}
				{frame >= CUT - 8 && (
					<g opacity={1 - prog(frame, R.end - 10, R.end + 20)}>
						<line x1={AX} y1={-1400} x2={AX} y2={Math.min(gapTop, curtainBottom)} stroke="#ffffff" strokeWidth={28} opacity={0.12} />
						<line x1={AX} y1={-1400} x2={AX} y2={Math.min(gapTop, curtainBottom)} stroke="#ffffff" strokeWidth={5} />
						{curtainBottom > gapBottom && (
							<>
								<line x1={AX} y1={gapBottom} x2={AX} y2={curtainBottom} stroke="#ffffff" strokeWidth={28} opacity={0.12} />
								<line x1={AX} y1={gapBottom} x2={AX} y2={curtainBottom} stroke="#ffffff" strokeWidth={5} />
							</>
						)}
						{cutK >= 1 && <ellipse cx={AX} cy={4} rx={60} ry={10} fill="#ffffff" opacity={0.35} />}
					</g>
				)}
			</World>
			<ProgressLamps frame={frame} />
		</AbsoluteFill>
	);
};
