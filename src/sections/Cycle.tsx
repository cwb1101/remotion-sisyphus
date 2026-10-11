/**
 * 第六节 · 关系里的循环（屏 38–46）
 * 接上一节：从 TA 的心口里拉出来，回到第二节那座蓝色大舞台（主线问题的现场）。
 * 来人这次心跳很快、不停发出小小的信号（怕被丢下）；追、躲，绕成一个越转越快的圈；
 * 停下来，两个人背对背、心跳一致；最后来人慢慢靠近，TA 的心发出一道红色信号——随即冰墙弹起。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, cues, sectionRange} from '../data/script';
import {Cam, CamKey} from '../lib/camera';
import {clamp, easeIn, easeInOut, easeOut, lerp, prog, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {POCKETS, REACH, STAND, mixPose, strideFor, walk} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL, Pose, heartWorld} from '../components/Person';
import {World} from '../components/World';
import {Curtain, LIGHT, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';
import {Flood, Ripple} from '../components/Props';
import {ADULT_SCALE} from './Question';
import {EXPRESS_END} from './Express';

const R = sectionRange('cycle');
const [s38, s39, s40, s41, s42, s43, s44, s45, s46] = [38, 39, 40, 41, 42, 43, 44, 45, 46].map(S);

export const X6 = 20000; // 蓝色大舞台
const C = X6 + 100; // 绕圈中心
const LOOP_A = 560;
const LOOP_D = 150;
const WARM_ON = cue(38, 'lamp', 30);
const ANX = cues(39, 'pluck');
const RING41 = cue(41, 'lock', 30);
const DIM = cue(43, 'lamp_off', 6);
const FLASH_P = cues(44, 'pluck')[0];
const FLASH_T = cues(44, 'pluck')[1];
const SIGNAL = cue(46, 'pluck', 40);
const WALL = cue(46, 'lock', 62);
const IMPACT46 = cue(46, 'hit', 7);
const START_HEART = heartWorld(X6, 1, ADULT_SCALE, -1);

/** 本节结束时两人的状态（第七节从这里接） */
export const CYCLE_END = {taX: C + 760, pX: C + 50, rings: {count: 3, r: 130, gap: 40, frost: 0.7, thick: 7, rise: 0.7, riseH: 560}};

export const cycleCamera: CamKey[] = [
	{f: s38.start, x: START_HEART.x, y: START_HEART.y, z: 22, sy: 330},
	{f: s38.start + 42, x: X6 - 440, y: 0, z: 1.0, sy: 860, ease: easeInOut},
	{f: s39.start + 10, x: X6 - 675, y: 0, z: 1.15, sy: 900},
	{f: s39.end, x: X6 - 675, y: 0, z: 1.16, sy: 900},
	{f: s40.start + 40, x: X6 - 450, y: 0, z: 1.0, sy: 880},
	{f: s40.end, x: X6 - 450, y: 0, z: 1.0, sy: 880},
	{f: s41.end - 4, x: X6 + 50, y: 0, z: 1.0, sy: 880},
	{f: s42.start + 8, x: C, y: 0, z: 0.72, sy: 900},
	{f: s42.end, x: C, y: 0, z: 0.7, sy: 900},
	{f: s43.start + 30, x: C, y: 0, z: 0.95, sy: 880},
	{f: s44.end, x: C, y: 0, z: 1.0, sy: 880},
	{f: s45.end, x: C + 208, y: 0, z: 1.25, sy: 890},
	{f: IMPACT46 + 6, x: C + 380, y: 0, z: 0.62, sy: 960, ease: easeOut},
	{f: R.end, x: C + 400, y: 0, z: 0.64, sy: 960},
];

/** 绕圈：角度随时间加速 */
const loopTheta = (f: number) => {
	const t = clamp((f - s42.start) / (s42.end - s42.start));
	return 2.4 * Math.PI * (0.35 * t + 0.65 * t * t);
};

export const Cycle: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame >= R.end) return null;
	const beat = pulseAt(frame);
	const flood = 1 - prog(frame, s38.start, s38.start + 22);

	// ===== TA =====
	let taX = X6;
	let taFacing = -1;
	let taPose: Pose = POCKETS;
	let taDepth = 0;
	let taFace: 'neutral' | 'down' | 'flat' | 'sad' = 'neutral';
	// ===== 来人 =====
	let pX = X6 - 1350;
	let pFacing = 1;
	let pPose: Pose = STAND;
	let pDepth = 0;
	let pFace: 'smile' | 'sad' | 'neutral' = 'smile';

	// 屏 38：来人走进暖光
	const pIn = prog(frame, s38.start + 18, s38.end - 2, easeOut);
	if (frame < s39.start) {
		pX = lerp(X6 - 2050, X6 - 1350, pIn);
		if (pIn > 0 && pIn < 1) pPose = walk(strideFor(pX), 1);
	}
	// 屏 39：不安——快速心跳、小信号、身体晃
	if (frame >= s39.start && frame < s40.start) {
		pFace = 'sad';
		pPose = {...STAND, lean: Math.sin(frame * 0.35) * 4, head: 6, armFront: {a: 30 + Math.sin(frame * 0.5) * 10, b: 60}};
	}
	// 屏 40：追
	const run = prog(frame, s40.start + 8, s40.end - 12, easeInOut);
	if (frame >= s40.start) {
		pFace = 'sad';
		pX = lerp(X6 - 1350, X6 - 900, run);
		pPose = run > 0 && run < 1 ? walk(strideFor(pX), 1.2, STAND) : mixPose(STAND, REACH, prog(frame, s40.end - 14, s40.end));
	}
	// 屏 41：躲（距离锁定）
	const flee = prog(frame, s41.start + 4, s41.end - 4, easeInOut);
	if (frame >= s41.start) {
		taFacing = lerp(-1, 1, prog(frame, s41.start, s41.start + 8, easeInOut));
		taX = X6 + flee * 500;
		pX = X6 - 900 + flee * 500;
		if (flee > 0 && flee < 1) {
			taPose = walk(strideFor(taX), 1, POCKETS);
			pPose = {...walk(strideFor(pX), 1), ...REACH, legFront: walk(strideFor(pX), 1).legFront, legBack: walk(strideFor(pX), 1).legBack};
		}
	}
	// 屏 42：绕圈（越转越快）
	if (frame >= s42.start) {
		const th = loopTheta(frame);
		const blend = prog(frame, s42.start, s42.start + 10, easeInOut);
		const tx = C + LOOP_A * Math.cos(th);
		const px = C + LOOP_A * Math.cos(th - 1.25);
		taX = lerp(X6 + 500, tx, blend);
		pX = lerp(X6 - 400, px, blend);
		taDepth = LOOP_D * Math.sin(th) * blend;
		pDepth = LOOP_D * Math.sin(th - 1.25) * blend;
		taFacing = frame < s42.start + 4 ? 1 : clamp(-Math.sin(th) * 3, -1, 1);
		pFacing = clamp(-Math.sin(th - 1.25) * 3, -1, 1);
		taPose = walk(strideFor(th * LOOP_A), 1.1, POCKETS);
		pPose = {...walk(strideFor((th - 1.25) * LOOP_A), 1.2), armFront: REACH.armFront};
	}
	// 屏 43–44：停下，各自转身背对，心跳一致
	if (frame >= s43.start) {
		const th = loopTheta(s43.start);
		const k = prog(frame, s43.start, s43.start + 30, easeInOut);
		taX = lerp(C + LOOP_A * Math.cos(th), C + 620, k);
		pX = lerp(C + LOOP_A * Math.cos(th - 1.25), C - 620, k);
		taDepth = lerp(LOOP_D * Math.sin(th), 0, k);
		pDepth = lerp(LOOP_D * Math.sin(th - 1.25), 0, k);
		taFacing = k < 1 ? lerp(clamp(-Math.sin(th) * 3, -1, 1), 1, k) : 1;
		pFacing = k < 1 ? lerp(clamp(-Math.sin(th - 1.25) * 3, -1, 1), -1, k) : -1;
		taPose = k > 0 && k < 1 ? walk(strideFor(taX), 1 - k, POCKETS) : {...POCKETS, head: 22};
		pPose = k > 0 && k < 1 ? walk(strideFor(pX), 1 - k) : {...STAND, head: 22};
		taFace = 'sad';
		pFace = 'sad';
	}
	// 屏 45–46：来人转身、慢慢走近；TA 的心发出信号，冰墙弹起，后退
	const approach = prog(frame, s45.start + 10, s46.start + 50, easeInOut);
	if (frame >= s45.start) {
		pFacing = lerp(-1, 1, prog(frame, s45.start, s45.start + 10, easeInOut));
		pX = lerp(C - 620, CYCLE_END.pX, approach);
		pPose = approach > 0 && approach < 1 ? walk(strideFor(pX), 0.6) : {...STAND, head: 4};
		pFace = 'neutral';
		taFace = frame > SIGNAL ? 'down' : 'neutral';
	}
	const backStep = prog(frame, WALL, WALL + 20, easeOut);
	if (frame >= s46.start) {
		taX = C + 620 + backStep * 140;
		taPose = backStep > 0 && backStep < 1 ? walk(strideFor(taX), 0.7, POCKETS) : {...POCKETS, head: 12};
	}

	// 冰环
	const count = 2 + clamp(springAt(frame, RING41, {damping: 11, stiffness: 200}));
	const rise = prog(frame, WALL - 4, WALL + 10, easeOut) * CYCLE_END.rings.rise;
	const syncFlash = frame >= FLASH_T ? Math.exp(-(frame - FLASH_T) / 6) : 0;
	const rings = {
		count,
		r: EXPRESS_END.ringR,
		gap: 40,
		frost: 0.3 + prog(frame, s41.start, s42.end) * 0.4,
		thick: 4 + prog(frame, s41.start, s41.end) * 3,
		rise,
		riseH: 560,
		spin: frame * (1.2 + prog(frame, s42.start, s42.end) * 3),
		opacity: 1 + syncFlash * 0.8,
	};

	// 光
	const warmI = prog(frame, WARM_ON, WARM_ON + 4) * lerp(1, 0.55, prog(frame, DIM, DIM + 8)) * (1 + (frame >= FLASH_P ? Math.exp(-(frame - FLASH_P) / 6) * 0.4 : 0));
	const coldI = lerp(1, 0.6, prog(frame, DIM, DIM + 8)) * (1 + syncFlash * 0.4);
	const spots = [
		{x: pX, width: 600, intensity: warmI},
		{x: taX, width: 520, intensity: coldI},
	];
	const taHeart = heartWorld(taX, 1, ADULT_SCALE, taFacing > 0 ? 1 : -1);
	const pHeart = heartWorld(pX, 1, ADULT_SCALE, pFacing > 0 ? 1 : -1);

	// 来人的小信号（不安）
	const anxRipples = ANX.map((t, i) => <Ripple key={i} x={pHeart.x} y={pHeart.y} t={(frame - t) / 18} maxR={150} dir={1} color="#FFB07A" width={4} spread={40} />);
	const pFlash = <Ripple x={pHeart.x} y={pHeart.y} t={(frame - FLASH_P) / 24} maxR={240} dir={-1} color="#FFB07A" width={6} />;
	// TA 的信号被唤醒（呼应第四节孩子的信号）
	const signal = <Ripple x={taHeart.x} y={taHeart.y} t={(frame - SIGNAL) / 24} maxR={520} dir={-1} width={8} />;
	const taHeartScale = 1 + 1.4 * Math.exp(-Math.max(0, frame - SIGNAL) / 10) * (frame >= SIGNAL ? 1 : 0) + syncFlash * 0.8;

	// 地上的循环轨迹
	const loopOn = prog(frame, s42.start, s42.start + 8) * (1 - prog(frame, s43.start + 10, s43.start + 30));

	const actorP = (
		<Lit key="p" level={lightAt(pX, spots)}>
			<g transform={`translate(0 ${pDepth}) translate(${pX} 0) scale(${1 + pDepth / 1100}) translate(${-pX} 0)`}>
				<Actor x={pX} scale={ADULT_SCALE} facing={pFacing} pose={pPose} palette={PAL.warm} face={pFace} heart={beat * 1.1} heartGlow={1.3 + (frame >= FLASH_P ? Math.exp(-(frame - FLASH_P) / 8) : 0)} opacity={frame < s38.start + 18 ? 0 : 1} />
			</g>
		</Lit>
	);
	const actorT = (
		<Lit key="t" level={lightAt(taX, spots)}>
			<g transform={`translate(0 ${taDepth}) translate(${taX} 0) scale(${1 + taDepth / 1100}) translate(${-taX} 0)`}>
				<Avoider x={taX} frame={frame} beat={beat} scale={ADULT_SCALE} facing={taFacing} pose={taPose} face={taFace} heartGlow={lerp(1, 1.9, prog(frame, s45.start, SIGNAL))} heartScale={taHeartScale} rings={rings} />
			</g>
		</Lit>
	);

	return (
		<AbsoluteFill>
			<World cam={cam} frame={frame}>
				<Curtain x0={X6 - 4200} x1={X6 + 6500} opacity={0.9} frame={frame} />
				<StageFloor tint="#0f141d" x0={X6 - 4200} x1={X6 + 6500} />
				<Spotlight x={pX} color={LIGHT.warm} intensity={warmI} width={600} topWidth={170} tilt={-200} frame={frame} seed={41} />
				<Spotlight x={taX} color={LIGHT.cold} intensity={coldI} width={520} topWidth={150} tilt={180} frame={frame} seed={42} />
				{loopOn > 0.01 && (
					<g opacity={loopOn}>
						<ellipse cx={C} cy={10} rx={LOOP_A} ry={LOOP_D} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={4} strokeDasharray="22 18" strokeDashoffset={-frame * 6} />
						{[0.3, 2.4, 4.5].map((a, i) => {
							const x = C + LOOP_A * Math.cos(a + loopTheta(frame) * 0.3);
							const y = 10 + LOOP_D * Math.sin(a + loopTheta(frame) * 0.3);
							const ang = (Math.atan2(LOOP_D * Math.cos(a + loopTheta(frame) * 0.3), -LOOP_A * Math.sin(a + loopTheta(frame) * 0.3)) * 180) / Math.PI;
							return <path key={i} d="M -16 -12 L 14 0 L -16 12 Z" fill="#ffffff" opacity={0.5} transform={`translate(${x} ${y}) rotate(${ang})`} />;
						})}
					</g>
				)}
				{taDepth >= pDepth ? [actorP, actorT] : [actorT, actorP]}
				{anxRipples}
				{pFlash}
				{signal}
			</World>
			<Flood color="#E0412F" alpha={flood} />
		</AbsoluteFill>
	);
};
