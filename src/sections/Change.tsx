/**
 * 第七节 · 能变吗（屏 47–55）
 * 接上一节：同一座舞台，幕布后面亮起暖光（天亮了），冰墙开始滴水融化。
 * 来人在固定的距离上，像节拍器一样稳定地亮着；冰环一圈圈化掉。
 * TA 先发出一小道信号；想躲时走到光的边缘停下，头顶一圈时钟走满后回来；
 * 最后镜头移到右边，一盏柔白的灯下有人坐着等——TA 走过去坐下。
 */
import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {S, cue, cues, sectionRange} from '../data/script';
import {Cam, CamKey} from '../lib/camera';
import {clamp, easeInOut, easeOut, lerp, prog, rand} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {POCKETS, SIT, STAND, mixPose, strideFor, walk} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL, Pose, heartWorld} from '../components/Person';
import {World} from '../components/World';
import {Curtain, LIGHT, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';
import {Chair, ClockRing, Ripple, SunGlow} from '../components/Props';
import {ADULT_SCALE} from './Question';
import {CYCLE_END, X6} from './Cycle';

const R = sectionRange('change');
const [s47, s48, s49, s50, s51, s52, s53, s54, s55] = [47, 48, 49, 50, 51, 52, 53, 54, 55].map(S);

const C = X6 + 100;
const P_STEADY = C - 280;
const P_SPACE = C - 520;
const TA0 = CYCLE_END.taX;
const EDGE = C + 1050;
const AWAY = C + 1700;
const BACK = C + 960;
const CHAIR_TA = C + 1100;
const CHAIR_HELP = C + 2600;
const TICKS48 = cues(48, 'tick');
const DRIPS = cues(49, 'drip');
const SIG51 = cue(51, 'pluck', 20);
const ECHO51 = cue(51, 'chime', 46);
const CLOCK_DONE = cue(53, 'chime', 92);
const MELT54 = cue(54, 'drip', 30);
const HELP_ON = cue(55, 'lamp', 10);
const SPIN0 = R.start * 4.2;

/** 本节结束时的状态（第八节从这里接） */
export const CHANGE_END = {taX: CHAIR_TA, pX: P_SPACE, helpX: CHAIR_HELP, ringCount: 0.35, spin: (f: number) => SPIN0 + (f - R.start) * 1.2};

export const changeCamera: CamKey[] = [
	{f: R.start, x: C + 400, y: 0, z: 0.64, sy: 960},
	{f: s47.end - 4, x: C + 400, y: 0, z: 0.68, sy: 960},
	{f: s48.start + 14, x: C + 240, y: 0, z: 0.95, sy: 880},
	{f: s49.end, x: C + 300, y: 0, z: 1.04, sy: 885},
	{f: s50.start + 26, x: TA0 - 306, y: 0, z: 1.6, sy: 900},
	{f: s50.end, x: TA0 - 300, y: 0, z: 1.64, sy: 900},
	{f: s51.start + 26, x: C + 240, y: 0, z: 0.95, sy: 880},
	{f: s51.end, x: C + 250, y: 0, z: 0.97, sy: 880},
	{f: s52.end - 6, x: C + 385, y: 0, z: 0.9, sy: 880},
	// 第 53 屏：TA 走远时镜头同步拉远，两人始终留在长字幕两侧
	{f: s53.start + 4, x: C + 385, y: 0, z: 1.08, sy: 890},
	{f: s53.start + 50, x: C + 710, y: 0, z: 0.72, sy: 910},
	{f: s53.end, x: C + 700, y: 0, z: 0.78, sy: 905},
	{f: s54.start + 36, x: C + 220, y: 0, z: 0.9, sy: 880},
	{f: s54.end - 6, x: C + 230, y: 0, z: 0.91, sy: 880},
	// 第 54/55 屏字幕交接的空当里甩到咨询室
	{f: s55.start + 6, x: C + 1850, y: 0, z: 0.95, sy: 880, ease: Easing.inOut(Easing.poly(4))},
	{f: R.end, x: C + 1850, y: 0, z: 0.97, sy: 880},
];

export const Change: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame >= R.end) return null;
	const beat = pulseAt(frame);

	// ===== 来人：退到一个稳定的距离 =====
	let pX = CYCLE_END.pX;
	let pFacing = 1;
	let pPose: Pose = {...STAND, head: 4};
	const back = prog(frame, s47.start + 20, s47.end - 12, easeInOut);
	if (frame < s48.start) {
		pFacing = back > 0 && back < 1 ? -1 : back >= 1 ? lerp(-1, 1, prog(frame, s47.end - 12, s47.end - 4, easeInOut)) : lerp(1, -1, prog(frame, s47.start + 12, s47.start + 20, easeInOut));
		pX = lerp(CYCLE_END.pX, P_STEADY, back);
		if (back > 0 && back < 1) pPose = walk(strideFor(pX), 1);
	} else {
		pX = P_STEADY;
		if (frame < s50.start) pPose = {...STAND, head: 4, lean: Math.sin((frame - s48.start) * ((2 * Math.PI) / 30)) * 3};
	}
	const space = prog(frame, s54.start + 15, s54.start + 40, easeInOut);
	if (frame >= s54.start) {
		pX = lerp(P_STEADY, P_SPACE, space);
		if (space > 0 && space < 1) pPose = walk(strideFor(pX), 0.6);
	}

	// ===== TA =====
	let taX = TA0;
	let facing = 1;
	let pose: Pose = {...POCKETS, head: 12};
	let face: 'neutral' | 'down' | 'smile' | 'flat' = 'neutral';
	const faceP = prog(frame, DRIPS[3] ?? s49.start + 48, (DRIPS[3] ?? s49.start + 48) + 8, easeInOut);
	if (frame >= s49.start) {
		facing = lerp(1, -1, faceP);
		pose = mixPose({...POCKETS, head: 12}, STAND, faceP);
	}
	// 屏 52：转身走到光的边缘，停下回头
	const toEdge = prog(frame, s52.start + 10, s52.start + 55, easeInOut);
	if (frame >= s52.start) {
		facing = lerp(-1, 1, prog(frame, s52.start + 4, s52.start + 12, easeInOut));
		if (frame > s52.start + 62) facing = lerp(1, -1, prog(frame, s52.start + 62, s52.start + 70, easeInOut));
		taX = lerp(TA0, EDGE, toEdge);
		pose = toEdge > 0 && toEdge < 1 ? walk(strideFor(taX), 1) : STAND;
	}
	// 屏 53：走进暗处，时钟走满后回来
	const away = prog(frame, s53.start + 10, s53.start + 50, easeInOut);
	const ret = prog(frame, CLOCK_DONE + 2, s54.start + 35, easeInOut);
	if (frame >= s53.start) {
		facing = frame < CLOCK_DONE ? (frame < s53.start + 52 ? lerp(-1, 1, prog(frame, s53.start + 2, s53.start + 10, easeInOut)) : lerp(1, -1, prog(frame, s53.start + 52, s53.start + 60, easeInOut))) : -1;
		taX = lerp(lerp(EDGE, AWAY, away), BACK, ret);
		const moving = (away > 0 && away < 1) || (ret > 0 && ret < 1);
		pose = moving ? walk(strideFor(taX), 1) : {...STAND, lean: Math.sin(frame / 9) * 3, head: 8 + Math.sin(frame / 13) * 6, bob: Math.sin(frame / 7) * 2};
		face = ret >= 1 ? 'smile' : 'neutral';
	}
	// 屏 55：走到椅子边坐下
	const toChair = prog(frame, s55.start + 20, s55.start + 45, easeInOut);
	const sit = prog(frame, s55.start + 47, s55.start + 63, easeInOut);
	if (frame >= s55.start) {
		taX = lerp(BACK, CHAIR_TA, toChair);
		facing = lerp(-1, 1, prog(frame, s55.start + 12, s55.start + 20, easeInOut));
		pose = toChair > 0 && toChair < 1 ? walk(strideFor(taX), 0.8) : mixPose(STAND, SIT, sit);
		face = 'neutral';
	}

	// ===== 冰环：滴水、一圈圈化掉 =====
	const melted = DRIPS.reduce((n, t) => n + prog(frame, t, t + 10), 0) / Math.max(1, DRIPS.length);
	const lastMelt = prog(frame, MELT54, MELT54 + 14);
	const tickFrost = TICKS48.reduce((n, t) => n + prog(frame, t, t + 6), 0) / Math.max(1, TICKS48.length);
	const rings = {
		count: lerp(3, 1, melted) - lastMelt * 0.65,
		r: CYCLE_END.rings.r,
		gap: 40,
		frost: lerp(CYCLE_END.rings.frost, 0.1, Math.max(melted, tickFrost * 0.5)),
		thick: lerp(CYCLE_END.rings.thick, 4, melted),
		rise: lerp(CYCLE_END.rings.rise, 0, Math.max(prog(frame, s47.start, s48.end) * 0.4, melted)),
		riseH: 560,
		spin: CHANGE_END.spin(frame),
	};
	// 融化的水滴
	const drops = Array.from({length: 24}, (_, i) => {
		const period = 26 + (i % 5) * 4;
		const t = ((frame + i * 7) % period) / period;
		const active = frame >= s47.start + 10 && frame < s54.end && rings.count > 0.3;
		if (!active) return null;
		const x = taX + (rand(i) - 0.5) * 2 * (130 + 40 * Math.min(2, rings.count - 1));
		const y0 = -lerp(40, 520 * rings.rise + 20, rand(i + 3));
		const y = y0 + t * t * Math.abs(y0);
		return <ellipse key={i} cx={x} cy={y} rx={3} ry={6} fill="#CFE8FF" opacity={(1 - t) * 0.7} />;
	});

	// ===== 光 =====
	const sun = prog(frame, s47.start, s48.start + 10, easeOut) * (1 - prog(frame, s55.start, R.end) * 0.3);
	const tickPulse = TICKS48.reduce((v, t) => v + (frame >= t ? Math.exp(-(frame - t) / 5) : 0), 0);
	const warmI = lerp(0.55, 1, prog(frame, s47.start, s47.start + 30)) * (1 + 0.25 * Math.min(1, tickPulse));
	const taSpotX = frame < s52.start ? TA0 : frame < s55.start ? Math.min(taX, EDGE) : taX;
	const coldI = lerp(0.6, 0.9, prog(frame, s47.start, s47.start + 30));
	const helpI = prog(frame, HELP_ON, HELP_ON + 8);
	const spots = [
		{x: pX, width: 600, intensity: warmI},
		{x: taSpotX, width: 520, intensity: coldI},
		{x: CHAIR_HELP, width: 560, intensity: helpI},
	];
	const taHeart = heartWorld(taX, 1, ADULT_SCALE, facing > 0 ? 1 : -1);
	const pHeart = heartWorld(pX, 1, ADULT_SCALE, pFacing > 0 ? 1 : -1);
	const sig = <Ripple x={taHeart.x} y={taHeart.y} t={(frame - SIG51) / 26} maxR={taX - pX - 60} dir={-1} width={6} spread={30} />;
	const echo = <Ripple x={pHeart.x} y={pHeart.y} t={(frame - ECHO51) / 24} maxR={320} dir={1} color="#FFB07A" width={6} spread={36} />;
	const pGlow = 1.2 + (frame >= ECHO51 ? Math.exp(-(frame - ECHO51) / 14) * 1.2 : 0);
	// 节拍器：来人脚下一圈圈稳定的暖光
	const metro = TICKS48.map((t, i) => {
		const k = (frame - t) / 20;
		if (k <= 0 || k >= 1) return null;
		return <ellipse key={i} cx={pX} cy={8} rx={lerp(80, 340, k)} ry={lerp(14, 60, k)} fill="none" stroke={LIGHT.warm} strokeWidth={4} opacity={(1 - k) * 0.7} />;
	});
	// 时钟与系绳
	const clockOn = prog(frame, s53.start + 8, s53.start + 16) * (1 - prog(frame, CLOCK_DONE + 6, CLOCK_DONE + 16));
	const clockP = prog(frame, s53.start + 14, CLOCK_DONE);
	const tether = prog(frame, s53.start + 4, s53.start + 16) * (1 - prog(frame, s54.start + 30, s54.start + 45));

	return (
		<AbsoluteFill>
			<World cam={cam} frame={frame}>
				<Curtain x0={X6 - 4200} x1={X6 + 6500} opacity={0.9} frame={frame} />
				<SunGlow x={C + 600} y={-650} r={1700} a={sun * 0.6} id="ch" />
				<StageFloor tint="#16120f" x0={X6 - 4200} x1={X6 + 6500} />
				<Spotlight x={pX} color={LIGHT.warm} intensity={warmI} width={600} topWidth={170} tilt={-200} frame={frame} seed={51} />
				<Spotlight x={taSpotX} color={LIGHT.cold} intensity={coldI} width={520} topWidth={150} tilt={180} frame={frame} seed={52} />
				<Spotlight x={CHAIR_HELP} color="#F4F1EA" intensity={helpI * 0.85} width={560} topWidth={160} frame={frame} seed={53} />
				{metro}
				{tether > 0.01 && (
					<line x1={pX + 40} y1={14} x2={taX - 40} y2={14} stroke={LIGHT.warm} strokeWidth={5} strokeDasharray="18 16" opacity={tether * 0.75} strokeDashoffset={-frame * 2} />
				)}
				<Chair x={CHAIR_TA} facing={1} opacity={prog(frame, s55.start, s55.start + 20)} />
				<Chair x={CHAIR_HELP} facing={-1} opacity={0.3 + 0.7 * helpI} />
				<Lit level={lightAt(CHAIR_HELP, spots)}>
					<Actor x={CHAIR_HELP} scale={ADULT_SCALE} facing={-1} pose={SIT} palette={PAL.sage} face="smile" heart={0.5} opacity={frame < s55.start ? 0 : 1} />
				</Lit>
				<Lit level={lightAt(pX, spots)}>
					<Actor x={pX} scale={ADULT_SCALE} facing={pFacing} pose={pPose} palette={PAL.warm} face="smile" heart={beat} heartGlow={pGlow} />
				</Lit>
				<Lit level={lightAt(taX, spots)}>
					<Avoider x={taX} frame={frame} beat={beat} scale={ADULT_SCALE} facing={facing} pose={pose} face={face} heartGlow={lerp(1.2, 1.7, prog(frame, s50.start, s51.end))} heartScale={1 + (frame >= SIG51 ? Math.exp(-(frame - SIG51) / 10) * 1.2 : 0)} rings={rings} />
				</Lit>
				{drops}
				{sig}
				{echo}
				<ClockRing x={taX} y={-600} r={58} p={clockP} opacity={clockOn} />
			</World>
		</AbsoluteFill>
	);
};
