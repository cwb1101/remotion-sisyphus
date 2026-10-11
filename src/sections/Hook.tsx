/**
 * 第一节 · 钩子（屏 1–4）
 * 场景：昏暗的房间，一束窄聚光。镜头从「母子」中景一路推近到孩子的心跳。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, sectionRange} from '../data/script';
import {C} from '../theme';
import {Cam, CamKey, project} from '../lib/camera';
import {clamp, easeIn, easeOut, lerp, prog, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {Shell} from '../components/Shell';
import {HeartLine} from '../components/HeartLine';
import {World} from '../components/World';

const R = sectionRange('hook');
const s1 = S(1);
const s2 = S(2);
const s3 = S(3);
const s4 = S(4);
const SNAP = cue(1, 'click', 44);
const IMPACT = cue(3, 'hit', 7);

/** 本节结束时孩子的状态（下一节从这里接着长大） */
export const HOOK_END = {x: 0, y: 0, r: 48, rings: 1};
export const BABY_R = 48;
const MOM_R = 120;

export const hookCamera: CamKey[] = [
	{f: s1.start, x: 85, y: 0, z: 1.55, sy: 400},
	{f: s1.end, x: 20, y: 0, z: 1.85, sy: 400},
	{f: s2.end, x: 0, y: 0, z: 2.5, sy: 410},
	{f: IMPACT, x: 0, y: 0, z: 3.7, sy: 480, ease: easeOut},
	{f: s3.end, x: 0, y: 0, z: 4.2, sy: 500},
	{f: s4.start + 18, x: 0, y: 0, z: 3.1, sy: 360},
	{f: s4.end, x: 0, y: 0, z: 2.9, sy: 350},
];

export const Hook: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame > R.end + 40) return null;
	const beat = pulseAt(frame);
	// 妈妈：缓缓滑出画面
	const momX = lerp(170, 1500, prog(frame, s1.start + 6, s1.end - 2, easeIn));
	const momOpacity = 1 - prog(frame, s1.end - 10, s1.end + 10);
	// 连线：被拉长，在「咔哒」处断开并回弹
	const snapped = frame >= SNAP;
	const recoil = springAt(frame, SNAP, {damping: 12, stiffness: 120});
	const babyEdge = BABY_R;
	const momEdge = momX - MOM_R;
	const tetherW = lerp(6, 1.6, clamp((momEdge - babyEdge) / 500));
	// 防御环：第 2 屏淡入
	const rings = prog(frame, s2.start + 8, s2.start + 55, easeOut);
	// 「表面」高亮时环闪一下；「身体」高亮时心率线加粗
	const surfaceFlash = Math.exp(-Math.max(0, frame - (s4.start + 3)) / 6) * (frame >= s4.start + 3 ? 1 : 0);
	const bodyFlash = Math.exp(-Math.max(0, frame - (s4.start + 8)) / 6) * (frame >= s4.start + 8 ? 1 : 0);

	const core = project(cam, 0, 0);
	const hlOpacity = 1 - prog(frame, R.end, R.end + 22);
	const amp = lerp(60, 115, prog(frame, s3.start, s4.start + 10));

	return (
		<AbsoluteFill>
			{frame < R.end && (
			<World cam={cam} frame={frame}>
				{/* 妈妈的影子（柔光） */}
				<circle cx={momX} cy={14} r={MOM_R * 1.25} fill={C.ink} opacity={0.06 * momOpacity} />
				{/* 连线 */}
				{!snapped && <line x1={babyEdge} y1={0} x2={momEdge} y2={0} stroke={C.ink} strokeWidth={tetherW} strokeLinecap="round" />}
				{snapped && frame < SNAP + 20 && (
					<g opacity={1 - clamp((frame - SNAP) / 20)}>
						<line
							x1={babyEdge}
							y1={0}
							x2={babyEdge + lerp((momEdge - babyEdge) * 0.5, 4, recoil)}
							y2={0}
							stroke={C.ink}
							strokeWidth={2.2}
							strokeLinecap="round"
						/>
						<line
							x1={momEdge - lerp((momEdge - babyEdge) * 0.5, 4, recoil)}
							y1={0}
							x2={momEdge}
							y2={0}
							stroke={C.ink}
							strokeWidth={2.2}
							strokeLinecap="round"
						/>
					</g>
				)}
				<Shell x={momX} y={0} r={MOM_R} solid opacity={momOpacity} />
				<Shell
					x={0}
					y={0}
					r={BABY_R}
					rings={rings}
					ringOpacity={0.5 + surfaceFlash * 0.45}
					ringWidth={0.05}
					ringRot={frame < s3.start ? frame * 0.25 : s3.start * 0.25}
					beat={beat}
					coreGlow={lerp(0.5, 1.1, prog(frame, s3.start, s3.end))}
					bodyStroke={0.045}
				/>
			</World>
			)}
			<HeartLine
				frame={frame}
				startFrame={s3.start}
				baseY={935}
				amp={amp}
				anchor={core}
				opacity={hlOpacity}
				strokeWidth={5 + bodyFlash * 4}
			/>
		</AbsoluteFill>
	);
};
