/**
 * 第四节 · 它从哪来（屏 18–29）
 * 接上一节：镜头推进 TA 的心口，红光充满画面——从孩子的心口里拉出来，回到童年。
 * 场景：暖褐色的回忆舞台。孩子哭着伸手、发出红色的信号波，被冷淡和推开撞碎；
 * 一次次之后，孩子不再发信号，冰环一圈圈合上，升成保护罩；最后三束不同方向的光照向孩子（原因不止一个）。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, cues, sectionRange} from '../data/script';
import {Cam, CamKey} from '../lib/camera';
import {clamp, easeIn, easeInOut, easeOut, lerp, prog, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {PHONE, PUSH_BACK, REACH_UP, STAND, mixPose, strideFor, walk} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL, Person, heartWorld} from '../components/Person';
import {World} from '../components/World';
import {LIGHT, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';
import {Flood, Ripple, Shards, Tears} from '../components/Props';
import {ADULT_SCALE} from './Question';
import {KID_SCALE, KID_RING_R} from './Hook';
import {WHAT_END} from './WhatItLooksLike';

const R = sectionRange('origin');
const [s18, s19, s20, s21, s22, s23, s24, s25, s26, s27, s28, s29] = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29].map(S);

export const X4 = -9000; // 回忆舞台
const MOM_X = X4 + 1100;
const WALL_X = X4 + 760; // 信号撞上的那堵看不见的墙
const DIVE = cue(18, 'dive', 38);
const FLOOD_PEAK = DIVE + 16;
const TA = WHAT_END.x;
const TA_HEART = heartWorld(TA, 1, ADULT_SCALE, 1);
const KID_HEART = heartWorld(X4, 0, KID_SCALE, 1);

const RIP20 = cues(20, 'pluck');
const RIP21 = cues(21, 'pluck');
const SH21 = cues(21, 'shatter');
const RIP22 = cues(22, 'pluck');
const SH22 = cues(22, 'shatter');
const MOM_OFF = cue(23, 'lamp_off', 12);
const LOCKS = [cue(24, 'lock', 20), cue(25, 'lock', 14), cue(26, 'lock', 20)];
const ICE_OFF = cue(26, 'lamp_off', 45);
const BEAMS = cues(28, 'lamp');
const IMPACT27 = cue(27, 'hit', 7);

/** 本节结束时孩子的状态（第五节从这里接） */
export const ORIGIN_END = {x: X4, facing: -1, rings: {count: 3, r: KID_RING_R, gap: 30, frost: 0.6, thick: 4, rise: 0.6, riseH: 300}, heartGlow: 0.35, spotW: 340};

/** 镜头：起点由完整片在第 18 屏开始处采样上一节的机位后接上 */
export const originCamera: CamKey[] = [
	{f: s18.start + 37, x: TA_HEART.x, y: TA_HEART.y, z: 3.4, sy: 330},
	{f: FLOOD_PEAK, x: TA_HEART.x, y: TA_HEART.y, z: 26, sy: 330, ease: easeIn},
	{f: FLOOD_PEAK + 2, x: KID_HEART.x, y: KID_HEART.y, z: 22, sy: 330},
	{f: s19.start + 30, x: X4 + 560, y: 0, z: 1.12, sy: 880, ease: easeInOut},
	{f: s22.end, x: X4 + 570, y: 0, z: 1.1, sy: 880},
	{f: s23.end, x: X4 + 390, y: 0, z: 1.5, sy: 885},
	{f: s26.end, x: X4 + 380, y: 0, z: 1.62, sy: 890},
	{f: IMPACT27 + 6, x: X4, y: 0, z: 0.82, sy: 950, ease: easeOut},
	{f: s28.start, x: X4 + 10, y: 0, z: 0.84, sy: 950},
	{f: s28.end, x: X4 - 70, y: 0, z: 0.92, sy: 955},
	{f: R.end, x: X4 + 60, y: 0, z: 1.0, sy: 960},
];

export const Origin: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame >= R.end + 40) return null;
	const beat = pulseAt(frame);
	const inPast = frame >= FLOOD_PEAK + 1;
	const flood = prog(frame, FLOOD_PEAK - 12, FLOOD_PEAK) * (1 - prog(frame, FLOOD_PEAK + 2, FLOOD_PEAK + 24));

	// ===== 现在：成年 TA，推进到心口 =====
	const taHeartScale = lerp(1, 4, prog(frame, s18.start + 20, FLOOD_PEAK - 4, easeIn));
	const curtainFade = 0.5 * (1 - prog(frame, s18.start, s18.start + 20));

	// ===== 过去：回忆舞台 =====
	const showChild = frame < R.end;
	const kidHeartScale = lerp(4, 1, prog(frame, FLOOD_PEAK + 2, s19.start + 26, easeOut));

	// 孩子的姿势：哭着伸手 → 一次次落空 → 垂下
	const reach = prog(frame, s20.start + 4, s20.start + 14, easeOut);
	const lower = prog(frame, s22.start, s23.start + 10, easeInOut);
	let kidPose = mixPose(STAND, REACH_UP, reach * (1 - lower));
	const crying = prog(frame, s20.start + 2, s20.start + 10) * (1 - prog(frame, s23.start, s23.start + 20));
	const turnAway = prog(frame, s25.start + 30, s25.start + 38, easeInOut);
	const kidFacing = lerp(1, -1, turnAway);
	if (frame >= s23.start) kidPose = {...kidPose, head: lerp(0, 10, prog(frame, s23.start, s23.end))};
	if (frame >= s28.start) kidPose = {...kidPose, head: 10 - 14 * Math.sin((frame - s28.start) / 14) * prog(frame, s28.start, s28.start + 10)};
	const kidFace = crying > 0.5 ? 'sad' : 'neutral';
	const heartGlow = lerp(1.3, ORIGIN_END.heartGlow, prog(frame, s26.start + 10, ICE_OFF + 10));

	// 冰环：三次「咔」一圈圈合上，再升成保护罩
	const count = LOCKS.reduce((n, f) => n + clamp(springAt(frame, f, {damping: 11, stiffness: 220})), 0);
	const rise = prog(frame, s27.start + 4, IMPACT27 + 20, easeOut) * ORIGIN_END.rings.rise;
	const rings = {
		count,
		r: KID_RING_R,
		gap: 30,
		frost: lerp(0.1, ORIGIN_END.rings.frost, prog(frame, LOCKS[0], ICE_OFF)),
		thick: 4,
		rise,
		riseH: 300,
		spin: frame * 1.2,
		opacity: 1 + 0.6 * Math.exp(-Math.max(0, frame - IMPACT27) / 8) * (frame >= IMPACT27 ? 1 : 0),
	};

	// 妈妈：低头看手机 → 背身推开、走远 → 灯灭
	const momPush = prog(frame, s21.start + 2, s21.start + 10, easeOut) * (1 - prog(frame, s22.end, s23.start + 20));
	const momStep = prog(frame, s21.start + 30, s21.start + 60, easeInOut) * 160;
	const momX = MOM_X + momStep;
	const momPose = momStep > 1 && momStep < 159 ? walk(strideFor(momStep), 0.8, PUSH_BACK) : mixPose(PHONE, PUSH_BACK, momPush);
	const momLight = (1 - prog(frame, MOM_OFF, MOM_OFF + 5)) * lerp(0.9, 0.55, prog(frame, s21.start, s21.end));
	const momFade = 1 - prog(frame, MOM_OFF + 5, s23.end);

	// 光
	const kidSpotI = 1;
	const kidSpotColor = frame < ICE_OFF ? LIGHT.neutral : LIGHT.ice;
	const kidSpotW = lerp(440, ORIGIN_END.spotW, prog(frame, ICE_OFF, ICE_OFF + 10));
	const beamI = BEAMS.map((b) => prog(frame, b, b + 6) * (1 - prog(frame, R.end, R.end + 30)));
	const spots = [
		{x: momX, width: 640, intensity: momLight},
		{x: X4, width: kidSpotW, intensity: kidSpotI},
	];

	// 信号波：s20 落空（自己消失），s21/s22 撞墙碎掉
	const ripples: React.ReactNode[] = [];
	const shards: React.ReactNode[] = [];
	RIP20.forEach((t, i) => ripples.push(<Ripple key={`a${i}`} x={KID_HEART.x} y={KID_HEART.y} t={(frame - t) / 34} maxR={520} />));
	RIP21.forEach((t, i) => {
		const hit = SH21[i];
		ripples.push(<Ripple key={`b${i}`} x={KID_HEART.x} y={KID_HEART.y} t={frame < hit ? (frame - t) / (hit - t) * 0.92 : 1} maxR={WALL_X - KID_HEART.x + 40} />);
		shards.push(<Shards key={`bs${i}`} x={WALL_X} y={KID_HEART.y} dt={frame - hit} seed={i + 3} color="#e4a3a0" />);
	});
	RIP22.forEach((t, i) => {
		const hit = SH22[i];
		const k = 1 - i * 0.25;
		ripples.push(<Ripple key={`c${i}`} x={KID_HEART.x} y={KID_HEART.y} t={frame < hit ? (frame - t) / (hit - t) * 0.92 : 1} maxR={WALL_X - KID_HEART.x + 40} width={7 * k} />);
		shards.push(<Shards key={`cs${i}`} x={WALL_X} y={KID_HEART.y} dt={frame - hit} seed={i + 9} n={Math.round(20 * k)} color="#d49a96" />);
	});
	// 第 26 屏：最后一道很小的信号，在冰环里就熄灭了
	const lastSignal = <Ripple x={KID_HEART.x - 6} y={KID_HEART.y} t={(frame - (s26.start + 6)) / 22} maxR={90} dir={-1} width={4} />;
	// 墙被撞时闪一下
	const wallFlash = [...SH21, ...SH22].reduce((v, t) => v + (frame >= t ? Math.exp(-(frame - t) / 4) : 0), 0);

	// 第 29 屏：远处走过的人（后来的经历）
	const passers = [0, 1, 2].map((i) => {
		const t0 = s28.start + 20 + i * 22;
		const dir = i === 1 ? -1 : 1;
		const x = X4 + dir * lerp(-1500, 1500, clamp((frame - t0) / (110 - i * 15)));
		if (frame < t0) return null;
		return (
			<g key={i} opacity={0.75}>
				<Person x={x} y={-50} scale={1.0} facing={dir} pose={walk(strideFor(x, 1), 1)} palette={PAL.cool} tone={['#454b58', '#574c55', '#47534c'][i]} heart={-1} />
			</g>
		);
	});

	const taSpots = [{x: TA, width: WHAT_END.spotW, intensity: 1}];

	return (
		<AbsoluteFill>
			{!inPast && (
				<World cam={cam} frame={frame}>
					<StageFloor tint="#121417" x0={1200} x1={12000} />
					<Spotlight x={TA} color={LIGHT.cold} intensity={1} width={WHAT_END.spotW} topWidth={140} frame={frame} seed={6} />
					{curtainFade > 0.01 && (
						<g opacity={curtainFade} stroke="#ffffff" strokeWidth={5}>
							<line x1={WHAT_END.AX} y1={-1400} x2={WHAT_END.AX} y2={(495 - cam.sy) / cam.z} />
							<line x1={WHAT_END.AX} y1={(630 - cam.sy) / cam.z} x2={WHAT_END.AX} y2={0} />
						</g>
					)}
					<Lit level={lightAt(TA, taSpots)}>
						<Avoider x={TA} frame={frame} beat={beat} scale={ADULT_SCALE} facing={1} pose={STAND} face="neutral" heartGlow={lerp(WHAT_END.heartGlow, 2, prog(frame, s18.start, FLOOD_PEAK))} heartScale={taHeartScale} rings={{count: 1, r: WHAT_END.ringR, gap: 40, frost: WHAT_END.frost, thick: WHAT_END.thick, spin: frame * 1.2}} />
					</Lit>
				</World>
			)}
			{inPast && (
				<World cam={cam} frame={frame}>
					{showChild && <StageFloor tint="#1a130c" x0={X4 - 3000} x1={X4 + 3000} />}
					{passers}
					{showChild && <Spotlight x={momX} color={LIGHT.warm} intensity={momLight * momFade} width={640} topWidth={200} tilt={180} frame={frame} seed={11} />}
					{showChild && <Spotlight x={X4} color={kidSpotColor} intensity={kidSpotI} width={kidSpotW} topWidth={120} frame={frame} seed={12} />}
					{/* 三束不同方向的光：原因不止一个 */}
					<Spotlight x={X4} color={LIGHT.warm} intensity={beamI[0] * 0.7} width={520} topWidth={140} tilt={-900 + Math.sin(frame / 18) * 160} frame={frame} seed={13} dust={false} />
					<Spotlight x={X4} color={LIGHT.cold} intensity={beamI[1] * 0.7} width={520} topWidth={140} tilt={900 + Math.sin(frame / 15 + 1) * 160} frame={frame} seed={14} dust={false} />
					<Spotlight x={X4} color="#E8D5FF" intensity={beamI[2] * 0.6} width={460} topWidth={160} tilt={Math.sin(frame / 22 + 2) * 120} frame={frame} seed={15} dust={false} />
					{/* 看不见的墙：被撞时才显形 */}
					{wallFlash > 0.02 && <line x1={WALL_X} y1={-420} x2={WALL_X} y2={0} stroke="#BFE0FF" strokeWidth={6} opacity={Math.min(0.8, wallFlash)} />}
					{momFade > 0.01 && (
						<Lit level={lightAt(momX, spots)}>
							<Actor x={momX} scale={ADULT_SCALE} facing={1} pose={momPose} palette={PAL.mom} face="none" heart={-1} opacity={momFade} phone={momPush < 0.5} />
						</Lit>
					)}
					{ripples}
					{shards}
					{lastSignal}
					{showChild && (
						<Lit level={lightAt(X4, spots)}>
							<Avoider x={X4} frame={frame} beat={beat} age={0} scale={KID_SCALE} facing={kidFacing} pose={kidPose} face={kidFace} heartGlow={heartGlow} heartScale={kidHeartScale} rings={rings} />
							<Tears x={X4 + 18} y={KID_HEART.y - 72} frame={frame} on={crying * (kidFacing > 0 ? 1 : 0)} />
						</Lit>
					)}
				</World>
			)}
			<Flood color="#E0412F" alpha={flood} />
		</AbsoluteFill>
	);
};
