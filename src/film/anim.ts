// 关键帧轨道与缓动

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  // 冲进来、落定时几乎没有余速，适合“落在底鼓上”
  land: (t: number) => 1 - Math.pow(1 - t, 4),
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const progress = (f: number, from: number, to: number) => clamp((f - from) / Math.max(1, to - from));

export interface Key {
  f: number;
  v: number;
  /** 从上一个关键帧到这一个用的缓动 */
  ease?: Ease;
}

/** 分段关键帧插值；log=true 时在对数空间插值（用于缩放） */
export const track = (keys: Key[], f: number, log = false): number => {
  const ks = [...keys].sort((a, b) => a.f - b.f);
  if (f <= ks[0].f) return ks[0].v;
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1];
    const b = ks[i];
    if (f <= b.f) {
      const t = (b.ease ?? ease.inOut)(progress(f, a.f, b.f));
      return log ? Math.exp(lerp(Math.log(a.v), Math.log(b.v), t)) : lerp(a.v, b.v, t);
    }
  }
  return ks[ks.length - 1].v;
};

/** 确定性伪随机：同一个 seed 每帧都给同一个值 */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** 一次性的冲击包络：f0 处为 1，之后按 tau 帧指数衰减；f0 之前为 0 */
export const hit = (f: number, f0: number, tau: number) => (f < f0 ? 0 : Math.exp(-(f - f0) / tau));

/** 在 [from, to) 内显示：开头 fin 帧淡入，结尾 fout 帧淡出 */
export const win = (f: number, from: number, to: number, fin = 8, fout = 6) =>
  clamp((f - from) / fin) * clamp((to - f) / fout);
