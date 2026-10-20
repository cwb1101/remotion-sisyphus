// 固定种子的随机数：群像、尘埃、眨眼时间每次渲染都一样
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hash = (...xs: number[]): number => {
  let h = 2166136261;
  for (const x of xs) {
    h ^= Math.floor(x * 1000) | 0;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

/** 平滑噪声（1D value noise），用来做呼吸、重心晃、漂移这种不规则的慢运动 */
export const noise1 = (x: number, seed = 0): number => {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};
