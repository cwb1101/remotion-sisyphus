/**
 * 第二节 · 抛出问题（屏 5–9）
 * 场景换成蓝色大舞台（幕布、冷雾、两束光）。孩子在原地长成大人，冰环一圈圈弹出；
 * 一束暖光带着「想靠近的人」走进来；TA转身后退，镜头横移跟拍；
 * 主题词砸下时，冰环炸开铺满舞台、升成冰墙。
 */
import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {S, cue, cues, sectionRange} from '../data/script';
import {Cam, CamKey} from '../lib/camera';
import {clamp, easeIn, easeInOut, easeOut, lerp, prog, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {POCKETS, REACH, STAND, mixPose, strideFor, walk} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL} from '../components/Person';
import {World} from '../components/World';
import {Curtain, LIGHT, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';
import {HOOK_END} from './Hook';

const R = sectionRange('question');
const [s5, s6, s7, s8, s9] = [5, 6, 7, 8, 9].map(S);
const LOCKS = cues(5, 'lock');
const WARM_ON = cue(6, 'lamp', 2);
const HIT2 = cue(8, 'hit2', 22);
const BOOM = cue(9, 'boom', 4);

export const ADULT_SCALE = 1.3;
export const ADULT_RING_R = 150;
const CHASE_TO = 700;
const P_START = -1750;
const P_NEAR = -830;

/** 本节结束时 TA 的状态（下一节从这里接） */
export const QUESTION_END = {x: CHASE_TO, ringR: ADULT_RING_R, spread: 2.6, rise: 0.75, rings: 3, frost: 0.7, thick: 7};

export const questionCamera: CamKey[] = [
	{f: s5.start, x: 320, y: 0, z: 1.85, sy: 870},
	// 长大时 TA 留在左三分之一处；在第 5/6 屏字幕交接的瞬间甩到右三分之一，给来人让出左边
	{f: s5.end - 6, x: 480, y: 0, z: 1.0, sy: 860, ease: easeInOut},
	{f: s6.start + 8, x: -440, y: 0, z: 1.0, sy: 860, ease: Easing.inOut(Easing.poly(4))},
	{f: s6.end, x: -460, y: 0, z: 0.95, sy: 860},
	{f: s7.end, x: -440, y: 0, z: 1.0, sy: 860},
	{f: s8.end - 8, x: CHASE_TO - 440, y: 0, z: 0.92, sy: 860, rot: -1.5},
	{f: BOOM + 2, x: CHASE_TO, y: 0, z: 0.6, sy: 960, rot: 0, ease: easeOut},
	{f: s9.end, x: CHASE_TO, y: 0, z: 0.63, sy: 960},
];

export const Question: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame >= R.end) return null;
	const beat = pulseAt(frame);

	// —— 长大 ——
	const age = prog(frame, s5.start + 4, s5.end - 8, easeInOut);
	const scale = lerp(HOOK_END.scale, ADULT_SCALE, age);
	const pops = LOCKS.reduce((n, f) => n + clamp(springAt(frame, f, {damping: 11, stiffness: 200})), 0);

	// —— TA：先面向来人，再转身后退 ——
	const faceLeft = prog(frame, s6.start + 10, s6.start + 18, easeInOut);
	const turnAway = prog(frame, s8.start, s8.start + 8, easeInOut);
	const facing = lerp(lerp(1, -1, faceLeft), 1, turnAway);
	const chase = prog(frame, s8.start + 6, s8.end - 10, easeInOut);
	const jolt = frame >= HIT2 ? Math.exp(-(frame - HIT2) / 5) * 45 : 0;
	const taX = lerp(0, CHASE_TO, chase) + jolt;
	const taWalking = chase > 0 && chase < 1;
	const taBase = mixPose(STAND, POCKETS, prog(frame, s7.start, s7.start + 20));
	const taPose = taWalking ? walk(strideFor(taX), Math.min(1, Math.sin(chase * Math.PI) * 2), POCKETS) : taBase;

	// —— 想靠近的人 ——
	const pIn = prog(frame, s6.start, s6.end - 4, easeOut);
	const pNear = prog(frame, s7.start, s7.end, easeInOut);
	const pX = frame < s8.start ? lerp(lerp(P_START, -1000, pIn), P_NEAR, pNear) : lerp(P_NEAR, CHASE_TO + (P_NEAR - 0), chase);
	const pMoving = frame < s8.start ? (pIn < 1 || (pNear > 0 && pNear < 1)) : chase > 0 && chase < 1;
	const reach = prog(frame, s7.start + 30, s7.end, easeInOut) * (1 - prog(frame, s9.start + 4, s9.start + 20));
	const pWalk = walk(strideFor(pX), pMoving ? 1 : 0);
	const pPose = mixPose(pWalk, {...pWalk, ...REACH}, reach);
	const pFade = 1 - prog(frame, s9.start, s9.start + 24);

	// —— 冰环 ——
	const burst = prog(frame, BOOM, BOOM + 14, easeOut);
	const settle = prog(frame, BOOM + 14, s9.end - 10, easeInOut);
	const spread = frame < BOOM ? 1 : lerp(lerp(1, 7, burst), QUESTION_END.spread, settle);
	const rise = frame < BOOM ? 0 : lerp(lerp(0, 1, burst), QUESTION_END.rise, settle);
	const rings = {
		count: HOOK_END.rings + pops,
		r: lerp(HOOK_END.ringR, ADULT_RING_R, age),
		gap: 44,
		frost: lerp(HOOK_END.frost, 0.2, age) + prog(frame, s8.start, s8.end) * 0.5,
		thick: lerp(3, 4, age) + prog(frame, s8.start, s8.start + 40) * 3,
		spread,
		rise,
		riseH: 560,
		spin: frame * 1.2,
	};

	// —— 光 ——
	const warmI = prog(frame, WARM_ON, WARM_ON + 4) * (0.9 + 0.1 * Math.sin(frame * 2.3) * (1 - prog(frame, WARM_ON + 4, WARM_ON + 12))) * pFade;
	const coldW = lerp(400, 560, age);
	const spots = [
		{x: pX, width: 620, intensity: warmI},
		{x: taX, width: coldW, intensity: 1},
	];
	const curtain = prog(frame, s5.start, s5.start + 40);

	return (
		<AbsoluteFill>
			<World cam={cam} frame={frame}>
				<Curtain x0={-3200} x1={3800} opacity={curtain * 0.9} frame={frame} />
				<StageFloor tint="#0f141d" />
				<Spotlight x={pX} color={LIGHT.warm} intensity={warmI} width={620} topWidth={180} tilt={-260} frame={frame} seed={3} />
				<Spotlight x={taX} color={LIGHT.cold} intensity={1} width={coldW} topWidth={150} tilt={160} frame={frame} seed={4} />
				<Lit level={lightAt(pX, spots) * (0.25 + 0.75 * pFade)}>
					<Actor x={pX} scale={ADULT_SCALE} facing={1} pose={pPose} palette={PAL.warm} face="smile" heart={0.5} opacity={frame < s6.start ? 0 : 1} />
				</Lit>
				<Lit level={lightAt(taX, spots)}>
					<Avoider
						x={taX}
						frame={frame}
						beat={beat}
						age={age}
						scale={scale}
						facing={facing}
						pose={taPose}
						face={frame > s7.start + 10 ? 'down' : 'neutral'}
						heartGlow={lerp(1, 1.8, prog(frame, s7.start, s7.end))}
						rings={rings}
					/>
				</Lit>
			</World>
		</AbsoluteFill>
	);
};
