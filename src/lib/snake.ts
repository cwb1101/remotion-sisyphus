import { clamp, ease, lerp, norm, rot, v, Vec, vlerp, sub, add, mul } from './anim';
import { SAW } from '../components/Saw';

/** 蛇的一个节段（世界坐标）。z < 0 表示绕到锯条下面。 */
export type Seg = { x: number; y: number; r: number; z: number };

export const N = 34; // 节段数
export const SP = 22; // 节段间距（沿路径参数）

export const radius = (i: number) => (i === 0 ? 21 : 19 - 13.5 * Math.pow(i / (N - 1), 1.25));

// —— 爬行路径：一条斜向右上的正弦曲线，正好在 s=170 处越过锯齿 ——
const O = v(1050, 615);
const D = norm(v(1, -0.18));
const NRM = v(-D.y, D.x);
const AMP = 38;
const LAMBDA = 260;
const PHASE = 90;

export const pathAt = (s: number): Vec => {
  const w = AMP * Math.sin((2 * Math.PI * (s + PHASE)) / LAMBDA);
  return { x: O.x + D.x * s + NRM.x * w, y: O.y + D.y * s + NRM.y * w };
};

export const crawl = (sHead: number): Seg[] =>
  Array.from({ length: N }, (_, i) => {
    const p = pathAt(sHead - i * SP);
    return { ...p, r: radius(i), z: 1 };
  });

/** 头部若干节逐渐转向（回头）。bend 为总转角（弧度，负值=逆时针，往回看）。 */
export const bendHead = (segs: Seg[], bend: number, K = 9): Seg[] => {
  if (Math.abs(bend) < 1e-4) return segs;
  const out = segs.map((s) => ({ ...s }));
  for (let i = K - 1; i >= 0; i--) {
    const dir = sub(segs[i], segs[i + 1]);
    const a = bend * Math.pow((K - i) / K, 1.3);
    out[i] = { ...out[i], ...add(out[i + 1], rot(dir, a)) };
  }
  return out;
};

/** 头部扑向 target，t 为 0..1 的扑咬强度。 */
export const lunge = (segs: Seg[], target: Vec, t: number, K = 9): Seg[] => {
  if (t <= 0) return segs;
  const off = sub(target, segs[0]);
  return segs.map((s, i) => {
    if (i >= K) return s;
    const w = Math.pow(1 - i / K, 1.6) * t;
    return { ...s, ...add(s, mul(off, w)) };
  });
};

export const COIL = { count: 30, turns: 2.4, xa: 1170, xb: 1450 };

/** 螺旋缠在锯条上的位置。R 越小缠得越紧。 */
export const coilAt = (j: number, R: number, wobble = 0): Seg => {
  const u = 1 - j / (COIL.count - 1);
  const th = 2 * Math.PI * COIL.turns * u + 0.6;
  const cy = SAW.y + SAW.w / 2;
  return {
    x: lerp(COIL.xa, COIL.xb, u) + R * 0.32 * Math.sin(th) + wobble * Math.sin(j * 1.3),
    y: cy + R * Math.cos(th),
    z: Math.sin(th),
    r: radius(j),
  };
};

/** 从 base 姿态缠绕到锯条上；p 为 0..1 进度，头先缠。 */
export const coil = (base: Seg[], p: number, R: number, wobble = 0): Seg[] => {
  const last = coilAt(COIL.count - 1, R, wobble);
  return base.map((s, j) => {
    const k = Math.min(j, COIL.count - 1);
    const b = ease.inOut(clamp(p * 1.7 - (k / COIL.count) * 0.7));
    // 尾巴不缠，顺着螺旋末端往左下拖出去
    const c = j < COIL.count ? coilAt(j, R, wobble) : { x: last.x - (j - COIL.count + 1) * SP * 0.95, y: last.y + (j - COIL.count + 1) * SP * 0.3, z: 1, r: s.r };
    const pos = vlerp(s, c, b);
    return { ...pos, r: s.r, z: lerp(1, c.z, b) };
  });
};

/** 爬行路径上的头部参数（S2 的真蛇），由节拍帧推出。 */
export const makeHeadS = (fStart: number, fScratch: number, fStop: number) => {
  const V = 5.5; // 像素/帧
  const sScratch = 170 + 6 * SP; // 第 6 节在 fScratch 时正好压在齿尖上
  const sStart = sScratch - V * (fScratch - fStart);
  const T = fStop - fScratch;
  const Dist = (V * T) / 3; // 三次缓出，衔接处速度连续
  const at = (f: number) => {
    if (f <= fScratch) return sStart + V * (f - fStart);
    const u = clamp((f - fScratch) / T);
    return sScratch + Dist * (1 - Math.pow(1 - u, 3));
  };
  return { at, sStart, sStop: sScratch + Dist, V };
};

export const WOUND_SEG = 6;
