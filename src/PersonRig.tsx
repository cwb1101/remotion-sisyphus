import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LIGHTS } from './theme';
import { ease, impulse, prog, track } from './lib/anim';
import { lerpPose, Person, POSES, walkPose } from './components/Person';
import { Saw } from './components/Saw';

/**
 * 人物骨骼演示（不进正片）：走 → 被刺块碰到停下 → 转身 → 推 → 停 → 抬头 → 松手转身走开。
 * 用来确认人物画法、关节动作和他与“刺块”（缩小的锯子）的互动。
 */
const BLOCK = { x0: 620, y: 812, len: 200 };

export const PersonRig: React.FC = () => {
  const f = useCurrentFrame();
  const L = LIGHTS.night;

  // 位置与朝向
  // 0–44 走到刺块旁被扎一下（44），再走一步停住（66）
  const x = track(f, [
    [0, 140],
    [44, 760, ease.linear],
    [66, 950, ease.out],
    [196, 950],
    [240, 1520, ease.in],
  ]);
  const phase = f * 0.36;
  const turn1 = ease.inOut(prog(f, 72, 92)); // 转身面向刺块
  const turn2 = ease.inOut(prog(f, 186, 204)); // 松手后转回去
  const facing: 1 | -1 = turn1 >= 1 && turn2 < 0.5 ? -1 : 1;
  const turn = turn1 < 1 ? turn1 : turn2 > 0 && turn2 < 1 ? turn2 : 0;

  let pose = walkPose(phase, f < 66 ? 1 - prog(f, 48, 66) : 1);
  if (f >= 44) pose = lerpPose(pose, POSES.flinch, ease.out(prog(f, 44, 52)) * (1 - prog(f, 54, 70)));
  if (f >= 66) pose = lerpPose(pose, POSES.stand, prog(f, 66, 80));
  if (f >= 92) pose = lerpPose(POSES.stand, POSES.push, ease.inOut(prog(f, 92, 108)));
  if (f >= 138) pose = lerpPose(POSES.push, POSES.stand, ease.inOut(prog(f, 138, 154)));
  if (f >= 156) pose = lerpPose(POSES.stand, POSES.lookUp, ease.inOut(prog(f, 156, 172)) * (1 - prog(f, 182, 196)));
  if (f > 200) pose = lerpPose(POSES.stand, walkPose(phase), prog(f, 200, 212));

  const tremble = f >= 108 && f < 138 ? Math.sin(f * 2.1) * 1.5 : 0;
  pose = { ...pose, torso: pose.torso + tremble };
  const crack = track(f, [
    [44, 0],
    [50, 0.15],
    [96, 0.15],
    [138, 0.85],
    [160, 0.85],
    [200, 0],
  ]);
  const calm = track(f, [
    [160, 0],
    [190, 1],
  ]);
  const breath = f >= 140 && f < 176 ? 0.5 + 0.5 * Math.sin((f - 140) * 0.18) : 0;
  // 推的时候身体往前顶一点，脚不动
  const pushX = f >= 92 && f < 154 ? -40 * Math.sin(prog(f, 92, 154) * Math.PI) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: L.base }}>
      <svg width={1920} height={1080}>
        <defs>
          <radialGradient id="rig-floor" cx="0.5" cy="0.8" r="0.7">
            <stop offset="0" stopColor="#1C2633" />
            <stop offset="1" stopColor={L.base} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#rig-floor)" />
        <line x1={0} y1={830} x2={1920} y2={830} stroke="#243040" strokeWidth={2} />
        <Saw
          id="rigblock"
          x0={BLOCK.x0}
          y={BLOCK.y - 60}
          length={BLOCK.len}
          w={56}
          morph={1}
          handle={0}
          flash={0.8 * impulse(f, 44, 8)}
        />
        <Person x={x + pushX} y={830} scale={1.25} facing={facing} turn={turn} pose={pose} crack={crack} calm={calm} breath={breath} />
      </svg>
    </AbsoluteFill>
  );
};
