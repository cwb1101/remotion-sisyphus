// 把 src/data/subtitles.ts 导出成 JSON，给 Python 的生成和检查脚本用：npm run timeline
import fs from "node:fs";
import { screens, sections, sfx } from "../src/data/subtitles";
import { THEMES } from "../src/styles/themes";
import { POSES } from "../src/data/poses";
import manifest from "../src/data/sfx-manifest.json";

const poseLabel = (p: string) => (p === "walk" ? "走路" : p === "run" ? "奔跑" : POSES[p as keyof typeof POSES].label);

const out = {
  styles: Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.name])),
  tiers: { light: { name: "轻", lufs: -30 }, mid: { name: "中", lufs: -24 }, heavy: { name: "重", lufs: -21 } },
  sections,
  sfx,
  manifest,
  screens: screens.map((s) => ({
    ...s,
    act: sections.find((x) => x.id === s.section)!.name,
    float: s.float?.text ?? null,
    floatDelayBeats: s.float?.delayBeats ?? 0,
    sfx: s.sfx.map((x) => ({ at: x.frame - s.start, name: x.label, tier: x.tier, id: x.id })),
    cast: s.cast.map((c) => ({ ...c, offset: c.at - s.start, poseLabel: poseLabel(c.pose) })),
  })),
};
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/timeline.json", JSON.stringify(out, null, 2));
console.log(`写入 out/timeline.json  ${screens.length} 屏  ${sfx.length} 个音效`);
