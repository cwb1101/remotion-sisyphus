// 动作的时间曲线：解析弹簧（spring），可以指定「第一次到位」落在哪一帧，
// 再叠加预备（反向小动作）。躯干和四肢用不同阻尼，末端更软、会过冲一点再回落。

export type JointGroup = "core" | "head" | "upper" | "mid" | "end";

/** 阻尼比：1 = 不过冲（躯干稳），越小越软（手腕脚踝跟随更明显） */
export const GROUP_ZETA: Record<JointGroup, number> = {
  core: 1.0,
  head: 0.58,
  upper: 0.74,
  mid: 0.62,
  end: 0.48,
};

/** 同一个动作里各组关节晚到的帧数：躯干先动，末端最后到（2–4 帧一级） */
export const GROUP_DELAY: Record<JointGroup, number> = {
  core: 0,
  upper: 2,
  head: 3,
  mid: 4,
  end: 7,
};
export const MAX_DELAY = 7;

/** ω0 = 1 时的弹簧响应 */
const unitSpring = (t: number, zeta: number): number => {
  if (t <= 0) return 0;
  if (zeta < 1) {
    const wd = Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * t) * (Math.cos(wd * t) + (zeta / wd) * Math.sin(wd * t));
  }
  // 临界阻尼
  return 1 - Math.exp(-t) * (1 + t);
};

const hitCache = new Map<number, number>();
/** ω0 = 1 时第一次到位（欠阻尼取第一次达到 1，临界阻尼取到 0.985）所需时间 */
const unitHitTime = (zeta: number): number => {
  const cached = hitCache.get(zeta);
  if (cached !== undefined) return cached;
  const target = zeta < 1 ? 1 : 0.985;
  let t = 0;
  while (unitSpring(t, zeta) < target && t < 40) t += 0.002;
  hitCache.set(zeta, t);
  return t;
};

/**
 * 弹簧进度：t = 自起动以来的帧数，duration = 第一次到位用的帧数。
 * 返回 0→1，欠阻尼时到位后会过冲再回落（跟随）。
 */
export const springProgress = (t: number, duration: number, zeta: number): number => {
  if (t <= 0) return 0;
  const w = unitHitTime(zeta) / Math.max(1, duration);
  return unitSpring(t * w, zeta);
};

/** 预备：在动作前段往反方向走一点（amount 是占整段位移的比例） */
export const anticipation = (t: number, duration: number, amount: number): number => {
  const ta = duration * 0.42;
  if (amount <= 0 || t <= 0 || t >= ta) return 0;
  return -amount * Math.sin((Math.PI * t) / ta);
};

/** 缓入缓出，用于镜头、光、位置这类非关节的运动 */
export const easeInOut = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const easeOut = (x: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
export const easeIn = (x: number): number => Math.pow(Math.min(1, Math.max(0, x)), 3);
/** 猛地动、慢慢停：大部分位移在前几帧完成，用于重卡点的镜头 */
export const snapOut = (x: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 6);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const progress = (frame: number, from: number, to: number) =>
  clamp((frame - from) / Math.max(1, to - from), 0, 1);
