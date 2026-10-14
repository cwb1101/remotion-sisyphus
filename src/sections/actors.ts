import {cue, cueList, screen} from '../data/script';
import {lerpPose, NEUTRAL, pose, Pose, poseAt, SIT, walkPose} from '../components/Figure';
import {clamp01, kf, lerp, prog} from '../lib/anim';
import {DOOR, WALK, walkX, WATER_Y} from '../shot';

const DOOR_X = DOOR.x;

/**
 * 第四到第六节共用的角色状态（局部坐标，相对 S4_X）：
 * 小人推着水箱走、停下、坐下、起身、转身、拧阀门、走向门；
 * “问候的人”从右侧进场、伸手、陪着走到门边。
 * 三节组件只按时间读取这里的状态，保证跨节连续。
 */

export const P_H = 280;
export const OTHER_H = 320;
export const TANK = {w: 170, h: 230, bottom: WATER_Y - 22, gap: 192};
const SIT_Y = WATER_Y + 0.43 * P_H;

const s = (id: number) => screen(id).startFrame;

export const T4 = () => ({
	s20: s(20),
	s21: s(21),
	s22: s(22),
	s23: s(23),
	drips: cueList(23, 'drip'),
	s24: s(24),
	dark: cueList(24, 'dark'),
	s25: s(25),
	s26: s(26),
	touch: cue(26, 'touch'),
	s27: s(27),
	hit27: cue(27, 'hit'),
	s28: s(28),
	s29: s(29),
	sit: cue(29, 'sit'),
	s30: s(30),
	hit30: cue(30, 'hit'),
	s31: s(31),
	s32: s(32),
	s33: s(33),
	s34: s(34),
	s35: s(35),
	look: cue(35, 'look'),
	s36: s(36),
	valve: cue(36, 'valve'),
	s37: s(37),
	card: cue(37, 'card'),
	s38: s(38),
	land38: cue(38, 'land'),
	s39: s(39),
	hand: cue(39, 'hand'),
	s40: s(40),
	open40: cue(40, 'open'),
	s41: s(41),
	turn: cue(41, 'turn'),
	s42: s(42),
	marks: cueList(42, 'marks'),
	s43: s(43),
	open43: cue(43, 'open'),
	s44: s(44),
	door: cue(44, 'door'),
	s45: s(45),
	s46: s(46),
});

const PUSH: Partial<Pose> = {lean: 10, pitch: 4, shoulderF: 72, elbowF: 18, shoulderB: 64, elbowB: 22};
const PUSH_HARD: Partial<Pose> = {lean: 17, pitch: 10, shoulderF: 76, elbowF: 22, shoulderB: 68, elbowB: 26};
const STAND_HOLD = pose({lean: 4, pitch: 6, shoulderF: 62, elbowF: 20, shoulderB: 56, elbowB: 22});
const BEND_VALVE = pose({lean: 26, pitch: 16, shoulderF: 30, elbowF: 4, shoulderB: 10, elbowB: 10});
const STAND = pose({pitch: 4});

/** 小人在 S45 推车时的起点：先走到水箱后面再一起推 */
const PUSH2_START = () => T4().s45 + 18;

export const tankX = (f: number) => {
	const T = T4();
	if (f < WALK.stop) return walkX(f) + TANK.gap;
	const parked = walkX(WALK.stop) + TANK.gap;
	if (f < PUSH2_START()) return parked;
	return parked + WALK.speed * (Math.min(f, T.s46 + 30) - PUSH2_START());
};

/** 行走相位（第 24 屏开始步子变沉） */
const walkPhase = (f: number) => {
	const T = T4();
	return (Math.min(f, T.s24) - T.s20) / 13 + Math.max(0, f - T.s24) / 17;
};

export interface ActorState {
	x: number;
	y: number;
	facing: number;
	pose: Pose;
	opacity: number;
	breath: number;
}

export const person = (f: number): ActorState => {
	const T = T4();
	const parkedX = walkX(WALK.stop);
	const sitX = parkedX - 90;
	const standX = parkedX - 40;
	const backX = standX - 70;
	let x = parkedX;
	let y = WATER_Y;
	let facing = 1;
	let ps: Pose;

	if (f < WALK.stop) {
		x = walkX(f);
		const base = f < T.s24 ? PUSH : PUSH_HARD;
		ps = walkPose(walkPhase(f), base, f < T.s24 ? 1 : 0.8);
	} else if (f < T.s29) {
		ps = poseAt(f, [
			[WALK.stop, walkPose(walkPhase(WALK.stop), PUSH_HARD, 0.8)],
			[WALK.stop + 10, STAND_HOLD],
			[T.hit27 - 2, STAND_HOLD],
			[T.hit27 + 12, pose({lean: 8, pitch: 24, shoulderF: 12, elbowF: 12, shoulderB: 4, elbowB: 10})],
			[T.s29, pose({lean: 7, pitch: 22, shoulderF: 8, elbowF: 10})],
		]);
	} else if (f < T.s36) {
		// 第五节：退半步、坐下、抬头
		const stepBack = prog(f, T.s29, T.sit + 4);
		x = lerp(parkedX, sitX, stepBack);
		const down = prog(f, T.sit + 2, T.sit + 26);
		y = lerp(WATER_Y, SIT_Y, down);
		const sitPose = pose({...SIT, pitch: 28, shoulderF: 34, elbowF: 44, shoulderB: 26, elbowB: 40});
		const stepping = f < T.sit + 4 ? walkPose((f - T.s29) / 9, {pitch: 20, lean: 4}, 0.45) : pose({pitch: 22, lean: 6});
		ps = lerpPose(stepping, sitPose, down);
		const twitch = f >= T.hit30 && f < T.hit30 + 12 ? 4 * Math.sin(((f - T.hit30) / 12) * Math.PI) : 0;
		const straighten = prog(f, T.s31, T.s31 + 60);
		const lookUp = prog(f, T.look, T.look + 20);
		ps = {
			...ps,
			lean: ps.lean - 4 * straighten - twitch,
			pitch: lerp(lerp(ps.pitch, 12, straighten), -10, lookUp),
		};
	} else if (f < T.s41) {
		// 第六节前半：起身、拿卡片、举给对方、抬手“稍等”、拧阀门
		const up = prog(f, T.s36 + 4, T.s36 + 28);
		y = lerp(SIT_Y, WATER_Y, up);
		x = lerp(sitX, standX, prog(f, T.s36 + 22, T.s36 + 42));
		x = lerp(x, standX - 18, prog(f, T.s39, T.hand));
		const seated = pose({...SIT, pitch: -10, lean: 2, shoulderF: 34, elbowF: 44, shoulderB: 26, elbowB: 40});
		const standing = f < T.s36 + 42 && f > T.s36 + 22 ? walkPose((f - T.s36 - 22) / 10, {pitch: 0}, 0.6) : STAND;
		ps = lerpPose(seated, standing, up);
		if (f >= T.s36 + 42) {
			ps = poseAt(f, [
				[T.s36 + 42, STAND],
				[T.card - 10, STAND],
				[T.card + 4, pose({pitch: 8, shoulderF: 48, elbowF: 58, shoulderB: -4})],
				[T.land38 + 4, pose({pitch: 10, shoulderF: 48, elbowF: 58, shoulderB: -4})],
				[T.land38 + 22, pose({pitch: 0, shoulderF: 78, elbowF: 8, shoulderB: -4})],
				[T.s39, pose({pitch: 0, shoulderF: 70, elbowF: 10})],
				[T.hand + 4, pose({lean: -4, pitch: -4, shoulderF: 86, elbowF: 96, shoulderB: -6})],
				[T.s40 + 10, pose({lean: -4, pitch: -4, shoulderF: 84, elbowF: 96, shoulderB: -6})],
				[T.open40 - 6, STAND],
				[T.open40 + 6, BEND_VALVE],
				[T.s41 - 12, BEND_VALVE],
				[T.s41, STAND],
			]);
		}
	} else if (f < T.s45) {
		// 第六节后半：转身回看、指认、再转回来提前放水、看向门
		x = standX - 18;
		const turnA = prog(f, T.turn, T.turn + 12);
		const walkL = prog(f, T.turn + 12, T.s41 + 60, (t) => t);
		const turnB = prog(f, T.s43 + 2, T.s43 + 10);
		const walkR = prog(f, T.s43 + 10, T.open43 - 8, (t) => t);
		x = lerp(lerp(x, backX, walkL), standX - 18, walkR);
		facing = lerp(lerp(1, -1, turnA), 1, turnB);
		const walking = (walkL > 0 && walkL < 1) || (walkR > 0 && walkR < 1);
		if (walking) {
			ps = walkPose((f - T.s41) / 10, {pitch: 6}, 0.8);
		} else if (f < T.s43) {
			const point = prog(f, T.marks[0] - 8, T.marks[0] + 4);
			ps = lerpPose(STAND, pose({pitch: 18, shoulderF: 40, elbowF: 0}), point);
		} else {
			ps = poseAt(f, [
				[T.open43 - 8, STAND],
				[T.open43, BEND_VALVE],
				[T.open43 + 24, BEND_VALVE],
				[T.open43 + 34, STAND],
				[T.door, STAND],
				[T.door + 20, pose({pitch: -6, lean: -2})],
			]);
		}
	} else {
		// 第 45 屏：走回水箱后，推向门
		const start = standX - 18;
		const p2 = PUSH2_START();
		if (f < p2) {
			x = lerp(start, parkedX, prog(f, T.s45, p2, (t) => t));
			ps = walkPose((f - T.s45) / 10, {pitch: 0}, 0.7);
		} else {
			x = tankX(f) - TANK.gap;
			ps = walkPose((f - p2) / 13, PUSH, 1);
		}
	}
	return {x, y, facing, pose: ps, opacity: 1, breath: f / 95};
};

/** 问候的人：从右侧进场，伸手，之后陪着，最后走到门边等 */
export const other = (f: number): ActorState => {
	const T = T4();
	const x0 = 2150;
	const stand = walkX(WALK.stop) + TANK.gap + 175;
	const doorSide = 2225;
	let x = stand;
	let facing = -1;
	let ps: Pose = pose({pitch: 6});
	const enter = prog(f, T.s25 + 6, T.s25 + 54, (t) => t);
	if (f < T.s25 + 54) {
		x = lerp(x0, stand, enter);
		ps = walkPose((f - T.s25) / 12, {pitch: 6}, 0.9);
	} else if (f < T.s44) {
		const nod = (at: number) => (f >= at && f < at + 36 ? 9 * Math.sin(((f - at) / 36) * Math.PI * 2) : 0);
		ps = poseAt(f, [
			[T.s25 + 54, pose({pitch: 6})],
			[T.touch - 18, pose({pitch: 10, lean: 3})],
			[T.touch - 2, pose({pitch: 12, lean: 5, shoulderF: 72, elbowF: 14})],
			[T.hit27 + 6, pose({pitch: 12, lean: 5, shoulderF: 70, elbowF: 16})],
			[T.hit27 + 24, pose({pitch: 14, lean: 3, shoulderF: 6})],
		]);
		ps = {...ps, pitch: ps.pitch + nod(T.look + 12) + nod(T.hand)};
	} else {
		// 转身，先走到门口，回头等一下，再走进门光里
		const turnR = prog(f, T.s44 + 6, T.s44 + 16);
		const walk = prog(f, T.s44 + 16, T.s44 + 72, (t) => t);
		const look = prog(f, T.s44 + 74, T.s44 + 82) * (1 - prog(f, T.s45 - 4, T.s45 + 4));
		const into = prog(f, T.s45 + 4, T.s45 + 40, (t) => t);
		facing = lerp(lerp(-1, 1, turnR), -1, look);
		x = lerp(lerp(stand, doorSide, walk), DOOR_X, into);
		ps = (walk > 0 && walk < 1) || (into > 0 && into < 1) ? walkPose((f - T.s44) / 12, {pitch: 4}, 0.9) : pose({pitch: 6});
		return {x, y: WATER_Y, facing, pose: ps, opacity: 1 - prog(f, T.s45 + 16, T.s45 + 40), breath: f / 110};
	}
	return {x, y: WATER_Y, facing, pose: ps, opacity: clamp01(prog(f, T.s25, T.s25 + 10)), breath: f / 110};
};

/** 第 21 屏的后景对照人物：同样推着水箱，门槛更高 */
export const ghost = (f: number) => {
	const T = T4();
	const op = 0.38 * prog(f, T.s21, T.s21 + 16) * (1 - prog(f, T.s22, T.s22 + 24));
	return {
		x: walkX(f) + 360,
		y: WATER_Y - 60,
		pose: walkPose(walkPhase(f) + 0.5, PUSH, 1),
		opacity: op,
	};
};

// ---------- 水箱 ----------

export const tankHole = (f: number) => lerp(0.55, 0.48, prog(f, T4().s22, T4().s22 + 28));

export const tankLevel = (f: number) => {
	const T = T4();
	let v = 0.12;
	for (const d of T.drips) v += 0.08 * prog(f, d, d + 10);
	for (const d of T.dark) v += 0.06 * prog(f, d, d + 10);
	// 最后一滴：越过门槛，从孔里流走，回到门槛高度
	v += 0.07 * prog(f, T.hit27, T.hit27 + 6) - 0.07 * prog(f, T.hit27 + 6, T.hit27 + 60);
	v -= 0.06 * prog(f, T.s31, T.s32);
	v -= 0.1 * prog(f, T.s34, T.s35);
	v -= 0.1 * prog(f, T.open40 + 4, T.s41);
	v += 0.06 * prog(f, T.open43 - 4, T.open43 + 4) - 0.06 * prog(f, T.open43 + 6, T.open43 + 34);
	v += 0.24 * prog(f, T.s44 + 8, T.s45 - 10);
	return v;
};

export const tankSlosh = (f: number) => {
	const T = T4();
	return kf(f, [
		[T.s22, 1],
		[T.s22 + 20, 1.8],
		[T.s24, 1.8],
		[T.s24 + 10, 2.6],
		[WALK.stop + 20, 1.6],
		[T.s29, 1.2],
		[T.s35, 0.6],
		[T.s44, 0.6],
		[T.s44 + 30, 1.6],
	]);
};

export const valveState = (f: number) => {
	const T = T4();
	const show = prog(f, T.valve - 6, T.valve + 8);
	let angle = 90 * prog(f, T.open40, T.open40 + 10) + 90 * prog(f, T.open43, T.open43 + 10);
	if (f > T.door - 12) angle += (f - (T.door - 12)) * 14;
	return {show, angle};
};

/** 阀门出水的时间点（落地帧） */
export const valveDrops = () => {
	const T = T4();
	const out: number[] = [];
	for (let t = T.open40 + 8; t < T.s41 - 6; t += 9) out.push(t);
	for (let t = T.open43 + 6; t < T.open43 + 32; t += 9) out.push(t);
	for (let t = T.door - 4; t < T.s46; t += 10) out.push(t);
	return out;
};

/** 越过门槛后从孔里漏出的眼泪（落地帧） */
export const holeDrops = () => {
	const T = T4();
	const out: number[] = [];
	for (let t = T.hit27 + 10; t < T.hit27 + 70; t += 10) out.push(t);
	return out;
};

export {NEUTRAL};
