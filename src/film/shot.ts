// 一镜到底的“镜头状态”：每节只往这些轨道里加关键帧，最后合成一条连续的轨道。
//
// 镜头用“钉住地球上的一个点”来描述：
//   anchor = 0 钉住地平线顶点 (0, -R)，anchor = 1 钉住球心 (0, 0)
//   这个点出现在屏幕 (ax, ay)，缩放 s = 每个世界单位多少像素
// 这样从贴地的直线一路拉到一个小球，缩放跨好几个数量级也是连续的。
import { type Key, track } from './anim';
import { R } from './theme';

export type TrackName =
  | 's'
  | 'anchor'
  | 'ax'
  | 'ay'
  | 'lightAngle'
  | 'lightAmt'
  | 'rim'
  | 'ambient'
  | 'speed'
  | 'cool'
  | 'beam'
  | 'moonTop';

export type ShotKeys = Partial<Record<TrackName, Key[]>>;

const DEFAULTS: Record<TrackName, number> = {
  s: 3000,
  anchor: 0,
  ax: 960,
  ay: 700,
  lightAngle: -130,
  lightAmt: 0.8,
  rim: 1,
  ambient: 1,
  speed: 1,
  cool: 0,
  beam: 0,
  moonTop: 1600,
};

const LOG_TRACKS = new Set<TrackName>(['s']);

export interface ShotState extends Record<TrackName, number> {
  /** 地球球心在屏幕上的位置和半径 */
  cx: number;
  cy: number;
  r: number;
  /** 变速后的时间，给尘埃、轨道这些“环境运动”用 */
  tau: number;
}

export const mergeKeys = (...all: ShotKeys[]): ShotKeys => {
  const out: ShotKeys = {};
  for (const keys of all) {
    for (const [name, ks] of Object.entries(keys) as [TrackName, Key[]][]) {
      out[name] = [...(out[name] ?? []), ...ks];
    }
  }
  return out;
};

const value = (keys: ShotKeys, name: TrackName, f: number) => {
  const ks = keys[name];
  if (!ks || ks.length === 0) return DEFAULTS[name];
  return track([{ f: -1, v: DEFAULTS[name] }, ...ks], f, LOG_TRACKS.has(name));
};

export const shotAt = (keys: ShotKeys, f: number): ShotState => {
  const v = Object.fromEntries((Object.keys(DEFAULTS) as TrackName[]).map((n) => [n, value(keys, n, f)])) as Record<
    TrackName,
    number
  >;
  // 镜头永远有一点呼吸：极慢的推近 + 轻微漂移，保证不会完全静止
  const breathe = 1 + 0.004 * Math.sin(f / 47) + 0.0008 * (f / 30);
  const s = v.s * breathe;
  const r = R * s;
  const cx = v.ax + Math.sin(f / 61) * 3;
  const cy = v.ay + R * s * (1 - v.anchor) + Math.cos(f / 53) * 2;
  let tau = 0;
  for (let i = 0; i < f; i++) tau += value(keys, 'speed', i);
  return { ...v, s, cx, cy, r, tau };
};

/** 世界坐标 → 屏幕坐标（世界原点 = 球心） */
export const toScreen = (st: ShotState, wx: number, wy: number) => ({
  x: st.cx + wx * st.s,
  y: st.cy + wy * st.s,
});
