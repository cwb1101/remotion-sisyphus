// 第 4 节 落到你身上 (屏 19-25): 夜里的卧室, 一个穿连帽衫的普通人 (观众替身)
// 从上一节合流的杯里穿进来, 出口是这个人的手机屏幕 (杯 -> 手机)
// 低谷段每小节一下心跳 = 拿起一次手机, 墙上多一道刻痕, 一共 7 下; 床头柜上的杯一点点变空
// 抽空的那一小节屏住呼吸, 67.9 秒的重击是手机一震, 这个人一下坐起来 -> 只是一条广告
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, useRenderMode, type CharacterProps} from '../components/Character';
import {Cup} from '../components/Cup';
import {Bed, Bubble, NightWindow, Nightstand, Phone, Tally} from '../components/Props';
import {BARS, plusBeats} from '../data/beatmap';
import {poseAt} from '../data/poses';
import {cueFrame, screenById} from '../lib/timeline';
import {COLORS} from '../theme';
import {PLACES, VIEWER_KEYS, VIEWER_LOOK} from './cast';

const S = (id: number) => screenById(id);
export const YOU_START = S(19).startFrame;
export const YOU_END = S(26).startFrame;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 7 次看手机: 低谷段每个小节的第一拍 */
export const GLANCES = BARS.filter((b) => b >= YOU_START && b < S(24).startFrame);

const T = {
	send: cueFrame(S(19), 1),
	sitEdge: S(22).startFrame,
	lieAgain: S(24).startFrame,
	buzz: S(25).startFrame,
	slump: cueFrame(S(25), 2),
};

/** 卧室: 一直都在, 第 6 节结尾和第 7 节主角也会回到这里 */
export const Bedroom: React.FC = () => {
	const f = useCurrentFrame();
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const w = PLACES.bedroomWall;
	const b = PLACES.bed;
	// 第 7 节主角在这里起身时, 床头的灯亮起来
	const lamp = interpolate(f, [S(41).startFrame, S(41).startFrame + 30], [0, 1], clamp);
	return (
		<g>
			<defs>
				<linearGradient id="bed-wall" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor="#11131A" />
					<stop offset="1" stopColor="#1B1712" />
				</linearGradient>
				<radialGradient id="moon-floor">
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.16} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0} />
				</radialGradient>
				<radialGradient id="bed-lamp">
					<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.4} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={w.x0} y={-1200} width={w.x1 - w.x0} height={1200} fill="url(#bed-wall)" />
			<rect x={w.x0} y={0} width={w.x1 - w.x0} height={700} fill="#120E0A" />
			<rect x={w.x1} y={-1200} width={8} height={1200} fill="#0A0806" />
			<NightWindow x={PLACES.window.x} y={PLACES.window.y} w={260} h={300} />
			<polygon points={`${PLACES.window.x - 130},${PLACES.window.y + 150} ${PLACES.window.x + 130},${PLACES.window.y + 150} ${PLACES.window.x + 330},0 ${PLACES.window.x - 60},0`} fill={COLORS.ivory} opacity={0.04} />
			<ellipse cx={PLACES.window.x + 140} cy={4} rx={260} ry={30} fill="url(#moon-floor)" />
			<Bed x0={b.x0} x1={b.x1} top={b.top} />
			<Nightstand x={PLACES.nightstand.x} top={PLACES.nightstand.top} />
			<rect x={PLACES.nightstand.x - 6} y={PLACES.nightstand.top - 70} width={12} height={70} fill="#2A1D13" />
			<path d={`M ${PLACES.nightstand.x - 26} ${PLACES.nightstand.top - 70} L ${PLACES.nightstand.x + 26} ${PLACES.nightstand.top - 70} L ${PLACES.nightstand.x + 16} ${PLACES.nightstand.top - 104} L ${PLACES.nightstand.x - 16} ${PLACES.nightstand.top - 104} Z`} fill="#3A2B1E" stroke={COLORS.goldDim} strokeWidth={1} />
			{lamp > 0 ? <circle cx={PLACES.nightstand.x} cy={PLACES.nightstand.top - 90} r={260} fill="url(#bed-lamp)" opacity={lamp} /> : null}
		</g>
	);
};

export const viewerPlace = (f: number, fps: number) => {
	// 躺着 -> 坐到床沿 -> 躺回去 -> 坐起 -> 倒回去
	const lie = {x: PLACES.viewerLie, y: PLACES.bed.top};
	const edge = {x: PLACES.bedEdge, y: 0};
	const toEdge = spring({frame: f - T.sitEdge, fps, config: {damping: 20, stiffness: 120}});
	const toLie = spring({frame: f - T.lieAgain, fps, config: {damping: 20, stiffness: 120}});
	const k = Math.min(1, Math.max(0, toEdge - toLie));
	return {x: lie.x + (edge.x - lie.x) * k, y: lie.y + (edge.y - lie.y) * k};
};

export const You: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (f < YOU_START - 2 || f >= YOU_END + 2) return null;

	const place = viewerPlace(f, fps);
	const state = poseAt(VIEWER_KEYS, f, fps, 0, 1);
	const seated = f >= T.sitEdge && f < T.lieAgain;
	const up = f >= T.buzz && f < T.slump;

	// 第几次看手机, 这一次的进度
	const done = GLANCES.filter((g) => f >= g).length;
	const last = GLANCES[done - 1] ?? -999;
	const lift = done ? interpolate(f - last, [0, 4, 30, 50], [0, 1, 1, 0], clamp) : 0;
	const light = Math.max(
		f < T.send + 6 ? 0.8 : 0,
		lift * 0.9,
		interpolate(f, [T.lieAgain, T.buzz - 2, T.buzz], [0.15, 0.55, 1], clamp),
	);

	// 手机在哪: 躺着举在胸口上方, 坐床沿时放在床上, 坐起来拿在面前
	let phone = {x: place.x - 72, y: -175 - 60 * Math.max(lift, f < T.send + 10 ? 1 : 0)};
	if (seated) phone = f < S(23).startFrame ? {x: PLACES.bedEdge - 110, y: PLACES.bed.top - 6} : {x: place.x + 52, y: -262};
	if (f >= T.lieAgain) phone = {x: place.x - 72, y: -236};
	if (up) phone = {x: place.x + 58, y: -250};
	if (f >= T.slump) phone = {x: place.x - 60, y: interpolate(f, [T.slump, T.slump + 10], [-236, -180], clamp)};
	const holding = !(seated && f < S(23).startFrame);

	const props: CharacterProps = {
		...VIEWER_LOOK,
		x: place.x,
		y: up ? PLACES.bed.top : place.y,
		state,
		light: [0.3, -0.95],
		rim: 0.7,
		ikF: holding ? {x: phone.x + 4, y: phone.y + 12} : null,
		ikB: holding ? {x: phone.x - 6, y: phone.y + 16} : null,
		ikWeight: 1,
	} as CharacterProps;

	// 床头柜上的杯: 每看一次手机就少一截
	const cupFill = interpolate(done, [0, 7], [0.6, 0.04]) - (f >= T.buzz ? 0.04 : 0);
	// 墙上的影子戏: 屏 22 里一个小人转身走远
	const sh0 = S(22).startFrame;
	const shadowKeys = [{frame: sh0, pose: 'stand' as const, facing: 1 as const}, {frame: plusBeats(sh0, 1), pose: 'walk' as const}];
	const shadowX = interpolate(f, [plusBeats(sh0, 1), S(23).startFrame], [-1500, -1200], clamp);
	const shadowOn = interpolate(f, [sh0, sh0 + 10, S(23).startFrame - 6, S(23).startFrame], [0, 1, 1, 0], clamp);

	return (
		<g>
			<Cup id="bed-cup" x={PLACES.nightstand.x + 2} y={PLACES.nightstand.top} scale={0.7} fill={Math.max(0, cupFill)} liquid={COLORS.liquidHero} stain={1} />
			<Tally x={PLACES.tally.x} y={PLACES.tally.y} n={done} fresh={lift} />
			{shadowOn > 0 ? (
				<Character x={shadowX} y={-130} scale={0.55} state={poseAt(shadowKeys, f, fps, 0, 1)} color="#06070A" rim={0} opacity={0.6 * shadowOn} hair="crop" seed={77} build={1.1} />
			) : null}
			<Character {...props} />
			<Phone id="viewer" x={phone.x} y={phone.y} rot={seated ? -20 : 0} light={light} ad={up || f >= T.slump ? 1 : 0} />
			<Bubble x={phone.x + 60} y={phone.y - 70} text="睡了吗" t={interpolate(f, [T.send - 4, T.send + 4, T.send + 26, T.send + 34], [0, 1, 1, 0], clamp)} tail={-1} />
		</g>
	);
};
