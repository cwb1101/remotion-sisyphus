// 第三节 孩子在试（第 8–12 小节，木刻变奏）：婴儿笑 伸手 哭 推碗，没人回应，手一次比一次低；
// 奶妈捡碗 倒满 转身出门；窗光扫过三次
import React from "react";
import { HeroState } from "./hero";
import { HeroLayers } from "./HeroLayers";
import { Layer } from "./NurserySet";

export const TrialSection: React.FC<{ layer: Layer; st: HeroState; frame: number }> = ({ layer, st, frame }) => (
  <HeroLayers layer={layer} st={st} frame={frame} />
);
