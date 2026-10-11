import {inOut, lerp, noise1} from './anim';

/** 相机关键帧：在第 f 帧时，画面中心对准世界坐标 (x, y)，缩放 zoom，旋转 rot 度 */
export type Shot = {f: number; x: number; y: number; zoom: number; rot?: number; ease?: (t: number) => number};
export type Cam = {x: number; y: number; zoom: number; rot: number};

/** 在关键帧之间插值；缩放按对数插值，推拉速度更自然。ease 写在目标关键帧上 */
export const sampleShots = (frame: number, shots: Shot[]): Cam => {
  const s = [...shots].sort((a, b) => a.f - b.f);
  const first = s[0];
  const last = s[s.length - 1];
  const pick = (k: Shot): Cam => ({x: k.x, y: k.y, zoom: k.zoom, rot: k.rot ?? 0});
  if (frame <= first.f) return pick(first);
  if (frame >= last.f) return pick(last);
  const i = s.findIndex((k, idx) => k.f <= frame && frame < s[idx + 1].f);
  const a = s[i];
  const b = s[i + 1];
  const e = (b.ease ?? inOut)((frame - a.f) / (b.f - a.f));
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e),
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), e)),
    rot: lerp(a.rot ?? 0, b.rot ?? 0, e),
  };
};

export type Impact = {f: number; amp: number};

/** 冲击带来的屏幕震动（屏幕像素 / 度） */
export const shakeAt = (frame: number, impacts: Impact[]) => {
  let dx = 0;
  let dy = 0;
  let dr = 0;
  for (const {f, amp} of impacts) {
    const t = frame - f;
    if (t < 0 || t > 24) continue;
    const k = amp * Math.exp(-t / 5);
    dx += noise1(t * 1.7 + f) * k;
    dy += noise1(t * 1.9 + f + 50) * k;
    dr += noise1(t * 1.3 + f + 90) * k * 0.04;
  }
  return {dx, dy, dr};
};

/** 手持感的持续漂移，保证画面永远在动 */
export const driftAt = (frame: number, zoom: number) => ({
  x: (noise1(frame / 45) * 10) / zoom,
  y: (noise1(frame / 52 + 20) * 7) / zoom,
  rot: noise1(frame / 80 + 40) * 0.5,
});
