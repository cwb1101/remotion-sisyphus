// 动作协调检查（用动作库测试的同一套轨道逐帧算）：
//   - 关节错开：每次换动作，各组关节起动帧 停住帧的先后，躯干应先动、末端晚 2–4 帧以上
//   - 预备：带预备的动作，开头是否先往反方向走
//   - 跟随：末端关节（手腕 脚踝 头）到位后有没有一点过冲再回落
//   - 落点卡拍：末端关节第一次到位的帧和拍点差几帧
//   - 滑步：走路 跑步时支撑脚在支撑期里的漂移；站立换动作时脚的漂移
//   - 手 IK：捂嘴 抱头 侧耳时手离目标多远
// 用法：npx tsx scripts/check-motion.ts → out/check/motion.json
import fs from "node:fs";
import { solveRig, sampleTrack, PoseKey, bodyTargetLocal } from "../src/components/rig";
import { POSE_TEST_INFO } from "../src/PoseTest";
import { POSES, footfalls, Pose } from "../src/data/poses";
import { BEATS } from "../src/lib/rhythm";

const { ADULT_POSES, walk, run } = POSE_TEST_INFO;
// 重建和 PoseTest 一样的轨道
import { adultTrackForTest } from "../src/PoseTest";

const H = 120;
const GROUND = 860;
const groups: Record<string, (keyof ReturnType<typeof sampleTrack>["joints"])[]> = {
  躯干: ["torso"],
  头: ["neck"],
  肩髋: ["shL", "shR", "hipL", "hipR"],
  肘膝: ["elL", "elR", "knL", "knR"],
  腕踝: ["wrL", "wrR", "anL", "anR"],
};

type Row = Record<string, unknown>;
const transitions: Row[] = [];
const track: PoseKey[] = adultTrackForTest;
for (let k = 1; k < track.length; k++) {
  const key = track[k];
  const prevAt = track[k - 1].at;
  const nextAt = k + 1 < track.length ? track[k + 1].at : key.at + 40;
  const lo = Math.max(prevAt + 1, key.at - 40);
  const hi = Math.min(nextAt - 1, key.at + 30);
  const samples: ReturnType<typeof sampleTrack>[] = [];
  for (let f = lo; f <= hi; f++) samples.push(sampleTrack(track, f));
  const startOf: Record<string, number | null> = {};
  const stopOf: Record<string, number | null> = {};
  let antic = false;
  let overshoot = 0;
  let landing: number | null = null;
  for (const [g, js] of Object.entries(groups)) {
    const v = samples.map((s, i) => (i ? Math.max(...js.map((j) => Math.abs(s.joints[j] - samples[i - 1].joints[j]))) : 0));
    const moving = v.map((x) => x > 0.25);
    const first = moving.indexOf(true);
    const last = moving.lastIndexOf(true);
    startOf[g] = first >= 0 ? lo + first : null;
    stopOf[g] = last >= 0 ? lo + last : null;
    {
      // 预备：起动后前几帧的位移方向和总位移相反（所有关节都看）
      for (const j of js) {
        const a = samples[0].joints[j];
        const b = samples[samples.length - 1].joints[j];
        if (Math.abs(b - a) < 4) continue;
        const firstMoves = samples.slice(0, first + 6).map((s) => s.joints[j] - a);
        if (firstMoves.some((d) => Math.sign(d) === -Math.sign(b - a) && Math.abs(d) > 0.4)) antic = true;
        if (g === "腕踝") {
          const beyond = samples.map((s) => (s.joints[j] - b) * Math.sign(b - a));
          overshoot = Math.max(overshoot, ...beyond);
          const hit = samples.findIndex((s) => Math.abs(s.joints[j] - b) < Math.max(1, Math.abs(b - a) * 0.03));
          if (hit >= 0 && landing === null) landing = lo + hit;
        }
      }
    }
  }
  const starts = Object.values(startOf).filter((x): x is number => x !== null);
  const stops = Object.values(stopOf).filter((x): x is number => x !== null);
  const nearestBeat = BEATS.reduce((b, x) => (Math.abs(x - key.at) < Math.abs(b - key.at) ? x : b), BEATS[0]);
  transitions.push({
    pose: POSES[key.pose].label,
    落点帧: key.at,
    离拍: key.at - nearestBeat,
    末端第一次到位: landing,
    起动先后: startOf,
    停住先后: stopOf,
    起动错开帧数: starts.length ? Math.max(...starts) - Math.min(...starts) : 0,
    停住错开帧数: stops.length ? Math.max(...stops) - Math.min(...stops) : 0,
    有预备: (key.antic ?? 0) > 0 ? antic : "无预备设置",
    末端过冲度: Number(overshoot.toFixed(2)),
  });
}

// 滑步：步态支撑期的脚漂移
const gaitSlide = (g: typeof walk) => {
  const strikes = footfalls(g);
  let worst = 0;
  const offBeat = strikes.map((s) => s - BEATS.reduce((b, x) => (Math.abs(x - s) < Math.abs(b - s) ? x : b), BEATS[0]));
  for (let f = strikes[0] - 20; f < strikes[strikes.length - 1] + 20; f++) {
    const a = solveRig({ build: "adult", h: H, x: g.startX, y: GROUND, track: [{ at: 0, pose: "stand" }], frame: f, seed: 7, gait: g });
    const b = solveRig({ build: "adult", h: H, x: g.startX, y: GROUND, track: [{ at: 0, pose: "stand" }], frame: f + 1, seed: 7, gait: g });
    for (const side of ["anL", "anR"] as const) {
      const pa = a.toWorld(a.s[side], "L");
      const pb = b.toWorld(b.s[side], "L");
      const groundA = GROUND - pa.y < H * 0.2;
      const groundB = GROUND - pb.y < H * 0.2;
      const still = Math.abs(pb.y - pa.y) < 0.5;
      if (groundA && groundB && still) worst = Math.max(worst, Math.abs(pb.x - pa.x));
    }
  }
  return { 步数: g.steps, 着地帧: strikes, 着地离拍帧数: offBeat, 支撑脚最大漂移px: Number(worst.toFixed(2)) };
};

// 站着换动作时脚的漂移（脚钉在地上，骨盆去找脚）
let standSlide = 0;
for (let f = 1; f < track[track.length - 1].at + 20; f++) {
  const keyIdx = track.findIndex((k) => k.at > f);
  const pose = track[Math.max(0, keyIdx - 1)].pose;
  if (POSES[pose].pin !== "feet") continue;
  const a = solveRig({ build: "adult", h: H, x: 900, y: GROUND, track, frame: f, seed: 3 });
  const b = solveRig({ build: "adult", h: H, x: 900, y: GROUND, track, frame: f + 1, seed: 3 });
  // 只看呼吸和重心晃动造成的漂移：动作目标不变的那几帧（离关键帧 ≥ 25 帧）
  const near = track.some((k) => Math.abs(k.at - f) < 25);
  if (near) continue;
  for (const side of ["anL", "anR"] as const) standSlide = Math.max(standSlide, Math.abs(b.toWorld(b.s[side], "L").x - a.toWorld(a.s[side], "L").x));
}

// 手 IK 落点误差
const ikRows: Row[] = [];
for (const k of track) {
  const p: Pose = POSES[k.pose];
  if (!p.reach) continue;
  const f = k.at + 8;
  const r = solveRig({ build: "adult", h: H, x: 900, y: GROUND, track, frame: f, seed: 3 });
  for (const side of ["L", "R"] as const) {
    const t = p.reach[side];
    if (!t) continue;
    const target = bodyTargetLocal(r.s, t);
    const hand = side === "L" ? r.s.handL : r.s.handR;
    const wrist = side === "L" ? r.s.wrL : r.s.wrR;
    const palm = { x: (hand.x + wrist.x) / 2, y: (hand.y + wrist.y) / 2 };
    ikRows.push({ pose: p.label, 手: side === "L" ? "近侧" : "远侧", 目标: t, 误差px: Number(Math.hypot(palm.x - target.x, palm.y - target.y).toFixed(1)), 头高px: H });
  }
}

const out = {
  换动作: transitions,
  走路: gaitSlide(walk),
  奔跑: gaitSlide(run),
  站立时脚漂移最大px: Number(standSlide.toFixed(2)),
  手IK: ikRows,
};
fs.mkdirSync("out/check", { recursive: true });
fs.writeFileSync("out/check/motion.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
void ADULT_POSES;
