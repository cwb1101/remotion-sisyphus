// 两段 IK。角度约定和骨骼一致：肢体方向 (sin a, cos a)，0 = 竖直向下，正值 = 朝面向的前方
export type Vec = { x: number; y: number };

export const dirOf = (a: number): Vec => {
  const r = (a * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
};
export const angleOf = (v: Vec): number => (Math.atan2(v.x, v.y) * 180) / Math.PI;
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const mix = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * 从 root 出发，两段长 l1 l2，末端尽量落到 target。
 * bend = +1：中间关节往「前方」弯（肘关节屈曲方向），-1：往后弯（膝关节屈曲方向）。
 * 返回两段的绝对角度；够不到时把手臂/腿伸到 99%，不锁死。
 */
export const twoBone = (root: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1) => {
  const d = sub(target, root);
  const dist = Math.min(Math.max(len(d), Math.abs(l1 - l2) + 0.01), (l1 + l2) * 0.995);
  const base = angleOf(d);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = (Math.acos(Math.min(1, Math.max(-1, cosA))) * 180) / Math.PI;
  // 第一段往 bend 的反方向偏，中间关节才会朝 bend 方向凸出
  const a1 = base - bend * a;
  const mid = add(root, mul(dirOf(a1), l1));
  const a2 = angleOf(sub(add(root, mul(d, dist / Math.max(0.001, len(d)))), mid));
  return { a1, a2, mid, reached: len(d) <= (l1 + l2) * 0.995 };
};
