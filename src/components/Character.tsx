// 骨骼人物: 关节角度驱动 (颈 肩 肘 腕 髋 膝 踝)
// 画风: 实心暗色剪影 + 迎光一侧金色轮廓光, 头身比 1:7
// 默认开启 呼吸 眨眼 衣角头发摆动 重心轻晃
import React, {createContext, useContext} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {Expression, Pose, PoseState} from '../data/poses';
import {COLORS} from '../theme';
import {mulberry32} from '../lib/random';

export type Feature = 'scarf' | 'hood' | 'none';
export type Hair = 'bob' | 'short' | 'bun' | 'crop' | 'long';
export type Vec = {x: number; y: number};
export type RenderMode = 'normal' | 'chars' | 'subs';

/** 渲染模式: 'chars' 时人物画成纯色遮罩 (身体红 头绿 手蓝 脚黄), 用于自动质检 */
export const RenderModeContext = createContext<RenderMode>('normal');
export const useRenderMode = () => useContext(RenderModeContext);

export const MASK = {body: '#ff0000', head: '#00ff00', hand: '#0000ff', foot: '#ffff00'};

// 尺寸 (scale 1, 身高约 420px = 7 个头)
const D = {
	headR: 30, neck: 14, torso: 130, upper: 80, fore: 72, hand: 20,
	thigh: 104, shin: 98, ankleH: 12, footF: 32, footB: 10,
	shoulderW: 21, hipW: 24,
	upperR: [13, 10.5], foreR: [10.5, 8], handR: 8.5, thighR: [15, 11], shinR: [11, 7.5],
};
export const CHARACTER_HEIGHT = 420;

export type CharacterProps = {
	/** 脚下地面点 (世界坐标) */
	x: number;
	y: number;
	scale?: number;
	state: PoseState;
	color?: string;
	rimColor?: string;
	/** 光从哪边来 (屏幕方向单位向量), 轮廓光画在这一侧 */
	light?: [number, number];
	rim?: number;
	feature?: Feature;
	hair?: Hair;
	build?: number;
	heightK?: number;
	seed?: number;
	breathe?: boolean;
	blink?: boolean;
	sway?: boolean;
	/** 手的目标点 (世界坐标), 有值时用两节 IK 覆盖手臂角度 */
	ikF?: Vec | null;
	ikB?: Vec | null;
	ikWeight?: number;
	/** 水平速度 (每帧像素), 让围巾和衣角往后飘 */
	vx?: number;
	opacity?: number;
	/** 额外的整体抖动 (被压弯时) */
	shake?: number;
	/** 画在身体和近侧手臂之间的东西 (世界坐标), 比如双手捧着的杯子, 这样近侧手会盖在物件前面 */
	between?: React.ReactNode;
};

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: Vec, b: Vec): Vec => ({x: a.x + b.x, y: a.y + b.y});
const mul = (a: Vec, k: number): Vec => ({x: a.x * k, y: a.y * k});
const down = (deg: number): Vec => ({x: Math.sin(rad(deg)), y: Math.cos(rad(deg))});
const up = (deg: number): Vec => ({x: Math.sin(rad(deg)), y: -Math.cos(rad(deg))});
const fwd = (deg: number): Vec => ({x: Math.cos(rad(deg)), y: Math.sin(rad(deg))});
const lerpV = (a: Vec, b: Vec, t: number): Vec => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});

export type Skeleton = {
	P: Vec; S: Vec; neckTop: Vec; head: Vec; headAngle: number; torsoAngle: number;
	armF: {E: Vec; W: Vec; H: Vec; a1: number; a2: number};
	armB: {E: Vec; W: Vec; H: Vec; a1: number; a2: number};
	legF: {K: Vec; A: Vec; heel: Vec; toe: Vec};
	legB: {K: Vec; A: Vec; heel: Vec; toe: Vec};
	k: number; // 尺寸系数 (scale * heightK)
	sign: number; // 朝向符号
	sx: number; // 水平压缩 (转身时)
};

/** 两节 IK: 给肩膀和目标点, 求 肩角 和 肘角 (肘只能往前弯) */
const ik = (S: Vec, T: Vec, l1: number, l2: number): {sh: number; el: number} => {
	const dx = T.x - S.x;
	const dy = T.y - S.y;
	const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999);
	const theta = Math.atan2(dx, dy); // 从竖直向下量起
	const alpha = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
	const beta = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
	return {sh: ((theta - alpha) * 180) / Math.PI, el: 180 - (beta * 180) / Math.PI};
};

type Living = {breath: number; swayX: number; swayT: number; t: number};

const living = (frame: number, fps: number, seed: number, on: {breathe: boolean; sway: boolean}): Living => {
	const t = frame / fps;
	const r = mulberry32(seed)();
	return {
		t,
		breath: on.breathe ? Math.sin((2 * Math.PI * t) / (3.2 + r) + r * 6) : 0,
		swayX: on.sway ? 1.6 * Math.sin((2 * Math.PI * t) / (5.1 + r * 2) + r * 3) : 0,
		swayT: on.sway ? 0.8 * Math.sin((2 * Math.PI * t) / (4.3 + r) + r * 5) : 0,
	};
};

/** 正向运动学: 由关节角度算出各关节的世界坐标. 场景用它把杯子放到手上 */
export const solveSkeleton = (p: CharacterProps, frame: number, fps: number): Skeleton => {
	const k = (p.scale ?? 1) * (p.heightK ?? 1);
	const {pose, facing} = p.state;
	const sign = facing >= 0 ? 1 : -1;
	const sx = Math.max(0.55, Math.abs(facing)); // 转身时最窄压到 55%, 不会变成一条线
	const lv = living(frame, fps, p.seed ?? 1, {breathe: p.breathe ?? true, sway: p.sway ?? true});
	const shake = p.shake ?? 0;

	const rot = pose.rot;
	const torso = pose.torso + lv.swayT + shake * Math.sin(frame * 1.7) * 2;
	const torsoLen = D.torso * (1 + 0.012 * lv.breath);
	const shBreath = -1.2 * lv.breath;

	const P0: Vec = {x: lv.swayX, y: -(D.thigh + D.shin + D.ankleH)};
	const S = add(P0, mul(up(torso + rot), torsoLen));
	const neckTop = add(S, mul(up(torso + rot + pose.neck * 0.4), D.neck));
	const headAngle = torso + rot + pose.neck;
	const head = add(neckTop, mul(up(headAngle), D.headR));

	const legOf = (l: Pose['legF']) => {
		const K = add(P0, mul(down(l.hip + rot), D.thigh));
		const shinA = l.hip - l.kn + rot;
		const A = add(K, mul(down(shinA), D.shin));
		const sole = down(shinA + l.an);
		const along = down(shinA + l.an + 90);
		return {
			K, A,
			heel: add(add(A, mul(sole, D.ankleH)), mul(along, -D.footB)),
			toe: add(add(A, mul(sole, D.ankleH)), mul(along, D.footF)),
		};
	};
	const legF = legOf(pose.legF);
	const legB = legOf(pose.legB);

	const armOf = (a: Pose['armF'], target: Vec | null | undefined, offset: number) => {
		let sh = a.sh + shBreath;
		let el = a.el;
		if (target) {
			const w = p.ikWeight ?? 1;
			const sol = ik(S, target, D.upper, D.fore);
			sh = sh + (sol.sh - sh) * w;
			el = el + (sol.el - el) * w;
		}
		const a1 = sh + rot;
		const a2 = sh + el + rot;
		const E = add({x: S.x + offset, y: S.y}, mul(down(a1), D.upper));
		const W = add(E, mul(down(a2), D.fore));
		const H = add(W, mul(down(a2 + a.wr), D.hand));
		return {E, W, H, a1, a2};
	};

	// 先不带 IK 算一遍, 找最低点贴地
	const probeArmF = armOf(pose.armF, null, 2);
	const probeArmB = armOf(pose.armB, null, -2);
	const lows = [legF.heel.y, legF.toe.y, legB.heel.y, legB.toe.y, legF.K.y + D.thighR[1], legB.K.y + D.thighR[1], P0.y + D.hipW];
	if (pose.ground === 'hands') lows.push(probeArmF.H.y, probeArmB.H.y);
	const g = -Math.max(...lows);

	const shift = (v: Vec): Vec => ({x: v.x, y: v.y + g});
	// IK 目标: 世界坐标 -> 本地坐标 (朝右, 未缩放, 已贴地)
	const toLocal = (w?: Vec | null) =>
		w ? {x: (w.x - p.x) / (k * sign * sx), y: (w.y - p.y) / k - g} : null;

	const armF = armOf(pose.armF, toLocal(p.ikF), 2);
	const armB = armOf(pose.armB, toLocal(p.ikB), -2);

	const toWorld = (v: Vec): Vec => {
		const s = shift(v);
		return {x: p.x + s.x * k * sign * sx, y: p.y + s.y * k};
	};
	const mapArm = (a: typeof armF) => ({...a, E: toWorld(a.E), W: toWorld(a.W), H: toWorld(a.H)});
	const mapLeg = (l: typeof legF) => ({K: toWorld(l.K), A: toWorld(l.A), heel: toWorld(l.heel), toe: toWorld(l.toe)});
	return {
		P: toWorld(P0), S: toWorld(S), neckTop: toWorld(neckTop), head: toWorld(head),
		headAngle, torsoAngle: torso + rot,
		armF: mapArm(armF), armB: mapArm(armB), legF: mapLeg(legF), legB: mapLeg(legB),
		k, sign, sx,
	};
};

// ---------- 绘制 (本地坐标, 朝右) ----------

const capsule = (a: Vec, ra: number, b: Vec, rb: number) => {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len = Math.hypot(dx, dy) || 1;
	const n = {x: -dy / len, y: dx / len};
	const pts = [add(a, mul(n, ra)), add(b, mul(n, rb)), add(b, mul(n, -rb)), add(a, mul(n, -ra))];
	return (
		<>
			<polygon points={pts.map((q) => `${q.x},${q.y}`).join(' ')} />
			<circle cx={a.x} cy={a.y} r={ra} />
			<circle cx={b.x} cy={b.y} r={rb} />
		</>
	);
};

const poly = (pts: Vec[]) => <polygon points={pts.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')} />;

const smoothPath = (pts: Vec[]) => {
	// 闭合的平滑曲线 (Catmull-Rom 转 Bezier)
	const n = pts.length;
	let d = `M ${pts[0].x} ${pts[0].y}`;
	for (let i = 0; i < n; i++) {
		const p0 = pts[(i - 1 + n) % n];
		const p1 = pts[i];
		const p2 = pts[(i + 1) % n];
		const p3 = pts[(i + 2) % n];
		const c1 = {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6};
		const c2 = {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6};
		d += ` C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
	}
	return d + ' Z';
};

const HAIR: Record<Hair, [number, number][]> = {
	bob: [[0.55, 0.78], [0.05, 1.1], [-0.6, 0.98], [-1.08, 0.35], [-1.14, -0.42], [-0.86, -0.88], [-0.36, -0.8], [-0.22, -0.2], [0.3, 0.55]],
	short: [[0.62, 0.72], [0.05, 1.1], [-0.78, 0.88], [-1.07, 0.22], [-0.92, -0.25], [-0.42, 0.25], [0.3, 0.76]],
	crop: [[0.5, 0.86], [-0.1, 1.06], [-0.8, 0.8], [-1.04, 0.1], [-0.75, 0.15], [0.2, 0.8]],
	bun: [[0.62, 0.72], [0.05, 1.1], [-0.78, 0.88], [-1.07, 0.22], [-0.92, -0.25], [-0.42, 0.25], [0.3, 0.76]],
	long: [[0.55, 0.78], [0.05, 1.1], [-0.6, 0.98], [-1.1, 0.35], [-1.2, -0.9], [-0.95, -1.7], [-0.45, -1.55], [-0.3, -0.4], [0.3, 0.55]],
};

type LocalArm = {S: Vec; E: Vec; W: Vec; H: Vec};
type LocalLeg = {P: Vec; K: Vec; A: Vec; heel: Vec; toe: Vec};

/** 把世界坐标骨架换回本地坐标 (朝右 未缩放), 绘制都在本地坐标里做 */
const toLocalSkel = (sk: Skeleton, p: CharacterProps) => {
	const inv = (v: Vec): Vec => ({x: (v.x - p.x) / (sk.k * sk.sign * sk.sx), y: (v.y - p.y) / sk.k});
	return {
		S: inv(sk.S), P0: inv(sk.P), neckTop: inv(sk.neckTop), head: inv(sk.head),
		armF: {S: inv(sk.S), E: inv(sk.armF.E), W: inv(sk.armF.W), H: inv(sk.armF.H)},
		armB: {S: inv(sk.S), E: inv(sk.armB.E), W: inv(sk.armB.W), H: inv(sk.armB.H)},
		legF: {P: inv(sk.P), K: inv(sk.legF.K), A: inv(sk.legF.A), heel: inv(sk.legF.heel), toe: inv(sk.legF.toe)},
		legB: {P: inv(sk.P), K: inv(sk.legB.K), A: inv(sk.legB.A), heel: inv(sk.legB.heel), toe: inv(sk.legB.toe)},
	};
};

const Eye: React.FC<{head: Vec; ang: number; expr: Expression; blink: number; color: string}> = ({head, ang, expr, blink, color}) => {
	const r = D.headR;
	const f = fwd(ang);
	const u = up(ang);
	const at = (fx: number, uy: number) => add(add(head, mul(f, fx * r)), mul(u, uy * r));
	const eye = at(0.5, 0.14);
	const mouth = at(0.74, -0.42);
	const rot = ang;
	const open = 1 - blink;
	const ry = {neutral: 0.075, sad: 0.06, surprised: 0.12, smile: 0.07, tense: 0.04, calm: 0.03}[expr] * r * Math.max(0.12, open);
	const rx = (expr === 'surprised' ? 0.12 : 0.14) * r;
	const mouthPath = (() => {
		const w = 0.13 * r;
		const c = {neutral: 0, sad: -0.07, surprised: 0, smile: 0.09, tense: -0.02, calm: 0.04}[expr] * r;
		return `M ${-w} 0 Q 0 ${c * 2} ${w} 0`;
	})();
	return (
		<g fill={color} stroke="none">
			{expr === 'smile' && open > 0.5 ? (
				<path transform={`translate(${eye.x} ${eye.y}) rotate(${rot})`} d={`M ${-rx} 0 Q 0 ${-ry * 2.4} ${rx} 0 Q 0 ${-ry * 0.8} ${-rx} 0`} />
			) : (
				<ellipse cx={eye.x} cy={eye.y} rx={rx} ry={ry} transform={`rotate(${rot + (expr === 'sad' ? -10 : 0)} ${eye.x} ${eye.y})`} />
			)}
			{expr === 'tense' || expr === 'sad' ? (
				<path
					transform={`translate(${eye.x} ${eye.y - 0.2 * r}) rotate(${rot + (expr === 'sad' ? -14 : 10)})`}
					d={`M ${-rx * 1.1} 0 L ${rx * 1.1} 0`}
					stroke={color}
					strokeWidth={1.4}
					fill="none"
				/>
			) : null}
			{expr === 'surprised' ? (
				<ellipse cx={mouth.x} cy={mouth.y} rx={0.06 * r} ry={0.08 * r} />
			) : (
				<path transform={`translate(${mouth.x} ${mouth.y}) rotate(${rot})`} d={mouthPath} stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
			)}
		</g>
	);
};

export const Character: React.FC<CharacterProps> = (p) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const mode = useRenderMode();
	if (mode === 'subs') return null;
	const mask = mode === 'chars';

	const sk = solveSkeleton(p, frame, fps);
	const L = toLocalSkel(sk, p);
	const pose = p.state.pose;
	const lv = living(frame, fps, p.seed ?? 1, {breathe: p.breathe ?? true, sway: p.sway ?? true});
	const seedR = mulberry32((p.seed ?? 1) * 97 + 13);
	const blinkPeriod = 2.6 + seedR() * 2.2;
	const blinkPhase = seedR() * blinkPeriod;
	const tb = (lv.t + blinkPhase) % blinkPeriod;
	const blink = p.blink === false ? 0 : tb < 0.13 ? Math.sin((tb / 0.13) * Math.PI) : 0;

	const build = p.build ?? 1;
	const torsoA = sk.torsoAngle;
	const f = fwd(torsoA);
	const vx = (p.vx ?? 0) * sk.sign;
	const hemSway = (p.sway ?? true ? 4 * Math.sin(lv.t * 2.1 + (p.seed ?? 1)) : 0) - vx * 0.8;

	const col = p.color ?? COLORS.silhouette;
	const rimCol = p.rimColor ?? COLORS.gold;
	const light = p.light ?? [0.6, -0.8];
	const rimPx = 3.2 * (p.rim ?? 1) / sk.k;
	// light 指向光源 (屏幕方向), 轮廓光层往光源一侧偏; 本地 x 可能被镜像
	const rimOffset = {x: (light[0] * rimPx) / (sk.sign * sk.sx), y: light[1] * rimPx};

	const kneeFront = L.legF.K.x > L.legB.K.x ? L.legF.K : L.legB.K;
	const kneeBack = kneeFront === L.legF.K ? L.legB.K : L.legF.K;
	// 坐着时大腿是平的, 衣摆只盖到大腿中段, 免得像裙子
	const seated = Math.min(1, Math.max(0, (Math.min(pose.legF.hip, pose.legB.hip) - 35) / 40));
	const hemK = 0.95 - 0.4 * seated;
	const hemF = add(lerpV(L.P0, kneeFront, hemK), {x: 12 + hemSway * 0.5, y: 4 + 8 * seated});
	const hemB = add(lerpV(L.P0, kneeBack, hemK), {x: -14 + hemSway - 10 * seated, y: 6 + 14 * seated});
	const torsoPts = [
		add(L.S, mul(f, -D.shoulderW * build)),
		add(L.S, mul(f, D.shoulderW * build * 0.92)),
		add(L.P0, mul(f, D.hipW * build * 1.06)),
		hemF,
		hemB,
		add(L.P0, mul(f, -D.hipW * build * 1.04)),
	];

	const hairPts = HAIR[p.hair ?? 'short'].map(([fx, uy], i) => {
		const sway = i >= 3 ? Math.sin(lv.t * 2.4 + i) * 0.04 - vx * 0.004 * (i - 2) : 0;
		return add(add(L.head, mul(fwd(sk.headAngle), (fx - sway) * D.headR)), mul(up(sk.headAngle), uy * D.headR));
	});
	const ha = sk.headAngle;
	const fh = fwd(ha);
	const uh = up(ha);
	const nose = [
		add(add(L.head, mul(fh, 0.9 * D.headR)), mul(uh, 0.18 * D.headR)),
		add(add(L.head, mul(fh, 1.13 * D.headR)), mul(uh, -0.06 * D.headR)),
		add(add(L.head, mul(fh, 0.92 * D.headR)), mul(uh, -0.22 * D.headR)),
	];

	const limb = (seg: 'arm' | 'leg', a: LocalArm | LocalLeg, c: {body: string; hand: string; foot: string}) => {
		if (seg === 'arm') {
			const x = a as LocalArm;
			return (
				<>
					<g fill={c.body}>
						{capsule(x.S, D.upperR[0] * build, x.E, D.upperR[1] * build)}
						{capsule(x.E, D.foreR[0] * build, x.W, D.foreR[1] * build)}
					</g>
					<g fill={c.hand}>{capsule(x.W, D.handR, x.H, D.handR * 0.8)}</g>
				</>
			);
		}
		const y = a as LocalLeg;
		return (
			<>
				<g fill={c.body}>
					{capsule(y.P, D.thighR[0] * build, y.K, D.thighR[1] * build)}
					{capsule(y.K, D.shinR[0] * build, y.A, D.shinR[1] * build)}
				</g>
				<g fill={c.foot}>{poly([y.A, add(y.toe, {x: 0, y: -10}), y.toe, y.heel])}</g>
			</>
		);
	};

	const scarf = (main: string, dark: string) => {
		if (p.feature !== 'scarf') return null;
		const base = add(L.S, add(mul(f, D.shoulderW * 0.45), mul(up(torsoA), 6)));
		const tail = (len: number, n: number, phase: number) => {
			const pts: Vec[] = [base];
			let a = torsoA * 0.4 - 4;
			for (let i = 1; i <= n; i++) {
				a += (p.sway ?? true ? Math.sin(lv.t * 2.2 + i * 0.7 + phase) * 3.2 : 0) - vx * 0.9 - pose.torso * 0.02;
				pts.push(add(pts[i - 1], mul(down(a), len / n)));
			}
			const left: Vec[] = [];
			const right: Vec[] = [];
			pts.forEach((q, i) => {
				const w = 8 - i * 0.6;
				const nx = {x: Math.cos(rad(a)), y: -Math.sin(rad(a))};
				left.push(add(q, mul(nx, w)));
				right.push(add(q, mul(nx, -w)));
			});
			return poly([...left, ...right.reverse()]);
		};
		const wrapA = add(L.S, mul(f, -D.shoulderW * 0.9));
		const wrapB = add(L.S, mul(f, D.shoulderW * 0.95));
		const wrapC = add(L.neckTop, mul(f, D.shoulderW * 0.55));
		const wrapD = add(L.neckTop, mul(f, -D.shoulderW * 0.6));
		return (
			<g>
				<g fill={dark}>{tail(110, 6, 1.3)}</g>
				<g fill={main}>
					{poly([wrapA, wrapB, wrapC, wrapD])}
					{tail(140, 7, 0)}
				</g>
			</g>
		);
	};

	const hood = (c: string) =>
		p.feature === 'hood' ? (
			<path
				fill={c}
				d={smoothPath([
					add(add(L.head, mul(fh, 0.7 * D.headR)), mul(uh, 1.15 * D.headR)),
					add(add(L.head, mul(fh, -0.6 * D.headR)), mul(uh, 1.3 * D.headR)),
					add(add(L.head, mul(fh, -1.45 * D.headR)), mul(uh, 0.2 * D.headR)),
					add(L.S, mul(f, -D.shoulderW * 1.1)),
					add(L.neckTop, mul(f, D.shoulderW * 0.3)),
				])}
			/>
		) : null;

	const bodyLayer = (c: {body: string; head: string; hand: string; foot: string}, withFace: boolean) => (
		<>
			{limb('arm', L.armB, c)}
			{limb('leg', L.legB, c)}
			<g fill={c.body}>
				{poly(torsoPts)}
				{capsule(L.S, 8 * build, L.neckTop, 7 * build)}
			</g>
			{limb('leg', L.legF, c)}
			<g fill={c.head}>
				{hood(c.head)}
				<circle cx={L.head.x} cy={L.head.y} r={D.headR} />
				{poly(nose)}
				<path d={smoothPath(hairPts)} />
				{p.hair === 'bun' ? (
					<circle
						cx={L.head.x + fh.x * -0.72 * D.headR + uh.x * 0.95 * D.headR}
						cy={L.head.y + fh.y * -0.72 * D.headR + uh.y * 0.95 * D.headR}
						r={D.headR * 0.38}
					/>
				) : null}
			</g>
			{withFace ? <Eye head={L.head} ang={ha} expr={p.state.expr} blink={blink} color={COLORS.ivory} /> : null}
			{mask ? null : scarf(c.body === col ? COLORS.vermilion : c.body, c.body === col ? '#A8422D' : c.body)}
		</>
	);
	const frontArm = (c: {body: string; head: string; hand: string; foot: string}) => limb('arm', L.armF, c);

	const transform = `translate(${p.x} ${p.y}) scale(${sk.k * sk.sign * sk.sx} ${sk.k})`;
	if (mask) {
		const m = {body: MASK.body, head: MASK.head, hand: MASK.hand, foot: MASK.foot};
		return (
			<g transform={transform}>
				{bodyLayer(m, false)}
				{p.feature === 'scarf' ? <g>{scarf(MASK.body, MASK.body)}</g> : null}
				{frontArm(m)}
			</g>
		);
	}
	const rimC = {body: rimCol, head: rimCol, hand: rimCol, foot: rimCol};
	const bodyC = {body: col, head: col, hand: col, foot: col};
	const rimT = `translate(${rimOffset.x} ${rimOffset.y})`;
	return (
		<g opacity={p.opacity ?? 1}>
			<g transform={transform}>
				<g transform={rimT} opacity={0.95}>
					{bodyLayer(rimC, false)}
				</g>
				{bodyLayer(bodyC, true)}
			</g>
			{p.between}
			<g transform={transform}>
				<g transform={rimT} opacity={0.95}>
					{frontArm(rimC)}
				</g>
				{frontArm(bodyC)}
			</g>
		</g>
	);
};
