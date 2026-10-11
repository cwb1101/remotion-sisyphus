/**
 * 第五节 · 关掉的只是表达（屏 30–37）
 * 接上一节：镜头推进孩子结了霜的心口——心还在跳。一道闪光，回到开头那个实验：
 * 冷色监测室，心率线和压力激素仪表一起上升；哭的孩子和不哭的孩子，心跳线几乎一样。
 * TA 再次长大；任务卡片绕着 TA 转，冰墙开裂，压下去的念头带着红光冲出来。
 * 最后推到心口：关掉的是表达，不是需要。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, cues, sectionRange, CITATIONS} from '../data/script';
import {Cam, CamKey, project} from '../lib/camera';
import {clamp, easeIn, easeInOut, easeOut, lerp, prog, rand, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {REACH_UP, STAND, mixPose, strideFor, walk} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL, Person, heartWorld} from '../components/Person';
import {World} from '../components/World';
import {HeartLine} from '../components/HeartLine';
import {LIGHT, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';
import {Citation, Flood, Gauge, MonitorWall, Ripple, Shards, TaskCard, Tears} from '../components/Props';
import {ADULT_SCALE} from './Question';
import {KID_SCALE, KID_RING_R} from './Hook';
import {ORIGIN_END, X4} from './Origin';

const R = sectionRange('express');
const [s30, s31, s32, s33, s34, s35, s36, s37] = [30, 31, 32, 33, 34, 35, 36, 37].map(S);

export const X5 = 14000; // 监测室
const KID_B = X5 + 1000;
const FLASH = cue(30, 'flash', 84);
const CRACK30 = cue(30, 'crack', 30);
const GAUGE_ON = cue(32, 'tick', 20);
const CRIES = cues(33, 'pluck');
const RING34 = cue(34, 'lock', 30);
const CARD_T = cues(35, 'tick');
const CRACKS = cues(36, 'crack');
const BURST = cue(36, 'shatter', 40);
const IMPACT37 = cue(37, 'hit', 7);
const DIVE37 = cue(37, 'dive', 66);
const FLOOD37 = DIVE37 + 16;

const OLD_HEART = heartWorld(X4, 0, KID_SCALE, -1);
const ADULT_HEART = heartWorld(X5, 1, ADULT_SCALE, 1);

/** 本节结束时 TA 的状态 */
export const EXPRESS_END = {ringR: 130};

export const expressCamera: CamKey[] = [
	{f: s30.start, x: X4 + 20, y: 0, z: 0.82, sy: 950},
	{f: s30.start + 45, x: OLD_HEART.x, y: OLD_HEART.y, z: 7, sy: 330, ease: easeInOut},
	{f: FLASH + 1, x: OLD_HEART.x, y: OLD_HEART.y, z: 8.6, sy: 330},
	{f: FLASH + 2, x: X5 + 330, y: 0, z: 1.75, sy: 880},
	{f: s31.end, x: X5 + 370, y: 0, z: 1.62, sy: 880},
	{f: s32.start + 20, x: X5 + 460, y: 0, z: 1.56, sy: 880},
	{f: s32.end, x: X5 + 465, y: 0, z: 1.54, sy: 880},
	{f: s33.start + 20, x: X5 + 500, y: 0, z: 1.15, sy: 880},
	{f: s33.end, x: X5 + 500, y: 0, z: 1.12, sy: 880},
	{f: s34.end - 10, x: X5 + 600, y: 0, z: 1.0, sy: 880},
	{f: s35.start + 20, x: X5 + 700, y: 0, z: 1.0, sy: 880},
	{f: s36.end, x: X5 + 700, y: 0, z: 1.03, sy: 880},
	{f: IMPACT37 + 4, x: ADULT_HEART.x, y: ADULT_HEART.y, z: 4.4, sy: 330, ease: easeOut},
	{f: DIVE37, x: ADULT_HEART.x, y: ADULT_HEART.y, z: 5, sy: 330},
	{f: FLOOD37, x: ADULT_HEART.x, y: ADULT_HEART.y, z: 26, sy: 330, ease: easeIn},
];

export const Express: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame >= R.end) return null;
	const beat = pulseAt(frame);
	const inLab = frame > FLASH + 1;
	const flash = prog(frame, FLASH - 3, FLASH + 1) * (1 - prog(frame, FLASH + 2, FLASH + 18));
	const flood = prog(frame, FLOOD37 - 12, FLOOD37);

	// ===== 第 30 屏：结霜的心还在跳 =====
	const frost = prog(frame, CRACK30 - 10, CRACK30 + 20, easeOut);
	const oldHeartScale = lerp(1, 3.8, prog(frame, s30.start, s30.start + 45, easeInOut));
	const shards = Array.from({length: 26}, (_, i) => {
		const a = (i / 26) * Math.PI * 2;
		const r0 = (22 + rand(i) * 10) * 1.2;
		const len = (14 + rand(i + 4) * 16) * frost;
		const cx = OLD_HEART.x;
		const cy = OLD_HEART.y;
		return (
			<polygon
				key={i}
				points={`${cx + Math.cos(a - 0.08) * r0},${cy + Math.sin(a - 0.08) * r0} ${cx + Math.cos(a) * (r0 + len)},${cy + Math.sin(a) * (r0 + len)} ${cx + Math.cos(a + 0.08) * r0},${cy + Math.sin(a + 0.08) * r0}`}
				fill="#DDF0FF"
				opacity={0.75 * frost}
			/>
		);
	});

	// ===== 监测室 =====
	const age = prog(frame, s34.start + 4, s34.end - 12, easeInOut);
	const scale = lerp(KID_SCALE, ADULT_SCALE, age);
	const ringR = lerp(KID_RING_R, EXPRESS_END.ringR, age);
	const ghostMom = prog(frame, FLASH + 4, s31.end, easeIn);

	// 任务卡片绕头转
	const load = prog(frame, s35.start, s36.start + 10);
	const cardsOut = prog(frame, s37.start, s37.start + 22, easeIn);
	const headY = -heartWorld(X5, 1, ADULT_SCALE).y - 0; // 心口高度（正值）
	const cards = Array.from({length: 14}, (_, i) => {
		const at = (CARD_T[i % CARD_T.length] ?? s35.start) + Math.floor(i / CARD_T.length) * 4;
		const ap = clamp(springAt(frame, at, {damping: 12, stiffness: 180}), 0, 1.1);
		if (ap <= 0) return null;
		const th = i * 0.9 + (frame - s35.start) * (0.05 + load * 0.08);
		const x = X5 + Math.cos(th) * 230 + (frame > s37.start ? 0 : 0);
		const y = -headY - 190 + Math.sin(th) * 80 + cardsOut * (frame - s37.start) * (frame - s37.start) * 0.9;
		return <TaskCard key={i} x={x} y={y} rot={Math.sin(th * 1.3) * 25 + i * 13} s={ap} opacity={1 - cardsOut} />;
	});
	const strain = load * (1 - prog(frame, s37.start, s37.start + 20));
	const shake = Math.sin(frame * 2.1) * 4 * strain;

	// 冰墙开裂、红光冲出
	const crackK = CRACKS.reduce((v, t) => v + prog(frame, t, t + 4), 0) / CRACKS.length;
	const heal = prog(frame, s37.start + 6, s37.start + 30);
	const rise = lerp(0, 0.45, prog(frame, s35.start, s35.end)) * (1 - prog(frame, BURST, BURST + 20));
	const leak = crackK * (1 - heal);
	const burstRipples = [0, 1, 2].map((k) => (
		<Ripple key={k} x={ADULT_HEART.x} y={ADULT_HEART.y} t={(frame - BURST - k * 6) / 30} maxR={420} dir={k % 2 ? -1 : 1} spread={70} width={8} />
	));
	const thought = prog(frame, CRACKS[0], BURST + 10) * (1 - prog(frame, s37.start, s37.start + 20));

	// 第 33 屏：哭的孩子
	const bIn = prog(frame, s33.start, s33.start + 14) * (1 - prog(frame, s34.start, s34.start + 18));
	const cryRipples = CRIES.map((t, i) => <Ripple key={i} x={KID_B - 7} y={heartWorld(KID_B, 0, KID_SCALE).y} t={(frame - t) / 26} maxR={300} dir={-1} color="#FF7A5A" />);

	// 光
	const spots = [
		{x: X5, width: 420, intensity: 1},
		{x: KID_B, width: 440, intensity: bIn},
	];

	// 屏幕空间：心率线 / 仪表 / 出处
	const kidHeart = project(cam, X5 + 7, heartWorld(X5, 0, KID_SCALE).y);
	const ecgMain = 1 - prog(frame, s33.start, s33.start + 10);
	const ecgPair = prog(frame, s33.start + 4, s33.start + 14) * (1 - prog(frame, s34.start, s34.start + 18));
	const gauge = prog(frame, GAUGE_ON, GAUGE_ON + 8) * (1 - prog(frame, s33.start, s33.start + 10));
	const gaugeV = lerp(0.18, 0.8, prog(frame, GAUGE_ON + 8, s32.end - 6, easeInOut));
	const cite1 = prog(frame, s32.start + 10, s32.start + 20) * (1 - prog(frame, s33.end - 10, s33.end));
	const cite2 = prog(frame, s36.start + 4, s36.start + 14) * (1 - prog(frame, s36.end - 8, s36.end));

	return (
		<AbsoluteFill>
			{!inLab && (
				<World cam={cam} frame={frame}>
					<StageFloor tint="#1a130c" x0={X4 - 3000} x1={X4 + 3000} />
					<Spotlight x={X4} color={LIGHT.ice} intensity={1} width={ORIGIN_END.spotW} topWidth={120} frame={frame} seed={12} />
					<Avoider x={X4} frame={frame} beat={beat} age={0} scale={KID_SCALE} facing={-1} pose={{...STAND, head: 10}} face="neutral" heartGlow={lerp(ORIGIN_END.heartGlow, 1.4, prog(frame, CRACK30, CRACK30 + 30))} heartScale={oldHeartScale} rings={{...ORIGIN_END.rings, spin: frame * 1.2}} />
					{shards}
				</World>
			)}
			{inLab && (
				<World cam={cam} frame={frame}>
					<MonitorWall x0={X5 - 900} x1={X5 + 2200} frame={frame} />
					<StageFloor tint="#0c1617" x0={X5 - 3000} x1={X5 + 4000} />
					<Spotlight x={X5} color={LIGHT.cold} intensity={1} width={420} topWidth={120} frame={frame} seed={21} />
					<Spotlight x={KID_B} color={LIGHT.warm} intensity={bIn} width={440} topWidth={130} frame={frame} seed={22} />
					{/* 开头那一幕的回声：妈妈的影子走开 */}
					{ghostMom > 0 && ghostMom < 1 && (
						<Person x={X5 + 300 + ghostMom * 900} scale={ADULT_SCALE} facing={1} pose={walk(strideFor(ghostMom * 900), 1)} palette={PAL.mom} tone="#e9b7a8" opacity={0.25 * (1 - ghostMom)} heart={-1} />
					)}
					{bIn > 0.01 && (
						<Lit level={lightAt(KID_B, spots)}>
							<Actor x={KID_B} scale={KID_SCALE} age={0} facing={-1} pose={REACH_UP} palette={{...PAL.kid, shirt: '#E59A6B', shirtShade: '#C77F52'}} face="sad" heart={1} opacity={bIn} />
							<Tears x={KID_B - 18} y={heartWorld(KID_B, 0, KID_SCALE).y - 72} frame={frame} on={bIn} />
						</Lit>
					)}
					{cryRipples}
					{/* 冲出来的念头：那个人的影子 */}
					{thought > 0.01 && (
						<Person x={X5 - 120} y={-60} scale={ADULT_SCALE * 1.15} facing={1} pose={{...STAND, armFront: {a: 60, b: 10}}} palette={PAL.warm} tone="#FFB58A" opacity={0.28 * thought} heart={-1} />
					)}
					<g transform={`translate(${shake} 0)`}>
						<Lit level={lightAt(X5, spots)}>
							<Avoider
								x={X5}
								frame={frame}
								beat={beat}
								age={age}
								scale={scale}
								facing={1}
								pose={{...STAND, head: lerp(0, 8, strain), bob: Math.sin(frame * 0.5) * 3 * strain}}
								face={strain > 0.3 ? 'flat' : 'neutral'}
								heartGlow={lerp(0.9, 1.6, prog(frame, s36.start, s37.start + 10))}
								heartScale={lerp(1, 3.4, prog(frame, s37.start, IMPACT37 + 4, easeOut))}
								rings={{count: frame < RING34 ? 1 : 1 + clamp(springAt(frame, RING34, {damping: 11, stiffness: 200})), r: ringR, gap: 40, frost: 0.3 + strain * 0.4, thick: 4 + strain * 2, rise, riseH: 520, spin: frame * 1.2}}
							/>
						</Lit>
					</g>
					{/* 冰墙裂纹与漏出的红光 */}
					{leak > 0.01 &&
						[0, 1, 2, 3, 4].map((i) => {
							const x = X5 + (i - 2) * 70 + rand(i) * 30;
							const top = -60 - rand(i + 3) * 200;
							const pts = Array.from({length: 6}, (_, k) => `${x + (rand(i * 7 + k) - 0.5) * 30},${top - k * 34 * crackK}`).join(' ');
							return (
								<g key={i} opacity={leak}>
									<polyline points={pts} fill="none" stroke="#FF5A45" strokeWidth={14} opacity={0.25} />
									<polyline points={pts} fill="none" stroke="#FFE2DA" strokeWidth={3} />
								</g>
							);
						})}
					{burstRipples}
					<Shards x={X5} y={-220} dt={frame - BURST} seed={31} color="#cfe6ff" n={30} />
					{cards}
				</World>
			)}
			<HeartLine frame={frame} startFrame={s32.start + 6} baseY={905} x0={600} x1={1820} amp={95} anchor={kidHeart} opacity={ecgMain * (frame >= s32.start ? 1 : 0)} color="#FF4433" />
			<HeartLine frame={frame} startFrame={s33.start + 4} baseY={940} x0={110} x1={860} amp={70} opacity={ecgPair} color="#7FC8FF" strokeWidth={4} />
			<HeartLine frame={frame} startFrame={s33.start + 4} baseY={940} x0={1060} x1={1810} amp={78} opacity={ecgPair} color="#FF8A5A" strokeWidth={4} />
			<Gauge x={1760} y0={260} y1={720} v={gaugeV} opacity={gauge} />
			<Citation text={`${CITATIONS[1]} · ${CITATIONS[2]}`} opacity={cite1} />
			<Citation text={CITATIONS[3]} opacity={cite2} />
			<Flood color="#FFFFFF" alpha={flash} />
			<Flood color="#E0412F" alpha={flood} />
		</AbsoluteFill>
	);
};
