import React from 'react';
import {AbsoluteFill} from 'remotion';
import {handPosition} from '../components/Figure';
import {FallingTear} from '../components/tear/Tear';
import {lerp, prog} from '../lib/anim';
import {DOOR, doorCut, S4_X, WATER_Y} from '../shot';
import {C, FONT} from '../theme';
import {ActorsView, personHead, tankGeom} from './ActorsView';
import {P_H, person, T4} from './actors';
import {Block, Moon} from './WhyFaster';

/**
 * 第六节 · 和它相处的三件小事（第 36–45 屏）
 * 晨光渐亮：小人起身，水箱长出放水阀 → ①卡片 ②“给我一分钟”+慢呼气+放水
 * ③回头看是哪几滴 → 提前放水 → 控制不住时，门亮了，推着水箱走过去。
 */

const X = (lx: number) => S4_X + lx;

export const LivingWithIt: React.FC<{frame: number}> = ({frame: f}) => {
	const T = T4();
	if (f < T.s36 || f >= doorCut()) return null;
	const p = person(f);
	const tg = tankGeom(f);
	const hand = handPosition({x: X(p.x), y: p.y, height: P_H, facing: p.facing}, p.pose);
	const head = personHead(T.land38);
	// 卡片：拿出 → 被眼泪打到晃一下 → 收起
	const cardIn = prog(f, T.card - 6, T.card + 6);
	const cardOut = prog(f, T.hand - 14, T.hand - 4);
	const cardOp = cardIn * (1 - cardOut);
	const wob = f >= T.land38 && f < T.land38 + 24 ? 8 * Math.exp(-(f - T.land38) / 7) * Math.sin((f - T.land38) * 1.2) : 0;
	const cardTop = hand[1] - 40;
	// 慢呼气：胸前光环，吸气快、呼气慢
	const inhale = prog(f, T.s40, T.s40 + 16);
	const exhale = prog(f, T.s40 + 16, T.s40 + 60);
	const ring = 30 + 60 * inhale * (1 - exhale);
	const ringOp = (f >= T.s40 && f < T.s40 + 66 ? 0.55 : 0) * (1 - prog(f, T.s40 + 56, T.s40 + 66));
	const s = P_H / 100;
	const chest = [X(p.x) + p.facing * 2 * s, p.y - 66 * s];
	// 回看：地上的印记，一个个亮起，连向水箱
	const markXs = [-80, -170, -260].map((dx) => X(person(T.marks[0]).x) + dx);
	const marksOp = prog(f, T.s42, T.s42 + 10) * (1 - prog(f, T.s43 + 30, T.s43 + 50));
	// 门
	const doorIn = prog(f, T.door - 10, T.door + 16);
	const dX = X(DOOR.x);
	const dTop = WATER_Y - DOOR.h;
	return (
		<g>
			{/* 门与地上的光 */}
			{doorIn > 0 ? (
				<g>
					<polygon
						points={`${dX - DOOR.w / 2},${WATER_Y} ${dX + DOOR.w / 2},${WATER_Y} ${dX - 900},${WATER_Y + 160} ${dX - 1300},${WATER_Y + 160}`}
						fill="#BFE6FF"
						opacity={0.12 * doorIn * (0.85 + 0.15 * Math.sin(f * 0.05))}
					/>
					<rect x={dX - DOOR.w / 2 - 40} y={dTop - 40} width={DOOR.w + 80} height={DOOR.h + 40} fill="#BFE6FF" opacity={0.25 * doorIn} filter="url(#bigGlow)" />
					<g transform={`translate(${dX},${WATER_Y}) scale(1,${doorIn})`}>
						<rect x={-DOOR.w / 2} y={-DOOR.h} width={DOOR.w} height={DOOR.h} rx={6} fill="#D8F3FF" opacity={0.92} />
						<rect x={-DOOR.w / 2} y={-DOOR.h} width={DOOR.w} height={DOOR.h} rx={6} fill="none" stroke={C.figureRim} strokeWidth={4} />
					</g>
				</g>
			) : null}
			{/* 地上的印记（第 42 屏） */}
			{marksOp > 0 ? (
				<g opacity={marksOp}>
					{markXs.map((mx, i) => {
						const lit = prog(f, T.marks[i] - 4, T.marks[i] + 8);
						const my = WATER_Y - 16;
						return (
							<g key={i} opacity={0.3 + 0.7 * lit}>
								<line
									x1={mx}
									y1={my - 20}
									x2={lerp(mx, tg.cx, lit)}
									y2={lerp(my - 20, tg.top + 30, lit)}
									stroke={C.blue}
									strokeWidth={2.5}
									strokeDasharray="8 8"
								/>
								{i === 0 ? <Moon x={mx} y={my - 8} r={18} /> : null}
								{i === 1 ? <Block x={mx} y={my - 6} s={30} /> : null}
								{i === 2 ? (
									<path d={`M ${mx} ${my - 34} C ${mx + 9} ${my - 20} ${mx + 13} ${my - 12} ${mx + 13} ${my - 5} A 13 13 0 0 1 ${mx - 13} ${my - 5} C ${mx - 13} ${my - 12} ${mx - 9} ${my - 20} ${mx} ${my - 34} Z`} fill="url(#tearDark)" />
								) : null}
								{lit > 0 && lit < 1 ? <circle cx={mx} cy={my - 10} r={30 * lit} fill={C.blue} opacity={0.4 * (1 - lit)} /> : null}
							</g>
						);
					})}
				</g>
			) : null}
			<ActorsView frame={f} />
			{/* 新的一滴（第 43 屏），刚落进来就提前放水 */}
			<FallingTear frame={f} x={tg.cx - 20} y0={60} groundY={tg.surface} r={11} formStart={T.open43 - 30} detach={T.open43 - 22} land={T.open43 - 4} />
			{/* 呼气光环 */}
			{ringOp > 0 ? (
				<ellipse cx={chest[0]} cy={chest[1]} rx={ring} ry={ring * 1.25} fill="none" stroke={C.blue} strokeWidth={4} opacity={ringOp} filter="url(#softGlow)" />
			) : null}
			{ringOp > 0 ? (
				<ellipse cx={chest[0]} cy={chest[1]} rx={ring} ry={ring * 1.25} fill="none" stroke="#BFEAFF" strokeWidth={2} opacity={ringOp} />
			) : null}
			{/* 卡片 */}
			{cardOp > 0 ? (
				<g transform={`translate(${hand[0] + 6},${hand[1] - 6}) rotate(${-8 + wob}) scale(${cardIn})`} opacity={cardOp}>
					<rect x={-30} y={-40} width={60} height={78} rx={6} fill="#E8F4FF" stroke={C.figureRim} strokeWidth={2.5} />
					{[-22, -8, 6, 20].map((ly, i) => (
						<line key={ly} x1={-20} x2={i === 3 ? 6 : 20} y1={ly} y2={ly} stroke="#5A6878" strokeWidth={3} strokeLinecap="round" />
					))}
				</g>
			) : null}
			{/* 眼泪落到卡片上 */}
			<FallingTear frame={f} x={head[0] + 22} y0={head[1] + 10} groundY={cardTop + 2} r={9} formStart={T.land38 - 22} detach={T.land38 - 12} land={T.land38} />
		</g>
	);
};

/** 屏幕左上角的 1/2/3 编号槽（不随镜头移动；放在左上，避开右上水印） */
export const LivingWithItOverlay: React.FC<{frame: number}> = ({frame: f}) => {
	const T = T4();
	const show = prog(f, T.s36 + 8, T.s36 + 26) * (1 - prog(f, T.s44, T.s44 + 20));
	if (show <= 0) return null;
	const litAt = [T.s37, T.s39, T.s41];
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				{litAt.map((at, i) => {
					const lit = prog(f, at, at + 10);
					const cx = 120 + i * 104;
					const cy = 112;
					const pulse = lit > 0 && f < at + 40 ? 1 + 0.12 * Math.sin(((f - at) / 40) * Math.PI) : 1;
					return (
						<g key={i} opacity={show}>
							<circle cx={cx} cy={cy} r={34 * pulse} fill={lit > 0 ? '#16304A' : 'none'} stroke={lit > 0 ? C.blue : '#8FB3D9'} strokeWidth={3} strokeOpacity={0.5 + 0.5 * lit} />
							{lit > 0 ? <circle cx={cx} cy={cy} r={44} fill={C.blue} opacity={0.2 * lit} filter="url(#softGlow)" /> : null}
							<text x={cx} y={cy + 14} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={38} fill="#FFFFFF" fillOpacity={0.45 + 0.55 * lit}>
								{i + 1}
							</text>
						</g>
					);
				})}
			</svg>
		</AbsoluteFill>
	);
};
