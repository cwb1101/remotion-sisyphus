import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Figure } from '../components/Figure';
import { Converge, Drift } from '../components/Particles';
import { QuestionShape } from '../components/QuestionShape';
import { at } from '../data/script';
import { camTransform, prog } from '../lib/anim';
import { C } from '../theme';
import { EARLY_GROUND, cue, earlyRig } from './rigs';

/**
 * 早熟长什么样（屏 07–13）：换到一片夜色旷野，地平线有一道冷光。
 * 少年坐着想问题，每问一个，气球胀一圈；大人夸他，气球更亮；最后镜头推到他已经离地的脚。
 */
export const Early: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const { cam, teen, balloon, adults, questions } = earlyRig(f);
  const sand = cue(7, 1);
  const conv = prog(f, sand - 6, sand + 54);
  const shadowK = Math.max(0, 1 - (teen.hover ?? 0) / 50);
  // 拉远时先只看见气球，镜头退到中景后少年再显出来——放大的浅色人物不能垫在字幕后面
  const reveal = prog(f, at(7) + 18, at(7) + 44);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity }}>
      <defs>
        <linearGradient id="ea-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E1124" />
          <stop offset="62%" stopColor="#1A2142" />
          <stop offset="100%" stopColor="#273158" />
        </linearGradient>
        <radialGradient id="ea-horizon">
          <stop offset="0%" stopColor="#5C6FB0" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#5C6FB0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#ea-sky)" />
      <Drift seed="ea" count={90} frame={f} color="#C9D3FF" maxOpacity={0.55} h={820} speed={0.12} />
      <g transform={camTransform(cam)}>
        <ellipse cx={1000} cy={EARLY_GROUND} rx={1500} ry={220} fill="url(#ea-horizon)" />
        <rect x={-2000} y={EARLY_GROUND} width={6000} height={1400} fill="#151A2E" />
        <line x1={-2000} y1={EARLY_GROUND} x2={4000} y2={EARLY_GROUND} stroke={C.groundLine} strokeWidth={3} />
        <ellipse cx={teen.x} cy={EARLY_GROUND + 5} rx={44 * shadowK + 6} ry={7 * shadowK + 1} fill="#000" opacity={0.4 * shadowK * reveal} />
        {adults.map((a, i) => (
          <Figure key={i} {...a} />
        ))}
        <Converge seed="ea-c" count={90} t={conv} tx={balloon.cx} ty={balloon.cy} spread={1100} color="#FFD7A8" />
        {questions.map((q, i) => (
          <QuestionShape key={q.kind} q={q} frame={f} seed={`q${i}`} />
        ))}
        <Balloon id="ea-b" {...balloon} stringOpacity={reveal} />
        <Figure {...teen} opacity={reveal} />
      </g>
    </svg>
  );
};
