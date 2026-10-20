// 群像：复用 Character，按固定种子随机身高 衣色 动作相位。N 个人里 M 个在做某事（doing）
import React from "react";
import { CastCue } from "../data/subtitles";
import { PoseName } from "../data/poses";
import { rng } from "../lib/random";
import { Character, Costume, Feature } from "./Character";
import { Build, PoseKey } from "./rig";

export type Member = {
  x: number;
  y: number;
  facing?: 1 | -1;
  /** 身高系数（相对 h） */
  scale?: number;
  color?: string;
};

export type CrowdProps = {
  members: Member[];
  build: Build;
  costume: Costume;
  h: number;
  seed: number;
  /** 不在做动作的人摆什么姿势 */
  idle: PoseName;
  /** 这群人的动作提示（来自 subtitles.ts 的 cast，who 相同的那些） */
  cues: CastCue[];
  palette?: string[];
  feature?: Feature;
  /** 身高随机幅度 */
  heightJitter?: number;
  /** 动作时间随机错开的最大帧数 */
  timeJitter?: number;
  /** 部分人一直把脸转开（比如婴儿转向墙），给出人数 */
  turnedAway?: number;
  render?: (i: number, el: React.ReactNode) => React.ReactNode;
};

/** 用种子打乱 0..n-1，前 m 个就是「在做这件事」的人，同样的种子每次都一样 */
export const pickDoers = (n: number, m: number, seed: number): Set<number> => {
  const r = rng(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return new Set(idx.slice(0, Math.min(n, m)));
};

export const crowdTracks = (p: CrowdProps): PoseKey[][] => {
  const n = p.members.length;
  const r = rng(p.seed);
  const delays = p.members.map(() => Math.round(r() * (p.timeJitter ?? 8)));
  const turned = pickDoers(n, p.turnedAway ?? 0, p.seed + 99);
  return p.members.map((m, i) => {
    const facing = m.facing ?? 1;
    const track: PoseKey[] = [{ at: 0, pose: p.idle, facing, headTurn: turned.has(i) ? 1 : 0 }];
    p.cues.forEach((c, k) => {
      if (c.pose === "walk" || c.pose === "run") return;
      const doers = c.doing === undefined ? null : pickDoers(n, c.doing, p.seed + k * 17);
      if (doers && !doers.has(i)) return;
      track.push({
        at: c.at + delays[i],
        pose: c.pose,
        lead: c.lead,
        antic: c.antic,
        face: c.face,
        facing,
        headTurn: c.headTurn ?? (turned.has(i) ? 1 : 0),
        joints: c.joints,
      });
    });
    return track;
  });
};

export const Crowd: React.FC<CrowdProps> = (p) => {
  const r = rng(p.seed + 1);
  const tracks = crowdTracks(p);
  return (
    <>
      {p.members.map((m, i) => {
        const jitter = 1 + (r() * 2 - 1) * (p.heightJitter ?? 0.06);
        const color = m.color ?? (p.palette ? p.palette[Math.floor(r() * p.palette.length)] : undefined);
        const el = (
          <Character
            key={i}
            build={p.build}
            costume={p.costume}
            h={p.h * (m.scale ?? 1) * jitter}
            x={m.x}
            y={m.y}
            track={tracks[i]}
            seed={p.seed * 31 + i}
            color={color}
            feature={p.feature}
          />
        );
        return <React.Fragment key={i}>{p.render ? p.render(i, el) : el}</React.Fragment>;
      })}
    </>
  );
};
