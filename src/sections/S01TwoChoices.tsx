import React from 'react';
import {useCurrentFrame} from 'remotion';
import {useCamera, WorldHtml, WorldSvg, worldToScreen} from '../camera/Camera';
import {ForkTree} from '../components/Fork';
import {ParticleBurst, Shockwave, UnknownCloud} from '../components/Fx';
import {Glow} from '../components/Glow';
import {GlowLine} from '../components/GlowLine';
import {LightNode} from '../components/LightNode';
import {HudCounter} from '../components/HudCounter';
import {SlamText} from '../components/QuoteCard';
import {clamp01, crossings, easeInOut, easeOut, ellipsePoint, prog, quadPath, quadPoint} from '../components/geometry';
import {KEYWORDS, LABELS} from '../data/script';
import {at, section} from '../data/timeline';
import {OrbitBeing} from '../motif/OrbitBeing';
import {ORBIT_ENTRY, ORBIT_HOME, orbitTheta} from '../motif/orbitTimeline';
import {fonts, palette} from '../theme';
import type {Direction} from './direction';

/* ── 世界坐标布局 ─────────────────────────────── */
const ORIGIN = {x: 0, y: 0};
const L = {x: ORBIT_HOME.cx, y: ORBIT_HOME.cy - ORBIT_HOME.ry};
const R = {x: 380, y: -40};
const LC = {x: -190, y: -95};
const RC = {x: 190, y: -95};
const EXT_END = {x: 720, y: 250};
const EXT_C = {x: 640, y: -10};
const LEFT = quadPath(ORIGIN, LC, L);
const RIGHT = quadPath(ORIGIN, RC, R);
const EXT = quadPath(R, EXT_C, EXT_END);
const PAIN_LABEL = {x: -400, y: -112};
const CHANGE_LABEL = {x: 400, y: -112};
const FAMILIAR_LABEL = {x: -380, y: -150};
const UNKNOWN_LABEL = {x: 470, y: 110};

/** 被“刮”的位置：轨道右下方 */
const SCRATCH = Math.PI / 4;

/* ── 时间（全部挂在字幕屏上） ───────────────────── */
const A = at('s01-01');
const B = at('s01-02');
const C = at('s01-03');
const D = at('s01-04');
const E = at('s01-05');
const END = section('s01').endFrame;

export const T1 = {
	dotPop: A + 6,
	branch: [A + 12, A + 52] as const,
	nodes: [A + 50, A + 54] as const,
	labels: A + 44,
	dissolve: B,
	orbitDraw: [B + 6, B + 56] as const,
	slam: B + 20,
	dashSwap: [B + 8, B + 28] as const,
	ext: [B + 18, B + 58] as const,
	unknownLabel: B + 26,
	fizz: [B + 40, C + 30] as const,
	fizzOut: [C + 8, C + 64] as const,
	hesitate: [C, C + 14] as const,
	slide: [C + 14, ORBIT_ENTRY] as const,
	toFar: [E + 24, END + 4] as const,
};

/** 光点每次经过伤痕处的帧（画面变暗和闷声脉冲共用） */
export const SCRATCH_PASSES = crossings(orbitTheta, SCRATCH, D - 6, END + 6);
const TOP_PASSES = crossings(orbitTheta, -Math.PI / 2, ORBIT_ENTRY + 2, END + 200);

const sinceLast = (frame: number, list: number[]) => {
	let last = -Infinity;
	for (const f of list) if (f <= frame) last = f;
	return frame - last;
};

export const S01TwoChoices: React.FC = () => {
	const frame = useCurrentFrame();
	const cam = useCamera();
	if (frame >= END) return null;

	/* 分叉 */
	const branchP = prog(frame, T1.branch[0], T1.branch[1], easeInOut);
	const swap = prog(frame, T1.dashSwap[0], T1.dashSwap[1]);
	const forkFade = 1 - prog(frame, D, E, easeInOut);

	/* 轨道 */
	const draw = prog(frame, T1.orbitDraw[0], T1.orbitDraw[1], easeInOut);
	const far = prog(frame, T1.toFar[0], T1.toFar[1], easeInOut);
	const scarAmount = SCRATCH_PASSES.reduce((acc, p) => acc + (frame >= p ? 0.55 * (1 - Math.exp(-(frame - p) / 5)) : 0), 0);

	/* 光点 */
	let dotP = ORIGIN;
	let dotScale = 1;
	let dotTheta: number | undefined;
	if (frame < T1.hesitate[1]) {
		const h = prog(frame, T1.hesitate[0], T1.hesitate[1]);
		const wobble = Math.sin(h * Math.PI);
		dotP = {x: ORIGIN.x + 14 * wobble, y: ORIGIN.y};
		dotScale = 1 - 0.22 * wobble + 0.08 * Math.sin(h * Math.PI * 2);
	} else if (frame < ORBIT_ENTRY) {
		dotP = quadPoint(ORIGIN, LC, L, prog(frame, T1.slide[0], T1.slide[1], easeInOut));
	} else {
		dotTheta = orbitTheta(frame);
		dotP = ellipsePoint(ORBIT_HOME, dotTheta);
	}
	const sincePass = sinceLast(frame, SCRATCH_PASSES);
	const dotBrightness = (1 - 0.55 * Math.exp(-Math.max(0, sincePass) / 7)) * (1 - 0.25 * far);
	// 入轨即第 01 圈，之后每过一次顶点滚到下一个数
	const passed = TOP_PASSES.filter((f) => f <= frame).length;
	const loopValue = passed === 0 ? 1 : passed + clamp01(sinceLast(frame, TOP_PASSES) / 8);

	/* 标签 */
	const labelIn = prog(frame, T1.labels, T1.labels + 16);
	const labelOut = 1 - prog(frame, T1.dissolve, T1.dissolve + 6);
	const familiarOut = 1 - prog(frame, D + 6, D + 30);
	const unknownOut = 1 - prog(frame, C + 20, C + 46);
	const loopPos = worldToScreen(cam, -700, -70);

	return (
		<>
			{/* 远处的未知：暗粒子云 + 熄灭的分叉 */}
			<Glow outer={false} opacity={0.75 * forkFade}>
				<WorldSvg>
					<UnknownCloud x={780} y={320} w={360} h={260} opacity={prog(frame, B + 24, B + 60) * (1 - prog(frame, D, E))} chaos={1.2} />
					<ForkTree
						origin={EXT_END}
						angle={28}
						length={110}
						depth={4}
						spread={30}
						seed="unknown"
						progress={prog(frame, T1.fizz[0], T1.fizz[1], easeOut)}
						dissolve={prog(frame, T1.fizzOut[0], T1.fizzOut[1])}
						color={palette.goldDim}
						nodeColor={palette.goldDim}
						dash={[0.06, 0.05]}
						width={1.1}
						nodes={false}
					/>
					<GlowLine d={RIGHT} progress={branchP} color={palette.goldDim} dash={[0.035, 0.03]} opacity={0.75 * swap} />
					<GlowLine d={EXT} progress={prog(frame, T1.ext[0], T1.ext[1], easeOut)} color={palette.goldDim} dash={[0.025, 0.025]} opacity={0.6} />
				</WorldSvg>
			</Glow>

			{/* 分叉的两条金线 */}
			<Glow opacity={forkFade}>
				<WorldSvg>
					<GlowLine d={LEFT} progress={branchP} />
					<GlowLine d={RIGHT} progress={branchP} opacity={1 - swap} />
					<ParticleBurst x={PAIN_LABEL.x} y={PAIN_LABEL.y} w={90} h={40} f0={T1.dissolve} seed="pain" />
					<ParticleBurst x={CHANGE_LABEL.x} y={CHANGE_LABEL.y} w={90} h={40} f0={T1.dissolve} seed="change" />
					<ParticleBurst x={UNKNOWN_LABEL.x} y={UNKNOWN_LABEL.y} w={170} h={50} f0={T1.unknownLabel - 22} mode="gather" color={palette.goldDim} seed="unk" />
					<ParticleBurst x={UNKNOWN_LABEL.x} y={UNKNOWN_LABEL.y} w={170} h={50} f0={C + 22} color={palette.goldDim} seed="unk2" />
				</WorldSvg>
			</Glow>

			{/* 贯穿物件：轨道 + 光点 */}
			<OrbitBeing
				e={ORBIT_HOME}
				draw={draw}
				strength={1 - 0.08 * clamp01(scarAmount)}
				far={far}
				scars={[{theta: SCRATCH, width: 0.42, amount: Math.min(1, scarAmount)}]}
				dot={frame >= T1.dotPop ? {p: dotP, scale: dotScale, brightness: dotBrightness, theta: dotTheta, tail: dotTheta !== undefined ? 0.55 : 0} : null}
			/>
			{/* 两端节点 */}
			<Glow opacity={forkFade}>
				<WorldSvg>
					<LightNode x={L.x} y={L.y} r={4.5} appear={T1.nodes[0]} />
					<LightNode x={R.x} y={R.y} r={4.5} appear={T1.nodes[1]} brightness={1 - 0.6 * swap} core={swap > 0.5 ? palette.goldDim : palette.goldHi} />
					{SCRATCH_PASSES.map((p) => (
						<ParticleBurst key={p} x={ellipsePoint(ORBIT_HOME, SCRATCH).x} y={ellipsePoint(ORBIT_HOME, SCRATCH).y} w={20} h={10} f0={p} count={14} speed={1.3} life={22} color={palette.goldDim} seed={`scar${p}`} />
					))}
					<Shockwave e={{...ORBIT_HOME, rx: 120, ry: 48, cx: FAMILIAR_LABEL.x, cy: FAMILIAR_LABEL.y + 10}} f0={T1.slam} grow={5} dur={36} />
				</WorldSvg>
			</Glow>

			{/* 世界里的文字 */}
			<WorldHtml x={PAIN_LABEL.x} y={PAIN_LABEL.y} scaleExp={0.5} style={{opacity: labelIn * labelOut}}>
				<Label text={LABELS.pain} />
			</WorldHtml>
			<WorldHtml x={CHANGE_LABEL.x} y={CHANGE_LABEL.y} scaleExp={0.5} style={{opacity: labelIn * labelOut}}>
				<Label text={LABELS.change} />
			</WorldHtml>
			<WorldHtml x={FAMILIAR_LABEL.x} y={FAMILIAR_LABEL.y} scaleExp={0.55}>
				<SlamText text={KEYWORDS['s01-02'] ?? LABELS.familiarPain} impact={T1.slam} size={62} opacity={familiarOut} />
			</WorldHtml>
			<WorldHtml x={UNKNOWN_LABEL.x} y={UNKNOWN_LABEL.y} scaleExp={0.55}>
				<SlamText text={LABELS.unknownRoad} impact={T1.unknownLabel} size={50} color={palette.goldDim} outer={false} fall={6} opacity={unknownOut} />
			</WorldHtml>

			{/* 前景 HUD：绕圈计数 */}
			<HudCounter
				x={loopPos.x}
				y={loopPos.y}
				label={LABELS.loopCn}
				labelEn={LABELS.loop}
				appear={ORBIT_ENTRY}
				value={loopValue}
				digits={2}
				numberSize={52}
				opacity={1 - far}
			/>
		</>
	);
};

const Label: React.FC<{text: string}> = ({text}) => (
	<div style={{fontFamily: fonts.sansCn, fontWeight: 400, fontSize: 40, color: palette.text, letterSpacing: '0.12em'}}>{text}</div>
);

/* ── 调度：镜头 / 光线 / 冲击 / 音效 ─────────────── */
export const s01Direction: Direction = {
	camera: [
		{f: A, x: 0, y: -10, z: 1.22, r: 0},
		{f: A + 70, x: 0, y: -20, z: 1.3, r: -0.6},
		{f: B + 40, x: -90, y: 0, z: 1.34, r: 0.4},
		{f: C + 10, x: -140, y: 20, z: 1.36, r: 0.8},
		{f: ORBIT_ENTRY + 28, x: -380, y: 80, z: 1.95, r: 0},
		{f: D + 58, x: -372, y: 86, z: 2.2, r: -1.6},
		{f: E + 62, x: 300, y: -30, z: 1.0, r: 0},
	],
	kicks: [{f: T1.slam, zoom: 0.03, decay: 10}],
	light: [
		{f: A, alpha: 0, cx: 0.5, cy: 0.48, vignette: 0.72},
		{f: A + 12, alpha: 0.05, cx: 0.5, cy: 0.48, vignette: 0.72},
		{f: T1.slam, alpha: 0.056, cx: 0.45, cy: 0.46, vignette: 0.72},
		{f: ORBIT_ENTRY, alpha: 0.05, cx: 0.44, cy: 0.5, vignette: 0.76},
		{f: D, alpha: 0.044, cx: 0.5, cy: 0.5, vignette: 0.82},
		{f: E + 50, alpha: 0.05, cx: 0.56, cy: 0.46, vignette: 0.72},
	],
	flashes: [{f: T1.slam, amount: 0.014, decay: 16}],
	impulses: [{f: T1.slam, x: 560, y: 340, strength: 40}],
	cues: [
		{f: T1.dotPop, name: 'impact_soft', volume: 0.7},
		{f: T1.nodes[0], name: 'click_soft', volume: 0.6},
		{f: T1.nodes[1], name: 'click_soft', volume: 0.5},
		{f: T1.dissolve, name: 'whoosh', volume: 0.55},
		{f: T1.slam, name: 'impact_soft', volume: 0.9},
		{f: T1.orbitDraw[1], name: 'click_soft', volume: 0.5},
		{f: T1.slide[0], name: 'whoosh_down', volume: 0.6},
		{f: ORBIT_ENTRY, name: 'impact_soft', volume: 0.55},
		...SCRATCH_PASSES.filter((p) => p >= D - 2 && p < E + 30).map((f) => ({f, name: 'pulse_low' as const, volume: 0.75})),
		{f: E + 2, name: 'whoosh_long', volume: 0.6},
	],
};
