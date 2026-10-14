import React from 'react';
import {cue, cueList, screen} from '../data/script';
import {BigWord} from '../components/BigWord';
import {Eye} from '../components/Eye';
import {Burst, Bubbles} from '../components/Particles';
import {FallingTear, Tear} from '../components/tear/Tear';
import {Splash} from '../components/tear/WaterLine';
import {clamp01, easeInOut, easeOut, lerp, prog, rand} from '../lib/anim';
import {S2_X, S3_X, WATER_Y} from '../shot';
import {C, FONT} from '../theme';

/**
 * 第三节 · 眼泪走快车道（第 9–19 屏）
 * 容器 A 的水被提成一颗大泪滴，镜头跟着它甩到新场景 → 分成三种眼泪 →
 * 情绪泪缩成光点，在路线图上和“说话”的弯路赛跑 → “比嘴快一步”砸下。
 */

const X = (lx: number) => S3_X + lx;
const TEARS_Y = 380;
const TEAR_XS = [420, 960, 1500];
const EYE_Y = 610;
const BRAIN = {x: 230, y: 470};
const LOW_Y = 560;
const LOW_X0 = 330;
const LOW_X1 = 1615;
const MAP_EYE = {x: 1720, y: 525, w: 210, h: 92};
const GATE_X = 900;
/** 说话那条弯路：分段三次贝塞尔（局部坐标） */
const UPPER: [number, number][][] = [
	[[260, 420], [330, 180], [480, 160], [520, 260]],
	[[520, 260], [560, 360], [700, 380], [800, 250]],
	[[800, 250], [900, 120], [980, 120], [1060, 240]],
	[[1060, 240], [1140, 360], [1240, 360], [1300, 230]],
	[[1300, 230], [1340, 150], [1420, 150], [1470, 250]],
];
/** 路标：取弯路上的点（贝塞尔段的终点） */
const WAYPOINTS: {label: string; at: [number, number]}[] = [
	{label: '想清楚', at: [520, 260]},
	{label: '组织语言', at: [1060, 240]},
	{label: '开口', at: [1470, 250]},
];

const bez = (p: [number, number][], t: number): [number, number] => {
	const u = 1 - t;
	return [
		u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
		u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
	];
};

/** 弯路折线（按弧长参数化） */
const upperPoly = (() => {
	const pts: [number, number][] = [];
	UPPER.forEach((seg, i) => {
		for (let k = i === 0 ? 0 : 1; k <= 40; k++) pts.push(bez(seg, k / 40));
	});
	const len = [0];
	for (let i = 1; i < pts.length; i++) {
		len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
	}
	return {pts, len, total: len[len.length - 1]};
})();

const upperAt = (u: number): [number, number] => {
	const target = clamp01(u) * upperPoly.total;
	const {pts, len} = upperPoly;
	for (let i = 1; i < pts.length; i++) {
		if (len[i] >= target) {
			const k = (target - len[i - 1]) / (len[i] - len[i - 1] || 1);
			return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
		}
	}
	return pts[pts.length - 1];
};

const upperD = upperPoly.pts.map((p, i) => `${i ? 'L' : 'M'} ${X(p[0]).toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

const t = () => ({
	s9: screen(9).startFrame,
	rise: cue(9, 'rise'),
	split: cue(9, 'split'),
	s10: screen(10).startFrame,
	film: cue(10, 'film'),
	s11: screen(11).startFrame,
	wash: cue(11, 'wash'),
	s12: screen(12).startFrame,
	grow: cue(12, 'grow'),
	s13: screen(13).startFrame,
	depart: cue(13, 'depart'),
	s14: screen(14).startFrame,
	arrive: cue(14, 'arrive'),
	s15: screen(15).startFrame,
	pass: cue(15, 'pass'),
	s16: screen(16).startFrame,
	marks: cueList(16, 'marks'),
	s17: screen(17).startFrame,
	go: cue(17, 'go'),
	s18: screen(18).startFrame,
	hit: cue(18, 'hit'),
	s19: screen(19).startFrame,
	slam: cue(19, 'slam'),
	s20: screen(20).startFrame,
});

/** 赛跑中白点（说话）沿弯路的进度 */
const whiteU = (f: number) => {
	const T = t();
	return clamp01((f - T.go) / 260);
};

export const fastLaneSplashes = (): Splash[] => {
	const T = t();
	return [
		{x: X(MAP_EYE.x), frame: T.hit + 18, amp: 9, rings: true},
		{x: X(700), frame: T.s20 - 4, amp: 10, rings: true},
	];
};

const Dot: React.FC<{x: number; y: number; color: string; r?: number}> = ({x, y, color, r = 11}) => (
	<g>
		<circle cx={x} cy={y} r={r * 2.4} fill={color} opacity={0.35} filter="url(#softGlow)" />
		<circle cx={x} cy={y} r={r} fill={color} />
	</g>
);

export const FastLane: React.FC<{frame: number}> = ({frame: f}) => {
	const T = t();
	if (f < T.rise - 2 || f > T.s20 + 30) return null;

	// ---------- 第 9 屏：大泪滴升起、飞行、分成三颗 ----------
	const riseP = easeOut(prog(f, T.rise, T.rise + 16, (x) => x));
	const flyP = prog(f, T.rise + 16, T.split);
	const splitP = prog(f, T.split, T.s10);
	const bigR = lerp(18, 55, riseP);
	const bigX = lerp(S2_X + 950, X(960), flyP);
	const bigY = lerp(lerp(640, 420, riseP), TEARS_Y, flyP);

	// ---------- 第 10–12 屏：三种眼泪 ----------
	const eyesIn = prog(f, T.s10, T.s10 + 18);
	const eyesOut = prog(f, T.s12, T.s12 + 30);
	const focus = (i: number) => {
		if (f < T.s10) return 1;
		if (f < T.s11) return i === 0 ? 1 : 0.35;
		if (f < T.s12) return i === 1 ? 1 : 0.35;
		return i === 2 ? 1 : 0.35;
	};
	// 基础泪：落到眼睛上化成水膜
	const melt = prog(f, T.s10, T.film + 4);
	const film0 = prog(f, T.film, T.film + 12) * (1 - eyesOut);
	// 反射泪：灰尘飘向眼睛，泪滴落下冲开
	const washP = prog(f, T.wash - 12, T.wash);
	const film1 = prog(f, T.wash, T.wash + 10) * (1 - eyesOut);
	// 情绪泪：放大到中央
	const growP = prog(f, T.grow, T.grow + 32);
	const shrinkP = prog(f, T.s13, T.depart);

	// ---------- 第 13 屏起：路线图 ----------
	const mapIn = prog(f, T.s13, T.s13 + 26);
	const mapDim = 1 - 0.7 * prog(f, T.s19, T.s19 + 14);
	const mapOut = 1 - prog(f, T.s20 - 16, T.s20 + 10);
	const mapOp = mapIn * mapDim * mapOut;
	const lowDraw = prog(f, T.s13 + 4, T.depart);
	const upperDraw = prog(f, T.s16, T.s16 + 62);
	// 情绪泪光点沿直路到眼睛
	const dot1 = prog(f, T.depart, T.arrive, easeInOut);
	const arrived = prog(f, T.arrive, T.arrive + 8);
	const glandOn = Math.max(arrived * (1 - prog(f, T.arrive + 30, T.arrive + 60)), 0);
	// 闸门回放
	const replayX = lerp(600, 1200, prog(f, T.pass - 20, T.pass + 20, (x) => x));
	// 赛跑
	const blueP = prog(f, T.go, T.hit, (x) => x * x * (3 - 2 * x));
	const wu = whiteU(f);
	const [wx, wy] = upperAt(wu);
	const hitT = f - T.hit;

	// 大字：比嘴快一步（画面中部偏左）
	const slamWord = screen(19).highlights[0];

	return (
		<g>
			<Bubbles frame={f} x0={X(-200)} x1={X(2000)} waterY={WATER_Y} count={30} opacity={prog(f, T.s10, T.s10 + 20)} />

			{/* 第 9 屏：大泪滴 */}
			{f < T.split ? <Tear x={bigX} y={bigY} r={bigR} stretch={1 + 0.25 * Math.sin(flyP * Math.PI)} /> : null}

			{/* 第 10–12 屏：三只眼睛与三颗泪 */}
			{f >= T.s10 - 2 && eyesOut < 1 ? (
				<g opacity={eyesIn * (1 - eyesOut)}>
					<Eye frame={f} x={X(TEAR_XS[0])} y={EYE_Y} w={240} h={104} film={film0} opacity={0.4 + 0.6 * focus(0)} />
					<Eye frame={f} x={X(TEAR_XS[1])} y={EYE_Y} w={240} h={104} film={film1} opacity={0.4 + 0.6 * focus(1)} />
					<Eye frame={f} x={X(TEAR_XS[2])} y={EYE_Y} w={240} h={104} opacity={0.4 + 0.6 * focus(2)} />
				</g>
			) : null}
			{f >= T.split && f < T.s13 + 30
				? TEAR_XS.map((tx, i) => {
						let x = lerp(X(960), X(tx), easeOut(splitP));
						let y = TEARS_Y + Math.sin(f * 0.08 + i) * 6;
						let r = lerp(55, 34, splitP);
						let op = f < T.s10 ? 1 : focus(i);
						if (i === 0) {
							y = lerp(y, EYE_Y - 30, melt);
							r *= 1 - melt;
						}
						if (i === 1) {
							y = lerp(y, EYE_Y - 30, washP * washP);
							r *= 1 - prog(f, T.wash, T.wash + 6);
						}
						if (i === 2) {
							x = lerp(x, X(960), growP);
							y = lerp(y, 420, growP);
							r = lerp(r, 70, growP);
							op = Math.max(op, growP);
							// 第 13 屏：缩成光点，飞向大脑
							x = lerp(x, X(LOW_X0), shrinkP);
							y = lerp(y, LOW_Y, shrinkP);
							r = lerp(r, 9, shrinkP);
							if (f >= T.depart) return null;
						}
						if (i !== 2) op *= 1 - eyesOut;
						return <Tear key={i} x={x} y={y} r={r} opacity={op} />;
					})
				: null}
			{/* 灰尘 */}
			{f >= T.s11 && f < T.wash + 40
				? Array.from({length: 12}).map((_, i) => {
						const a = rand(i * 3.3) * Math.PI * 2;
						const startR = 260 + rand(i * 1.7) * 120;
						const near = 60 + rand(i * 5.1) * 40;
						const inP = easeOut(prog(f, T.s11, T.wash - 4));
						const outP = prog(f, T.wash, T.wash + 34);
						const rr = lerp(lerp(startR, near, inP), startR * 1.4, outP);
						return (
							<circle
								key={i}
								cx={X(TEAR_XS[1]) + Math.cos(a) * rr}
								cy={EYE_Y + Math.sin(a) * rr * 0.45}
								r={4 + rand(i) * 4}
								fill="#8896A6"
								opacity={0.75 * (1 - outP)}
							/>
						);
					})
				: null}

			{/* 第 13 屏起：路线图 */}
			{mapOp > 0 ? (
				<g opacity={mapOp}>
					{/* 大脑：重叠的发光圆 */}
					{[
						[0, 0, 58],
						[-40, 18, 44],
						[42, 14, 46],
						[-12, -34, 42],
						[26, -30, 38],
					].map(([dx, dy, r], i) => (
						<circle
							key={i}
							cx={X(BRAIN.x + dx)}
							cy={BRAIN.y + dy}
							r={r * (1 + 0.04 * Math.sin(f * 0.1 + i))}
							fill="#16304A"
							fillOpacity={0.6}
							stroke={C.figureRim}
							strokeWidth={3}
							strokeOpacity={0.8}
						/>
					))}
					<circle cx={X(BRAIN.x)} cy={BRAIN.y} r={70} fill={C.blue} opacity={0.18 + 0.1 * Math.sin(f * 0.12)} filter="url(#bigGlow)" />
					{/* 直路：情绪 → 泪腺 */}
					<line
						x1={X(LOW_X0)}
						y1={LOW_Y}
						x2={X(lerp(LOW_X0, LOW_X1, lowDraw))}
						y2={LOW_Y}
						stroke={C.blue}
						strokeWidth={5}
						strokeLinecap="round"
					/>
					<line x1={X(LOW_X0)} y1={LOW_Y} x2={X(lerp(LOW_X0, LOW_X1, lowDraw))} y2={LOW_Y} stroke={C.blue} strokeWidth={14} opacity={0.35} filter="url(#lineGlow)" />
					{/* 弯路：想清楚 → 组织语言 → 开口 */}
					{upperDraw > 0 ? (
						<g>
							<path d={upperD} fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={3.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - upperDraw} />
							{WAYPOINTS.map((w, i) => {
								const lit = prog(f, T.marks[i], T.marks[i] + 8);
								return (
									<g key={w.label} opacity={0.25 + 0.75 * lit}>
										<circle cx={X(w.at[0])} cy={w.at[1]} r={9} fill="#FFFFFF" />
										<text
											x={X(w.at[0])}
											y={w.at[1] - 62}
											textAnchor="middle"
											fontFamily={FONT}
											fontWeight={700}
											fontSize={38}
											fill="#FFFFFF"
										>
											{w.label}
										</text>
									</g>
								);
							})}
						</g>
					) : null}
					{/* 终点：眼睛 */}
					<Eye frame={f} x={X(MAP_EYE.x)} y={MAP_EYE.y} w={MAP_EYE.w} h={MAP_EYE.h} film={arrived * 0.8 + (hitT >= 0 ? 0.2 : 0)} gland={Math.max(glandOn, hitT >= 0 && hitT < 40 ? 1 - hitT / 40 : 0)} />
					{/* 闸门：一直抬着，从不落下 */}
					{f >= T.s15 - 10 ? (
						<g opacity={prog(f, T.s15 - 10, T.s15 + 6)} transform={`translate(${X(GATE_X)},${LOW_Y})`}>
							<rect x={-8} y={-110} width={16} height={110} rx={5} fill={C.figure} stroke={C.figureRim} strokeWidth={2.5} />
							<g transform={`rotate(${-78 + 3 * Math.sin(f * 0.1)} 0 -104)`}>
								<rect x={0} y={-112} width={150} height={16} rx={8} fill="#1B3350" stroke={C.figureRim} strokeWidth={2.5} />
								{[30, 70, 110].map((sx) => (
									<rect key={sx} x={sx} y={-112} width={18} height={16} fill={C.figureRim} opacity={0.5} />
								))}
							</g>
						</g>
					) : null}
					{/* 情绪泪光点（第 13–14 屏） */}
					{f >= T.depart && f < T.arrive + 6 ? (
						<Dot x={X(lerp(LOW_X0, LOW_X1, dot1))} y={LOW_Y} color={C.blue} />
					) : null}
					{/* 闸门处的回放光点（第 15 屏） */}
					{f >= T.pass - 20 && f < T.pass + 20 ? <Dot x={X(replayX)} y={LOW_Y} color={C.blue} /> : null}
					{/* 赛跑（第 17 屏起） */}
					{f >= T.go && f < T.hit + 4 ? <Dot x={X(lerp(LOW_X0, LOW_X1, blueP))} y={LOW_Y} color={C.blue} /> : null}
					{f >= T.go ? <Dot x={X(wx)} y={wy} color="#FFFFFF" r={9} /> : null}
					{/* 冲击：眼睛处的光环 */}
					{hitT >= 0 && hitT < 36
						? [0, 7].map((d) => {
								const tt = hitT - d;
								if (tt < 0) return null;
								return (
									<circle
										key={d}
										cx={X(MAP_EYE.x)}
										cy={MAP_EYE.y}
										r={40 + tt * 18}
										fill="none"
										stroke={C.blue}
										strokeWidth={5}
										opacity={Math.max(0, 0.8 * (1 - tt / 30))}
									/>
								);
							})
						: null}
				</g>
			) : null}
			{/* 眼泪从眼睛落下（第 18 屏） */}
			<FallingTear
				frame={f}
				x={X(MAP_EYE.x + 20)}
				y0={MAP_EYE.y + 30}
				groundY={WATER_Y}
				r={12}
				formStart={T.hit - 2}
				detach={T.hit + 6}
				land={T.hit + 18}
			/>
			<Burst frame={f} at={T.hit} x={X(MAP_EYE.x)} y={MAP_EYE.y} count={26} power={7} />
			{/* 第 19 屏：大字 */}
			<BigWord
				frame={f}
				text={slamWord.word}
				color={slamWord.color}
				x={X(700)}
				baseline={515}
				size={175}
				dropAt={T.slam - 12}
				hitAt={T.slam}
				outAt={T.s20 - 22}
				outDur={24}
				sink={260}
			/>
			<Burst frame={f} at={T.slam} x={X(700)} y={520} count={30} power={7} />
		</g>
	);
};
