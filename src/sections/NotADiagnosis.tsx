import React from 'react';
import {cue, cueList, screen} from '../data/script';
import {Card, CARD_H} from '../components/Card';
import {FallingTear} from '../components/tear/Tear';
import {Vessel} from '../components/tear/Vessel';
import {Splash} from '../components/tear/WaterLine';
import {Bubbles} from '../components/Particles';
import {clamp01, easeOut, lerp, mixColor, prog} from '../lib/anim';
import {S2_X, WATER_Y} from '../shot';
import {C, FONT} from '../theme';
import {TITLE, titleColor, titleWord} from './Opening';

/**
 * 第二节 · 先说清楚（第 4–8 屏）
 * 镜头沿水位线平移到新场景：标题缩成卡片 → 卡片下泪滴频频落下 →
 * 两张排除卡片从水里升起又沉下 → 主卡片变成带“门槛孔”的容器，与门槛更高的容器对比。
 */

const X = (lx: number) => S2_X + lx;
const MAIN = {x: 520, y: 470};
const MAIN_RIGHT = {x: 1270, y: 470};
const SIDE_A = {x: 330, y: 470};
const SIDE_B = {x: 800, y: 470};
const VESSEL_A = {x: 950, w: 240, h: 520, hole: 0.5};
const VESSEL_B = {x: 1350, w: 240, h: 520, hole: 0.82};
const CARD_TEXT = 50;
/** 排除卡片相对第 6 屏开始的升起延迟：等主卡片先移开，避免穿插 */
const SIDE_A_RISE = 4;
const SIDE_B_RISE = 16;
const DRIP_R = 13;

const t = () => ({
	s4: screen(4).startFrame,
	pan: cue(4, 'panEnd'),
	cardDraw: cue(4, 'cardDraw'),
	s5: screen(5).startFrame,
	drips: cueList(5, 'drip'),
	s6: screen(6).startFrame,
	sinkA: cue(6, 'sinkA'),
	s7: screen(7).startFrame,
	sinkB: cue(7, 'sinkB'),
	s8: screen(8).startFrame,
	fillStart: cue(8, 'fillStart'),
	thresholdHit: cue(8, 'thresholdHit'),
	leaks: cueList(8, 'leak'),
});

const mainCardPos = (f: number) => {
	const T = t();
	const m = prog(f, T.s6, T.s6 + 28);
	return {x: lerp(MAIN.x, MAIN_RIGHT.x, m), y: MAIN.y};
};

/** 排除卡片：从水下升起，到点变灰、沉回水里 */
const sideCard = (f: number, base: {x: number; y: number}, riseStart: number, sink: number) => {
	const rise = easeOut(prog(f, riseStart, riseStart + 30, (x) => x));
	let y = lerp(900, base.y, rise);
	const gray = prog(f, sink - 14, sink - 6);
	const tt = f - (sink - 6);
	// 在水下时几乎看不见，避免透到底部字幕区
	let opacity = 1 - prog(y, 640, 820, (x) => x);
	if (tt > 0) {
		const drop = WATER_Y - (base.y + CARD_H / 2);
		y += tt <= 6 ? drop * (tt / 6) ** 2 : drop + 320 * (1 - Math.exp(-(tt - 6) / 8));
		opacity = tt <= 6 ? 1 : Math.max(0, 1 - (tt - 6) / 24);
	}
	return {x: base.x, y, gray, opacity};
};

/** 容器水位：fillStart 开始上涨，thresholdHit 正好到达 A 的门槛孔 */
const levels = (f: number) => {
	const T = t();
	const base = 0.04;
	if (f < T.fillStart) return {a: base, b: base};
	if (f < T.thresholdHit) {
		const v = base + (VESSEL_A.hole - base) * ((f - T.fillStart) / (T.thresholdHit - T.fillStart));
		return {a: v, b: v};
	}
	const d = f - T.thresholdHit;
	return {
		a: VESSEL_A.hole + 0.025 * (1 - Math.exp(-d / 20)),
		b: VESSEL_A.hole + 0.13 * (1 - Math.exp(-d / 30)),
	};
};

const holeY = () => WATER_Y - VESSEL_A.h * VESSEL_A.hole;
const leakX = () => X(VESSEL_A.x + VESSEL_A.w / 2 + 11);

export const section2Splashes = (): Splash[] => {
	const T = t();
	return [
		...T.drips.map((d) => ({x: X(MAIN.x), frame: d, amp: 6, rings: true})),
		{x: X(SIDE_A.x), frame: T.s6 + SIDE_A_RISE + 7, amp: 5},
		{x: X(SIDE_B.x), frame: T.s6 + SIDE_B_RISE + 7, amp: 5},
		{x: X(SIDE_A.x), frame: T.sinkA, amp: 12, rings: true},
		{x: X(SIDE_B.x), frame: T.sinkB, amp: 12, rings: true},
		{x: X(VESSEL_B.x), frame: T.s8 + 23, amp: 6},
		...T.leaks.map((l) => ({x: leakX(), frame: l, amp: 6, rings: true})),
	];
};

/** drainAt：完整片里，第 9 屏容器 A 的水被“提”出来变成大泪滴（预览不传） */
export const NotADiagnosis: React.FC<{frame: number; drainAt?: number}> = ({frame: f, drainAt}) => {
	const T = t();
	if (f < T.s4) {
		return null;
	}

	// 标题 → 卡片文字
	const p = prog(f, T.s4, T.pan);
	const mc = mainCardPos(f);
	const tx = lerp(TITLE.x, X(mc.x), p);
	const ty = lerp(TITLE.baseline, mc.y + 18, p);
	const ts = lerp(1, CARD_TEXT / TITLE.size, p);
	const draw = prog(f, T.cardDraw, T.cardDraw + 24);
	const morph = prog(f, T.s8, T.s8 + 30);
	const textFade = 1 - prog(f, T.s8, T.s8 + 12);

	const a = sideCard(f, SIDE_A, T.s6 + SIDE_A_RISE, T.sinkA);
	const b = sideCard(f, SIDE_B, T.s6 + SIDE_B_RISE, T.sinkB);

	const lv = levels(f);
	if (drainAt !== undefined) {
		lv.a = lerp(lv.a, 0.015, prog(f, drainAt, drainAt + 16));
	}
	const marks = prog(f, T.s8 + 30, T.s8 + 48);
	const flashT = f - T.thresholdHit;
	const flash = flashT >= 0 && flashT < 30 ? Math.exp(-flashT / 9) : 0;
	// 等主卡片变形、让出位置后，对照容器 B 再升起，避免两者穿插
	const bRise = easeOut(prog(f, T.s8 + 22, T.s8 + 50, (x) => x));

	// 主卡片 → 容器 A 的几何插值
	const vx = lerp(mc.x, VESSEL_A.x, morph);
	const vw = lerp(380, VESSEL_A.w, morph);
	const vh = lerp(CARD_H, VESSEL_A.h, morph);
	const vcy = lerp(mc.y, WATER_Y - VESSEL_A.h / 2, morph);

	return (
		<g>
			<Bubbles frame={f} x0={X(-200)} x1={X(1900)} waterY={WATER_Y} count={34} opacity={prog(f, T.s4, T.pan)} />

			{/* 排除卡片（在水体遮罩之前画，沉下去时会被水罩住） */}
			{f >= T.s6 && a.opacity > 0 ? (
				<Card x={X(a.x)} y={a.y} label={screen(6).highlights[0].word} icon="knot" gray={a.gray} opacity={a.opacity} />
			) : null}
			{f >= T.s6 && b.opacity > 0 ? (
				<Card x={X(b.x)} y={b.y} label={screen(7).highlights[0].word} icon="brain" gray={b.gray} opacity={b.opacity} />
			) : null}
			{/* 对照容器 B 从水下升起 */}
			{f >= T.s8 ? (
				<Vessel
					frame={f}
					cx={X(VESSEL_B.x)}
					bottom={WATER_Y + (1 - bRise) * 560}
					width={VESSEL_B.w}
					height={VESSEL_B.h}
					level={lv.b}
					hole={VESSEL_B.hole}
					marks={marks}
					label={screen(8).highlights[0].word}
					dim={1}
					opacity={bRise}
					clipId="vesselB"
				/>
			) : null}
			{/* 水面以下的遮罩：让沉下去的卡片“进水” */}
			<rect
				x={-2000}
				y={WATER_Y + 2}
				width={9000}
				height={900}
				fill={C.bg}
				opacity={0.8 * prog(f, T.s4, T.s4 + 24) * (drainAt === undefined ? 1 : 1 - prog(f, drainAt, drainAt + 40))}
			/>

			{/* 主卡片 / 容器 A */}
			{morph < 1 ? (
				<g>
					{draw > 0 && morph === 0 ? (
						<Card
							x={X(vx)}
							y={vcy}
							label=""
							draw={draw}
							fill={draw}
							opacity={1}
						/>
					) : null}
					{morph > 0 ? (
						<rect
							x={X(vx) - vw / 2}
							y={vcy - vh / 2}
							width={vw}
							height={vh}
							rx={lerp(24, 18, morph)}
							fill={C.cardFill}
							fillOpacity={lerp(0.88, 0.1, morph)}
							stroke={C.figureRim}
							strokeWidth={3.5}
							strokeOpacity={0.85}
						/>
					) : null}
				</g>
			) : (
				<Vessel
					frame={f}
					cx={X(VESSEL_A.x)}
					bottom={WATER_Y}
					width={VESSEL_A.w}
					height={VESSEL_A.h}
					level={lv.a}
					hole={VESSEL_A.hole}
					marks={marks}
					flash={flash}
					label={screen(8).highlights[0].word}
					clipId="vesselA"
				/>
			)}
			{/* 标题文字飞进卡片 */}
			{textFade > 0 ? (
				<g transform={`translate(${morph > 0 ? X(vx) : tx},${morph > 0 ? vcy + 18 : ty}) scale(${ts})`} opacity={textFade}>
					<text
						x={0}
						y={0}
						textAnchor="middle"
						fontFamily={FONT}
						fontWeight={p < 1 ? 900 : 700}
						fontSize={TITLE.size}
						fill={mixColor(titleColor(), C.white, p)}
					>
						{titleWord()}
					</text>
				</g>
			) : null}

			{/* 卡片下的泪滴：一有情绪就掉 */}
			{T.drips.map((d) => {
				const pos = mainCardPos(d - 24);
				return (
					<FallingTear
						key={d}
						frame={f}
						x={X(pos.x)}
						y0={pos.y + CARD_H / 2}
						groundY={WATER_Y}
						r={DRIP_R}
						formStart={d - 24}
						detach={d - 11}
						land={d}
					/>
				);
			})}
			{/* 容器 A 门槛孔漏出的眼泪 */}
			{T.leaks.map((l) => (
				<FallingTear
					key={l}
					frame={f}
					x={leakX()}
					y0={holeY() - 4}
					groundY={WATER_Y}
					r={9}
					formStart={l - 22}
					detach={l - 16}
					land={l}
					hang={0.6}
				/>
			))}
			{/* 门槛被碰到时，孔口闪一下 */}
			{flash > 0 ? (
				<circle cx={X(VESSEL_A.x + VESSEL_A.w / 2)} cy={holeY()} r={26 * clamp01(flash + 0.2)} fill={C.blue} opacity={0.5 * flash} filter="url(#softGlow)" />
			) : null}
		</g>
	);
};
