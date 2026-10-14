import React from 'react';
import {handPosition} from '../components/Figure';
import {Burst, Bubbles} from '../components/Particles';
import {FallingTear} from '../components/tear/Tear';
import {lerp, prog} from '../lib/anim';
import {S4_X, WATER_Y} from '../shot';
import {C} from '../theme';
import {ActorsView, personHead, tankGeom} from './ActorsView';
import {OTHER_H, other, T4, TANK, tankX} from './actors';

/**
 * 第四节 · 为什么你的门槛特别低（第 20–28 屏）
 * 小人推着水箱沿水位线走：对照人物的门槛更高 → 路过月亮、重物各滴进一滴 →
 * 深色的委屈落进来 → 停下，有人走近、伸手，一颗光点成了“最后一滴” → 拉远看来时的路。
 */

const X = (lx: number) => S4_X + lx;

/** 路边物件：月亮（没睡好）、重物（太累），放在水箱经过的位置上方 */
export const roadside = () => {
	const T = T4();
	return [
		{kind: 'moon' as const, land: T.drips[0], x: X(tankX(T.drips[0])) - 28, y: 300},
		{kind: 'block' as const, land: T.drips[1], x: X(tankX(T.drips[1])) - 28, y: 320},
	];
};

export const Moon: React.FC<{x: number; y: number; r: number; opacity?: number}> = ({x, y, r, opacity = 1}) => (
	<g opacity={opacity}>
		<circle cx={x} cy={y} r={r * 1.6} fill="#8FB3D9" opacity={0.18} filter="url(#softGlow)" />
		{/* 月牙：外侧半圆 + 内侧较扁的弧 */}
		<path d={`M ${x} ${y - r} A ${r} ${r} 0 0 0 ${x} ${y + r} A ${r * 0.55} ${r} 0 0 1 ${x} ${y - r} Z`} fill="#BFD6EC" />
	</g>
);

export const Block: React.FC<{x: number; y: number; s: number; opacity?: number}> = ({x, y, s, opacity = 1}) => (
	<g opacity={opacity}>
		<rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * 0.16} fill={C.figure} stroke={C.figureRim} strokeWidth={3} />
		<rect x={x - s * 0.3} y={y - s * 0.62} width={s * 0.6} height={s * 0.14} rx={s * 0.07} fill={C.figureRim} opacity={0.7} />
	</g>
);

export const WhyFaster: React.FC<{frame: number}> = ({frame: f}) => {
	const T = T4();
	if (f < T.s20 - 40 || f >= T.s29) return null;
	const items = roadside();
	const o = other(f);
	const hand = handPosition({x: X(o.x), y: o.y, height: OTHER_H, facing: o.facing}, o.pose);
	const tg = tankGeom(f);
	const tgHit = tankGeom(T.hit27);
	// 光点：从问候者的手里飘出，落进水箱
	const dotP = prog(f, T.touch, T.hit27, (t) => t);
	const handAt = handPosition(
		{x: X(other(T.touch).x), y: WATER_Y, height: OTHER_H, facing: other(T.touch).facing},
		other(T.touch).pose,
	);
	const dotX = lerp(handAt[0], tgHit.cx, dotP);
	const dotY = lerp(handAt[1], tgHit.surface, dotP) - Math.sin(dotP * Math.PI) * 110;
	const head = personHead(T.hit27);
	const pull = prog(f, T.s28, T.s28 + 34);
	const markerOp = pull * (1 - prog(f, T.s29 - 6, T.s29 + 10));
	const marks = [
		...items.map((it) => ({kind: it.kind, x: it.x + 28})),
		...T.dark.map((d) => ({kind: 'dark' as const, x: X(tankX(d))})),
	];
	return (
		<g>
			<Bubbles frame={f} x0={X(-300)} x1={X(2300)} waterY={WATER_Y} count={34} opacity={1} />
			{/* 月亮、重物：经过时各滴下一滴 */}
			{items.map((it) => {
				const op = prog(f, it.land - 60, it.land - 40) * (1 - prog(f, it.land + 30, it.land + 60));
				if (op <= 0) return null;
				const bob = Math.sin(f * 0.06) * 6;
				return (
					<g key={it.kind}>
						{it.kind === 'moon' ? <Moon x={it.x} y={it.y + bob} r={34} opacity={op} /> : <Block x={it.x} y={it.y + bob} s={64} opacity={op} />}
						<FallingTear
							frame={f}
							x={it.x}
							x1={X(tankX(it.land))}
							y0={it.y + 36}
							groundY={TANK.bottom - TANK.h * 0.2 + 10}
							r={11}
							formStart={it.land - 22}
							detach={it.land - 14}
							land={it.land}
						/>
					</g>
				);
			})}
			{/* 憋着没说的委屈：深色水滴从上方落进水箱 */}
			{T.dark.map((d) => (
				<FallingTear
					key={d}
					frame={f}
					x={X(tankX(d)) - 70}
					x1={X(tankX(d))}
					y0={40}
					groundY={TANK.bottom - TANK.h * 0.35}
					r={12}
					formStart={d - 30}
					detach={d - 24}
					land={d}
					dark
				/>
			))}
			<ActorsView frame={f} />
			{/* 问候者伸出的手 → 光点 */}
			{f >= T.touch - 4 && f < T.hit27 + 2 ? (
				<g>
					<circle cx={dotX} cy={dotY} r={22} fill="#FFFFFF" opacity={0.3} filter="url(#softGlow)" />
					<circle cx={dotX} cy={dotY} r={8} fill="#FFFFFF" />
				</g>
			) : null}
			{f >= T.touch - 12 && f < T.touch + 8 ? (
				<circle cx={hand[0]} cy={hand[1]} r={18 * prog(f, T.touch - 12, T.touch)} fill="#FFFFFF" opacity={0.35} filter="url(#softGlow)" />
			) : null}
			{/* 最后一滴：小人的眼泪 */}
			<FallingTear frame={f} x={head[0] + 22} y0={head[1] + 10} groundY={WATER_Y} r={10} formStart={T.hit27 - 4} detach={T.hit27 + 6} land={T.hit27 + 20} />
			<Burst frame={f} at={T.hit27} x={tgHit.cx} y={tgHit.top + 6} count={30} power={7} />
			{/* 拉远：来时路上的印记，都连向水箱 */}
			{markerOp > 0 ? (
				<g opacity={markerOp}>
					{marks.map((m, i) => {
						const draw = prog(f, T.s28 + 14 + i * 6, T.s28 + 40 + i * 6);
						const mx = m.x;
						const my = WATER_Y - 16;
						return (
							<g key={i}>
								<line
									x1={mx}
									y1={my - 16}
									x2={lerp(mx, tg.cx, draw)}
									y2={lerp(my - 16, tg.top + 20, draw)}
									stroke={C.blue}
									strokeWidth={2.5}
									strokeDasharray="8 8"
									opacity={0.8}
								/>
								{m.kind === 'moon' ? <Moon x={mx} y={my - 6} r={16} /> : null}
								{m.kind === 'block' ? <Block x={mx} y={my - 4} s={28} /> : null}
								{m.kind === 'dark' ? (
									<path d={`M ${mx} ${my - 30} C ${mx + 8} ${my - 18} ${mx + 12} ${my - 10} ${mx + 12} ${my - 4} A 12 12 0 0 1 ${mx - 12} ${my - 4} C ${mx - 12} ${my - 10} ${mx - 8} ${my - 18} ${mx} ${my - 30} Z`} fill="url(#tearDark)" />
								) : null}
							</g>
						);
					})}
				</g>
			) : null}
		</g>
	);
};

