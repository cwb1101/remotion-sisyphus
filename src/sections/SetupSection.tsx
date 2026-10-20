// 第二节 设定（第 4–7 小节）：皇帝俯身在最后一张摇篮上侧耳听，鹰在他手套上；
// 镜头摇回来，奶妈喂奶、擦身，一句话不说
import React from "react";
import { Character } from "../components/Character";
import { IconicPortrait } from "../components/IconicPortrait";
import { castOf, screens } from "../data/subtitles";
import { solveRig, worldPoint, Rig } from "../components/rig";
import { clamp, easeOut, progress } from "../lib/motion";
import { FRAMES_PER_BEAT } from "../lib/rhythm";
import { useTheme } from "../styles/ThemeContext";
import { FONT_SANS } from "../styles/fonts";
import { HeroState } from "./hero";
import { HeroLayers } from "./HeroLayers";
import { Layer } from "./NurserySet";
import { Gait } from "../data/poses";
import { EMPEROR_FROM, EMPEROR_X, LECTERN_X, NURSE_H, PORTRAIT, STAND_Y } from "./world";

const EMP_CUES = castOf("emperor");
const FALCON_CUES = castOf("falcon");
const SCREEN3 = screens[2];
// 纸卷在第 5 小节第一拍展开（scroll 音效那一帧），语言名每半拍出一个
const SCROLL_AT = SCREEN3.sfx.find((x) => x.id === "scroll")!.frame;
const LANGS = SCREEN3.labels.slice(1);

const EMP_WALK = EMP_CUES.find((c) => c.pose === "walk")!;
const EMP_H = NURSE_H * 1.06;
const EMP_GAIT: Gait = { kind: "walk", firstStep: EMP_WALK.at, steps: EMP_WALK.steps ?? 2, startX: EMPEROR_X, direction: EMP_WALK.direction ?? -1, hold: EMP_WALK.hold };

export const emperorRig = (frame: number): Rig =>
  solveRig({
    build: "adult",
    h: EMP_H,
    x: EMPEROR_X,
    y: STAND_Y,
    track: EMP_CUES.filter((c) => c.pose !== "walk").map((c) => ({ at: c.at, pose: c.pose as "stand", lead: c.lead, antic: c.antic, facing: c.facing ?? -1, face: c.face, joints: c.joints })),
    frame,
    seed: 13,
    gait: EMP_GAIT,
  });

/** 鹰：有头 身子 翅膀 腿，能转头 眨眼 扇翅。停在皇帝远侧手套上 */
const Falcon: React.FC<{ at: { x: number; y: number }; frame: number; facing: number }> = ({ at, frame, facing }) => {
  const th = useTheme();
  const turnCue = FALCON_CUES.find((c) => c.headTurn);
  const flapCue = FALCON_CUES.find((c) => c.pose === "raiseHand");
  const turn = turnCue ? easeOut(progress(frame, turnCue.at - 6, turnCue.at)) : 0;
  const flapT = flapCue ? frame - (flapCue.at - 8) : -1;
  const flap = flapT >= 0 && flapT < 24 ? Math.sin((flapT / 24) * Math.PI * 2) * (1 - flapT / 24) : 0;
  const blink = (frame % 70) < 3;
  const dark = th.material === "woodcut" ? th.wall : "#2B2018";
  const s = 1;
  return (
    <g transform={`translate(${at.x} ${at.y - 4}) scale(${facing * s} ${s})`}>
      {/* 爪子抓着手套 */}
      <path d="M-6 0 l-3 8 M4 0 l3 8" stroke={th.gold} strokeWidth={3} strokeLinecap="round" />
      {/* 尾巴 身子 */}
      <path d="M-4 -6 L-22 18 L-10 18 Z" fill={dark} stroke={th.gold} strokeWidth={1.6} />
      <ellipse cx={0} cy={-18} rx={14} ry={20} fill={dark} stroke={th.gold} strokeWidth={1.8} />
      {/* 翅膀：收着时贴身，扇动时张开 */}
      <path d={`M-2 -30 Q${-30 - flap * 30} ${-40 - flap * 40} ${-26 - flap * 12} ${-4 + flap * -10} Q-12 -6 -2 -14 Z`} fill={dark} stroke={th.gold} strokeWidth={1.6} />
      {/* 头：转头时整个头和喙转到另一边 */}
      <g transform={`translate(4 -40) scale(${1 - turn * 2} 1)`}>
        <circle cx={0} cy={0} r={10} fill={dark} stroke={th.gold} strokeWidth={1.8} />
        <path d="M8 -2 l9 4 l-8 5 Z" fill={th.gold} />
        <circle cx={3} cy={-2} r={blink ? 0.6 : 2.2} fill="#F2D27A" />
      </g>
    </g>
  );
};

const Lectern: React.FC<{ frame: number }> = ({ frame }) => {
  const th = useTheme();
  const u = easeOut(progress(frame, SCROLL_AT - 4, SCROLL_AT + 14));
  const x = LECTERN_X;
  const top = STAND_Y - 210;
  const len = 40 + u * 230;
  return (
    <g>
      <rect x={x - 10} y={top} width={20} height={210} fill={th.woodDark} stroke={th.ink} strokeWidth={3} />
      <path d={`M${x - 70} ${STAND_Y} L${x + 70} ${STAND_Y} L${x + 40} ${STAND_Y - 20} L${x - 40} ${STAND_Y - 20} Z`} fill={th.wood} stroke={th.ink} strokeWidth={3} />
      <path d={`M${x - 80} ${top + 10} L${x + 80} ${top - 22} L${x + 84} ${top - 8} L${x - 76} ${top + 24} Z`} fill={th.wood} stroke={th.ink} strokeWidth={3} />
      {/* 纸卷从台子边上垂下来展开 */}
      <rect x={x - 68} y={top + 6} width={136} height={len} fill="#E9DDBE" stroke={th.ink} strokeWidth={3} />
      <rect x={x - 76} y={top + len} width={152} height={16} rx={8} fill="#CDB98F" stroke={th.ink} strokeWidth={3} />
      {LANGS.map((name, i) => {
        const at = SCROLL_AT + Math.round((i * FRAMES_PER_BEAT) / 2);
        const o = clamp((frame - at) / 6, 0, 1);
        return (
          <text key={name} x={x} y={top + 50 + i * 42} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={500} fontSize={name.length > 4 ? 22 : 27} fill="#3A2A1A" opacity={o}>
            {name}
          </text>
        );
      })}
    </g>
  );
};

/** 皇帝 鹰 书架 肖像：从王冠影子出现（f40）起就在门口，直到这一节结束 */
export const EmperorGroup: React.FC<{ layer: Layer; frame: number }> = ({ layer, frame }) => {
  if (frame < EMPEROR_FROM) return null;
  if (layer === "back") return <IconicPortrait x={PORTRAIT.x} y={PORTRAIT.y} w={130} carrier="tapestry" emblems={["crown", "falcon"]} />;
  if (layer !== "actors") return null;
  const emp = emperorRig(frame);
  const glove = worldPoint(emp, "handR");
  return (
    <>
      <Lectern frame={frame} />
      <Character build="adult" costume="emperor" h={EMP_H} x={EMPEROR_X} y={STAND_Y} rig={emp} />
      <Falcon at={glove} frame={frame} facing={emp.facingU < 0 ? -1 : 1} />
    </>
  );
};

export const SetupSection: React.FC<{ layer: Layer; st: HeroState; frame: number }> = ({ layer, st, frame }) => <HeroLayers layer={layer} st={st} frame={frame} />;
