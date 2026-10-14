import React from 'react';
import {cue, screen} from '../data/script';
import {BigWord} from '../components/BigWord';
import {Figure, headCenter, pose, poseAt} from '../components/Figure';
import {Burst} from '../components/Particles';
import {FallingTear} from '../components/tear/Tear';
import {Splash} from '../components/tear/WaterLine';
import {mixColor, prog} from '../lib/anim';
import {doorCut, S7_X, WATER_Y} from '../shot';
import {C, FONT} from '../theme';

/**
 * 第七节 · 收尾（第 46–49 屏）
 * 门光退去，回到开场的同一个构图：同样两个人、同样的泪滴。
 * 眼泪还是先到了，但这次气泡里有了话；落点再次铺成水位线，“话可以后到”砸在线上。
 */

const X = (lx: number) => S7_X + lx;
const A = {x: 560, h: 300};
const B = {x: 1330, h: 350};

const t = () => ({
	cut: doorCut(),
	s46: screen(46).startFrame,
	land: cue(46, 'tearLand'),
	s47: screen(47).startFrame,
	bubble: cue(47, 'bubble'),
	s48: screen(48).startFrame,
	hit: cue(48, 'hit'),
	s49: screen(49).startFrame,
	end: screen(49).endFrame,
});

const aPose = (f: number) => {
	const T = t();
	return poseAt(f, [
		[T.cut, pose({pitch: 8})],
		[T.cut + 14, pose({pitch: -14, lean: -2, shoulderF: 12, elbowF: 24})],
		[T.land, pose({pitch: -12, lean: -2, shoulderF: 14, elbowF: 28})],
		[T.bubble + 10, pose({pitch: -16, lean: -3, shoulderF: 26, elbowF: 48})],
		[T.s48, pose({pitch: -12, lean: -2, shoulderF: 18, elbowF: 36})],
	]);
};

const bPose = (f: number) => {
	const T = t();
	const nod = f >= T.bubble + 14 && f < T.bubble + 50 ? 10 * Math.sin(((f - T.bubble - 14) / 36) * Math.PI * 2) : 0;
	const p = poseAt(f, [
		[T.cut, pose({pitch: 6})],
		[T.bubble, pose({pitch: 8, lean: 3})],
		[T.s48, pose({pitch: 4, lean: 2, shoulderF: 8})],
	]);
	return {...p, pitch: p.pitch + nod};
};

const tearAnchor = () => {
	const [hx, hy] = headCenter({x: X(A.x), y: WATER_Y, height: A.h, facing: 1}, aPose(t().land - 10));
	return {x: hx + 0.085 * A.h * 0.75, y: hy + 0.03 * A.h};
};

export const endingSplashes = (): Splash[] => {
	const T = t();
	return [
		{x: tearAnchor().x, frame: T.land, amp: 7, rings: true},
		{x: X(750), frame: T.hit, amp: 18, rings: true},
	];
};

export const Ending: React.FC<{frame: number}> = ({frame: f}) => {
	const T = t();
	if (f < T.cut) return null;
	const ap = aPose(f);
	const [hx, hy] = headCenter({x: X(A.x), y: WATER_Y, height: A.h, facing: 1}, ap);
	const anchor = tearAnchor();
	const say = screen(39).highlights[0].word.replace(/[“”"]/g, '');
	const inflate = prog(f, T.bubble - 4, T.bubble + 26);
	const textIn = prog(f, T.bubble + 14, T.bubble + 30);
	const sil = prog(f, T.s48, T.hit + 10);
	const figOp = 1 - 0.6 * sil;
	const bubbleOp = 1 - prog(f, T.hit - 6, T.hit + 14);
	const word = screen(48).highlights[0];
	const hitT = f - T.hit;
	return (
		<g>
			<g opacity={figOp}>
				<Figure x={X(B.x)} y={WATER_Y} height={B.h} facing={-1} pose={bPose(f)} color={mixColor(C.figureDeep, '#101B2A', sil)} rim="#6F8FB3" breath={f / 110} />
				<Figure x={X(A.x)} y={WATER_Y} height={A.h} facing={1} pose={ap} color={mixColor(C.figure, '#15243A', sil)} backColor="#27405E" rim={C.figureRim} breath={f / 95} />
			</g>
			{/* 这一次，气泡里有了话 */}
			{inflate > 0 && bubbleOp > 0 ? (
				<g transform={`translate(${hx + 120},${hy - 110}) scale(${inflate * (1 + 0.02 * Math.sin(f * 0.2))})`} opacity={bubbleOp}>
					<path d="M -70 46 L -112 92 L -34 56 Z" fill="#1B3350" stroke={C.figureRim} strokeWidth={3} strokeLinejoin="round" />
					<ellipse cx={0} cy={0} rx={150} ry={62} fill="#1B3350" stroke={C.figureRim} strokeWidth={3} />
					<path d="M -66 48 L -36 54" stroke="#1B3350" strokeWidth={6} />
					<text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} fill="#FFFFFF" opacity={textIn}>
						{say}
					</text>
				</g>
			) : null}
			<FallingTear frame={f} x={anchor.x} y0={anchor.y} groundY={WATER_Y} r={11} formStart={T.cut + 4} detach={T.land - 14} land={T.land} />
			{hitT >= 0 && hitT < 40
				? [0, 6].map((d) => {
						const tt = hitT - d;
						if (tt < 0) return null;
						const rx = 80 + tt * 70;
						return (
							<ellipse key={d} cx={X(750)} cy={WATER_Y} rx={rx} ry={rx * 0.24} fill="none" stroke={word.color} strokeWidth={6 - d * 0.5} opacity={Math.max(0, 0.7 * (1 - tt / 34))} />
						);
					})
				: null}
			<Burst frame={f} at={T.hit} x={X(750)} y={WATER_Y} count={46} power={10} color="#FFD79A" />
			<BigWord
				frame={f}
				text={word.word}
				color={word.color}
				x={X(750)}
				baseline={WATER_Y - 10}
				size={170}
				dropAt={T.hit - 14}
				hitAt={T.hit}
				outAt={T.s49 + 10}
				outDur={40}
			/>
		</g>
	);
};
