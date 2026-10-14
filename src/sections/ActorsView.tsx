import React from 'react';
import {Figure, headCenter, pose} from '../components/Figure';
import {FallingTear} from '../components/tear/Tear';
import {Vessel} from '../components/tear/Vessel';
import {prog} from '../lib/anim';
import {S4_X, WATER_Y} from '../shot';
import {C} from '../theme';
import {
	ghost,
	holeDrops,
	OTHER_H,
	other,
	P_H,
	person,
	T4,
	TANK,
	tankHole,
	tankLevel,
	tankSlosh,
	tankX,
	valveDrops,
	valveState,
} from './actors';

const X = (lx: number) => S4_X + lx;

/** 水箱几何（世界坐标） */
export const tankGeom = (f: number) => {
	const cx = X(tankX(f));
	const left = cx - TANK.w / 2;
	const level = tankLevel(f);
	return {
		cx,
		left,
		right: left + TANK.w,
		top: TANK.bottom - TANK.h,
		surface: TANK.bottom - TANK.h * level,
		holeY: TANK.bottom - TANK.h * tankHole(f),
		valve: {x: left - 30, y: TANK.bottom - 26},
	};
};

/** 小人的头部中心（世界坐标） */
export const personHead = (f: number) => {
	const p = person(f);
	return headCenter({x: X(p.x), y: p.y, height: P_H, facing: p.facing}, p.pose);
};

/**
 * 第四到第六节共用的角色层：后景对照人物、问候的人、水箱、小人，
 * 以及从门槛孔、放水阀流出的水滴。
 */
export const ActorsView: React.FC<{frame: number}> = ({frame: f}) => {
	const T = T4();
	const p = person(f);
	const o = other(f);
	const g = ghost(f);
	const tg = tankGeom(f);
	const flashT = f - T.hit27;
	const flash = flashT >= 0 && flashT < 30 ? Math.exp(-flashT / 9) : 0;
	const v = valveState(f);
	return (
		<g>
			{/* 后景：门槛更高的对照水箱 */}
			{g.opacity > 0 ? (
				<g opacity={g.opacity}>
					<Vessel
						frame={f}
						cx={X(g.x + TANK.gap * 0.8)}
						bottom={TANK.bottom - 60}
						width={TANK.w * 0.8}
						height={TANK.h * 0.8}
						level={tankLevel(f)}
						hole={0.85}
						marks={1}
						dim={1}
						wheels
						clipId="ghostTank"
					/>
					<Figure x={X(g.x)} y={g.y} height={P_H * 0.8} pose={g.pose} color={C.figureDeep} rim="#6F8FB3" />
				</g>
			) : null}
			{o.opacity > 0 ? (
				<Figure
					x={X(o.x)}
					y={o.y}
					height={OTHER_H}
					facing={o.facing}
					pose={o.pose}
					color={C.figureDeep}
					rim="#6F8FB3"
					breath={o.breath}
					opacity={o.opacity}
				/>
			) : null}
			{/* 地上的一小摊水 */}
			{f > T.hit27 + 12 && f < T.s36 + 30 ? (
				<ellipse
					cx={tg.right + 60}
					cy={WATER_Y + 2}
					rx={70 * prog(f, T.hit27 + 12, T.hit27 + 50)}
					ry={8}
					fill={C.blue}
					opacity={0.35 * (1 - prog(f, T.s36, T.s36 + 30))}
				/>
			) : null}
			<Vessel
				frame={f}
				cx={tg.cx}
				bottom={TANK.bottom}
				width={TANK.w}
				height={TANK.h}
				level={tankLevel(f)}
				hole={tankHole(f)}
				marks={1}
				flash={flash}
				wheels
				slosh={tankSlosh(f)}
				valve={v}
				valveSide="left"
				clipId="tank"
			/>
			<Figure
				x={X(p.x)}
				y={p.y}
				height={P_H}
				facing={p.facing}
				pose={p.pose}
				color={C.figure}
				backColor="#27405E"
				rim={C.figureRim}
				breath={p.breath}
			/>
			{holeDrops().map((l) => (
				<FallingTear key={`h${l}`} frame={f} x={tg.right + 9} y0={tg.holeY - 4} groundY={WATER_Y} r={8} formStart={l - 14} detach={l - 10} land={l} hang={0.6} />
			))}
			{valveDrops().map((l) => (
				<FallingTear key={`v${l}`} frame={f} x={tg.valve.x} y0={tg.valve.y + 10} groundY={WATER_Y} r={6} formStart={l - 9} detach={l - 4} land={l} hang={0.6} />
			))}
		</g>
	);
};

export const actorSplashes = () => {
	const T = T4();
	return [
		...holeDrops().map((l) => ({x: tankGeom(l).right + 9, frame: l, amp: 4, rings: true})),
		...valveDrops().map((l) => ({x: tankGeom(l).valve.x, frame: l, amp: 3, rings: true})),
		{x: X(person(T.hit27 + 20).x) + 20, frame: T.hit27 + 20, amp: 6, rings: true},
	];
};

export {pose};
