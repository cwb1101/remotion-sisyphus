// 主角们（第三张摇篮的婴儿 奶妈 和那只碗）在各节之间是连续的：
// 动作都来自 subtitles.ts 的 cast，每帧在这里解出骨骼，再交给当前这一节去画
import React from "react";
import { Character } from "../components/Character";
import { Bowl } from "../components/Bowl";
import { PoseKey, Reach, Rig, solveRig, bodyTargetLocal, worldPoint } from "../components/rig";
import { castOf, CastCue, screens } from "../data/subtitles";
import { Gait, gaitEnd } from "../data/poses";
import { Vec, add } from "../lib/ik";
import { clamp, easeInOut, lerp, progress } from "../lib/motion";
import { useTheme } from "../styles/ThemeContext";
import { BABY_H, babyRoot, BASIN, BOWL_FLOOR, bowlOnRim, HERO_X, NURSE_H, NURSE_X, RIM_Y, STAND_Y } from "./world";

const NURSE_CUES = castOf("nurse");
const BABY_CUES = castOf("baby");
const BABY_ROOT = babyRoot(HERO_X);
const RIM_BOWL = bowlOnRim(HERO_X);

// —— 碗的时间线：全部从 cast 和 sfx 里取 ——
const findCue = (cues: CastCue[], pred: (c: CastCue) => boolean) => cues.find(pred)!;
const sfxFrame = (id: string, after = 0) => screens.flatMap((s) => s.sfx).find((x) => x.id === id && x.frame >= after)!.frame;
const T = {
  feedStart: findCue(NURSE_CUES, (c) => c.pose === "feed").at,
  setBack: findCue(NURSE_CUES, (c) => c.reachR === "bowlRim").at,
  push: findCue(BABY_CUES, (c) => c.pose === "babyPush").at,
  land: sfxFrame("bowl-fall-roll"),
  pick: findCue(NURSE_CUES, (c) => c.reachL === "bowlFloor").at,
  place: findCue(NURSE_CUES, (c) => c.reachL === "bowlRim").at,
  pour: findCue(NURSE_CUES, (c) => c.reachR === "jugPour").at,
};

const walkCue = NURSE_CUES.find((c) => c.pose === "walk")!;
export const NURSE_GAIT: Gait = { kind: "walk", firstStep: walkCue.at, steps: walkCue.steps ?? 4, startX: NURSE_X, direction: walkCue.direction ?? -1 };

type Targets = Record<string, Vec | null>;

const toTrack = (cues: CastCue[], targets: Targets, base: PoseKey[] = []): PoseKey[] => {
  const keys: PoseKey[] = [...base];
  const reach = (v: string | null | undefined): Reach | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = targets[v];
    return t ? { target: t } : null;
  };
  for (const c of cues) {
    if (c.pose === "walk" || c.pose === "run") continue;
    keys.push({
      at: c.at,
      pose: c.pose,
      lead: c.lead,
      antic: c.antic,
      face: c.face,
      facing: c.facing,
      headTurn: c.headTurn,
      joints: c.joints,
      reachL: reach(c.reachL),
      reachR: reach(c.reachR),
    });
  }
  return keys;
};

export type HeroState = {
  nurse: Rig;
  baby: Rig;
  bowl: { x: number; y: number; rotate: number; fill: number; wobble: number };
  puddle: number;
  jug: { p: Vec; tilt: number; opacity: number } | null;
  cloth: Vec | null;
  nurseOpacity: number;
};

const babyInput = (frame: number, targets: Targets) => ({
  build: "infant" as const,
  h: BABY_H,
  x: BABY_ROOT.x,
  y: BABY_ROOT.y,
  track: toTrack(BABY_CUES, targets),
  frame,
  seed: 2,
});

export const solveHero = (frame: number): HeroState => {
  // 1) 先解一遍婴儿（不管手），拿到嘴 身子这些点给奶妈的手 IK 用
  const babyPre = solveRig(babyInput(frame, {}));
  const bp = (n: Parameters<typeof bodyTargetLocal>[1]) => babyPre.toWorld(bodyTargetLocal(babyPre.s, n));
  const babyMouth = bp("mouth");
  const babyBelly = babyPre.toWorld({ x: (babyPre.s.pelvis.x + babyPre.s.neckBase.x) / 2, y: (babyPre.s.pelvis.y + babyPre.s.neckBase.y) / 2 - BABY_H * 0.25 });

  // 2) 碗：喂奶时在奶妈远侧手里，倒地后被捡起时在近侧手里
  const bowlHeld = { x: NURSE_X + 92, y: 880 };
  const nurseTargets: Targets = {
    bowlRim: { x: RIM_BOWL.x, y: RIM_BOWL.y - 10 },
    babyMouth,
    babyBelly,
    bowlHeld,
    basin: { x: BASIN.x - 8, y: BASIN.rim + 14 },
    bowlFloor: { x: BOWL_FLOOR.x, y: BOWL_FLOOR.y - 14 },
    jugPour: { x: RIM_BOWL.x + 14, y: RIM_BOWL.y - 70 },
    // 远侧手扶在摇篮头的立柱上
    cradleEdge: { x: HERO_X - 146, y: RIM_Y - 30 },
  };
  const nurse = solveRig({
    build: "adult",
    h: NURSE_H,
    x: NURSE_X,
    y: STAND_Y,
    track: toTrack(NURSE_CUES, nurseTargets),
    frame,
    seed: 5,
    gait: NURSE_GAIT,
  });

  // 3) 再解婴儿：手去抓奶妈的头巾 / 脸，推碗时手落在碗上
  const nHead = worldPoint(nurse, "head");
  const baby = solveRig(
    babyInput(frame, {
      nurseVeil: { x: nHead.x + 20, y: nHead.y + NURSE_H * 0.55 },
      nurseFace: { x: nHead.x + 18, y: nHead.y + 10 },
      bowlRim: { x: RIM_BOWL.x + 10, y: RIM_BOWL.y - 16 },
    }),
  );

  // —— 碗 ——
  let bowl = { x: RIM_BOWL.x, y: RIM_BOWL.y, rotate: 0, fill: 1, wobble: Math.exp(-frame / 14) };
  const handR = worldPoint(nurse, "handR");
  const handL = worldPoint(nurse, "handL");
  if (frame >= T.feedStart && frame < T.setBack) {
    bowl = { x: handR.x + 6, y: handR.y + 4, rotate: 0, fill: 0.85, wobble: 0.3 };
  } else if (frame >= T.setBack && frame < T.push) {
    bowl = { ...bowl, fill: 0.85, wobble: Math.exp(-(frame - T.setBack) / 12) };
  } else if (frame >= T.push && frame < T.pick) {
    // 翻出摇篮：抛物线落地，翻滚，落地后弹两下滚半圈
    const u = progress(frame, T.push, T.land);
    if (frame < T.land) {
      bowl = { x: lerp(RIM_BOWL.x, BOWL_FLOOR.x, u), y: lerp(RIM_BOWL.y, BOWL_FLOOR.y, u * u) - Math.sin(Math.PI * u) * 18, rotate: 200 * u, fill: 0, wobble: 0 };
    } else {
      const t = frame - T.land;
      const hop = Math.abs(Math.sin(t * 0.55)) * 14 * Math.exp(-t / 5);
      const rock = Math.sin(t * 0.4) * 30 * Math.exp(-t / 10);
      bowl = { x: BOWL_FLOOR.x + Math.min(t, 18) * 1.4, y: BOWL_FLOOR.y - hop, rotate: 180 + rock, fill: 0, wobble: 0 };
    }
  } else if (frame >= T.pick && frame < T.place) {
    // 被捡起：碗跟着手，翻正
    const e = easeInOut(progress(frame, T.pick, T.pick + 18));
    bowl = { x: handL.x + 4, y: handL.y + 6, rotate: lerp(180, 0, e), fill: 0, wobble: 0 };
  } else if (frame >= T.place) {
    const fill = easeInOut(progress(frame, T.pour - 2, T.pour + 14));
    bowl = { x: RIM_BOWL.x, y: RIM_BOWL.y, rotate: 0, fill, wobble: 0.3 * Math.exp(-(frame - T.pour) / 10) * (frame > T.pour ? 1 : 0) };
  }
  const puddle = frame >= T.land ? clamp((frame - T.land) / 10, 0, 1) : 0;

  // —— 水罐：倒奶时出现在远侧手里 ——
  let jug: HeroState["jug"] = null;
  if (frame >= T.pour - 16 && frame < T.pour + 26) {
    const tilt = easeInOut(progress(frame, T.pour - 6, T.pour + 4)) * (1 - easeInOut(progress(frame, T.pour + 14, T.pour + 22)));
    const op = clamp(Math.min(frame - (T.pour - 16), T.pour + 26 - frame) / 5, 0, 1);
    jug = { p: handR, tilt, opacity: op };
  }

  // —— 擦身的湿布：浸水到擦完 ——
  const washFrom = NURSE_CUES.find((c) => c.reachL === "basin")!.at - 12;
  const washTo = [...NURSE_CUES].reverse().find((c) => c.reachL === "basin")!.at + 16;
  const cloth = frame >= washFrom && frame < washTo ? handL : null;

  // 走到门口后进入门洞的暗处
  const nurseOpacity = 1 - clamp((frame - gaitEnd(NURSE_GAIT)) / 14, 0, 1);

  return { nurse, baby, bowl, puddle, jug, cloth, nurseOpacity };
};

// —— 画 ——
export const HeroBaby: React.FC<{ st: HeroState }> = ({ st }) => (
  <Character build="infant" costume="baby" feature="redSwaddle" h={BABY_H} x={BABY_ROOT.x} y={BABY_ROOT.y} rig={st.baby} />
);

export const HeroBowl: React.FC<{ st: HeroState; frame: number }> = ({ st, frame }) => {
  const th = useTheme();
  return (
    <>
      {st.puddle > 0 ? <ellipse cx={BOWL_FLOOR.x - 16} cy={BOWL_FLOOR.y + 2} rx={44 * st.puddle} ry={9 * st.puddle} fill={th.milk} opacity={0.85} stroke={th.ink} strokeWidth={th.material === "woodcut" ? 2.5 : 0} /> : null}
      <Bowl x={st.bowl.x} y={st.bowl.y} rotate={st.bowl.rotate} fill={st.bowl.fill} wobble={st.bowl.wobble} frame={frame} />
    </>
  );
};

export const HeroNurse: React.FC<{ st: HeroState }> = ({ st }) => {
  const th = useTheme();
  const jug = st.jug;
  return (
    <Character build="adult" costume="nurse" h={NURSE_H} x={NURSE_X} y={STAND_Y} rig={st.nurse} opacity={st.nurseOpacity}>
      {st.cloth ? <path d={`M${st.cloth.x - 12} ${st.cloth.y - 4} q8 -10 22 -2 q4 14 -6 22 q-12 2 -16 -20 Z`} fill={th.cloth.apron} stroke={th.ink} strokeWidth={2.5} /> : null}
      {jug ? (
        <g opacity={jug.opacity} transform={`rotate(${jug.tilt * 70} ${jug.p.x} ${jug.p.y})`}>
          <path d={`M${jug.p.x - 18} ${jug.p.y - 8} q-4 30 4 40 l28 0 q8 -10 4 -40 Z`} fill={th.material === "woodcut" ? th.wood : "#B98A5A"} stroke={th.ink} strokeWidth={3} />
          <path d={`M${jug.p.x + 16} ${jug.p.y - 6} q14 4 12 18`} fill="none" stroke={th.ink} strokeWidth={3} />
          {jug.tilt > 0.6 ? <path d={`M${jug.p.x - 18} ${jug.p.y - 6} q-6 20 ${RIM_BOWL.x - jug.p.x + 18} ${RIM_BOWL.y - jug.p.y - 14}`} fill="none" stroke={th.milk} strokeWidth={5} opacity={(jug.tilt - 0.6) * 2.5} /> : null}
        </g>
      ) : null}
    </Character>
  );
};

export { add };
