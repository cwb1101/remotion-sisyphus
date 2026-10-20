// 骨骼求解：把「动作轨道」在某一帧解成每个关节的位置。只算不画，Character.tsx 负责画。
// 顺序：轨道插值（分组弹簧 + 错开时间 + 预备）→ 步态覆盖 → 呼吸和重心晃 →
//       正向运动学 → 钉脚（腿 IK）/ 最低点落地 / 骨盆固定 → 手部 IK → 关节限制

import { FPS } from "../lib/rhythm";
import {
  anticipation,
  clamp,
  GROUP_DELAY,
  GROUP_ZETA,
  JointGroup,
  lerp,
  MAX_DELAY,
  springProgress,
} from "../lib/motion";
import { add, angleOf, dirOf, mul, twoBone, Vec } from "../lib/ik";
import { hash, noise1 } from "../lib/random";
import {
  BodyTarget,
  Face,
  GAIT_DEFAULTS,
  Gait,
  gaitEnd,
  gaitX,
  JointName,
  Joints,
  LIMITS,
  Pin,
  Pose,
  POSES,
  PoseName,
  stepFrame,
} from "../data/poses";

export type Build = "adult" | "child" | "infant";

/** 比例，单位 = 头高 h。成人 1:4 孩子 1:3 婴儿 1:2.2，全片一致 */
export const BUILDS: Record<
  Build,
  {
    neck: number;
    torso: number;
    torsoW: number;
    thigh: number;
    shin: number;
    ankle: number;
    foot: number;
    upper: number;
    fore: number;
    hand: number;
    rArm: [number, number, number];
    rLeg: [number, number, number];
  }
> = {
  adult: { neck: 0.16, torso: 1.22, torsoW: 0.3, thigh: 0.84, shin: 0.78, ankle: 0.07, foot: 0.36, upper: 0.7, fore: 0.6, hand: 0.2, rArm: [0.115, 0.085, 0.07], rLeg: [0.15, 0.11, 0.075] },
  child: { neck: 0.12, torso: 0.86, torsoW: 0.28, thigh: 0.5, shin: 0.45, ankle: 0.06, foot: 0.28, upper: 0.45, fore: 0.4, hand: 0.15, rArm: [0.1, 0.08, 0.065], rLeg: [0.12, 0.095, 0.07] },
  infant: { neck: 0.04, torso: 0.62, torsoW: 0.3, thigh: 0.31, shin: 0.26, ankle: 0.04, foot: 0.2, upper: 0.33, fore: 0.29, hand: 0.12, rArm: [0.1, 0.085, 0.075], rLeg: [0.12, 0.1, 0.08] },
};

const GROUP_OF: Record<JointName, JointGroup> = {
  torso: "core",
  neck: "head",
  shL: "upper",
  shR: "upper",
  hipL: "upper",
  hipR: "upper",
  elL: "mid",
  elR: "mid",
  knL: "mid",
  knR: "mid",
  wrL: "end",
  wrR: "end",
  anL: "end",
  anR: "end",
};
const JOINTS = Object.keys(GROUP_OF) as JointName[];
const GROUPS: JointGroup[] = ["core", "head", "upper", "mid", "end"];

export type Reach = { target: Vec | BodyTarget; weight?: number };

export type PoseKey = {
  /** 落点帧：末端关节（手 脚 头）到位的那一帧，卡拍就把它放在拍上 */
  at: number;
  pose: PoseName;
  /** 从起动到到位用多少帧，默认 12 */
  lead?: number;
  /** 预备幅度（反向小动作），0–0.35 */
  antic?: number;
  face?: Partial<Face>;
  /** 覆盖个别关节角度 */
  joints?: Partial<Joints>;
  /** 手要落到的世界坐标或身体部位；null 表示松开 */
  reachL?: Reach | null;
  reachR?: Reach | null;
  /** 1 朝右 -1 朝左。转身时肩先转、髋晚 3 帧 */
  facing?: 1 | -1;
  /** 0 = 侧脸，1 = 完全转向背后（后脑勺） */
  headTurn?: number;
  /** pin=root 的坐姿：骨盆比角色的 y 高出多少像素（座位高度）。不给时骨盆就在 (x, y) */
  seat?: number;
};

export type RigInput = {
  build: Build;
  /** 头高，像素 */
  h: number;
  /** pin=feet/lowest 时 x 是站位、y 是地面；pin=root 时是骨盆位置 */
  x: number;
  y: number;
  track: PoseKey[];
  frame: number;
  seed?: number;
  gait?: Gait;
  breathe?: boolean;
  /** 跟随某个点移动（被抱起的婴儿），覆盖 x y */
  carriedBy?: Vec | null;
};

type Channel = number;
type KeyState = {
  joints: Joints;
  face: Face;
  pin: Pin;
  reachL: { w: number; t: Vec | BodyTarget | null };
  reachR: { w: number; t: Vec | BodyTarget | null };
  facing: number;
  headTurn: number;
  seat: number;
};

const clampJoints = (j: Joints): Joints => {
  const o = { ...j };
  for (const k of JOINTS) o[k] = clamp(o[k], LIMITS[k][0], LIMITS[k][1]);
  return o;
};

const resolveKey = (k: PoseKey, prev: KeyState | null): KeyState => {
  const p: Pose = POSES[k.pose];
  const reachOf = (side: "L" | "R") => {
    const explicit = side === "L" ? k.reachL : k.reachR;
    if (explicit === null) return { w: 0, t: null };
    if (explicit) return { w: explicit.weight ?? 1, t: explicit.target };
    const body = p.reach?.[side];
    if (body) return { w: 1, t: body };
    return { w: 0, t: null };
  };
  return {
    joints: clampJoints({ ...p.joints, ...(k.joints ?? {}) }),
    face: { ...p.face, ...(k.face ?? {}) },
    pin: p.pin,
    reachL: reachOf("L"),
    reachR: reachOf("R"),
    facing: k.facing ?? prev?.facing ?? 1,
    headTurn: k.headTurn ?? 0,
    seat: k.seat ?? 0,
  };
};

// —— 轨道插值 ——
type Prepared = { keys: PoseKey[]; states: KeyState[]; memo: Map<string, number[]> };
const prepCache = new WeakMap<PoseKey[], Prepared>();
const prepare = (track: PoseKey[]): Prepared => {
  const hit = prepCache.get(track);
  if (hit) return hit;
  const keys = [...track].sort((a, b) => a.at - b.at);
  const states: KeyState[] = [];
  keys.forEach((k, i) => states.push(resolveKey(k, i ? states[i - 1] : null)));
  const p = { keys, states, memo: new Map() };
  prepCache.set(track, p);
  return p;
};

/** 每个分组的通道：该组关节角 + 附带的标量（core 带 pin 权重和朝向，mid 带手部 IK 权重，head 带转头） */
const groupChannels = (s: KeyState, g: JointGroup): number[] => {
  const js = JOINTS.filter((j) => GROUP_OF[j] === g).map((j) => s.joints[j]);
  if (g === "core") return [...js, s.pin === "lowest" ? 1 : 0, s.pin === "root" ? 1 : 0, s.facing];
  if (g === "upper") return [...js, s.facing];
  if (g === "mid") return [...js, s.reachL.w, s.reachR.w];
  if (g === "head") return [...js, s.headTurn];
  return js;
};

const startOf = (k: PoseKey, g: JointGroup) => k.at - (MAX_DELAY - GROUP_DELAY[g]) - (k.lead ?? 12);

const evalGroup = (P: Prepared, g: JointGroup, f: number): { v: number[]; idx: number; p: number } => {
  const { keys, states } = P;
  let idx = 0;
  for (let i = 1; i < keys.length; i++) if (startOf(keys[i], g) <= f) idx = i;
  const to = groupChannels(states[idx], g);
  if (idx === 0) return { v: to, idx, p: 1 };
  const k = keys[idx];
  const s0 = startOf(k, g);
  const memoKey = `${idx}|${g}`;
  let from = P.memo.get(memoKey);
  if (!from) {
    // 取上一段在本段起动前一瞬的值（不能用 s0 本身，否则又选中本段）
    from = evalGroup(P, g, s0 - 0.001).v;
    P.memo.set(memoKey, from);
  }
  const lead = k.lead ?? 12;
  const t = f - s0;
  const p = springProgress(t, lead, GROUP_ZETA[g]) + anticipation(t, lead, k.antic ?? 0);
  return { v: to.map((x, i) => lerp(from![i], x, p)), idx, p: clamp(p, 0, 1) };
};

export type TrackSample = {
  joints: Joints;
  face: Face;
  wLowest: number;
  wRoot: number;
  facingU: number;
  facingL: number;
  reachL: { w: number; t: Vec | BodyTarget | null };
  reachR: { w: number; t: Vec | BodyTarget | null };
  headTurn: number;
  /** 预备时骨盆下沉量（单位头高） */
  dip: number;
  talk: boolean;
  seat: number;
};

export const sampleTrack = (track: PoseKey[], f: number): TrackSample => {
  const P = prepare(track);
  const out: Partial<Joints> = {};
  const extra: Record<JointGroup, number[]> = { core: [], head: [], upper: [], mid: [], end: [] };
  const idxs: Record<JointGroup, { idx: number; p: number }> = {} as never;
  for (const g of GROUPS) {
    const r = evalGroup(P, g, f);
    const names = JOINTS.filter((j) => GROUP_OF[j] === g);
    names.forEach((n, i) => (out[n] = r.v[i]));
    extra[g] = r.v.slice(names.length);
    idxs[g] = { idx: r.idx, p: r.p };
  }
  // 表情在头部那组动作走到一半时换
  const hi = idxs.head;
  const faceIdx = hi.p > 0.4 || hi.idx === 0 ? hi.idx : hi.idx - 1;
  const face = P.states[faceIdx].face;

  // 手部 IK 目标：当前关键帧有目标就用它，没有就沿用上一个直到权重淡出
  const mi = idxs.mid.idx;
  const pickTarget = (side: "reachL" | "reachR") => {
    const cur = P.states[mi][side].t;
    if (cur) {
      const prev = mi > 0 ? P.states[mi - 1][side].t : null;
      if (prev && typeof prev !== "string" && typeof cur !== "string" && idxs.mid.p < 1) {
        return { x: lerp(prev.x, cur.x, idxs.mid.p), y: lerp(prev.y, cur.y, idxs.mid.p) };
      }
      return cur;
    }
    return mi > 0 ? P.states[mi - 1][side].t : null;
  };

  // 预备时的骨盆下沉：当前关键帧有预备，在起动后的前段下沉
  const ci = idxs.core.idx;
  const ck = P.keys[ci];
  let dip = 0;
  if (ci > 0 && (ck.antic ?? 0) > 0) {
    const t = f - startOf(ck, "core");
    dip = -anticipation(t, ck.lead ?? 12, ck.antic ?? 0) * 0.35;
  }

  return {
    joints: out as Joints,
    face,
    wLowest: clamp(extra.core[0], 0, 1),
    wRoot: clamp(extra.core[1], 0, 1),
    facingU: extra.core[2],
    facingL: extra.upper[0],
    reachL: { w: clamp(extra.mid[0], 0, 1), t: pickTarget("reachL") },
    reachR: { w: clamp(extra.mid[1], 0, 1), t: pickTarget("reachR") },
    headTurn: clamp(extra.head[0], 0, 1),
    dip,
    talk: face.mouth === "talk",
    seat: P.states[ci].seat,
  };
};

// —— 正向运动学 ——
export type Skeleton = {
  pelvis: Vec;
  neckBase: Vec;
  head: Vec;
  headR: number;
  shL: Vec;
  shR: Vec;
  elL: Vec;
  elR: Vec;
  wrL: Vec;
  wrR: Vec;
  handL: Vec;
  handR: Vec;
  hipL: Vec;
  hipR: Vec;
  knL: Vec;
  knR: Vec;
  anL: Vec;
  anR: Vec;
  /** 脚的绝对角度（正值脚尖上翘） */
  footAngL: number;
  footAngR: number;
  torso: number;
  headAng: number;
  armAng: { L: [number, number, number]; R: [number, number, number] };
  legAng: { L: [number, number]; R: [number, number] };
};

const up = (a: number): Vec => {
  const r = (a * Math.PI) / 180;
  return { x: Math.sin(r), y: -Math.cos(r) };
};

const fk = (j: Joints, B: (typeof BUILDS)[Build], h: number, breath: number): Skeleton => {
  const pelvis = { x: 0, y: 0 };
  const t = j.torso;
  const neckBase = add(pelvis, mul(up(t), B.torso * h * (1 + 0.014 * breath)));
  const headAng = t + j.neck;
  const headR = 0.5 * h;
  const head = add(neckBase, mul(up(headAng), B.neck * h + headR * 0.92));
  const down = { x: -Math.sin((t * Math.PI) / 180), y: Math.cos((t * Math.PI) / 180) };
  const sh = add(neckBase, mul(down, 0.12 * h - 0.01 * h * breath));
  const back = mul(up(t - 90), 0.05 * h);
  const shL = sh;
  const shR = add(sh, back);
  const arm = (s: Vec, shA: number, el: number, wr: number) => {
    const a1 = shA - t;
    const e = add(s, mul(dirOf(a1), B.upper * h));
    const a2 = a1 + el;
    const w = add(e, mul(dirOf(a2), B.fore * h));
    const a3 = a2 + wr;
    const hd = add(w, mul(dirOf(a3), B.hand * h));
    return { e, w, hd, ang: [a1, a2, a3] as [number, number, number] };
  };
  const aL = arm(shL, j.shL, j.elL, j.wrL);
  const aR = arm(shR, j.shR, j.elR, j.wrR);
  const hipL = add(pelvis, mul(up(t + 90), 0.02 * h));
  const hipR = add(pelvis, mul(up(t - 90), 0.04 * h));
  const leg = (hp: Vec, hip: number, kn: number, an: number) => {
    const b1 = hip - t;
    const k = add(hp, mul(dirOf(b1), B.thigh * h));
    const b2 = b1 - kn;
    const a = add(k, mul(dirOf(b2), B.shin * h));
    return { k, a, ang: [b1, b2] as [number, number], foot: b2 + an };
  };
  const lL = leg(hipL, j.hipL, j.knL, j.anL);
  const lR = leg(hipR, j.hipR, j.knR, j.anR);
  return {
    pelvis,
    neckBase,
    head,
    headR,
    shL,
    shR,
    elL: aL.e,
    elR: aR.e,
    wrL: aL.w,
    wrR: aR.w,
    handL: aL.hd,
    handR: aR.hd,
    hipL,
    hipR,
    knL: lL.k,
    knR: lR.k,
    anL: lL.a,
    anR: lR.a,
    footAngL: lL.foot,
    footAngR: lR.foot,
    torso: t,
    headAng,
    armAng: { L: aL.ang, R: aR.ang },
    legAng: { L: lL.ang, R: lR.ang },
  };
};

const footDir = (c: number): Vec => {
  const r = (c * Math.PI) / 180;
  return { x: Math.cos(r), y: -Math.sin(r) };
};
/** 脚底的两个点（脚跟 脚尖），用来落地 */
export const soles = (an: Vec, c: number, B: (typeof BUILDS)[Build], h: number) => {
  const d = footDir(c);
  const n = { x: -d.y, y: d.x }; // 指向脚底
  const base = add(an, mul(n, B.ankle * h + B.rLeg[2] * h * 0.6));
  return { heel: add(base, mul(d, -0.22 * B.foot * h)), toe: add(base, mul(d, 0.78 * B.foot * h)) };
};

/** 把角度差折到 (-180, 180]，避免 atan2 跨过 ±180° 时肘 膝被夹成 0（手臂突然伸直） */
const wrap = (a: number) => {
  let x = ((a + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
};
/** 肩角落在 [-100, 260) 这一圈里，和关节限制的范围对齐 */
const normSh = (a: number) => {
  let x = wrap(a);
  if (x < -100) x += 360;
  return x;
};

export const bodyTargetLocal = (s: Skeleton, t: BodyTarget): Vec => {
  const fwd = up(s.headAng + 90);
  const dn = up(s.headAng + 180);
  switch (t) {
    case "mouth":
      return add(add(s.head, mul(fwd, s.headR * 0.55)), mul(dn, s.headR * 0.3));
    case "ear":
      return add(add(s.head, mul(fwd, -s.headR * 0.05)), mul(dn, s.headR * 0.05));
    case "headL":
      return add(s.head, mul(up(s.headAng - 60), s.headR * 1.0));
    case "headR":
      return add(s.head, mul(up(s.headAng + 40), s.headR * 1.0));
    case "chest":
      return add(s.neckBase, mul(fwd, s.headR * 0.6));
  }
};

export type Rig = {
  input: RigInput;
  B: (typeof BUILDS)[Build];
  h: number;
  /** 骨盆的世界坐标 */
  root: Vec;
  facingU: number;
  facingL: number;
  /** 骨骼点（局部坐标，朝右，骨盆为原点） */
  s: Skeleton;
  face: Face;
  blink: number;
  headTurn: number;
  breath: number;
  /** 头发 衣角 披风的摆动角（度） */
  sway: number;
  talkOpen: number;
  toWorld: (p: Vec, part?: "U" | "L") => Vec;
};

const baseXAt = (inp: RigInput, f: number) => (inp.gait ? gaitX(inp.gait, f, inp.h) : inp.x);

export const solveRig = (inp: RigInput): Rig => {
  const { frame: f, h } = inp;
  const B = BUILDS[inp.build];
  const seed = inp.seed ?? 1;
  const ts = sampleTrack(inp.track, f);
  let j = { ...ts.joints };

  // —— 呼吸 重心轻晃 ——
  const breathe = inp.breathe !== false;
  const breath = breathe ? Math.sin((2 * Math.PI * f) / (FPS * 3.4) + seed * 1.7) : 0;
  if (breathe) {
    j.neck += breath * 0.9;
    j.torso += noise1(f / 55, seed) * 1.1;
    j.shL += breath * 1.2;
    j.shR += breath * 1.2;
  }

  // —— 步态 ——
  const g = inp.gait;
  let gaitW = 0;
  let gaitFeet: { L: { x: number; y: number; c: number }; R: { x: number; y: number; c: number } } | null = null;
  let bob = 0;
  if (g) {
    const D = GAIT_DEFAULTS[g.kind];
    const sf = g.stepFrames ?? D.stepFrames;
    const ramp = sf * 0.8;
    const t0 = g.firstStep - sf;
    const t1 = gaitEnd(g);
    gaitW = clamp(Math.min((f - t0) / ramp + 1, (t1 + ramp - f) / ramp), 0, 1);
    if (gaitW > 0) {
      const stride = (g.stride ?? D.stride) * h;
      const cycle = 2 * sf;
      const pelvisAt = (fr: number) => baseXAt(inp, fr);
      // 着地点：着地那一帧骨盆前方半步
      const plantAt = (k: number) => {
        if (k < 0) return g.startX;
        if (k >= g.steps) return pelvisAt(t1 + 99);
        return pelvisAt(stepFrame(g, k)) + g.direction * 0.5 * stride * (k === g.steps - 1 ? 0.5 : 1);
      };
      const footState = (offset: 0 | 1) => {
        // offset=0 的脚踩第 0 2 4… 步
        let k = offset - 2;
        while (k + 2 <= g.steps + 1 && stepFrame(g, k + 2) <= f) k += 2;
        const tk = stepFrame(g, k);
        const tn = stepFrame(g, k + 2);
        const lift = tk + D.stance * cycle;
        const from = plantAt(k);
        const to = plantAt(k + 2);
        if (f <= lift || k + 2 > g.steps + 1) {
          const u = (f - tk) / (D.stance * cycle);
          // 着地先脚跟（脚尖上翘 12°）→ 放平 → 末段脚跟抬起
          const c = u < 0.18 ? 12 * (1 - u / 0.18) : u > 0.75 && k + 2 <= g.steps ? -26 * ((u - 0.75) / 0.25) : 0;
          return { x: from, y: 0, c, swing: 0 };
        }
        const u = clamp((f - lift) / (tn - lift), 0, 1);
        const e = u * u * (3 - 2 * u);
        return {
          x: lerp(from, to, e),
          y: -Math.sin(Math.PI * u) * D.lift * h,
          c: u < 0.3 ? -26 * (1 - u / 0.3) : u > 0.7 ? 12 * ((u - 0.7) / 0.3) : 0,
          swing: 1,
        };
      };
      const fl = footState(0);
      const fr = footState(1);
      gaitFeet = { L: fl, R: fr };
      const phase = (2 * Math.PI * (f - g.firstStep)) / sf;
      // 走路时骨盆略降（膝盖不锁死），腿才够得到钉住的脚，不会拖着脚滑
      bob = ((g.kind === "walk" ? 1 : -1) * Math.cos(phase) * D.bob * h + D.sink * h) * gaitW;
      // 手臂和对侧腿反向：用脚相对骨盆的前后位置来摆
      const px = pelvisAt(f);
      const fwdL = clamp(((fl.x - px) * g.direction) / (0.5 * stride), -1.2, 1.2);
      const fwdR = clamp(((fr.x - px) * g.direction) / (0.5 * stride), -1.2, 1.2);
      const gj: Partial<Joints> = {
        torso: D.lean + Math.sin(phase) * 1.2,
        neck: -D.lean * 0.6,
        shL: -D.armSwing * fwdL + (g.kind === "run" ? 20 : 4),
        shR: -D.armSwing * fwdR + (g.kind === "run" ? 20 : 4),
        elL: (g.kind === "run" ? 85 : 14) + 10 * Math.max(0, -fwdL),
        elR: (g.kind === "run" ? 85 : 14) + 10 * Math.max(0, -fwdR),
        wrL: 6,
        wrR: 6,
      };
      const held = new Set((g.hold ?? []).flatMap((s) => [`sh${s}`, `el${s}`, `wr${s}`]));
      for (const k of Object.keys(gj) as JointName[]) if (!held.has(k)) j[k] = lerp(j[k], gj[k]!, gaitW);
    }
  }

  j = clampJoints(j);

  // —— 正向运动学（先按名义骨盆算出脚应该在哪里） ——
  let s = fk(j, B, h, breath);
  const facingU = Math.abs(ts.facingU) < 0.15 ? Math.sign(ts.facingU || 1) * 0.15 : ts.facingU;
  const facingL = Math.abs(ts.facingL) < 0.15 ? Math.sign(ts.facingL || 1) * 0.15 : ts.facingL;
  const dir = Math.sign(facingU) || 1;

  const groundY = inp.y;
  const sL = soles(s.anL, s.footAngL, B, h);
  const sR = soles(s.anR, s.footAngR, B, h);
  const lowestFoot = Math.max(sL.heel.y, sL.toe.y, sR.heel.y, sR.toe.y);
  const pts = [s.head.y + s.headR, s.neckBase.y, s.pelvis.y + 0.22 * h, s.knL.y + B.rLeg[1] * h, s.knR.y + B.rLeg[1] * h, sL.heel.y, sL.toe.y, sR.heel.y, sR.toe.y, s.elL.y, s.elR.y, s.wrL.y, s.wrR.y];
  const lowestAll = Math.max(...pts);

  let baseX = baseXAt(inp, f);
  let rootY = groundY - lowestFoot;
  const rootYLowest = groundY - lowestAll;
  rootY = lerp(rootY, rootYLowest, ts.wLowest);

  // 重心：上半身往前俯，骨盆往后坐，让重心留在双脚上方（只对钉脚的状态）
  const wFeet = (1 - ts.wLowest) * (1 - ts.wRoot);
  const upper = 0.6 * (s.neckBase.x * 0.5) + 0.4 * s.head.x;
  const comShift = -0.62 * upper * wFeet * (1 - gaitW);
  const swayX = breathe ? noise1(f / 70, seed + 9) * 0.035 * h * wFeet * (1 - gaitW) : 0;
  const dipY = ts.dip * h * 0.25;

  let root: Vec = { x: baseX, y: rootY + bob + dipY + (breathe ? breath * 0.006 * h : 0) };
  if (ts.wRoot > 0) {
    const pinned = inp.carriedBy ?? { x: inp.x, y: inp.y - ts.seat };
    root = { x: lerp(root.x, pinned.x, ts.wRoot), y: lerp(root.y, pinned.y, ts.wRoot) };
  }
  if (inp.carriedBy && ts.wRoot === 0) root = { ...inp.carriedBy };

  // 脚的世界位置（名义骨盆下算出来的，之后骨盆怎么晃脚都不动）
  const nominalRoot = { x: baseX, y: rootY };
  const feetWorld = {
    L: { x: nominalRoot.x + dir * s.anL.x, y: nominalRoot.y + s.anL.y, c: s.footAngL },
    R: { x: nominalRoot.x + dir * s.anR.x, y: nominalRoot.y + s.anR.y, c: s.footAngR },
  };
  if (gaitFeet) {
    for (const side of ["L", "R"] as const) {
      const gf = gaitFeet[side];
      // 脚尖着地蹬起时，以脚尖为支点；脚跟着地时以脚跟为支点
      const lift = gf.c < 0 ? Math.sin((-gf.c * Math.PI) / 180) * B.foot * h * 0.78 : 0;
      const gx = gf.x + (gf.c < 0 ? dir * B.foot * h * 0.78 * (1 - Math.cos((gf.c * Math.PI) / 180)) : 0);
      const gy = groundY - (B.ankle * h + B.rLeg[2] * h * 0.6) + gf.y - lift;
      feetWorld[side] = {
        x: lerp(feetWorld[side].x, gx, gaitW),
        y: lerp(feetWorld[side].y, gy, gaitW),
        c: lerp(feetWorld[side].c, gf.c, gaitW),
      };
    }
  }
  root = { x: root.x + comShift * dir + swayX, y: root.y };

  // —— 腿 IK：髋去找钉住的脚 ——
  const legIK = Math.max(wFeet, gaitW);
  if (legIK > 0) {
    for (const side of ["L", "R"] as const) {
      const hip = side === "L" ? s.hipL : s.hipR;
      const fw = feetWorld[side];
      const target = { x: (fw.x - root.x) * dir, y: fw.y - root.y };
      const r = twoBone(hip, target, B.thigh * h, B.shin * h, -1);
      const hipA = normSh(r.a1 + j.torso);
      const kn = clamp(wrap(r.a1 - r.a2), LIMITS.knL[0], LIMITS.knL[1]);
      const hipKey = side === "L" ? "hipL" : "hipR";
      const knKey = side === "L" ? "knL" : "knR";
      const anKey = side === "L" ? "anL" : "anR";
      j[hipKey] = lerp(j[hipKey], clamp(hipA, LIMITS.hipL[0], LIMITS.hipL[1]), legIK);
      j[knKey] = lerp(j[knKey], kn, legIK);
      const shinAbs = j[hipKey] - j.torso - j[knKey];
      j[anKey] = lerp(j[anKey], clamp(fw.c - shinAbs, LIMITS.anL[0], LIMITS.anL[1]), legIK);
    }
    s = fk(j, B, h, breath);
  }

  // —— 手 IK：手真的落在物件上 ——
  const toLocal = (p: Vec | BodyTarget): Vec =>
    typeof p === "string" ? bodyTargetLocal(s, p) : { x: (p.x - root.x) * dir, y: p.y - root.y };
  for (const side of ["L", "R"] as const) {
    const rc = side === "L" ? ts.reachL : ts.reachR;
    if (!rc.t || rc.w <= 0.001) continue;
    const shp = side === "L" ? s.shL : s.shR;
    const tgt = toLocal(rc.t);
    const r = twoBone(shp, tgt, B.upper * h, (B.fore + B.hand * 0.5) * h, 1);
    const shK = side === "L" ? "shL" : "shR";
    const elK = side === "L" ? "elL" : "elR";
    const shA = clamp(normSh(r.a1 + j.torso), LIMITS.shL[0], LIMITS.shL[1]);
    const el = clamp(wrap(r.a2 - r.a1), LIMITS.elL[0], LIMITS.elL[1]);
    j[shK] = lerp(j[shK], shA, rc.w);
    j[elK] = lerp(j[elK], el, rc.w);
  }
  s = fk(clampJoints(j), B, h, breath);

  // —— 眨眼 ——
  let blink = 0;
  const period = 96 + Math.floor(hash(seed, 3) * 50);
  const ph = (f + Math.floor(hash(seed, 7) * period)) % period;
  if (ph < 5) blink = Math.sin((Math.PI * ph) / 5);
  if (ts.face.eyes === "closed") blink = 1;

  // —— 次级运动：头发 衣角跟着身体速度反向摆，晚到 ——
  const vx = (baseXAt(inp, f) - baseXAt(inp, f - 3)) / 3;
  const torsoPrev = sampleTrack(inp.track, f - 4).joints.torso;
  const sway = clamp(-vx * 1.6 * dir - (j.torso - torsoPrev) * 1.2, -28, 28) + Math.sin((2 * Math.PI * f) / (FPS * 2.7) + seed) * 2.5;

  const talkOpen = ts.talk ? 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / 7) : 0;

  const toWorld = (p: Vec, part: "U" | "L" = "U"): Vec => ({
    x: root.x + p.x * (part === "U" ? facingU : facingL),
    y: root.y + p.y,
  });

  return { input: inp, B, h, root, facingU, facingL, s, face: ts.face, blink, headTurn: ts.headTurn, breath, sway, talkOpen, toWorld };
};

/** 某个骨骼点的世界坐标（例如把物件挂在手上） */
export const worldPoint = (rig: Rig, name: keyof Skeleton): Vec => {
  const p = rig.s[name] as Vec;
  const lower = ["hipL", "hipR", "knL", "knR", "anL", "anR"].includes(name);
  return rig.toWorld(p, lower ? "L" : "U");
};

export { angleOf };
