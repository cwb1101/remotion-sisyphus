/**
 * 第三节 · 它长什么样（屏 10–17）
 * 场景：冷白平光 + 世界网格（像一块观察板）。镜头沿一条轨道横向推移，
 * 依次经过四个「站点」，每站演一种表现；最后拉远，主角变成刻度轴上的一点。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, cues, sectionRange} from '../data/script';
import {C} from '../theme';
import {Cam, CamKey} from '../lib/camera';
import {clamp, easeIn, easeInOut, easeOut, lerp, prog, rand, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {Shell} from '../components/Shell';
import {World} from '../components/World';
import {QUESTION_END, ringRotAt} from './Question';
import {Easing} from 'remotion';

const R = sectionRange('what');
const [s10, s11, s12, s13, s14, s15, s16, s17] = [10, 11, 12, 13, 14, 15, 16, 17].map(S);

const ST = [3000, 3800, 4600, 5400, 6200];
const AX = 7100; // 刻度轴中心
const PR_OFF = -120; // 主角相对站点
const P_OFF = 250; // 对方相对站点
const BODY = 110;
const P_R = 70;
const DOLLY = 20; // 每屏开头的推轨时长

const HISS = cue(11, 'hiss_down', 20);
const ASKS = cues(12, 'pluck');
const FLAT = cue(12, 'flatline', 40);
const THUDS = cues(13, 'thud');
const ZAP = cue(14, 'zap', 10);
const TAG_LAND = cue(15, 'thud', 16);
const TAG_MORPH = cue(15, 'whoosh_up', 32);
const CUT = cue(17, 'lock', 18);
const TICKS = cues(10, 'tick');

const whip = Easing.inOut(Easing.poly(5));

export const whatCamera: CamKey[] = [
	{f: s10.start, x: QUESTION_END.x, y: 0, z: 1.06, sy: 540},
	{f: s10.start + 28, x: ST[0] + 40, y: 0, z: 1.2, sy: 370, ease: whip},
	{f: s10.end, x: ST[0] + 40, y: 0, z: 1.26, sy: 370},
	{f: s11.start + DOLLY, x: ST[1] + 40, y: 0, z: 1.24, sy: 360},
	{f: s11.end, x: ST[1] + 40, y: 0, z: 1.32, sy: 355},
	{f: s12.start + DOLLY, x: ST[2] + 40, y: 0, z: 1.26, sy: 370},
	{f: s12.end, x: ST[2] + 40, y: 0, z: 1.36, sy: 370},
	{f: s13.start + DOLLY, x: ST[3] + 40, y: 0, z: 1.24, sy: 385},
	{f: s13.end, x: ST[3] + 40, y: 0, z: 1.32, sy: 385},
	{f: s14.start + DOLLY, x: ST[4] + 40, y: 0, z: 1.26, sy: 370},
	{f: s14.end, x: ST[4] - 20, y: 0, z: 1.34, sy: 370},
	{f: s15.start + 22, x: AX, y: 0, z: 1.25, sy: 400},
	{f: TAG_MORPH, x: AX, y: 0, z: 1.3, sy: 410},
	// 标签被拉成轴：先拉远，等第 16 屏砸字时再把轴压到字幕下方（避免轴线扫过正在显示的字幕）
	{f: s15.end - 2, x: AX, y: 0, z: 0.95, sy: 400},
	{f: s16.start + 8, x: AX, y: 0, z: 0.9, sy: 790, ease: easeOut},
	{f: s16.end - 6, x: AX + 60, y: 0, z: 0.82, sy: 800},
	// 快速上摇：主角在第 17 屏字幕完全浮现前就越过字幕带
	{f: s17.start + 8, x: AX, y: 0, z: 0.95, sy: 370, ease: whip},
	{f: s17.start + 28, x: AX, y: 0, z: 1.0, sy: 370},
	{f: R.end + 40, x: AX, y: 0, z: 1.1, sy: 370},
];

/** 第 k 屏（11..14）开头推轨的进度 */
const dollyTo = (frame: number, s: {start: number}) => prog(frame, s.start, s.start + DOLLY + 2, easeInOut);

/** 主角所在站点 x（含推轨） */
const stationX = (frame: number) => {
	if (frame < s11.start) return lerp(QUESTION_END.x - PR_OFF, ST[0], prog(frame, s10.start, s10.start + 30, whip));
	const list = [s11, s12, s13, s14];
	let x = ST[0];
	list.forEach((s, i) => {
		x = lerp(x, ST[i + 1], dollyTo(frame, s));
	});
	return x;
};

const Progress: React.FC<{frame: number}> = ({frame}) => {
	const out = prog(frame, s15.start, s15.start + 12);
	if (frame < s10.start || out >= 1) return null;
	const lit = [s11, s12, s13, s14].map((s) => springAt(frame, s.start + 6, {damping: 10, stiffness: 200}));
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}} opacity={1 - out}>
			{[0, 1, 2, 3].map((i) => {
				const appear = springAt(frame, TICKS[i] ?? s10.start + 20 + i * 5, {damping: 12, stiffness: 220});
				const cx = 960 + (i - 1.5) * 64;
				return (
					<g key={i} transform={`translate(${cx} 975) scale(${appear})`}>
						<circle r={13} fill="none" stroke={C.ink} strokeWidth={3} />
						<circle r={13 * clamp(lit[i])} fill={C.red} />
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

	// —— 从标题过来：环从炸开状态收回 ——
	const arrive = prog(frame, s10.start, s10.start + 30, whip);
	let spread = lerp(QUESTION_END.spread, 1, arrive);
	let ringBase = lerp(QUESTION_END.ringBase, BODY, arrive);
	let r = lerp(QUESTION_END.r, BODY, arrive);
	let ringWidth = lerp(QUESTION_END.ringWidth, 0.05, arrive);
	let protX = st + PR_OFF;
	let protY = 0;
	let ringOpacity = 0.6;
	let gapDeg = 26;
	let frost = 0;
	let coreGlow = 0.8;
	let coreOpacity = 1;
	let tighten = 0;
	let bodyDash = 0;
	let opacity = 1;
	let squash = 1;
	let rings = 3;

	// 屏 11：降温
	const cool = prog(frame, HISS, HISS + 28, easeOut) * (1 - dollyTo(frame, s12));
	ringOpacity = lerp(ringOpacity, 0.97, cool);
	ringWidth = lerp(ringWidth, 0.085, cool);
	gapDeg = lerp(26, 6, cool);
	frost = cool;
	coreGlow = lerp(coreGlow, 0.12, cool);
	coreOpacity = lerp(1, 0.5, cool);

	// 屏 13：被压
	for (const t of THUDS) {
		if (frame >= t) squash -= 0.1 * Math.exp(-(frame - t) / 4) * Math.cos((frame - t) * 0.9);
	}

	// 屏 14：消失
	const vanish = prog(frame, ZAP + 14, s14.end - 12, easeInOut) * (1 - prog(frame, s15.start, s15.start + 20));
	tighten = vanish;
	bodyDash = vanish;
	coreOpacity *= lerp(1, 0.3, vanish);
	opacity = lerp(1, 0.4, vanish);
	const drift = prog(frame, ZAP + 14, s14.end, easeIn) * 300 * (1 - prog(frame, s15.start, s15.start + 22, easeInOut));

	// 屏 15–17：轴
	const toAxis = prog(frame, s15.start, s15.start + 22, easeInOut);
	if (frame >= s15.start) protX = lerp(ST[4] + PR_OFF - 300, AX, toAxis);
	else protX -= drift;
	const shrink = prog(frame, TAG_MORPH, TAG_MORPH + 18, easeInOut) * (1 - prog(frame, s17.start, s17.start + 26, easeInOut));
	r = lerp(r, 60, shrink);
	ringBase = lerp(ringBase, 60, shrink);
	const slide = prog(frame, s16.start, s16.start + 20) * (1 - prog(frame, s17.start, s17.start + 20));
	if (frame >= s16.start) protX = AX + Math.sin((frame - s16.start) / 13) * 560 * slide;
	const toLeft = prog(frame, s17.start, s17.start + 26, easeInOut);
	if (frame >= s17.start) protX = lerp(AX + Math.sin((frame - s16.start) / 13) * 560 * slide, AX - 420, toLeft);

	// 对方
	const pAppear = springAt(frame, s10.start + 24, {damping: 13, stiffness: 140});
	let pX = st + P_OFF;
	const approach = prog(frame, s11.start + 30, s11.end - 8, easeInOut) * (1 - dollyTo(frame, s12));
	pX -= approach * 90;
	const pOpacity = clamp(pAppear) * (1 - prog(frame, s15.start, s15.start + 14));

	// 屏 12：询问的弧线
	const asks = ASKS.map((t, i) => {
		const k = clamp((frame - t) / 26);
		if (frame < t || k >= 1) return null;
		const rr = lerp(P_R + 20, P_OFF - PR_OFF - BODY * 1.73 - 10, easeOut(k));
		const a = (40 * Math.PI) / 180;
		const x1 = pX - rr * Math.cos(a);
		const y1 = -rr * Math.sin(a);
		const y2 = rr * Math.sin(a);
		return (
			<path
				key={i}
				d={`M ${x1} ${y1} A ${rr} ${rr} 0 0 0 ${x1} ${y2}`}
				fill="none"
				stroke={C.red}
				strokeWidth={6}
				strokeDasharray="12 10"
				strokeLinecap="round"
				opacity={(1 - k) * 0.9}
			/>
		);
	});
	const askHit = ASKS.reduce((v, t) => v + (frame >= t + 20 ? Math.exp(-(frame - t - 20) / 5) : 0), 0);
	ringOpacity = clamp(ringOpacity + askHit * 0.3, 0, 1);

	// 屏 12：平直的线
	const flatK = prog(frame, FLAT, FLAT + 12, easeOut) * (1 - dollyTo(frame, s13));
	const flatLen = flatK * 1300;

	// 屏 13：三块重物（落在环顶不同位置）
	const outerR = BODY * 1.73 + 4;
	const weights = THUDS.map((t, i) => {
		const ang = ((-90 + [0, -32, 32][i]) * Math.PI) / 180;
		const land = {x: Math.cos(ang) * (outerR + 26), y: Math.sin(ang) * (outerR + 26)};
		const fall = clamp((frame - (t - 10)) / 10);
		const y = lerp(land.y - 700, land.y, easeIn(fall));
		const gone = prog(frame, s14.start, s14.start + 14);
		if (frame < t - 10 || gone >= 1) return null;
		return (
			<rect
				key={i}
				x={protX + land.x - 24}
				y={y * squash - 24}
				width={48}
				height={48}
				rx={6}
				fill={C.ink}
				opacity={1 - gone}
				transform={`rotate(${(ang * 180) / Math.PI + 90} ${protX + land.x} ${y * squash})`}
			/>
		);
	});
	// 伸出去又缩回的线
	const reachOut = prog(frame, THUDS[2] + 8, THUDS[2] + 20, easeOut);
	const reachBack = prog(frame, THUDS[2] + 22, s13.end - 4, easeIn);
	const reachLen = reachOut * (1 - reachBack) * 210;

	// 屏 14：争吵的锯齿线
	const zapOn = frame >= ZAP && frame < ZAP + 18;
	const zapPts: string[] = [];
	if (zapOn) {
		const a = protX + outerR;
		const b = pX - P_R;
		const n = 9;
		for (let i = 0; i <= n; i++) {
			const x = lerp(a, b, i / n);
			const y = i === 0 || i === n ? 0 : (rand(i + Math.floor(frame / 2) * 13) - 0.5) * 70;
			zapPts.push(`${x},${y}`);
		}
	}

	// 屏 15：标签砸下，再被拉成刻度轴
	const tagFall = clamp((frame - (TAG_LAND - 9)) / 9);
	const tagLandSp = springAt(frame, TAG_LAND, {damping: 9, stiffness: 260});
	const morph = prog(frame, TAG_MORPH, TAG_MORPH + 16, easeInOut);
	const tagW = lerp(320, 4600, morph);
	const tagH = lerp(130, 0, morph);
	const tagY = frame < TAG_LAND ? lerp(-800, 0, easeIn(tagFall)) : (1 - tagLandSp) * -14;
	const axisFade = 1 - prog(frame, s17.start, s17.start + 18);
	const axisScale = lerp(1, 0.02, prog(frame, s17.start, s17.start + 18, easeIn));
	const tagVisible = frame >= TAG_LAND - 9 && axisFade > 0;
	if (frame >= TAG_LAND && frame < TAG_LAND + 12) squash -= 0.14 * Math.exp(-(frame - TAG_LAND) / 3);

	// 屏 16：人人都在这条线上
	const dots = Array.from({length: 80}, (_, i) => {
		const dx = (rand(i * 3 + 1) - 0.5) * 2;
		const x = AX + dx * 1500;
		const y = (rand(i * 3 + 2) - 0.5) * 70 + Math.sin(frame / 14 + i) * 5;
		const rr = 7 + rand(i * 3 + 3) * 11;
		const appear = springAt(frame, s16.start + 6 + Math.abs(dx) * 22, {damping: 12, stiffness: 160});
		return (
			<circle key={i} cx={x} cy={y} r={rr * clamp(appear)} fill={C.ink} opacity={(0.18 + rand(i) * 0.35) * axisFade} />
		);
	});

	// 屏 17：一刀两断
	const cutK = clamp((frame - (CUT - 8)) / 8);
	// 分割线在字幕带（屏幕 y≈620–770）处断开，不从字后穿过
	const gapTop = (620 - cam.sy) / cam.z;
	const gapBottom = (770 - cam.sy) / cam.z;
	const other = springAt(frame, s17.start + 12, {damping: 13, stiffness: 140});
	const otherAway = prog(frame, s17.start + 48, R.end - 6, easeIn);

	return (
		<AbsoluteFill>
			<World cam={cam} frame={frame}>
				{/* 刻度轴 / 标签 */}
				{tagVisible && (
					<g transform={`translate(${AX} ${tagY}) scale(${axisScale} 1)`} opacity={axisFade}>
						<rect
							x={-tagW / 2}
							y={-tagH / 2 - 1}
							width={tagW}
							height={tagH + 2}
							rx={Math.min(tagH / 2, 60)}
							fill={morph < 0.5 ? 'rgba(236,233,227,0.55)' : 'none'}
							stroke={C.ink}
							strokeWidth={lerp(8, 4, morph)}
						/>
						<circle cx={-tagW / 2 + 48} cy={0} r={14 * (1 - morph)} fill="none" stroke={C.ink} strokeWidth={5} />
						<path
							d={`M ${-tagW / 2 + 34} 0 C ${-tagW / 2 - 40} -30, ${-tagW / 2 - 60} -110, ${-tagW / 2 - 20} -170`}
							fill="none"
							stroke={C.ink}
							strokeWidth={4}
							opacity={1 - morph * 2}
						/>
					</g>
				)}
				{frame >= s16.start - 2 && <g>{dots}</g>}
				{/* 平直线 */}
				{flatLen > 1 && (
					<line x1={protX - flatLen} y1={0} x2={protX + flatLen} y2={0} stroke={C.grey} strokeWidth={5} strokeLinecap="round" />
				)}
				{/* 伸出去的线 */}
				{reachLen > 1 && (
					<line x1={protX + BODY} y1={0} x2={protX + BODY + reachLen} y2={0} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
				)}
				{zapOn && <polyline points={zapPts.join(' ')} fill="none" stroke={C.red} strokeWidth={8} strokeLinejoin="miter" />}
				{asks}
				{/* 对方 */}
				<g opacity={pOpacity} transform={`translate(${pX} 0) scale(${clamp(pAppear, 0, 1.2)})`}>
					<circle r={P_R} fill="none" stroke={C.red} strokeWidth={7} />
					<circle r={P_R * 1.5} fill={C.red} opacity={0.06} />
				</g>
				{/* 屏 17：另一个概念（虚线圆）与分割线 */}
				{frame >= s17.start && (
					<g opacity={clamp(other) * (1 - otherAway)} transform={`translate(${AX + 420 + otherAway * 380} 0) scale(${clamp(other, 0, 1.3)})`}>
						<circle r={BODY} fill="none" stroke={C.inkSoft} strokeWidth={6} strokeDasharray="14 12" />
						<circle r={BODY * 1.4} fill="none" stroke={C.inkSoft} strokeWidth={3} strokeDasharray="4 14" opacity={0.6} />
					</g>
				)}
				{frame >= CUT - 8 && (
					<g stroke={C.ink} strokeWidth={6} strokeLinecap="round">
						<line x1={AX} y1={-760} x2={AX} y2={Math.min(gapTop, lerp(-760, 760, easeIn(cutK)))} />
						{lerp(-760, 760, easeIn(cutK)) > gapBottom && (
							<line x1={AX} y1={gapBottom} x2={AX} y2={lerp(-760, 760, easeIn(cutK))} />
						)}
					</g>
				)}
				{weights}
				<Shell
					x={protX}
					y={protY}
					r={r}
					ringBase={ringBase}
					rings={rings}
					spread={spread}
					ringWidth={ringWidth}
					ringOpacity={ringOpacity}
					ringRot={ringRotAt(frame)}
					gapDeg={gapDeg}
					frost={frost}
					beat={beat}
					coreGlow={coreGlow}
					coreOpacity={coreOpacity}
					tighten={tighten}
					bodyDash={bodyDash}
					squash={squash}
					opacity={opacity}
					bodyStroke={0.045}
				/>
			</World>
			<Progress frame={frame} />
		</AbsoluteFill>
	);
};
