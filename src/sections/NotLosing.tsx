import React from 'react';
import {screen} from '../data/script';
import {BigWord} from '../components/BigWord';
import {Burst} from '../components/Particles';
import {clamp01, lerp, prog, rand} from '../lib/anim';
import {S4_X} from '../shot';
import {C} from '../theme';
import {ActorsView, tankGeom} from './ActorsView';
import {T4, TANK} from './actors';

/**
 * 第五节 · 哭了不等于输（第 29–35 屏）
 * 近景、暖光：小人在水箱旁坐下 → “不等于输”砸下 →
 * 水位线被拉出水箱，画成“先低落、再回升”的曲线 → 曲线收回，水位落下，小人抬头。
 */

const X = (lx: number) => S4_X + lx;
/** 情绪曲线：世界坐标，横跨画面 x≈200–1500 */
const CURVE = {x0: X(540), x1: X(1840), y: 330, dip: 130};

/** 先快速下沉、再缓慢回到起点高度（不画超过起点） */
const dipAt = (u: number) => {
	if (u < 0.25 || u > 0.9) return 0;
	const v = (u - 0.25) / 0.65;
	return v < 0.3 ? Math.sin((v / 0.3) * (Math.PI / 2)) : Math.cos(((v - 0.3) / 0.7) * (Math.PI / 2));
};

export const NotLosing: React.FC<{frame: number}> = ({frame: f}) => {
	const T = T4();
	if (f < T.s29 || f >= T.s36) return null;
	const tg = tankGeom(f);
	const word = screen(30).highlights[0];
	// 曲线：第 32 屏画平段，第 33 屏画下沉和回升，第 34 屏收回
	const lift = prog(f, T.s32, T.s32 + 22);
	const drawU = f < T.s33 ? 0.22 * prog(f, T.s32 + 18, T.s33, (t) => t) : lerp(0.22, 1, prog(f, T.s33, T.s33 + 76, (t) => t));
	const retract = prog(f, T.s34, T.s34 + 34);
	const pts: string[] = [];
	const N = 120;
	for (let i = 0; i <= N * drawU; i++) {
		const u = i / N;
		pts.push(`${lerp(CURVE.x0, CURVE.x1, u).toFixed(1)},${(CURVE.y + CURVE.dip * dipAt(u)).toFixed(1)}`);
	}
	const head = drawU;
	const hx = lerp(CURVE.x0, CURVE.x1, head);
	const hy = CURVE.y + CURVE.dip * dipAt(head);
	// 被拉出的水面：一段水平线从水箱水面飞到曲线起点
	const segX = lerp(tg.left, CURVE.x0, lift);
	const segY = lerp(tg.surface, CURVE.y, lift);
	const segW = lerp(tg.right - tg.left, 120, lift);
	const curveOp = (1 - retract) * prog(f, T.s32, T.s32 + 6);
	const shrink = 1 - 0.6 * retract;
	return (
		<g>
			<ActorsView frame={f} />
			{/* 哭完以后水箱里冒出的小气泡 */}
			{f > T.s31 && f < T.s35
				? Array.from({length: 10}).map((_, i) => {
						const period = 50;
						const t = (f - T.s31 + rand(i) * period) % period;
						const x = tg.left + 20 + rand(i * 2.7) * (tg.right - tg.left - 40);
						return (
							<circle
								key={i}
								cx={x}
								cy={lerp(TANK.bottom - 8, tg.surface + 6, t / period)}
								r={3 + rand(i * 4.1) * 3}
								fill="none"
								stroke="#D8F3FF"
								strokeWidth={1.5}
								opacity={0.6 * (1 - t / period)}
							/>
						);
					})
				: null}
			<BigWord
				frame={f}
				text={word.word}
				color={word.color}
				x={X(1206)}
				baseline={551}
				size={124}
				dropAt={T.hit30 - 12}
				hitAt={T.hit30}
				outAt={T.s31 + 6}
				outDur={22}
				sink={-40}
			/>
			<Burst frame={f} at={T.hit30} x={X(1206)} y={556} count={34} power={6} color={C.amber} />
			<Burst frame={f} at={T.s31 + 8} x={X(1206)} y={520} count={30} power={4} color={C.amber} />
			{/* 情绪曲线 */}
			{curveOp > 0 && pts.length > 1 ? (
				<g opacity={curveOp} transform={`translate(${tg.cx * (1 - shrink)},${tg.surface * (1 - shrink)}) scale(${shrink})`}>
					<line x1={CURVE.x0} x2={CURVE.x1} y1={CURVE.y} y2={CURVE.y} stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={2} strokeDasharray="6 10" />
					<path d={`M ${pts.join(' L ')}`} fill="none" stroke={C.blue} strokeWidth={14} opacity={0.35} filter="url(#lineGlow)" />
					<path d={`M ${pts.join(' L ')}`} fill="none" stroke="#9EDFFF" strokeWidth={4.5} strokeLinecap="round" />
					<circle cx={hx} cy={hy} r={20} fill={C.blue} opacity={0.4} filter="url(#softGlow)" />
					<circle cx={hx} cy={hy} r={8} fill="#D8F3FF" />
				</g>
			) : null}
			{lift > 0 && lift < 1 ? (
				<line x1={segX} x2={segX + segW} y1={segY} y2={segY} stroke="#BFEAFF" strokeWidth={4} opacity={clamp01(1.4 - lift)} />
			) : null}
		</g>
	);
};
