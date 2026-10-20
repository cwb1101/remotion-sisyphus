// 动作库测试：每个 pose 一个小节（第 2 拍落点），然后走路循环、奔跑、婴儿动作。脚步音效卡在着地帧
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Html5Audio } from "remotion";
import { Character } from "./components/Character";
import { PoseKey } from "./components/rig";
import { footfalls, Gait, gaitEnd, POSES, PoseName } from "./data/poses";
import { bar, beat, FRAMES_PER_BAR } from "./lib/rhythm";
import { Defs } from "./styles/Defs";
import { ThemeProvider } from "./styles/ThemeContext";
import { THEMES } from "./styles/themes";
import { FONT_SANS } from "./styles/fonts";

const ADULT_POSES: PoseName[] = ["stand", "push", "pull", "sit", "lookUp", "lookDown", "reach", "point", "fall", "getUp", "turn", "raiseHand", "holdHead", "crouch", "bendOver", "cupEar", "coverMouth", "lean", "carry", "feed", "standBack"];
const BABY_POSES: PoseName[] = ["babyLie", "babyReach", "babyLaugh", "babyCry", "babyPush", "babyLimp", "babySit"];

const GROUND = 860;
const H = 120;

// 每个 pose 占一小节：落点在第 2 拍，预备 0.18
export const adultTrackForTest: PoseKey[] = [{ at: 0, pose: "stand" }];
const adultTrack = adultTrackForTest;
ADULT_POSES.forEach((p, i) => {
  const isTurn = p === "turn";
  const seat = p === "sit" ? { seat: 0.98 * H } : {};
  adultTrack.push({ at: beat(i + 1, 2), pose: p, lead: 14, antic: 0.18, facing: isTurn ? -1 : 1, ...seat });
  if (isTurn) adultTrack.push({ at: beat(i + 1, 4), pose: "stand", lead: 12, facing: 1 });
});
const ADULT_BARS = ADULT_POSES.length;

// 走路 8 步 奔跑 8 步，都是每拍一步
const walk: Gait = { kind: "walk", firstStep: beat(ADULT_BARS + 1, 2), steps: 8, startX: 360, direction: 1 };
const walkBars = 4;
const run: Gait = { kind: "run", firstStep: beat(ADULT_BARS + walkBars + 1, 2), steps: 8, startX: 150, direction: 1 };
const runBars = 4;
const babyStart = ADULT_BARS + walkBars + runBars + 1;
const babyTrack: PoseKey[] = [{ at: 0, pose: "babyLie" }];
BABY_POSES.forEach((p, i) => babyTrack.push({ at: beat(babyStart + i, 2), pose: p, lead: 12, antic: 0.12 }));

export const POSE_TEST_FRAMES = bar(babyStart + BABY_POSES.length + 1);

const segmentLabel = (f: number): string => {
  const b = Math.floor(f / FRAMES_PER_BAR);
  if (b < ADULT_BARS) {
    const prev = b === 0 ? "站立" : POSES[ADULT_POSES[b - 1]].label;
    return `${prev} 到 ${POSES[ADULT_POSES[b]].label}`;
  }
  if (b < ADULT_BARS + walkBars) return "走路循环 每拍一步";
  if (b < ADULT_BARS + walkBars + runBars) return "奔跑 每拍一步";
  const i = b - (babyStart - 1);
  return `婴儿 ${POSES[BABY_POSES[Math.min(BABY_POSES.length - 1, Math.max(0, i))]].label}`;
};

export const PoseTest: React.FC = () => {
  const f = useCurrentFrame();
  const inWalk = f >= bar(ADULT_BARS + 1) && f < bar(ADULT_BARS + walkBars + 1);
  const inRun = f >= bar(ADULT_BARS + walkBars + 1) && f < bar(babyStart);
  const inBaby = f >= bar(babyStart);
  const steps = [...footfalls(walk), ...footfalls(run)];
  // 地面上的刻度，方便逐帧看脚有没有滑
  const ticks = Array.from({ length: 40 }, (_, i) => i * 60);
  return (
    <ThemeProvider theme={THEMES.main}>
      <AbsoluteFill style={{ background: "#2B231D" }}>
        <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
          <Defs />
          <rect x={0} y={GROUND} width={1920} height={220} fill="#3A2F27" />
          {ticks.map((x) => (
            <line key={x} x1={x} x2={x} y1={GROUND} y2={GROUND + 14} stroke="#8C7A66" strokeWidth={2} />
          ))}
          {!inWalk && !inRun && !inBaby ? (
            <>
              <rect x={1180} y={GROUND - 250} width={220} height={250} fill="#5E3E26" stroke="#24190F" strokeWidth={4} />
              {/* 坐那一小节的凳子：座面高度和 sit 的 seat 一致 */}
              {Math.floor(f / FRAMES_PER_BAR) === ADULT_POSES.indexOf("sit") || Math.floor(f / FRAMES_PER_BAR) === ADULT_POSES.indexOf("sit") + 1 ? (
                <>
                  <rect x={840} y={GROUND - 0.98 * H + 0.2 * H} width={110} height={16} rx={4} fill="#8A5E3B" stroke="#24190F" strokeWidth={3} />
                  <rect x={360} y={GROUND - 0.98 * H + 0.2 * H} width={110} height={16} rx={4} fill="#8A5E3B" stroke="#24190F" strokeWidth={3} />
                  <path d={`M850 ${GROUND - 0.78 * H + 16} L842 ${GROUND} M940 ${GROUND - 0.78 * H + 16} L948 ${GROUND} M370 ${GROUND - 0.78 * H + 16} L362 ${GROUND} M460 ${GROUND - 0.78 * H + 16} L468 ${GROUND}`} stroke="#5E3E26" strokeWidth={8} />
                </>
              ) : null}
              <Character build="adult" costume="plain" h={H} x={900} y={GROUND} track={adultTrack} seed={3} color="#7D6B5A" />
              <Character build="adult" costume="nurse" h={H} x={420} y={GROUND} track={adultTrack} seed={5} />
            </>
          ) : null}
          {inWalk ? (
            <>
              <Character build="adult" costume="nurse" h={H * 0.8} x={110} y={GROUND - 60} track={[{ at: 0, pose: "stand" }]} gait={{ ...walk, startX: 110 }} seed={9} />
              <Character build="adult" costume="plain" h={H} x={360} y={GROUND} track={[{ at: 0, pose: "stand" }]} gait={walk} seed={7} color="#7D6B5A" />
            </>
          ) : null}
          {inRun ? <Character build="adult" costume="plain" h={H} x={420} y={GROUND} track={[{ at: 0, pose: "stand" }]} gait={run} seed={8} color="#7D6B5A" /> : null}
          {inBaby ? <Character build="infant" costume="baby" feature="redSwaddle" h={150} x={960} y={GROUND - 220} track={babyTrack} seed={2} /> : null}
        </svg>
        <div style={{ position: "absolute", left: 60, top: 50, color: "#EDE3CF", fontFamily: FONT_SANS, fontSize: 44 }}>{segmentLabel(f)}</div>
        <div style={{ position: "absolute", left: 60, top: 110, color: "#B9A88E", fontFamily: FONT_SANS, fontSize: 28 }}>
          第 {Math.floor(f / FRAMES_PER_BAR) + 1} 小节 第 {Math.floor((f % FRAMES_PER_BAR) / 18) + 1} 拍 帧 {f}
        </div>
        {steps.map((s, i) => (
          <Sequence key={i} from={s} durationInFrames={20} layout="none">
            <Html5Audio src={staticFile("audio/sfx/footstep.wav")} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export const POSE_TEST_INFO = { ADULT_POSES, BABY_POSES, walk, run, walkEnd: gaitEnd(walk) };
