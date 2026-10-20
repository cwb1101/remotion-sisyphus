// 第一节 钩子（第 1–3 小节）：奶妈放下碗、捂住嘴；镜头猛拉远，一排摇篮；门外的王冠影子
import React from "react";
import { Character } from "../components/Character";
import { castOf } from "../data/subtitles";
import { clamp, easeOut, progress } from "../lib/motion";
import { useTheme } from "../styles/ThemeContext";
import { HeroState } from "./hero";
import { HeroLayers } from "./HeroLayers";
import { Layer } from "./NurserySet";
import { NURSE_H, STAND_Y } from "./world";

// 王冠影子在第一屏 f40 滑进来（在门口那一侧的地面上）
const SHADOW_IN = 40;
const SHADOW_OUT = castOf("emperor")[0]?.at ?? 216;

const EmperorShadow: React.FC<{ frame: number }> = ({ frame }) => {
  const th = useTheme();
  const u = easeOut(progress(frame, SHADOW_IN, SHADOW_IN + 22));
  const fade = 1 - clamp((frame - (SHADOW_OUT - 30)) / 30, 0, 1);
  if (u <= 0 || fade <= 0) return null;
  const x = 520 + u * 230;
  return (
    <g opacity={0.62 * fade} transform={`translate(${x} ${STAND_Y + 6}) matrix(1 0 -1.55 -0.22 0 0)`}>
      <Character build="adult" costume="emperor" material="silhouette" h={NURSE_H * 1.05} x={0} y={0} pose="standBack" facing={1} breathe={false} tint={th.shadow} />
    </g>
  );
};

export const HookSection: React.FC<{ layer: Layer; st: HeroState; frame: number }> = ({ layer, st, frame }) => (
  <>
    {layer === "floor" ? <EmperorShadow frame={frame} /> : null}
    <HeroLayers layer={layer} st={st} frame={frame} />
  </>
);
