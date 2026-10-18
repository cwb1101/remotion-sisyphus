// 3:4 封面（1080×1440）：和片子同一套画面语言。
// 下方是那粒尘埃（地球）的边缘——一道弯起来的地平线，上面一粒绕行的光点；
// 一束斜光从左上打下来；片名「总观效应」金色粗宋，主线问题做副标题。
// 底部 10% 只放画面不放字（抖音信息流里会被点赞数之类挡住）。
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-sans-sc/400.css';
import { Mote } from './components/Mote';
import { rand } from './film/anim';
import { C, FONT_SANS, FONT_SERIF } from './film/theme';

export const COVER_W = 1080;
export const COVER_H = 1440;

const TITLE = '总观效应';
const EN = 'THE OVERVIEW EFFECT';
const HOOK = ['看一眼地球，', '为什么能改变一个人？'];

// 地球：球心在画面下方外侧，只露出一道弧
const EARTH = { cx: 540, cy: 2160, r: 1170 };

const DUST = Array.from({ length: 110 }, (_, i) => ({
  x: rand(i * 3.1 + 7) * COVER_W,
  y: rand(i * 5.7 + 2) * COVER_H * 0.78,
  r: [1.4, 2.6, 6][i % 3] * (0.6 + rand(i * 9.3) * 0.8),
  a: [0.5, 0.32, 0.12][i % 3] * (0.5 + rand(i * 1.7) * 0.7),
  gold: rand(i * 4.4) < 0.35,
}));

const useFonts = () => {
  const [handle] = useState(() => delayRender('加载思源字体'));
  useEffect(() => {
    Promise.all([
      document.fonts.load(`700 190px ${FONT_SERIF}`, TITLE + HOOK.join('')),
      document.fonts.load(`400 30px ${FONT_SANS}`, EN + '肆号静匣Logos'),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

/** 斜光束：和片中 drop 那束光同一个角度 */
const Beam: React.FC = () => {
  const ang = (58 * Math.PI) / 180;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const x = 300;
  const y = 520;
  const w = 300;
  const L = 2000;
  const p = (s: number, t: number) => `${x + dx * s + nx * t},${y + dy * s + ny * t}`;
  return (
    <g>
      <defs>
        <linearGradient id="coverBeam" gradientUnits="userSpaceOnUse" x1={x - nx * w} y1={y - ny * w} x2={x + nx * w} y2={y + ny * w}>
          <stop offset={0} stopColor={C.gold} stopOpacity={0} />
          <stop offset={0.35} stopColor={C.gold} stopOpacity={0.08} />
          <stop offset={0.5} stopColor={C.ivory} stopOpacity={0.2} />
          <stop offset={0.65} stopColor={C.gold} stopOpacity={0.08} />
          <stop offset={1} stopColor={C.gold} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={[p(-L, -w), p(L, -w), p(L, w), p(-L, w)].join(' ')} fill="url(#coverBeam)" />
    </g>
  );
};

/** 绕着地球的一粒光点和它的轨迹（“有人从这里看过地球”） */
const Orbiter: React.FC = () => {
  const R = EARTH.r * 1.1;
  const pts = Array.from({ length: 40 }, (_, i) => {
    const a = -1.32 - i * 0.012;
    return `${(EARTH.cx + Math.cos(a) * R).toFixed(1)},${(EARTH.cy + Math.sin(a) * R).toFixed(1)}`;
  });
  const [hx, hy] = pts[0].split(',').map(Number);
  return (
    <g>
      <path d={`M ${pts.join(' L ')}`} fill="none" stroke={C.gold} strokeOpacity={0.45} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={20} fill={C.gold} opacity={0.2} />
      <circle cx={hx} cy={hy} r={6} fill={C.ivory} />
    </g>
  );
};

export const Cover: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={COVER_W} height={COVER_H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="coverKey" gradientUnits="userSpaceOnUse" cx={160} cy={160} r={1100}>
            <stop offset={0} stopColor={C.gold} stopOpacity={0.13} />
            <stop offset={1} stopColor={C.gold} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="coverVig" cx="50%" cy="45%" r="75%">
            <stop offset={0.55} stopColor="#000" stopOpacity={0} />
            <stop offset={1} stopColor="#000" stopOpacity={0.7} />
          </radialGradient>
          {['ivory', 'gold'].map((c) => (
            <radialGradient key={c} id={`cd-${c}`}>
              <stop offset={0} stopColor={c === 'gold' ? C.gold : C.ivory} stopOpacity={1} />
              <stop offset={0.35} stopColor={c === 'gold' ? C.gold : C.ivory} stopOpacity={0.45} />
              <stop offset={1} stopColor={c === 'gold' ? C.gold : C.ivory} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        <rect width={COVER_W} height={COVER_H} fill="url(#coverKey)" />
        <Beam />
        {DUST.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r * 2.4} fill={`url(#cd-${d.gold ? 'gold' : 'ivory'})`} opacity={d.a} />
        ))}
        <Orbiter />
        <Mote cx={EARTH.cx} cy={EARTH.cy} r={EARTH.r} lightAngle={-115} lightAmt={1} rim={1.5} ambient={1} />
        <rect width={COVER_W} height={COVER_H} fill="url(#coverVig)" />
      </svg>

      {/* 片名 */}
      <div
        style={{
          position: 'absolute',
          top: 250,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: 196,
          letterSpacing: '0.12em',
          paddingLeft: '0.12em',
          color: C.gold,
          lineHeight: 1,
          textShadow: '0 0 40px rgba(221,189,116,0.25), 0 0 8px rgba(8,6,4,0.8)',
        }}
      >
        {TITLE}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 488,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT_SANS,
          fontSize: 30,
          letterSpacing: '0.42em',
          paddingLeft: '0.42em',
          color: C.ivory,
          opacity: 0.62,
        }}
      >
        {EN}
      </div>

      {/* 主线问题 */}
      <div
        style={{
          position: 'absolute',
          top: 640,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: 74,
          letterSpacing: '0.06em',
          lineHeight: 1.42,
          color: C.ivory,
          textShadow: '0 0 24px rgba(8,6,4,0.9)',
        }}
      >
        {HOOK.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      {/* 水印：和片中同一个样式 */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          padding: '7px 14px',
          border: `1px solid ${C.ivory}`,
          color: C.ivory,
          opacity: 0.35,
          fontFamily: FONT_SANS,
          fontSize: 22,
          lineHeight: 1,
          letterSpacing: '0.08em',
        }}
      >
        肆号静匣Logos
      </div>
    </AbsoluteFill>
  );
};
