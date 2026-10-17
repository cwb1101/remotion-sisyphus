import React from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import './fonts';
import { Balloon } from './components/Balloon';
import { Figure, figureJoints, POSES, walkPose } from './components/Figure';
import { Footprints } from './components/Footprints';
import { Drift } from './components/Particles';
import { rules } from './data/script';
import { C, FONT } from './theme';

/**
 * 3:4 封面（1080×1440）：上半是片子的核心画面——一个被气球拽在半空，一个提着小灯在地上走、身后一串脚印；
 * 下半在深色地面上放标题。早熟用色①、晚熟用色②，和片中含义一致，全图只有这两处高亮。
 */
const W = 1080;
const H = 1440;
const G = 880;
const TEXT = '为什么说早熟的人通常都晚熟早熟的是脑子，晚熟的是人生';

const fontHandle = typeof document !== 'undefined' ? delayRender('cover fonts') : null;
if (fontHandle !== null) {
  Promise.all([document.fonts.load(`900 140px 'Noto Sans SC'`, TEXT), document.fonts.load(`700 46px 'Noto Sans SC'`, TEXT)])
    .then(() => continueRender(fontHandle))
    .catch(() => continueRender(fontHandle));
}

export const Cover: React.FC = () => {
  const teen = { x: 330, groundY: G, scale: 1.7, facing: 1, color: C.teen, pose: { ...POSES.dangle, head: -24, torso: 6 }, hover: 150 };
  const hand = figureJoints(teen).nearHand;
  const r = 168;
  const balloon = { cx: hand.x + 20, cy: hand.y - 74 - r, r };
  const walker = { x: 820, groundY: G, scale: 1.65, facing: 1, color: C.walker, pose: walkPose(0.5, 1.0, { ...POSES.stand, rSh: 22, rEl: 44, head: 4 }) };
  const wHand = figureJoints(walker).nearHand;
  const prints = Array.from({ length: 7 }, (_, i) => ({ x: 120 + i * 96, y: G + 8, born: -100 }));
  const wm = rules.watermark;
  return (
    <AbsoluteFill style={{ background: '#0B0E1C' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="cv-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A0D1C" />
            <stop offset="65%" stopColor="#1B2244" />
            <stop offset="100%" stopColor="#3A3A62" />
          </linearGradient>
          <radialGradient id="cv-warm">
            <stop offset="0%" stopColor={C.think} stopOpacity={0.28} />
            <stop offset="100%" stopColor={C.think} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="cv-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#151A2E" />
            <stop offset="100%" stopColor="#080A14" />
          </linearGradient>
        </defs>
        <rect width={W} height={G} fill="url(#cv-sky)" />
        <Drift seed="cv" count={70} frame={40} w={W} h={G - 60} color="#C9D3FF" maxOpacity={0.5} />
        <ellipse cx={W / 2} cy={G} rx={760} ry={170} fill="url(#cv-warm)" />
        <rect y={G} width={W} height={H - G} fill="url(#cv-ground)" />
        <line x1={0} y1={G} x2={W} y2={G} stroke={C.act} strokeOpacity={0.35} strokeWidth={3} />
        <line x1={60} y1={G} x2={walker.x - 20} y2={G} stroke={C.act} strokeWidth={4} opacity={0.85} />
        <Footprints prints={prints} frame={0} scale={1.4} />
        <ellipse cx={walker.x} cy={G + 6} rx={46} ry={8} fill="#000" opacity={0.35} />
        <Balloon id="cv-b" {...balloon} rings={4} ringGap={0.13} glow={1.25} anchor={hand} sway={6} />
        <Figure {...teen} />
        <Figure {...walker} />
        <Balloon id="cv-l" cx={wHand.x + 6} cy={wHand.y - 16 - 26} r={26} rings={1} glow={1} anchor={wHand} />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 918, textAlign: 'center', fontFamily: FONT, color: C.white }}>
        <div style={{ fontWeight: 700, fontSize: 56, letterSpacing: 8, opacity: 0.78 }}>为什么说</div>
        <div style={{ fontWeight: 900, fontSize: 140, lineHeight: 1.08, marginTop: 6, textShadow: '0 6px 24px rgba(0,0,0,0.55)' }}>
          <span style={{ color: C.think }}>早熟</span>的人
          <br />
          通常都<span style={{ color: C.act }}>晚熟</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: 4, marginTop: 26, opacity: 0.82 }}>早熟的是脑子，晚熟的是人生</div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 36,
          top: 32,
          border: `${wm.borderWidth}px solid #FFFFFF`,
          padding: '6px 12px',
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: wm.fontSize,
          lineHeight: 1,
          letterSpacing: 1,
          color: '#FFFFFF',
          opacity: wm.opacity,
        }}
      >
        {wm.text}
      </div>
    </AbsoluteFill>
  );
};
