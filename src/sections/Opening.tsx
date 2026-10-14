import React from 'react';
import {cue, screen} from '../data/script';
import {Figure, headCenter, pose, poseAt} from '../components/Figure';
import {FallingTear} from '../components/tear/Tear';
import {Splash} from '../components/tear/WaterLine';
import {Burst} from '../components/Particles';
import {clamp01, easeIn, kf, prog} from '../lib/anim';
import {WATER_Y} from '../shot';
import {C, FONT} from '../theme';

/**
 * 第一节 · 钩子（第 1–3 屏）
 * 小人抬头想说话，气泡鼓起；泪滴比话先到，落地铺成水位线；“泪失禁体质”砸在水位线上。
 */

const A_HEIGHT = 300;
const B_HEIGHT = 350;
const B_X = 1330;
export const TITLE = {x: 750, baseline: WATER_Y - 10, size: 180};
/** 主题词取自第 3 屏的高亮词 */
export const titleWord = () => screen(3).highlights[0].word;
export const titleColor = () => screen(3).highlights[0].color;

const t = () => ({
	s1: screen(1).startFrame,
	step: cue(1, 'step'),
	lookUp: cue(1, 'lookUp'),
	bubble: cue(1, 'bubble'),
	tearForm: cue(2, 'tearForm'),
	tearFall: cue(2, 'tearFall'),
	tearLand: cue(2, 'tearLand'),
	s3: screen(3).startFrame,
	titleDrop: cue(3, 'titleDrop'),
	titleHit: cue(3, 'titleHit'),
	s4: screen(4).startFrame,
});

const aX = (f: number) => {
	const T = t();
	return kf(f, [
		[T.step, 500],
		[T.step + 36, 560],
	]);
};

const aPose = (f: number) => {
	const T = t();
	const stand = pose({pitch: 8});
	return poseAt(f, [
		[T.step, stand],
		[T.step + 12, pose({pitch: 6, hipF: 22, kneeF: 6, hipB: -16, kneeB: 18, shoulderF: -14, shoulderB: 14})],
		[T.step + 24, pose({pitch: 2, hipF: 4, kneeF: 2, hipB: 8, kneeB: 32, shoulderF: -4, shoulderB: 6})],
		[T.lookUp + 16, pose({pitch: -6, lean: -2})],
		[T.lookUp + 34, pose({pitch: -15, lean: -3, shoulderF: 14, elbowF: 30})],
		[T.bubble + 40, pose({pitch: -16, lean: -3, shoulderF: 24, elbowF: 46})],
		[T.tearFall, pose({pitch: -14, lean: -2, shoulderF: 22, elbowF: 44})],
		[T.tearLand, pose({pitch: -12, lean: -2, shoulderF: 20, elbowF: 40})],
		[T.tearLand + 12, pose({pitch: 22, lean: 7, shoulderF: 2, elbowF: 10})],
		[T.s3 + 40, pose({pitch: 18, lean: 6, shoulderF: 0, elbowF: 8})],
	]);
};

const bPose = (f: number) => {
	const T = t();
	return poseAt(f, [
		[0, pose({pitch: 6})],
		[T.lookUp + 10, pose({pitch: 6})],
		[T.lookUp + 50, pose({pitch: 10, lean: 3, shoulderF: 2})],
		[T.tearLand + 6, pose({pitch: 12, lean: 4})],
		[T.tearLand + 30, pose({pitch: 4, lean: -1, shoulderF: 10, elbowF: 20})],
	]);
};

/** 泪滴挂点：小人面部一侧 */
const tearAnchor = () => {
	const T = t();
	const f = T.tearForm;
	const [hx, hy] = headCenter({x: aX(f), y: WATER_Y, height: A_HEIGHT, facing: 1}, aPose(T.tearFall));
	return {x: hx + 0.085 * A_HEIGHT * 0.75, y: hy + 0.03 * A_HEIGHT};
};

export const openingSplashes = (): Splash[] => {
	const T = t();
	return [
		{x: tearAnchor().x, frame: T.tearLand, amp: 7, rings: true},
		{x: TITLE.x, frame: T.titleHit, amp: 18, rings: true},
	];
};

export const waterOrigin = () => {
	const T = t();
	return {x: tearAnchor().x, start: T.tearLand, end: T.titleHit + 24};
};

/** 标题在第 3 屏结束时的状态，第二节从这里接着变成卡片 */
export const titleDropOffset = (f: number) => {
	const T = t();
	if (f >= T.titleHit) {
		return 0;
	}
	return -760 * (1 - easeIn(prog(f, T.titleDrop, T.titleHit, (x) => x)));
};

export const Opening: React.FC<{frame: number}> = ({frame: f}) => {
	const T = t();
	if (f >= T.s4 + 2) {
		return null;
	}
	const figOpacity = 1 - prog(f, T.s3, T.s3 + 20);
	const ap = aPose(f);
	const ax = aX(f);
	const [hx, hy] = headCenter({x: ax, y: WATER_Y, height: A_HEIGHT, facing: 1}, ap);

	// 对话气泡：从 bubble 开始鼓起，泪滴落地前后瘪掉
	const inflate = prog(f, T.bubble, T.bubble + 34);
	const deflate = prog(f, T.tearLand - 6, T.tearLand + 8);
	const bubbleScale = inflate * (1 - deflate) * (1 + 0.025 * Math.sin(f * 0.25));
	const bx = hx + 70;
	const by = hy - 92;

	const anchor = tearAnchor();
	const hitT = f - T.titleHit;
	const squash = hitT >= 0 && hitT < 14 ? 1 - 0.12 * Math.exp(-hitT / 3) * Math.cos(hitT * 0.9) : 1;
	const titleOn = f >= T.titleDrop;

	return (
		<g>
			{figOpacity > 0 ? (
				<g opacity={figOpacity}>
					<Figure
						x={B_X}
						y={WATER_Y}
						height={B_HEIGHT}
						facing={-1}
						pose={bPose(f)}
						color={C.figureDeep}
						rim="#6F8FB3"
						breath={f / 110}
					/>
					<Figure
						x={ax}
						y={WATER_Y}
						height={A_HEIGHT}
						facing={1}
						pose={ap}
						color={C.figure}
						backColor="#27405E"
						rim={C.figureRim}
						breath={f / 95}
					/>
					{bubbleScale > 0.01 ? (
						<g transform={`translate(${bx},${by}) scale(${bubbleScale})`}>
							<path d="M -26 34 L -52 70 L -2 40 Z" fill="#1B3350" stroke={C.figureRim} strokeWidth={3} strokeLinejoin="round" />
							<ellipse cx={0} cy={0} rx={82} ry={52} fill="#1B3350" stroke={C.figureRim} strokeWidth={3} />
							<path d="M -24 36 L -6 38" stroke="#1B3350" strokeWidth={6} />
							{[-28, 0, 28].map((dx, i) => (
								<circle
									key={dx}
									cx={dx}
									cy={-6 * Math.max(0, Math.sin(f * 0.22 - i * 0.9))}
									r={7}
									fill={C.figureRim}
									opacity={0.9}
								/>
							))}
						</g>
					) : null}
				</g>
			) : null}
			<FallingTear
				frame={f}
				x={anchor.x}
				y0={anchor.y}
				groundY={WATER_Y}
				r={11}
				formStart={T.tearForm}
				detach={T.tearFall}
				land={T.tearLand}
			/>
			{/* 全屏冲击波 */}
			{hitT >= 0 && hitT < 40 ? (
				<g>
					{[0, 6].map((d) => {
						const tt = hitT - d;
						if (tt < 0) return null;
						const rx = 80 + tt * 70;
						return (
							<ellipse
								key={d}
								cx={TITLE.x}
								cy={WATER_Y}
								rx={rx}
								ry={rx * 0.24}
								fill="none"
								stroke={C.blue}
								strokeWidth={6 - d * 0.5}
								opacity={Math.max(0, 0.75 * (1 - tt / 34))}
							/>
						);
					})}
				</g>
			) : null}
			<Burst frame={f} at={T.titleHit} x={TITLE.x} y={WATER_Y} count={46} power={10} />
			{titleOn && f < T.s4 ? (
				<g transform={`translate(${TITLE.x},${TITLE.baseline + titleDropOffset(f)}) scale(${1 + (1 - squash) * 0.5},${squash})`}>
					<text
						x={0}
						y={0}
						textAnchor="middle"
						fontFamily={FONT}
						fontWeight={900}
						fontSize={TITLE.size}
						fill={titleColor()}
						opacity={0.55 * clamp01(hitT >= 0 ? 1 : 0.3)}
						filter="url(#bigGlow)"
					>
						{titleWord()}
					</text>
					<text x={0} y={0} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={TITLE.size} fill={titleColor()}>
						{titleWord()}
					</text>
				</g>
			) : null}
		</g>
	);
};
