/**
 * 第二节 · 抛出问题（屏 5–9）
 * 场景：灯亮起来，暖色大光。镜头从孩子身上猛地拉远——TA长大了；
 * 有人靠近，TA后退，镜头横移跟拍；最后防御环炸满全屏，主题词砸下。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, cues, sectionRange} from '../data/script';
import {C} from '../theme';
import {Cam, CamKey} from '../lib/camera';
import {clamp, easeIn, easeInOut, easeOut, lerp, prog, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {Shell} from '../components/Shell';
import {World} from '../components/World';
import {HOOK_END} from './Hook';

const R = sectionRange('question');
const s5 = S(5);
const s6 = S(6);
const s7 = S(7);
const s8 = S(8);
const s9 = S(9);
const LOCKS = cues(5, 'lock');
const HIT2_8 = cue(8, 'hit2', 22);
const BOOM = cue(9, 'boom', 4);

export const ADULT_R = 150;
const P_R = 85;
const CHASE_DIST = 470;
const CHASE_TO = 1030;

/** 环的转角：全片连续（标题处额外加速转一圈） */
export const ringRotAt = (f: number) => f * 0.35 + prog(f, BOOM, BOOM + 56, easeInOut) * 200;

/** 本节结束时主角状态（下一节从这里接） */
export const QUESTION_END = {x: CHASE_TO, y: 0, r: 105, ringBase: ADULT_R, spread: 2.35, ringWidth: 0.07, rings: 3};

export const questionCamera: CamKey[] = [
	{f: s5.start, x: 0, y: 0, z: 2.9, sy: 350},
	{f: s5.end - 4, x: 0, y: 0, z: 0.95, sy: 380, ease: easeInOut},
	{f: s6.end, x: -230, y: 0, z: 0.82, sy: 380},
	{f: s7.end, x: -235, y: 0, z: 0.95, sy: 380},
	{f: s8.end - 8, x: CHASE_TO - 240, y: 0, z: 0.8, sy: 380, rot: -2.5},
	{f: BOOM + 2, x: CHASE_TO, y: 0, z: 1.0, sy: 540, rot: 0, ease: easeOut},
	{f: s9.end, x: CHASE_TO, y: 0, z: 1.06, sy: 540},
];

export const Question: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame >= R.end) return null;
	const beat = pulseAt(frame);

	// —— 长大 ——
	const grow = prog(frame, s5.start + 2, s5.end - 6, easeInOut);
	const r0 = lerp(HOOK_END.r, ADULT_R, grow);
	const pops = LOCKS.reduce((n, f) => n + clamp(springAt(frame, f, {damping: 11, stiffness: 200})), 0);
	const rings = HOOK_END.rings + pops;

	// —— 追与逃 ——
	const chase = prog(frame, s8.start + 2, s8.end - 10, easeInOut);
	const jolt = frame >= HIT2_8 ? Math.exp(-(frame - HIT2_8) / 5) * 40 : 0;
	const protX = lerp(0, CHASE_TO, chase) + jolt;
	const pIn = prog(frame, s6.start, s6.end - 5, easeOut);
	const pNear = prog(frame, s7.start, s7.end, easeInOut);
	const pX = frame < s8.start ? lerp(lerp(-1350, -600, pIn), -CHASE_DIST, pNear) : lerp(-CHASE_DIST, CHASE_TO - CHASE_DIST, chase);
	const pOpacity = (frame < s6.start ? 0 : 1) * (1 - prog(frame, s9.start, s9.start + 18));
	const pXOut = pX - prog(frame, s9.start, s9.start + 18, easeIn) * 300;

	// —— 标题：环炸开填满全屏，再收拢到字后 ——
	const burst = prog(frame, BOOM, BOOM + 14, easeOut);
	const settle = prog(frame, BOOM + 14, s9.end - 12, easeInOut);
	const spread = frame < BOOM ? 1 : lerp(lerp(1, 4.2, burst), QUESTION_END.spread, settle);
	const r = frame < s9.start ? r0 : lerp(ADULT_R, QUESTION_END.r, prog(frame, BOOM, BOOM + 30));
	const thick = lerp(0.045, 0.1, prog(frame, s8.start, s8.start + 40)) * (frame < s9.start ? 1 : 1) ;
	const ringWidth = frame < s9.start ? thick : lerp(0.1, QUESTION_END.ringWidth, prog(frame, BOOM, BOOM + 20));
	const ringOpacity = lerp(0.55, 0.85, prog(frame, s8.start, s8.start + 40));

	const coreGlow = lerp(0.6, 1.4, prog(frame, s7.start, s7.end)) * (frame >= s9.start ? 1.15 : 1);

	// 两人之间的「锁定距离」虚线
	const protOuter = (frame < s9.start ? r0 : r) * 1.73;
	const lineA = pXOut + P_R + 14;
	const lineB = protX - protOuter - 14;
	const lineOpacity = prog(frame, s7.start + 10, s7.start + 30) * (1 - prog(frame, s9.start, s9.start + 10));

	return (
		<AbsoluteFill>
			<World cam={cam} frame={frame}>
				{lineOpacity > 0.01 && lineB > lineA && (
					<g opacity={lineOpacity}>
						<line x1={lineA} y1={0} x2={lineB} y2={0} stroke={C.inkSoft} strokeWidth={3} strokeDasharray="10 12" />
						<line x1={lineA} y1={-18} x2={lineA} y2={18} stroke={C.inkSoft} strokeWidth={3} />
						<line x1={lineB} y1={-18} x2={lineB} y2={18} stroke={C.inkSoft} strokeWidth={3} />
					</g>
				)}
				{/* 对方：朱红空心圆 */}
				<g opacity={pOpacity}>
					<circle cx={pXOut} cy={0} r={P_R * (1 + 0.03 * Math.sin(frame / 6))} fill="none" stroke={C.red} strokeWidth={7} />
					<circle cx={pXOut} cy={0} r={P_R * 1.5} fill={C.red} opacity={0.06} />
				</g>
				<Shell
					x={protX}
					y={0}
					r={r}
					ringBase={frame < s5.end ? r0 : ADULT_R}
					rings={rings}
					spread={spread}
					ringWidth={ringWidth}
					ringOpacity={ringOpacity}
					ringRot={ringRotAt(frame)}
					beat={beat}
					coreGlow={coreGlow}
					bodyStroke={0.045}
				/>
			</World>
		</AbsoluteFill>
	);
};
