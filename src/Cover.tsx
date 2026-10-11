import React from 'react';
import {AbsoluteFill} from 'remotion';
import './lib/fonts';
import {Orb} from './components/Orb';
import {Watermark} from './components/Watermark';
import {makeSlope} from './lib/geom';
import {COLORS, SANS, SERIF} from './theme';

// 16:9 封面（1920×1080）：左边是问题，右边是快到山顶的石头。和片中同一套底色、强调色和物件。

const SL = makeSlope({x: 760, y: 1010}, {x: 1800, y: 380});
const STONE_R = 150;
const U = 0.9;
const stone = SL.at(U, STONE_R);
const dot = SL.at(U - (STONE_R + 30 + 8) / SL.len, 30);

export const Cover: React.FC = () => (
  <AbsoluteFill style={{background: COLORS.bg, overflow: 'hidden'}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 55% 60% at 78% 45%, rgba(226,85,45,0.22) 0%, rgba(226,85,45,0.06) 45%, rgba(0,0,0,0) 75%)'}} />
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {/* 地面、山坡、山顶平台 */}
      <line x1={0} y1={SL.foot.y} x2={SL.foot.x} y2={SL.foot.y} stroke={COLORS.ink} strokeWidth={3} opacity={0.3} />
      <line x1={SL.foot.x} y1={SL.foot.y} x2={SL.top.x} y2={SL.top.y} stroke={COLORS.ember} strokeWidth={26} opacity={0.14} />
      <line x1={SL.foot.x} y1={SL.foot.y} x2={SL.top.x} y2={SL.top.y} stroke={COLORS.ink} strokeWidth={5} strokeLinecap="round" />
      <line x1={SL.top.x} y1={SL.top.y} x2={1920} y2={SL.top.y} stroke={COLORS.ink} strokeWidth={3} opacity={0.3} />
      {/* 石头滚回去的残影 */}
      {[1, 2, 3].map((k) => {
        const g = SL.at(U - k * 0.13, STONE_R);
        return <Orb key={k} x={g.x} y={g.y} r={STONE_R} rotation={-k * 50} opacity={0.16 - k * 0.04} />;
      })}
      <Orb x={stone.x} y={stone.y} r={STONE_R} rotation={20} glow={0.35} />
      <Orb x={dot.x} y={dot.y} r={30} variant="ember" glow={1} />
    </svg>
    <div style={{position: 'absolute', left: 120, top: 250, width: 1100}}>
      <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 76, color: COLORS.ink, letterSpacing: '0.04em', textShadow: '0 0 24px rgba(0,0,0,0.9)'}}>
        一个永远推不上山的人
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: 210,
          lineHeight: 1.15,
          color: COLORS.ember,
          letterSpacing: '0.02em',
          marginTop: 10,
          textShadow: '0 0 60px rgba(226,85,45,0.45), 0 0 24px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap',
        }}
      >
        凭什么幸福？
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: 40}}>
        <div style={{width: 80, height: 4, background: COLORS.ember}} />
        <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 44, color: COLORS.ink, letterSpacing: '0.18em', opacity: 0.9}}>西西弗斯 · 加缪</div>
      </div>
    </div>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
    <Watermark />
  </AbsoluteFill>
);
