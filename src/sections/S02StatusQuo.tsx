import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {px, useCamera, WorldHtml, WorldSvg} from '../camera/Camera';
import {ParticleBurst, Shockwave, UnknownCloud} from '../components/Fx';
import {Glow} from '../components/Glow';
import {GlowLine} from '../components/GlowLine';
import {HudCounter} from '../components/HudCounter';
import {LightNode} from '../components/LightNode';
import {MonoType, monoTypeFrames, QuoteCard, SlamText} from '../components/QuoteCard';
import {
	crossings,
	easeInOut,
	easeOut,
	type Ellipse,
	ellipsePoint,
	lerpEllipse,
	lerpPt,
	prog,
	type Pt,
	quadPath,
	quadThrough,
	TAU,
	wobble,
} from '../components/geometry';
import {KEYWORDS, LABELS} from '../data/script';
import {at, section} from '../data/timeline';
import {OrbitBeing} from '../motif/OrbitBeing';
import {ORBIT_HOME, orbitTheta} from '../motif/orbitTimeline';
import {fonts, palette} from '../theme';
import type {Direction} from './direction';

/* ── 时间 ──────────────────────────────────── */
const CARD_IN = at('s01-05', 18);
const G = at('s02-01');
const H = at('s02-02');
const I = at('s02-03');
const J = at('s02-04');
const K = at('s02-05');
const L = at('s02-06');
const M = at('s02-07');
const START = section('s02').startFrame;
const END = section('s02').endFrame;

const T2 = {
	slam: G + 10,
	typeStart: G + 24,
	quoteStart: G + 52,
	cardOut: [H + 8, H + 28] as const,
	fromFar: [H, H + 34] as const,
	predict: [I, J] as const,
	counter: [I + 6, I + 52] as const,
	flatten: [J, J + 30] as const,
	ticks: [J + 30, J + 36, J + 42] as const,
	bar50: [K + 4, K + 40] as const,
	bar0: [L + 4, L + 28] as const,
	bar100: [L + 12, L + 36] as const,
	curve: [L + 36, L + 66] as const,
	slam2: M + 8,
	lift: [M + 24, M + 56] as const,
	reinflate: [M + 24, M + 60] as const,
	dotReturn: [M + 30, M + 62] as const,
	halo: [M + 40, M + 70] as const,
};

/* ── 世界坐标布局 ───────────────────────────── */
const CARD = {x: 330, y: -40};
const FLAT: Ellipse = {cx: ORBIT_HOME.cx, cy: ORBIT_HOME.cy, rx: 420, ry: 3, rot: 0};
const AXIS_Y = ORBIT_HOME.cy;
const X0 = ORBIT_HOME.cx - 330;
const X50 = ORBIT_HOME.cx;
const X100 = ORBIT_HOME.cx + 330;
const H50 = 300;
const H0 = 70;
const H100 = 90;
const BAR_W = 56;

/** 预测环：每一圈开始的帧 */
const THETA_I = orbitTheta(I);
const LAP_STARTS = [I, ...crossings(orbitTheta, THETA_I, I, J)];
const QUADRANTS = [-Math.PI / 2, -Math.PI, (-3 * Math.PI) / 2, 0];
const QUAD_PASSES = QUADRANTS.map((q) => crossings(orbitTheta, q, I, J));

const lastBefore = (frame: number, list: number[]) => {
	let last = -Infinity;
	for (const f of list) if (f <= frame) last = f;
	return last;
};

/** 线条语言画的柱子：两条竖边 + 顶边 + 横向细纹；chaos 让线变乱变密 */
const Bar: React.FC<{x: number; h: number; chaos?: number; bright?: boolean}> = ({x, h, chaos = 0, bright = false}) => {
	const frame = useCurrentFrame();
	const cam = useCamera();
	if (h < 1) return null;
	const top = AXIS_Y - h;
	const l = x - BAR_W / 2;
	const r = x + BAR_W / 2;
	const j = (s: number) => chaos * 5 * wobble(s, frame * 0.6);
	const outline = (s: number) => `M${l + j(s)} ${AXIS_Y} L${l + j(s + 1)} ${top + j(s + 2)} L${r + j(s + 3)} ${top + j(s + 4)} L${r + j(s + 5)} ${AXIS_Y}`;
	const step = chaos > 0.3 ? 9 : 16;
	const hatches = [];
	for (let y = AXIS_Y - step; y > top + 4; y -= step) {
		hatches.push(<path key={y} d={`M${l + 6} ${y + j(y)} L${r - 6} ${y + j(y + 9)}`} stroke={palette.goldDim} strokeWidth={px(cam, 1)} opacity={0.55} fill="none" />);
	}
	return (
		<g>
			<path d={outline(1)} fill="none" stroke={bright ? palette.goldHi : palette.gold} strokeWidth={px(cam, 1.6)} strokeLinejoin="round" />
			{chaos > 0.05 ? (
				<>
					<path d={outline(11)} fill="none" stroke={palette.gold} strokeWidth={px(cam, 1)} opacity={0.5 * chaos} />
					<path d={outline(23)} fill="none" stroke={palette.goldDim} strokeWidth={px(cam, 1)} opacity={0.6 * chaos} />
				</>
			) : null}
			{hatches}
		</g>
	);
};

const Mono: React.FC<{text: string; size?: number; color?: string; opacity?: number}> = ({text, size = 13, color = palette.goldDim, opacity = 1}) => (
	<div style={{fontFamily: fonts.mono, fontSize: size, color, letterSpacing: '0.3em', opacity}}>{text}</div>
);

export const S02StatusQuo: React.FC = () => {
	const frame = useCurrentFrame();
	if (frame < CARD_IN || frame >= END) return null;

	/* 轨道形态：家 → 压扁成坐标轴 → 重新鼓起 */
	const flat = prog(frame, T2.flatten[0], T2.flatten[1], easeInOut);
	const re = prog(frame, T2.reinflate[0], T2.reinflate[1], easeInOut);
	const e = lerpEllipse(lerpEllipse(ORBIT_HOME, FLAT, flat), ORBIT_HOME, re);
	const far = frame < H ? 1 : 1 - prog(frame, T2.fromFar[0], T2.fromFar[1], easeInOut);
	const inChart = frame >= J && frame < T2.dotReturn[1];

	/* 光点 */
	const theta = orbitTheta(frame);
	const onOrbit = ellipsePoint(e, theta);
	const h50 = H50 * easeOut(prog(frame, T2.bar50[0], T2.bar50[1])) * (1 - prog(frame, T2.lift[0], T2.lift[1], easeInOut));
	const chartPos: Pt = {x: X50, y: AXIS_Y - h50};
	let dotP = onOrbit;
	if (inChart) {
		const detach = prog(frame, J, J + 26, easeInOut);
		const back = prog(frame, T2.dotReturn[0], T2.dotReturn[1], easeInOut);
		dotP = lerpPt(lerpPt(onOrbit, chartPos, detach), onOrbit, back);
	}
	const stress = prog(frame, T2.bar50[0], T2.bar50[1]) * (1 - prog(frame, T2.lift[0], T2.lift[1]));

	/* 预测环 */
	const inPredict = frame >= I - 4 && frame < J + 20;
	const lapStartF = lastBefore(frame, LAP_STARTS);
	const lapIdx = LAP_STARTS.indexOf(lapStartF);
	const lapTheta = THETA_I - lapIdx * TAU;
	const reveal = easeOut(prog(frame, lapStartF, lapStartF + 12));
	const predOpacity = prog(frame, I, I + 6) * (1 - prog(frame, J, J + 14));
	const ticks = QUADRANTS.map((q, i) => ({theta: q, lit: Math.exp(-Math.max(0, frame - lastBefore(frame, QUAD_PASSES[i])) / 10)}));

	/* 柱状图 */
	const shrink = 1 - prog(frame, T2.lift[0], T2.lift[0] + 28, easeInOut);
	const h0 = H0 * easeOut(prog(frame, T2.bar0[0], T2.bar0[1])) * shrink;
	const h100 = H100 * easeOut(prog(frame, T2.bar100[0], T2.bar100[1])) * shrink;
	const lift = prog(frame, T2.lift[0], T2.lift[1], easeInOut);
	const p0 = {x: X0, y: AXIS_Y - H0};
	const p50 = {x: X50, y: AXIS_Y - H50};
	const p100 = {x: X100, y: AXIS_Y - H100};
	const chartOpacity = prog(frame, J + 20, J + 34) * (1 - prog(frame, M + 20, M + 44));

	const cardOpacity = 1 - prog(frame, T2.cardOut[0], T2.cardOut[1]);
	const slam2Out = 1 - prog(frame, M + 52, M + 76);

	return (
		<>
			{/* 未知区：轨道右侧一团乱漂的暗粒子 */}
			<Glow outer={false} opacity={0.8}>
				<WorldSvg>
					<UnknownCloud x={70} y={60} w={240} h={220} opacity={prog(frame, I + 10, I + 40) * (1 - prog(frame, J, J + 20))} chaos={1.3} seed="uc2" />
				</WorldSvg>
			</Glow>
			<WorldHtml x={70} y={-70} scaleExp={0.3} style={{opacity: prog(frame, I + 20, I + 40) * (1 - prog(frame, J, J + 20))}}>
				<Mono text={LABELS.unknownEn} />
			</WorldHtml>

			{/* 柱状图（压扁的轨道就是横轴） */}
			<Glow opacity={chartOpacity}>
				<WorldSvg>
					<Bar x={X0} h={h0} />
					<Bar x={X50} h={h50} chaos={stress} bright />
					<Bar x={X100} h={h100} />
					<GlowLine
						d={quadPath(p0, quadThrough(p0, p50, p100), p100)}
						progress={prog(frame, T2.curve[0], T2.curve[1], easeInOut)}
						color={palette.goldHi}
						width={1.6}
						opacity={1 - lift}
					/>
					{T2.ticks.map((f, i) => (
						<LightNode key={i} x={[X0, X50, X100][i]} y={AXIS_Y} r={3.5} appear={f} />
					))}
				</WorldSvg>
			</Glow>
			{[X0, X50, X100].map((x, i) => (
				<WorldHtml key={i} x={x} y={AXIS_Y + 36} scaleExp={0.4} style={{opacity: prog(frame, T2.ticks[i], T2.ticks[i] + 10) * chartOpacity}}>
					<div
						style={{
							fontFamily: fonts.number,
							fontWeight: 600,
							fontSize: 30,
							color: i === 1 && frame >= K ? palette.goldHi : palette.goldDim,
						}}
					>
						{[LABELS.tick0, LABELS.tick50, LABELS.tick100][i]}
					</div>
				</WorldHtml>
			))}
			{[X0, X50, X100].map((x, i) => (
				<WorldHtml
					key={`c${i}`}
					x={x}
					y={AXIS_Y + 72}
					scaleExp={0.3}
					style={{opacity: (i === 1 ? prog(frame, K + 40, K + 54) : prog(frame, L + 30, L + 44)) * chartOpacity}}
				>
					<Mono text={i === 1 ? LABELS.uncertainEn : LABELS.certainEn} size={12} color={i === 1 ? palette.gold : palette.goldDim} />
				</WorldHtml>
			))}
			<WorldHtml x={X50 + 150} y={AXIS_Y - H50 - 10} scaleExp={0.3} style={{opacity: prog(frame, K + 30, K + 44) * (1 - prog(frame, M - 6, M + 6)) * chartOpacity}}>
				<div style={{fontFamily: fonts.sansCn, fontSize: 20, color: palette.text, letterSpacing: '0.1em'}}>{LABELS.stress}</div>
				<Mono text={LABELS.stressEn} size={10} />
			</WorldHtml>

			{/* 贯穿物件（从本节开始接手，上一节画到本节开始前一帧） */}
			{frame >= START ? (
			<OrbitBeing
				e={e}
				far={far}
				strength={frame < J ? 0.72 : 0.85}
				dim={frame < J ? 0.15 : 0}
				halo={{expand: 40, opacity: prog(frame, T2.halo[0], T2.halo[1], easeOut) * 0.9}}
				prediction={inPredict ? {from: theta, to: theta - (theta - (lapTheta - TAU)) * reveal, opacity: predOpacity} : null}
				trail={inPredict ? {from: lapTheta, to: theta, opacity: 0.85 * predOpacity} : null}
				ticks={inPredict ? ticks.map((t) => ({...t, lit: t.lit * predOpacity})) : []}
				dot={{
					p: dotP,
					theta: inChart ? undefined : theta,
					tail: inChart ? 0 : 0.55,
					brightness: far > 0.5 ? 0.75 : 0.9 + 0.3 * stress,
					scale: 1 + 0.25 * stress,
				}}
			/>
			) : null}

			{/* 冲击波 */}
			<Glow>
				<WorldSvg>
					<Shockwave e={{cx: CARD.x, cy: CARD.y - 80, rx: 260, ry: 80, rot: 0}} f0={T2.slam} grow={6} dur={44} />
					<Shockwave e={{cx: X50, cy: AXIS_Y - H50, rx: 70, ry: 26, rot: 0}} f0={T2.slam2} grow={8} dur={40} />
					<ParticleBurst x={X50} y={AXIS_Y - H50} w={30} h={20} f0={T2.slam2} count={40} speed={3} seed="stress" />
				</WorldSvg>
			</Glow>

			{/* 引言卡 */}
			{frame < T2.cardOut[1] ? (
				<WorldHtml x={CARD.x} y={CARD.y} scaleExp={1}>
					<QuoteCard
						title={KEYWORDS['s02-01']}
						en={LABELS.statusQuoEn}
						quote={LABELS.statusQuoQuote}
						slam={T2.slam}
						typeStart={T2.typeStart}
						quoteStart={T2.quoteStart}
						dividerStart={CARD_IN}
						opacity={cardOpacity}
					/>
				</WorldHtml>
			) : null}

			{/* 前景 HUD（屏幕坐标） */}
			<AbsoluteFill style={{pointerEvents: 'none'}}>
				<HudCounter
					x={1500}
					y={250}
					label={LABELS.nowState}
					labelEn={LABELS.nowStateEn}
					appear={H + 30}
					bar={0.5 * easeOut(prog(frame, H + 34, H + 58))}
					opacity={1 - prog(frame, I - 6, I + 6)}
				/>
				<HudCounter
					x={1500}
					y={250}
					label={LABELS.predictable}
					labelEn={LABELS.predictableEn}
					appear={I + 2}
					value={100 * easeOut(prog(frame, T2.counter[0], T2.counter[1]))}
					digits={3}
					numberSize={88}
					opacity={1 - prog(frame, J + 6, J + 20)}
				/>
				<HudCounter
					x={110}
					y={300}
					label={LABELS.shockProb}
					labelEn={LABELS.shockProbEn}
					appear={J + 34}
					opacity={1 - prog(frame, M + 40, M + 64)}
				/>
				<div style={{position: 'absolute', right: 64, top: 64, textAlign: 'right', opacity: prog(frame, J + 10, J + 26) * (1 - prog(frame, M + 56, M + 72))}}>
					<Mono text={LABELS.citation} size={13} />
				</div>
				<div style={{position: 'absolute', left: 1436, top: 104, opacity: 1 - prog(frame, END - 30, END)}}>
					<MonoType text={LABELS.formulaStress} start={M + 18} cps={0.9} size={18} color={palette.goldDim} />
				</div>
				{frame >= T2.slam2 - 12 ? (
					<div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center'}}>
						<SlamText text={KEYWORDS['s02-07']} impact={T2.slam2} size={150} opacity={slam2Out} />
					</div>
				) : null}
			</AbsoluteFill>
		</>
	);
};

/* ── 调度 ──────────────────────────────────── */
export const s02Direction: Direction = {
	camera: [
		{f: G + 110, x: 345, y: -40, z: 1.07, r: 0.5},
		{f: H + 50, x: -380, y: 80, z: 2.5, r: -0.5},
		{f: I + 20, x: -385, y: 78, z: 2.6, r: -1.0},
		{f: I + 70, x: -180, y: 60, z: 1.75, r: 0},
		{f: J + 60, x: -380, y: 20, z: 1.45, r: 0.3},
		{f: K + 60, x: -380, y: -30, z: 1.6, r: 0.8},
		{f: L + 70, x: -380, y: 0, z: 1.3, r: 0},
		{f: M + 76, x: -380, y: 60, z: 1.55, r: -0.8},
	],
	kicks: [
		{f: T2.slam, zoom: 0.035, decay: 9},
		{f: T2.slam2, zoom: 0.03, decay: 9},
	],
	light: [
		{f: G + 40, alpha: 0.07, cx: 0.56, cy: 0.44, vignette: 0.7},
		{f: H + 30, alpha: 0.05, cx: 0.5, cy: 0.52, vignette: 0.86},
		{f: I + 60, alpha: 0.05, cx: 0.55, cy: 0.5, vignette: 0.78},
		{f: J + 20, alpha: 0.055, cx: 0.48, cy: 0.56, vignette: 0.74},
		{f: K + 40, alpha: 0.068, cx: 0.5, cy: 0.45, vignette: 0.74},
		{f: L + 60, alpha: 0.055, cx: 0.5, cy: 0.5, vignette: 0.74},
		{f: M + 40, alpha: 0.05, cx: 0.5, cy: 0.5, vignette: 0.76},
	],
	flashes: [
		{f: T2.slam, amount: 0.03, decay: 18},
		{f: T2.bar50[1], amount: 0.01, decay: 12},
		{f: T2.slam2, amount: 0.02, decay: 14},
	],
	impulses: [
		{f: T2.slam, x: 1000, y: 420, strength: 80},
		{f: T2.slam2, x: 960, y: 300, strength: 50},
	],
	cues: [
		{f: T2.slam, name: 'impact_heavy', volume: 0.85},
		...monoTypeFrames(LABELS.statusQuoEn, T2.typeStart).map((f) => ({f, name: 'tick_type' as const, volume: 0.5})),
		{f: H + 2, name: 'whoosh_long', volume: 0.5},
		{f: H + 30, name: 'click_soft', volume: 0.4},
		...QUAD_PASSES.flat().map((f) => ({f, name: 'click_soft' as const, volume: 0.42})),
		{f: T2.counter[1] - 12, name: 'rise_soft', volume: 0.5},
		{f: J, name: 'whoosh', volume: 0.5},
		...T2.ticks.map((f) => ({f, name: 'click_soft' as const, volume: 0.45})),
		{f: T2.bar50[0], name: 'rise_soft', volume: 0.55},
		{f: T2.bar50[1], name: 'impact_soft', volume: 0.7},
		{f: T2.bar0[0], name: 'click_soft', volume: 0.4},
		{f: T2.bar100[0], name: 'click_soft', volume: 0.4},
		{f: T2.curve[0], name: 'whoosh', volume: 0.35},
		{f: T2.slam2, name: 'impact_heavy', volume: 0.7},
		{f: T2.lift[0] + 2, name: 'whoosh_down', volume: 0.45},
		{f: T2.dotReturn[1], name: 'click_soft', volume: 0.5},
	],
};
