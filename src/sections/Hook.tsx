/**
 * 第一节 · 钩子（屏 1–4）
 * 场景：漆黑里只有一束暖光，妈妈牵着孩子。妈妈松手、转身、走出光圈；
 * 孩子头顶亮起一束冷光，脚下结出第一圈冰环。镜头一路推进到孩子胸口——心在狂跳。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, sectionRange} from '../data/script';
import {Cam, CamKey, project} from '../lib/camera';
import {clamp, easeInOut, easeOut, lerp, prog} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {HOLD_DOWN, HOLD_UP, STAND, mixPose, strideFor, walk} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL, heartHeight} from '../components/Person';
import {HeartLine} from '../components/HeartLine';
import {World} from '../components/World';
import {LIGHT, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';

const R = sectionRange('hook');
const [s1, s2, s3, s4] = [1, 2, 3, 4].map(S);
const RELEASE = cue(1, 'click', 22);
const COLD_ON = cue(1, 'lamp', 40);
const IMPACT = cue(3, 'hit', 7);

export const KID_SCALE = 1.2;
const MOM_X0 = 190;
export const KID_RING_R = 95;
const HEART_Y = -heartHeight(0) * KID_SCALE;

/** 本节结束时孩子的状态（下一节从这里长大） */
export const HOOK_END = {x: 0, age: 0, scale: KID_SCALE, ringR: KID_RING_R, rings: 1, frost: 0.3};

export const hookCamera: CamKey[] = [
	{f: s1.start, x: 464, y: 0, z: 1.25, sy: 860},
	{f: s1.end, x: 400, y: 0, z: 1.4, sy: 870},
	{f: s2.end, x: 330, y: 0, z: 1.75, sy: 880},
	{f: IMPACT, x: 7, y: HEART_Y, z: 6.5, sy: 330, ease: easeOut},
	{f: s3.end, x: 7, y: HEART_Y, z: 7.3, sy: 330},
	{f: s4.start + 16, x: 330, y: 0, z: 1.9, sy: 870, ease: easeInOut},
	{f: s4.end, x: 320, y: 0, z: 1.85, sy: 870},
];

/** 妈妈走开的位移：先起步加速，再匀速 */
const momDist = (f: number) => {
	const t = f - (RELEASE + 6);
	if (t <= 0) return 0;
	return t < 10 ? 0.42 * t * t : 42 + 8.4 * (t - 10);
};

export const Hook: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame > R.end + 30) return null;
	const beat = pulseAt(frame);

	// 妈妈：松手 → 转身 → 走出光圈
	const d = momDist(frame);
	const momX = MOM_X0 + d;
	const turn = prog(frame, RELEASE, RELEASE + 8, easeInOut);
	const momFacing = lerp(-1, 1, turn);
	const momPose = d > 0 ? walk(strideFor(d), clamp(d / 30)) : mixPose(HOLD_DOWN, STAND, turn);

	// 孩子：松手后手臂慢慢垂下（没有去追）
	const kidPose = mixPose(HOLD_UP, STAND, prog(frame, RELEASE + 4, s2.start + 30, easeInOut));
	const rings = {count: prog(frame, s2.start + 10, s2.start + 55, easeOut), r: KID_RING_R, frost: lerp(0, 0.3, prog(frame, s2.start + 30, s2.end)), thick: 3, spin: frame * 0.6};
	const surfaceFlash = frame >= s4.start + 3 ? Math.exp(-(frame - s4.start - 3) / 6) : 0;
	const bodyFlash = frame >= s4.start + 8 ? Math.exp(-(frame - s4.start - 8) / 6) : 0;

	// 光：暖光跟着妈妈走远并熄灭；冷光在孩子头顶亮起
	const warmX = lerp(MOM_X0 / 2, momX, clamp(d / 200));
	const warmI = 1 - prog(momX, 520, 980);
	const coldI = prog(frame, COLD_ON, COLD_ON + 10) * (0.85 + 0.15 * Math.sin(frame * 1.7) * (1 - prog(frame, COLD_ON + 10, COLD_ON + 16)));
	const spots = [
		{x: warmX, width: 760, intensity: warmI},
		{x: 0, width: 400, intensity: coldI},
	];

	const heart = project(cam, 7, HEART_Y);
	const hlOpacity = 1 - prog(frame, R.end, R.end + 18);
	const amp = lerp(60, 110, prog(frame, s3.start, s4.start + 10));

	return (
		<AbsoluteFill>
			{frame < R.end && (
				<World cam={cam} frame={frame}>
					<StageFloor tint="#16110d" />
					<Spotlight x={warmX} color={LIGHT.warm} intensity={warmI} width={760} topWidth={220} frame={frame} seed={1} />
					<Spotlight x={0} color={LIGHT.cold} intensity={coldI} width={400} topWidth={120} frame={frame} seed={2} />
					<Lit level={lightAt(momX, spots)}>
						<Actor x={momX} scale={1.3} facing={momFacing} pose={momPose} palette={PAL.mom} face={turn > 0.5 ? 'none' : 'smile'} heart={-1} />
					</Lit>
					<Lit level={Math.min(1, lightAt(0, spots) + surfaceFlash * 0.3)}>
						<Avoider x={0} frame={frame} beat={beat} age={0} scale={KID_SCALE} facing={1} pose={kidPose} face="neutral" heartGlow={lerp(1, 1.9, prog(frame, s3.start, s3.end))} heartScale={lerp(1, 4.2, prog(frame, s3.start, IMPACT, easeOut)) * (1 - 0.76 * prog(frame, s4.start, s4.start + 16, easeInOut)) + 0.0} rings={{...rings, opacity: 1 + surfaceFlash}} />
					</Lit>
				</World>
			)}
			<HeartLine frame={frame} startFrame={s3.start} baseY={905} x0={600} x1={1820} amp={amp} anchor={heart} opacity={hlOpacity} strokeWidth={5 + bodyFlash * 4} color="#FF4433" />
		</AbsoluteFill>
	);
};
