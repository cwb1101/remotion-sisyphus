// 连续镜头：镜头从关键帧所在小节的第一拍开始动，落定在下一个关键帧小节的第一拍。
// 读字时也保留轻微漂移，镜头不会完全静止超过 3 秒。
import React from "react";
import { useCurrentFrame } from "remotion";
import { CameraKey } from "../data/subtitles";
import { bar } from "../lib/rhythm";
import { easeIn, easeInOut, easeOut, lerp, progress, snapOut } from "../lib/motion";
import { noise1 } from "../lib/random";
import { Shot } from "../sections/world";

export const W = 1920;
export const H = 1080;

const EASE = { inOut: easeInOut, snapOut, in: easeIn, out: easeOut };

export const cameraAt = (keys: CameraKey[], shots: Record<string, Shot>, frame: number): Shot => {
  const ks = [...keys].sort((a, b) => a.bar - b.bar);
  if (frame <= bar(ks[0].bar)) return shots[ks[0].shot];
  for (let i = 1; i < ks.length; i++) {
    const from = bar(ks[i - 1].bar);
    const to = bar(ks[i].bar);
    if (frame < to) {
      const a = shots[ks[i - 1].shot];
      const b = shots[ks[i].shot];
      const e = EASE[ks[i].ease ?? "inOut"](progress(frame, from, to));
      // 缩放按对数插值，推拉的速度感才均匀
      const zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), e));
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), zoom };
    }
  }
  return shots[ks[ks.length - 1].shot];
};

/** 世界坐标 → 屏幕坐标（给附着标签 字幕避让用） */
export const toScreen = (cam: Shot, p: { x: number; y: number }) => ({
  x: (p.x - cam.x) * cam.zoom + W / 2,
  y: (p.y - cam.y) * cam.zoom + H / 2,
});

export const useCamera = (keys: CameraKey[], shots: Record<string, Shot>): Shot => {
  const f = useCurrentFrame();
  const c = cameraAt(keys, shots, f);
  // 手持感的轻微漂移，幅度按缩放折算成屏幕上 2–3 像素
  const drift = 2.6 / c.zoom;
  return { x: c.x + noise1(f / 45, 11) * drift, y: c.y + noise1(f / 52, 23) * drift, zoom: c.zoom * (1 + noise1(f / 80, 5) * 0.004) };
};

export const CameraRig: React.FC<{ cam: Shot; children: React.ReactNode }> = ({ cam, children }) => (
  <g transform={`translate(${W / 2} ${H / 2}) scale(${cam.zoom}) translate(${-cam.x} ${-cam.y})`}>{children}</g>
);
