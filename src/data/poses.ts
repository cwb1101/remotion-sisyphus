// 动作库: 关节角度 (度), 人物朝右时的数值, 朝左由 Character 镜像
//
// 角度约定 (都从 竖直向下 量起, 正值 = 往人物面朝的方向转):
//   torso  躯干前倾 (从骨盆往上量, 正 = 上身往前)
//   neck   低头为正 抬头为负 (相对躯干)
//   arm.sh 肩: 上臂相对竖直向下的角度, 0 = 自然下垂, 90 = 平举向前, 180 = 举过头顶
//   arm.el 肘: 只能往前弯 0..160
//   arm.wr 腕
//   leg.hip 髋: 大腿相对竖直向下, 正 = 往前抬
//   leg.kn  膝: 只能往后弯 0..160
//   leg.an  踝: 脚掌相对小腿的修正
//   rot    整个人绕骨盆转 (跌倒用)
// F = 靠近镜头的一侧 (前景手脚), B = 远离镜头的一侧
import {spring} from 'remotion';
import {beatAt} from './beatmap';
import {clamp, lerp} from '../lib/random';

export type Arm = {sh: number; el: number; wr: number};
export type Leg = {hip: number; kn: number; an: number};
export type Pose = {
	torso: number;
	neck: number;
	rot: number;
	armF: Arm;
	armB: Arm;
	legF: Leg;
	legB: Leg;
	/** 'auto' = 最低点贴地; 'hands' = 手也算支撑点 (跌坐 爬起) */
	ground: 'auto' | 'hands';
};

export type PoseName =
	| 'stand' | 'walk' | 'run' | 'push' | 'pull' | 'sit' | 'lookUp' | 'lookDown' | 'reach' | 'point'
	| 'fall' | 'getUp' | 'turn' | 'raiseHand' | 'holdHead'
	| 'kneel' | 'holdCup' | 'pour' | 'offer' | 'lean' | 'leanBack' | 'carry' | 'stagger' | 'phone'
	| 'slump' | 'highFive' | 'pass' | 'lieSide' | 'hug' | 'type' | 'walkBack' | 'sitUp';

export type Expression = 'neutral' | 'sad' | 'surprised' | 'smile' | 'tense' | 'calm';

const arm = (sh: number, el: number, wr = 0): Arm => ({sh, el, wr});
const leg = (hip: number, kn: number, an = 0): Leg => ({hip, kn, an});

const STAND: Pose = {
	torso: 0, neck: 0, rot: 0,
	armF: arm(4, 10), armB: arm(-4, 10),
	legF: leg(4, 3), legB: leg(-4, 3),
	ground: 'auto',
};

const P = (o: Partial<Pose>): Pose => ({...STAND, ...o});

/** 静态动作 */
export const POSES: Record<Exclude<PoseName, 'walk' | 'run' | 'walkBack'>, Pose> = {
	stand: STAND,
	turn: STAND, // 转身 = 站姿 + 朝向翻转, 翻转由时间线处理
	push: P({torso: 18, armF: arm(84, 12), armB: arm(80, 22), legF: leg(22, 14), legB: leg(-26, 4)}),
	pull: P({torso: -16, neck: -4, armF: arm(62, 30), armB: arm(56, 42), legF: leg(26, 10), legB: leg(-14, 26)}),
	sit: P({torso: 4, neck: 4, armF: arm(28, 58), armB: arm(22, 62), legF: leg(88, 88), legB: leg(84, 84)}),
	lookUp: P({torso: -3, neck: -22, armF: arm(2, 8), armB: arm(-6, 8)}),
	lookDown: P({torso: 8, neck: 32, armF: arm(10, 28), armB: arm(4, 30)}),
	reach: P({torso: 12, neck: -4, armF: arm(86, 8, -6), armB: arm(-8, 12), legF: leg(10, 6)}),
	point: P({torso: 4, neck: -4, armF: arm(94, 0), armB: arm(-6, 10)}),
	// 跌坐: 屁股着地 双手往后撑地, 近侧腿伸直 远侧腿屈膝立起
	fall: P({torso: -30, neck: 12, rot: 0, armF: arm(-38, 6), armB: arm(-48, 6), legF: leg(86, 6), legB: leg(132, 128), ground: 'hands'}),
	getUp: P({torso: 12, neck: 6, armF: arm(42, 34), armB: arm(12, 20), legF: leg(86, 92), legB: leg(-8, 96), ground: 'auto'}),
	raiseHand: P({torso: -2, neck: -10, armF: arm(166, 12), armB: arm(-4, 10)}),
	holdHead: P({torso: 10, neck: 26, armF: arm(146, 128), armB: arm(140, 132), legF: leg(6, 10), legB: leg(-6, 10)}),
	kneel: P({torso: 4, neck: 10, armF: arm(20, 30), armB: arm(14, 30), legF: leg(2, 92), legB: leg(-2, 94)}),
	holdCup: P({torso: 2, neck: 8, armF: arm(32, 78), armB: arm(26, 82)}),
	pour: P({torso: 20, neck: 6, armF: arm(74, 26), armB: arm(70, 36)}),
	offer: P({torso: 10, neck: -2, armF: arm(70, 16), armB: arm(8, 20), legF: leg(12, 8)}),
	lean: P({torso: 38, neck: -12, armF: arm(62, 20), armB: arm(42, 30)}),
	leanBack: P({torso: -14, neck: -4, armF: arm(6, 32), armB: arm(0, 34)}),
	carry: P({torso: -10, neck: 8, armF: arm(40, 96), armB: arm(36, 100), legF: leg(10, 20), legB: leg(-10, 18)}),
	stagger: P({torso: -15, neck: 10, armF: arm(42, 98), armB: arm(38, 102), legF: leg(16, 34), legB: leg(-14, 30)}),
	phone: P({torso: 6, neck: 30, armF: arm(26, 106), armB: arm(22, 110)}),
	slump: P({torso: 14, neck: 34, armF: arm(4, 6), armB: arm(0, 6), legF: leg(4, 9), legB: leg(-4, 9)}),
	highFive: P({torso: -4, neck: -8, armF: arm(158, 22), armB: arm(-6, 12)}),
	pass: P({torso: 8, neck: 2, armF: arm(66, 20), armB: arm(0, 16)}),
	// 平躺: 整个人往后转 90 度, 头朝左 脸朝上
	lieSide: P({torso: 0, neck: -6, rot: -90, armF: arm(20, 90), armB: arm(10, 80), legF: leg(4, 2), legB: leg(-2, 6)}),
	// 在床上坐起: 腿伸直平放
	sitUp: P({torso: 4, neck: 8, armF: arm(28, 104), armB: arm(22, 108), legF: leg(88, 3), legB: leg(86, 6)}),
	hug: P({torso: 6, neck: 10, armF: arm(70, 70), armB: arm(64, 78), legF: leg(8, 6)}),
	type: P({torso: 6, neck: 26, armF: arm(30, 112), armB: arm(26, 116)}),
};

/** 走路循环: phase 每增加 1 = 两步; 前脚在 phase 为整数时落地, 后脚在 .5 落地 */
export const walkPose = (phase: number, amp = 1): Pose => {
	const w = 2 * Math.PI * phase;
	const legAt = (p: number): Leg => {
		const hip = 24 * amp * Math.cos(p);
		const kn = 5 + 42 * amp * Math.pow(Math.max(0, -Math.sin(p)), 1.2);
		return {hip, kn, an: clamp(-(hip - kn) * 0.55, -45, 45)};
	};
	return {
		...STAND,
		torso: 4,
		neck: 2,
		armF: arm(-18 * amp * Math.cos(w), 16 + 8 * Math.max(0, Math.cos(w))),
		armB: arm(18 * amp * Math.cos(w), 16 + 8 * Math.max(0, -Math.cos(w))),
		legF: legAt(w),
		legB: legAt(w + Math.PI),
	};
};

/** 跑步循环: phase 每增加 1 = 两步 */
export const runPose = (phase: number): Pose => {
	const w = 2 * Math.PI * phase;
	const legAt = (p: number): Leg => {
		const hip = 40 * Math.cos(p) + 6;
		const kn = 12 + 86 * Math.pow(Math.max(0, -Math.sin(p)), 1.1);
		// 踝角补偿让脚掌尽量放平, 但不超过 45 度
		return {hip, kn, an: clamp(-(hip - kn) * 0.5, -45, 45)};
	};
	return {
		...STAND,
		torso: 14,
		neck: -4,
		armF: arm(-40 * Math.cos(w) + 10, 84),
		armB: arm(40 * Math.cos(w) + 10, 84),
		legF: legAt(w),
		legB: legAt(w + Math.PI),
	};
};

/** 动作库清单 (交付给人看的中文名) */
export const POSE_LABELS: Record<PoseName, string> = {
	stand: '站立', walk: '走路循环', run: '奔跑', push: '推', pull: '拉', sit: '坐',
	lookUp: '抬头', lookDown: '低头', reach: '伸手', point: '指向', fall: '跌倒', getUp: '爬起',
	turn: '转身', raiseHand: '举手', holdHead: '抱头', kneel: '跪坐', holdCup: '捧杯', pour: '倒',
	offer: '递出', lean: '探身', leanBack: '后靠', carry: '抱重物', stagger: '被压弯', phone: '看手机',
	slump: '垂头丧气', highFive: '击掌', pass: '传递', lieSide: '躺下', hug: '拥抱', type: '打字',
	walkBack: '后退', sitUp: '坐起',
};

// ---------- 混合 ----------

const mixArm = (a: Arm, b: Arm, t: number): Arm => ({sh: lerp(a.sh, b.sh, t), el: lerp(a.el, b.el, t), wr: lerp(a.wr, b.wr, t)});
const mixLeg = (a: Leg, b: Leg, t: number): Leg => ({hip: lerp(a.hip, b.hip, t), kn: lerp(a.kn, b.kn, t), an: lerp(a.an, b.an, t)});

export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
	torso: lerp(a.torso, b.torso, t),
	neck: lerp(a.neck, b.neck, t),
	rot: lerp(a.rot, b.rot, t),
	armF: mixArm(a.armF, b.armF, t),
	armB: mixArm(a.armB, b.armB, t),
	legF: mixLeg(a.legF, b.legF, t),
	legB: mixLeg(a.legB, b.legB, t),
	ground: t < 0.5 ? a.ground : b.ground,
});

/** 关节限位: 肘和膝只能往一个方向弯, 防止反折 */
export const clampPose = (p: Pose): Pose => {
	const ca = (x: Arm): Arm => ({sh: clamp(x.sh, -80, 185), el: clamp(x.el, 0, 160), wr: clamp(x.wr, -60, 60)});
	const cl = (x: Leg): Leg => ({hip: clamp(x.hip, -60, 140), kn: clamp(x.kn, 0, 160), an: clamp(x.an, -50, 50)});
	return {...p, neck: clamp(p.neck, -45, 50), armF: ca(p.armF), armB: ca(p.armB), legF: cl(p.legF), legB: cl(p.legB)};
};

/** 一个动作关键帧: 从 frame 起切到 pose; lower 指定下半身用另一个动作 (比如上半身 伸手 + 下半身 坐) */
export type PoseKey = {
	frame: number;
	pose: PoseName;
	lower?: PoseName;
	expr?: Expression;
	facing?: 1 | -1;
	/** 提前多少帧开始过渡, 让动作的峰值正好落在拍上 */
	lead?: number;
	/** 过渡快慢: 'snap' 用于重卡点 */
	speed?: 'soft' | 'normal' | 'snap';
};

const SPRINGS = {
	soft: {damping: 22, stiffness: 70, mass: 1},
	normal: {damping: 20, stiffness: 150, mass: 0.9},
	snap: {damping: 16, stiffness: 420, mass: 0.7},
};

/** 单个关键帧在 frame 时的姿势 (走路 跑步按拍点算相位) */
const evalKey = (k: PoseKey, frame: number, phaseOffset: number): Pose => {
	const base = (name: PoseName): Pose => {
		if (name === 'walk') return walkPose((beatAt(frame) - beatAt(k.frame)) / 2 + phaseOffset);
		if (name === 'run') return runPose(beatAt(frame) - beatAt(k.frame) + phaseOffset);
		if (name === 'walkBack') return walkPose(-(beatAt(frame) - beatAt(k.frame)) / 2 + phaseOffset);
		return POSES[name];
	};
	const upper = base(k.pose);
	if (!k.lower) return upper;
	const lower = base(k.lower);
	// 下半身是躺着的动作时, 整体旋转也跟下半身走 (躺着打字 = 躺 + 打字的手)
	return {...upper, legF: lower.legF, legB: lower.legB, ground: lower.ground, rot: lower.rot !== 0 ? lower.rot : upper.rot};
};

export type PoseState = {pose: Pose; facing: number; expr: Expression; key: PoseKey};

/**
 * 按关键帧求当前姿势: 关键帧之间用 spring 插值, 朝向翻转也用 spring
 * keys 需按 frame 升序
 */
export const poseAt = (keys: PoseKey[], frame: number, fps: number, phaseOffset = 0, initialFacing: 1 | -1 = 1): PoseState => {
	if (keys.length === 0) return {pose: STAND, facing: initialFacing, expr: 'neutral', key: {frame: 0, pose: 'stand'}};
	let i = 0;
	while (i + 1 < keys.length && keys[i + 1].frame - (keys[i + 1].lead ?? 0) <= frame) i++;
	const cur = keys[i];
	const curPose = evalKey(cur, frame, phaseOffset);

	// 朝向: 逐个关键帧累计, 每次翻转单独做 spring
	let facing: number = initialFacing;
	let target: number = initialFacing;
	for (let j = 0; j <= i; j++) {
		const k = keys[j];
		const next = k.pose === 'turn' ? -target : (k.facing ?? target);
		if (next !== target) {
			const start = k.frame - (k.lead ?? 0);
			const t = spring({frame: frame - start, fps, config: SPRINGS.normal, durationInFrames: 8});
			facing = lerp(target, next, t);
			target = next;
		} else {
			facing = target;
		}
	}

	const expr = [...keys.slice(0, i + 1)].reverse().find((k) => k.expr)?.expr ?? 'neutral';
	if (i === 0 && frame >= cur.frame - (cur.lead ?? 0)) {
		return {pose: clampPose(curPose), facing, expr, key: cur};
	}
	const prev = keys[Math.max(0, i - 1)];
	const start = cur.frame - (cur.lead ?? 0);
	const t = spring({frame: frame - start, fps, config: SPRINGS[cur.speed ?? 'normal']});
	const prevPose = evalKey(prev, frame, phaseOffset);
	return {pose: clampPose(mixPose(prevPose, curPose, t)), facing, expr, key: cur};
};
