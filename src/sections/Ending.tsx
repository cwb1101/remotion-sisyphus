/**
 * 第八节 · 收尾（屏 56–59）——回收主线问题，呼应开头。
 * 接上一节：咨询室的灯暗下，舞台回到第二节「越靠近越想逃」的两束光：来人伸手，TA 沉默。
 * 镜头推进 TA 的心口——开头那条心率线又出现了：TA 不是没有心跳。
 * 拉回时 TA 变回开头那个站在冷光里的孩子，冰环淡到几乎看不见；这一次，暖光从右边回来了。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, cue, sectionRange, CITATIONS} from '../data/script';
import {Cam, CamKey, project} from '../lib/camera';
import {easeInOut, easeOut, lerp, prog} from '../lib/anim';
import {pulseAt} from '../lib/pulse';
import {REACH, SIT, STAND, mixPose} from '../lib/poses';
import {Avoider, Actor} from '../components/Avoider';
import {PAL, heartWorld} from '../components/Person';
import {World} from '../components/World';
import {HeartLine} from '../components/HeartLine';
import {Curtain, LIGHT, Spotlight, StageFloor} from '../components/Stage';
import {Lit, lightAt} from '../components/Lit';
import {Chair, Citation} from '../components/Props';
import {ADULT_SCALE} from './Question';
import {KID_SCALE, KID_RING_R} from './Hook';
import {X6} from './Cycle';
import {CHANGE_END} from './Change';

const R = sectionRange('ending');
const [s56, s57, s58, s59] = [56, 57, 58, 59].map(S);
const TA = CHANGE_END.taX;
const P = CHANGE_END.pX;
const IMPACT58 = cue(58, 'hit', 7);
const WARM_BACK = cue(58, 'chime', 50);
const HEART = heartWorld(TA, 1, ADULT_SCALE, -1);

export const endingCamera: CamKey[] = [
	{f: s56.start + 30, x: X6 + 450, y: 0, z: 0.8, sy: 900},
	{f: s56.end, x: X6 + 450, y: 0, z: 0.82, sy: 900},
	{f: s57.start + 36, x: HEART.x, y: HEART.y, z: 4.5, sy: 330, ease: easeInOut},
	{f: s57.end, x: HEART.x, y: HEART.y, z: 4.8, sy: 330},
	{f: IMPACT58 + 28, x: TA + 580, y: 0, z: 1.0, sy: 1000, ease: easeInOut},
	{f: s58.end, x: TA + 570, y: 0, z: 0.98, sy: 1000},
	{f: R.end, x: TA + 560, y: 0, z: 0.9, sy: 995},
];

export const Ending: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
	if (frame < R.start || frame > R.end) return null;
	const beat = pulseAt(frame);

	// 咨询室暗下，TA 起身转向来人
	const helpOff = 1 - prog(frame, s56.start, s56.start + 26);
	const stand = prog(frame, s56.start + 4, s56.start + 20, easeInOut);
	const facing = frame < s58.start + 30 ? lerp(1, -1, prog(frame, s56.start + 20, s56.start + 28, easeInOut)) : lerp(-1, 1, prog(frame, s58.start + 30, s58.start + 38, easeInOut));
	// 变回孩子
	const age = 1 - prog(frame, s58.start + 2, s58.start + 34, easeInOut);
	const scale = lerp(KID_SCALE, ADULT_SCALE, age);
	const pose = mixPose(SIT, {...STAND, head: 6}, stand);
	const heartScale = lerp(1, 3.3, prog(frame, s57.start, s57.start + 36, easeInOut)) * 1 - (lerp(1, 3.3, 1) - 1) * prog(frame, s58.start, s58.start + 30, easeInOut);

	// 来人：伸手，然后淡出
	const reach = prog(frame, s56.start + 10, s56.start + 30, easeOut);
	const pFade = 1 - prog(frame, s58.start, s58.start + 30);
	const warmI = lerp(0.8, 1, prog(frame, s56.start + 10, s56.start + 16)) * pFade;

	// 冰环：只剩一圈，越来越淡——「不让人看见」
	const rings = {
		count: lerp(CHANGE_END.ringCount, 1, prog(frame, s56.start, s56.start + 20)),
		r: lerp(130, KID_RING_R, 1 - age),
		gap: 40,
		frost: 0.15,
		thick: 4,
		spin: CHANGE_END.spin(frame),
		opacity: lerp(0.7, 0.22, prog(frame, s58.start + 20, s58.end)),
	};

	// 暖光从右边回来（开头妈妈是往右边走掉的）
	const warmBack = prog(frame, WARM_BACK - 30, WARM_BACK + 10, easeInOut);
	const warmBackX = lerp(TA + 1500, TA + 60, warmBack);
	const spots = [
		{x: P, width: 600, intensity: warmI},
		{x: TA, width: lerp(520, 420, 1 - age), intensity: 1},
		{x: warmBackX, width: 620, intensity: warmBack * 0.8},
	];

	const heartScreen = project(cam, heartWorld(TA, age, scale, facing > 0 ? 1 : -1).x, heartWorld(TA, age, scale).y);
	const ecgOn = frame >= s57.start + 8;
	const cite = prog(frame, s59.start + 8, s59.start + 20);
	const helpX = CHANGE_END.helpX;

	return (
		<AbsoluteFill>
			<World cam={cam} frame={frame}>
				<Curtain x0={X6 - 4200} x1={X6 + 6500} opacity={0.9 * (1 - prog(frame, s58.start, s58.end) * 0.6)} frame={frame} />
				<StageFloor tint="#0f141d" x0={X6 - 4200} x1={X6 + 6500} />
				<Spotlight x={P} color={LIGHT.warm} intensity={warmI} width={600} topWidth={170} tilt={-200} frame={frame} seed={61} />
				<Spotlight x={TA} color={LIGHT.cold} intensity={1} width={spots[1].width} topWidth={140} tilt={120} frame={frame} seed={62} />
				<Spotlight x={helpX} color="#F4F1EA" intensity={0.85 * helpOff} width={560} topWidth={160} frame={frame} seed={53} />
				<Spotlight x={warmBackX} color={LIGHT.warm} intensity={warmBack * 0.8} width={620} topWidth={200} tilt={300} frame={frame} seed={63} />
				<Chair x={TA} facing={1} opacity={helpOff} />
				<Chair x={helpX} facing={-1} opacity={helpOff} />
				{helpOff > 0.01 && <Actor x={helpX} scale={ADULT_SCALE} facing={-1} pose={SIT} palette={PAL.sage} face="smile" heart={0.5} opacity={helpOff} />}
				{pFade > 0.01 && (
					<Lit level={lightAt(P, spots)}>
						<Actor x={P} scale={ADULT_SCALE} facing={1} pose={mixPose(STAND, REACH, reach)} palette={PAL.warm} face="smile" heart={beat} opacity={pFade} />
					</Lit>
				)}
				<Lit level={lightAt(TA, spots)}>
					<Avoider x={TA} frame={frame} beat={beat} age={age} scale={scale} facing={facing} pose={pose} face={frame < s58.start ? 'flat' : 'neutral'} heartGlow={lerp(1.3, 1.9, prog(frame, s57.start, s58.start + 30))} heartScale={Math.max(1, heartScale)} rings={rings} />
				</Lit>
			</World>
			{ecgOn && <HeartLine frame={frame} startFrame={s57.start + 8} baseY={905} x0={600} x1={1820} amp={lerp(100, 80, prog(frame, s58.start, s58.end))} anchor={heartScreen} color="#FF4433" />}
			<Citation text={CITATIONS.join(' · ')} opacity={cite} bottom={22} />
		</AbsoluteFill>
	);
};
