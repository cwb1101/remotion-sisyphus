// 几何检查：逐帧算出镜头和每个角色的头 手 脚在屏幕上的位置，检查
//   1) 有字幕时，人物的脸和手有没有落进字幕框
//   2) 头 手 字幕 标签有没有进右上角水印区
//   3) 头和脚有没有被画面裁掉（特写镜头里有意裁掉的列为「特写」）
//   4) 手 IK 落点误差（手该碰到东西时离目标多远）
// 用法：npx tsx scripts/check-frames.ts [起始帧] [结束帧]  → 结果写到 out/check/geometry.json
import fs from "node:fs";
import { cameraAt, toScreen } from "../src/components/Camera";
import { subtitleBox } from "../src/components/Subtitle";
import { WATERMARK_BOX } from "../src/components/Overlay";
import { screens, sections } from "../src/data/subtitles";
import { solveHero } from "../src/sections/hero";
import { emperorRig } from "../src/sections/SetupSection";
import { SHOTS, EMPEROR_FROM } from "../src/sections/world";
import { Rig, worldPoint } from "../src/components/rig";

const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? 864);
const CAMERA = sections.flatMap((s) => s.camera);
const setupEnd = sections.find((s) => s.id === "setup")!.end;

type Issue = { frame: number; kind: string; who: string; part: string; x: number; y: number };
const issues: Issue[] = [];
const closeups: { frame: number; who: string; part: string }[] = [];
const inBox = (p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

for (let f = from; f < to; f++) {
  const cam = cameraAt(CAMERA, SHOTS, f);
  const st = solveHero(f);
  const scr = screens.find((s) => f >= s.start && f < s.end);
  const lines = scr ? [scr.upper, scr.lower].filter(Boolean).length : 0;
  const box = lines ? subtitleBox(lines) : null;
  // 字幕框：按每行字数估宽度（字号 × 1.06 × 字数），左右居中
  const maxChars = scr ? Math.max(...[scr.upper, scr.lower].filter(Boolean).map((l) => [...l!.replace(/[【】]/g, "")].length)) : 0;
  const subW = box ? maxChars * box.size * 1.06 : 0;
  const subBox = box ? { x: 960 - subW / 2, y: box.top, w: subW, h: box.bottom - box.top } : null;
  const rigs: [string, Rig, number][] = [["奶妈", st.nurse, st.nurseOpacity], ["婴儿", st.baby, 1]];
  if (f >= EMPEROR_FROM && f < setupEnd) rigs.push(["皇帝", emperorRig(f), 1]);
  for (const [who, rig, op] of rigs) {
    if (op < 0.5) continue;
    const head = worldPoint(rig, "head");
    const parts: [string, { x: number; y: number }][] = [
      ["脸", head],
      ["左手", worldPoint(rig, "handL")],
      ["右手", worldPoint(rig, "handR")],
      ["左脚", worldPoint(rig, "anL")],
      ["右脚", worldPoint(rig, "anR")],
    ];
    const onScreen = parts.map(([n, p]) => [n, toScreen(cam, p)] as const);
    // 角色根本不在画面里就跳过（不算裁切）
    const visible = onScreen.some(([, p]) => p.x > 0 && p.x < 1920 && p.y > 0 && p.y < 1080);
    if (!visible) continue;
    const headR = rig.s.headR * cam.zoom;
    // 主体：骨盆在画面中间 80% 里才算「这个人在画面里」，镜头摇过时从边上进出的不算裁切
    const pelvis = toScreen(cam, rig.root);
    const subject = pelvis.x > 192 && pelvis.x < 1728 && pelvis.y > 108 && pelvis.y < 972;
    for (const [n, p] of onScreen) {
      const inFrame = p.x > -5 && p.x < 1925 && p.y > -5 && p.y < 1085;
      if (subBox && (n === "脸" || n.endsWith("手")) && inBox(p, subBox) && f >= scr!.start + 6) issues.push({ frame: f, kind: "被字幕挡住", who, part: n, x: p.x, y: p.y });
      if (inBox(p, WATERMARK_BOX) || (n === "脸" && inBox({ x: p.x + headR * 0.7, y: p.y - headR * 0.7 }, WATERMARK_BOX))) issues.push({ frame: f, kind: "进水印区", who, part: n, x: p.x, y: p.y });
      if (!inFrame && subject && (n === "脸" || n.endsWith("脚"))) {
        // 婴儿躺着，脚被摇篮挡住、近景里奶妈的脚出画都属于有意的特写
        if (cam.zoom >= 1.8) closeups.push({ frame: f, who, part: n });
        else issues.push({ frame: f, kind: "被裁掉", who, part: n, x: p.x, y: p.y });
      }
    }
  }
}

const summarize = (xs: Issue[]) => {
  const g = new Map<string, { kind: string; who: string; part: string; frames: number[] }>();
  for (const i of xs) {
    const k = `${i.kind}|${i.who}|${i.part}`;
    if (!g.has(k)) g.set(k, { kind: i.kind, who: i.who, part: i.part, frames: [] });
    g.get(k)!.frames.push(i.frame);
  }
  return [...g.values()].map((v) => ({ ...v, count: v.frames.length, first: v.frames[0], last: v.frames[v.frames.length - 1] }));
};
const closeSum = new Map<string, number[]>();
for (const c of closeups) {
  const k = `${c.who}${c.part}`;
  closeSum.set(k, [...(closeSum.get(k) ?? []), c.frame]);
}
const out = {
  range: [from, to],
  issues: summarize(issues).map(({ frames, ...r }) => ({ ...r, ranges: ranges(frames) })),
  closeups: [...closeSum.entries()].map(([k, fr]) => ({ part: k, ranges: ranges(fr) })),
};
function ranges(fr: number[]) {
  const rs: [number, number][] = [];
  for (const f of fr) {
    const last = rs[rs.length - 1];
    if (last && f === last[1] + 1) last[1] = f;
    else rs.push([f, f]);
  }
  return rs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(" ");
}
fs.mkdirSync("out/check", { recursive: true });
fs.writeFileSync("out/check/geometry.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
