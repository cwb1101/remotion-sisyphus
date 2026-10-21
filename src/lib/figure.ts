import {screen} from '../data/script';
import {headroom} from '../sections/continuity';
import {ROOM} from '../theme';
import {clamp, EASE, Key, lerp, track} from './anim';
import {addPose, CROUCH, fitUnder, mixPose, Pose, solve, STAND, walkPose, withPose} from './pose';

// 人物走位的公共算法：位置关键帧 → 步态相位、是否在走、在屋里要弯腰、出了屋可以站直

/** 屋内待着时的呼吸蹲姿（各节通用，保证交接处姿态一致） */
export const idleCrouch = (frame: number): Pose => withPose(CROUCH, {torso: CROUCH.torso + 1.5 * Math.sin(frame / 14)});

/** 沿关键帧轨道已经走过的路程（用于步态相位，避免滑步） */
export const trackDistance = (f: number, keys: Key[]): number => {
	let dist = 0;
	for (let i = 1; i < keys.length; i++) {
		const [f0, v0] = keys[i - 1];
		const [f1, v1, ease] = keys[i];
		if (f >= f1) {
			dist += Math.abs(v1 - v0);
		} else if (f > f0) {
			dist += Math.abs(v1 - v0) * (ease ?? EASE)((f - f0) / (f1 - f0));
			break;
		} else {
			break;
		}
	}
	return dist;
};

export type FigureState = {x: number; facing: number; pose: Pose; moving: boolean; phase: number; outside: number};

/**
 * 根据位置/朝向关键帧算出人物状态。
 * ceiling：天花板下沉量；roomRight：房间右墙（出了右墙 90px 后可以站直）
 */
export const figure = (
	frame: number,
	opts: {xKeys: Key[]; facingKeys?: Key[]; ceiling: number; roomRight?: number; stride?: number},
): FigureState => {
	const {xKeys, facingKeys, ceiling} = opts;
	const roomRight = opts.roomRight ?? ROOM.right;
	const x = track(frame, xKeys);
	const moving = Math.abs(track(frame + 1, xKeys) - x) > 0.25;
	const phase = (trackDistance(frame, xKeys) / (opts.stride ?? 70)) * Math.PI;
	const facing = facingKeys ? track(frame, facingKeys) : 1;
	const outside = clamp((x - (roomRight + 20)) / 90);
	const maxH = lerp(headroom(ceiling), 400, outside);
	let base = mixPose(idleCrouch(frame), STAND, outside);
	if (moving) {
		base = addPose(base, walkPose(phase, lerp(0.55, 1, outside)));
	}
	const pose = fitUnder(base, addPose(CROUCH, walkPose(phase, moving ? 0.5 : 0)), maxH);
	return {x, facing, pose, moving, phase, outside};
};

/** 第 11 屏起的“原地来回走”：沿同一串脚印左右往返，每 15 帧一步 */
export const LOOP = {start: screen(11).start, step: 15, left: 640, right: 1060};
export const loopWalker = (frame: number, ceiling: number): FigureState => {
	const speed = 84 / LOOP.step;
	const t = frame - LOOP.start;
	const tt = ((t % 170) + 170) % 170;
	let x: number;
	let facing: number;
	let moving: boolean;
	if (tt < 75) {
		x = LOOP.right - speed * tt;
		facing = -1;
		moving = true;
	} else if (tt < 85) {
		x = LOOP.left;
		facing = lerp(-1, 1, EASE((tt - 75) / 10));
		moving = false;
	} else if (tt < 160) {
		x = LOOP.left + speed * (tt - 85);
		facing = 1;
		moving = true;
	} else {
		x = LOOP.right;
		facing = lerp(1, -1, EASE((tt - 160) / 10));
		moving = false;
	}
	const phase = (Math.PI * t) / LOOP.step;
	let base = idleCrouch(frame);
	if (moving) {
		base = addPose(base, walkPose(phase, 0.55));
	}
	const pose = fitUnder(base, addPose(CROUCH, walkPose(phase, moving ? 0.5 : 0)), headroom(ceiling));
	return {x, facing, pose, moving, phase, outside: 0};
};

/** 把 b 姿态按权重 w 叠到 a 上，并保证不超过 maxH */
export const blendUnder = (a: Pose, b: Pose, w: number, maxH: number): Pose => fitUnder(mixPose(a, b, w), b, maxH);

/** 某个关节在世界坐标里的位置（未计 IK，适合肩、髋、头） */
export const jointWorld = (x: number, groundY: number, pose: Pose, facing: number, joint: 'shoulder' | 'head' | 'hip', scale = 1) => {
	const s = solve(pose);
	const dir = facing >= 0 ? 1 : -1;
	const hipY = groundY - s.groundOffset * scale;
	const p = s[joint];
	return {x: x + dir * p.x * scale, y: hipY + p.y * scale};
};
