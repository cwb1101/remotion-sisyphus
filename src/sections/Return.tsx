// 第七节 · 回扣（第 39–42 屏 + 出处）
// 镜头从全景俯冲向球面，弧被拉平，回到第 1 屏那条直线（39，构图与开头一致）
// → 同一道金色反光再扫一次（40）→ 镜头微微抬起，直线两端露出一点弧度：它是圆的一小段（41）
// → 线上从左到右一粒粒亮起小光点，就是前面那些尘埃（42）→ 出处在线上方逐行淡入，
// 收尾重击时整条线亮一下，然后随音乐淡出。
import React from 'react';
import { Note } from '../components/Label';
import { limbYAt } from '../components/Mote';
import type { SfxCue } from '../components/Soundtrack';
import { CREDITS } from '../data/subtitles';
import { clamp, ease, hit, progress, rand } from '../film/anim';
import { BEATMAP, KICKS, S, kickAtOrAfter, kickNear, move } from '../film/cues';
import type { ShotKeys, ShotState } from '../film/shot';
import { C, H, W } from '../film/theme';
import { GlintSweep } from './Hook';

const m39 = move(S(39).start, 1.6); // 俯冲回地平线
// 钉点在俯冲的前 40% 就从球心换到地平线顶点，之后的放大都以地平线为轴
const pin39 = S(39).start + Math.round((m39.to - S(39).start) * 0.4);
const glint40 = { from: kickAtOrAfter(S(40).start), to: kickNear(S(40).start + 64) };
const m41 = move(S(41).start, 1.0); // 微微抬起，露出弧度
const HIT = BEATMAP.finalHitFrame;
const END = BEATMAP.durationInFrames;
const FADE_FROM = BEATMAP.fadeOutStartFrame;
const LIGHTS_FROM = S(42).start;
const LIGHTS_TO = S(42).end - 10;

export const returnKeys: ShotKeys = {
  s: [
    { f: S(39).start, v: 0.19 },
    { f: m39.to, v: 3000, ease: ease.inOut },
    { f: m41.from, v: 2600, ease: ease.linear },
    { f: m41.to, v: 14 },
    { f: S(42).end, v: 18, ease: ease.linear },
    { f: END, v: 22, ease: ease.linear },
  ],
  anchor: [
    { f: S(39).start, v: 1 },
    { f: pin39, v: 0, ease: ease.out },
  ],
  ax: [{ f: S(39).start, v: 960 }],
  ay: [
    { f: S(39).start, v: 560 },
    { f: m39.to, v: 700, ease: ease.inOut },
    { f: m41.to, v: 706 },
  ],
  beam: [
    { f: S(39).start, v: 0.3 },
    { f: m39.to, v: 0 },
  ],
  lightAmt: [
    { f: S(39).start, v: 1 },
    { f: m39.to, v: 0.8 },
  ],
  ambient: [
    { f: S(39).start, v: 1.05 },
    { f: m39.to, v: 1 },
  ],
  rim: [
    { f: HIT - 1, v: 1 },
    { f: HIT, v: 1.9, ease: ease.linear },
    { f: HIT + 20, v: 1.1, ease: ease.out },
  ],
};

export const returnSfx: SfxCue[] = [
  { name: 'whoosh_up', at: S(39).start, gain: 0.5 },
  { name: 'glint', at: glint40.from, gain: 0.45 },
  ...KICKS.filter((k) => k >= LIGHTS_FROM && k < LIGHTS_TO)
    .slice(0, 6)
    .map((at) => ({ name: 'tick', at, gain: 0.15 })),
];

/** 第 42 屏起：线上一粒粒亮起的小光点（站在上面的所有人） */
const LIGHTS = Array.from({ length: 140 }, (_, i) => ({
  x: 70 + (i / 139) * (W - 140) + (rand(i * 3.3) - 0.5) * 10,
  size: 1.4 + rand(i * 5.1) * 1.6,
}));

const LineLights: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  if (f < LIGHTS_FROM) return null;
  const flash = 1 + 1.5 * hit(f, HIT, 8);
  return (
    <g>
      {LIGHTS.map((p, i) => {
        const on = clamp((f - (LIGHTS_FROM + (i / LIGHTS.length) * (LIGHTS_TO - LIGHTS_FROM))) / 6);
        if (on <= 0) return null;
        const y = limbYAt(st.cx, st.cy, st.r, p.x) - 4;
        return <circle key={i} cx={p.x} cy={y} r={p.size} fill={i % 3 === 0 ? C.ivory : C.gold} opacity={Math.min(1, 0.85 * on * flash)} />;
      })}
    </g>
  );
};

const Credits: React.FC<{ f: number }> = ({ f }) => {
  if (f < CREDITS.start) return null;
  return (
    <g>
      {CREDITS.lines.map((line, i) => (
        <Note
          key={i}
          y={170 + i * 42}
          text={line}
          size={i === 0 ? 30 : 23}
          opacity={clamp((f - CREDITS.start - i * 4) / 10)}
        />
      ))}
    </g>
  );
};

export const ReturnOverlay: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => (
  <>
    <GlintSweep f={f} st={st} from={glint40.from} to={glint40.to} />
    <LineLights f={f} st={st} />
    <Credits f={f} />
  </>
);

/** 片尾随音乐淡出（整片最后 0.6 秒） */
export const EndFade: React.FC<{ f: number }> = ({ f }) => {
  const a = progress(f, FADE_FROM, END - 1);
  if (a <= 0) return null;
  return <rect width={W} height={H} fill={C.bg} opacity={a} />;
};
