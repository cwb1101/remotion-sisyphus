/**
 * 3:4 封面（1080×1440）：开场那盏灯下，他低头站在一把空椅子旁边，身后的人群淡进雾里。
 * 与正片同一套灰阶、强调色、思源字体和人物 / 椅子组件。
 */
import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Chair} from './components/Chair';
import {Figure} from './components/Figure';
import {HEAD_DOWN, STAND, addPose} from './components/poses';
import {ensureFonts} from './components/fonts';
import {C, FONT, WATERMARK, mix} from './theme';

ensureFonts();

export const COVER_TITLE = ['他身边有人，', '但没人可说'];
export const COVER_SUB = '男人的孤独，为什么更难被看见';
export const COVER_KICKER = 'THE QUIET LONELINESS OF MEN';

const CW = 1080;
const CH = 1440;
const FOG = '#2A2A2C';
const LAMP = {x: 540, y: 250};
const FLOOR_Y = 1000;

export const Cover: React.FC = () => {
  // 柱廊：越远越淡越窄
  const pillars: React.ReactNode[] = [];
  [
    {n: 9, w: 34, op: 0.55, fog: 0.75, top: 0},
    {n: 7, w: 52, op: 0.75, fog: 0.5, top: 0},
    {n: 4, w: 90, op: 1, fog: 0.15, top: 0},
  ].forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const t = (i + 0.5) / row.n;
      let x = t * CW + (random(`cp${ri}${i}`) - 0.5) * 20;
      if (Math.abs(x - 540) < 160 + ri * 60) x += x < 540 ? -(170 + ri * 60) : 170 + ri * 60;
      const col = mix(C.dark, FOG, row.fog);
      pillars.push(<rect key={`${ri}-${i}`} x={x - row.w / 2} y={row.top} width={row.w} height={FLOOR_Y - 40 + ri * 20} fill={col} opacity={row.op} />);
      pillars.push(<rect key={`${ri}-${i}h`} x={x - row.w * 0.15} y={row.top} width={row.w * 0.3} height={FLOOR_Y - 40 + ri * 20} fill={mix(C.mid, FOG, row.fog)} opacity={0.35 * row.op} />);
    }
  });
  // 雾里的人群（淡）
  const crowd: React.ReactNode[] = [];
  for (let k = 0; k < 22; k++) {
    const x = 60 + random(`cx${k}`) * 960;
    if (Math.abs(x - 560) < 200) continue;
    const y = 880 + random(`cy${k}`) * 50;
    const s = 70 + random(`cs${k}`) * 40;
    crowd.push(
      <Figure key={k} pose={addPose(STAND, {neck: random(`cn${k}`) * 14, lean: (random(`cl${k}`) - 0.5) * 4})} view="front" x={x} y={y} scale={s} rim={0.6} light={0} fog={0.6 + random(`cf${k}`) * 0.2} fogColor={FOG} opacity={0.75} />,
    );
  }
  const dust: React.ReactNode[] = [];
  for (let i = 0; i < 90; i++) {
    const y = LAMP.y + 40 + random(`dy${i}`) * (FLOOR_Y - LAMP.y - 60);
    const spread = ((y - LAMP.y) / (FLOOR_Y - LAMP.y)) * 300;
    const x = LAMP.x + (random(`dx${i}`) - 0.5) * 2 * spread;
    dust.push(<circle key={i} cx={x} cy={y} r={0.8 + random(`dr${i}`) * 1.6} fill={C.paper} opacity={0.2 + random(`do${i}`) * 0.5} />);
  }
  const heroScale = 300;
  return (
    <AbsoluteFill style={{background: C.black}}>
      <svg width={CW} height={CH} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="cbg" x1="0" y1="0" x2="0" y2={CH} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={C.black} />
            <stop offset="0.45" stopColor={C.deep} />
            <stop offset="0.66" stopColor={FOG} />
            <stop offset="0.72" stopColor={C.deep} />
            <stop offset="1" stopColor={C.black} />
          </linearGradient>
          <linearGradient id="ccone" x1="0" y1={LAMP.y} x2="0" y2={FLOOR_Y} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={C.paper} stopOpacity={0.42} />
            <stop offset="0.6" stopColor={C.paper} stopOpacity={0.13} />
            <stop offset="1" stopColor={C.paper} stopOpacity={0.05} />
          </linearGradient>
          <radialGradient id="cpool">
            <stop offset="0" stopColor={C.paper} stopOpacity={0.26} />
            <stop offset="1" stopColor={C.paper} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="cbulb">
            <stop offset="0" stopColor={C.accent} stopOpacity={1} />
            <stop offset="0.25" stopColor={C.accent} stopOpacity={0.4} />
            <stop offset="1" stopColor={C.accent} stopOpacity={0} />
          </radialGradient>
          <filter id="cblur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="cblur2">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>
        <rect width={CW} height={CH} fill="url(#cbg)" />
        <g filter="url(#cblur)">{pillars.slice(0, 32)}</g>
        <g filter="url(#cblur)">{crowd}</g>
        {pillars.slice(32)}
        {/* 地面 */}
        <rect x={0} y={FLOOR_Y - 20} width={CW} height={CH - FLOOR_Y + 20} fill={C.deep} opacity={0.6} />
        {/* 光锥 + 地面光斑 */}
        <g filter="url(#cblur2)" style={{mixBlendMode: 'screen'}}>
          <path d={`M${LAMP.x - 14},${LAMP.y}L${LAMP.x + 14},${LAMP.y}L${LAMP.x + 320},${FLOOR_Y}L${LAMP.x - 320},${FLOOR_Y}Z`} fill="url(#ccone)" />
          <ellipse cx={LAMP.x} cy={FLOOR_Y} rx={360} ry={50} fill="url(#cpool)" />
        </g>
        {/* 灯 */}
        <line x1={LAMP.x} y1={0} x2={LAMP.x} y2={LAMP.y - 22} stroke={C.mid} strokeWidth={2} opacity={0.6} />
        <path d={`M${LAMP.x - 26},${LAMP.y}L${LAMP.x + 26},${LAMP.y}L${LAMP.x + 13},${LAMP.y - 24}L${LAMP.x - 13},${LAMP.y - 24}Z`} fill={C.dark} />
        <circle cx={LAMP.x} cy={LAMP.y + 4} r={46} fill="url(#cbulb)" />
        <g style={{mixBlendMode: 'screen'}}>{dust}</g>
        {/* 空椅子 + 他 */}
        <Chair x={655} y={FLOOR_Y + 8} scale={heroScale} yaw={205} tilt={8} lit={0.85} light={-1} />
        <Figure pose={HEAD_DOWN} view="side" facing={1} x={455} y={FLOOR_Y + 6} scale={heroScale} rim={1} light={1} />
      </svg>
      {/* 暗角 + 底部衬底 */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 42%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.72) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(11,11,12,0.92) 0%, rgba(11,11,12,0.7) 22%, rgba(11,11,12,0) 38%)'}} />
      {/* 标题 */}
      <div style={{position: 'absolute', left: 96, right: 96, top: 1030}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT.sans, fontSize: 22, letterSpacing: '0.32em', color: C.light}}>
          <span style={{display: 'inline-block', width: 56, height: 1, background: C.accent}} />
          {COVER_KICKER}
        </div>
        <div style={{marginTop: 22, fontFamily: FONT.serifBold, fontSize: 92, lineHeight: 1.18, color: C.paper, letterSpacing: '0.03em'}}>
          <div>{COVER_TITLE[0]}</div>
          <div>
            但<span style={{color: C.accent}}>没人可说</span>
          </div>
        </div>
        <div style={{marginTop: 20, fontFamily: FONT.sansRegular, fontSize: 34, color: C.light, letterSpacing: '0.12em'}}>{COVER_SUB}</div>
      </div>
      {/* 胶片颗粒 */}
      <svg width={CW} height={CH} style={{position: 'absolute', inset: 0, mixBlendMode: 'soft-light', opacity: 0.5}}>
        <filter id="cgrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={CW} height={CH} filter="url(#cgrain)" />
      </svg>
      {/* 水印（与正片一致） */}
      <div style={{position: 'absolute', right: 60, top: 56, border: `1px solid ${C.paper}`, padding: '7px 14px 8px', fontFamily: FONT.sansRegular, fontSize: 22, lineHeight: 1, letterSpacing: '0.14em', color: C.paper, opacity: 0.35}}>
        {WATERMARK}
      </div>
    </AbsoluteFill>
  );
};
