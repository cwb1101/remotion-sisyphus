// 画四肢和衣服用的路径工具：四肢是两头粗细不同、中段略鼓的胶囊形，不是直线段
import { Vec } from "../lib/ik";

const f = (n: number) => n.toFixed(2);
export const pt = (p: Vec) => `${f(p.x)} ${f(p.y)}`;

/** 胶囊形肢体：p1 半径 r1 → p2 半径 r2，bulge 让一侧鼓出（肌肉） */
export const capsule = (p1: Vec, p2: Vec, r1: number, r2: number, bulge = 0): string => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const L = Math.hypot(dx, dy) || 0.001;
  const d = { x: dx / L, y: dy / L };
  const n = { x: -d.y, y: d.x };
  const a1 = { x: p1.x + n.x * r1, y: p1.y + n.y * r1 };
  const a2 = { x: p2.x + n.x * r2, y: p2.y + n.y * r2 };
  const b1 = { x: p1.x - n.x * r1, y: p1.y - n.y * r1 };
  const b2 = { x: p2.x - n.x * r2, y: p2.y - n.y * r2 };
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const rm = (r1 + r2) / 2;
  const ca = { x: mid.x + n.x * (rm + bulge), y: mid.y + n.y * (rm + bulge) };
  const cb = { x: mid.x - n.x * (rm + bulge * 0.35), y: mid.y - n.y * (rm + bulge * 0.35) };
  const k = 1.33;
  return [
    `M${pt(a1)}`,
    `Q${pt(ca)} ${pt(a2)}`,
    `C${pt({ x: a2.x + d.x * r2 * k, y: a2.y + d.y * r2 * k })} ${pt({ x: b2.x + d.x * r2 * k, y: b2.y + d.y * r2 * k })} ${pt(b2)}`,
    `Q${pt(cb)} ${pt(b1)}`,
    `C${pt({ x: b1.x - d.x * r1 * k, y: b1.y - d.y * r1 * k })} ${pt({ x: a1.x - d.x * r1 * k, y: a1.y - d.y * r1 * k })} ${pt(a1)}`,
    "Z",
  ].join(" ");
};

/** 经过一串点的平滑闭合曲线（Catmull-Rom 转贝塞尔） */
export const smoothClosed = (ps: Vec[], tension = 0.5): string => {
  const n = ps.length;
  let d = `M${pt(ps[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = ps[(i - 1 + n) % n];
    const p1 = ps[i];
    const p2 = ps[(i + 1) % n];
    const p3 = ps[(i + 2) % n];
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension * 2, y: p1.y + ((p2.y - p0.y) / 6) * tension * 2 };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension * 2, y: p2.y - ((p3.y - p1.y) / 6) * tension * 2 };
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + " Z";
};

/** 平滑开放曲线 */
export const smoothOpen = (ps: Vec[], tension = 0.5): string => {
  const n = ps.length;
  let d = `M${pt(ps[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = ps[Math.max(0, i - 1)];
    const p1 = ps[i];
    const p2 = ps[i + 1];
    const p3 = ps[Math.min(n - 1, i + 2)];
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension * 2, y: p1.y + ((p2.y - p0.y) / 6) * tension * 2 };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension * 2, y: p2.y - ((p3.y - p1.y) / 6) * tension * 2 };
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
};

/** 绕 c 旋转 deg 度（屏幕坐标，正值顺时针） */
export const rot = (p: Vec, c: Vec, deg: number): Vec => {
  const r = (deg * Math.PI) / 180;
  const x = p.x - c.x;
  const y = p.y - c.y;
  return { x: c.x + x * Math.cos(r) - y * Math.sin(r), y: c.y + x * Math.sin(r) + y * Math.cos(r) };
};

/** 颜色变暗，用于远侧肢体 */
export const shade = (hex: string, k: number): string => {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((1 << 24) | (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b)).toString(16).slice(1)}`;
};
