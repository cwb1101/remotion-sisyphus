// 第二节 · 实证（第 10–17 屏）。预览先做到第 10 屏：地球升起。
// 换场景：光从左上转到右侧，背景转冷，景别从特写拉成大全景；月球边缘从画面下方升起，
// 地球缩小后从月球边缘后面慢慢升起来。
import React from 'react';
import { Label } from '../components/Label';
import type { SfxCue } from '../components/Soundtrack';
import { clamp, ease, rand } from '../film/anim';
import { S, move } from '../film/cues';
import type { ShotKeys, ShotState } from '../film/shot';
import { C, W } from '../film/theme';

const m10 = move(S(10).start, 1.9); // 拉远 + 月球边缘升起

const MOON_R = 2600;
const MOON_DX = 260;

export const evidenceKeys: ShotKeys = {
  s: [
    { f: m10.to, v: 0.12 },
    { f: S(10).end, v: 0.115, ease: ease.linear },
  ],
  ay: [
    { f: m10.from, v: 560 },
    { f: m10.to, v: 770 },
    { f: S(10).end, v: 672, ease: ease.out },
  ],
  lightAngle: [
    { f: m10.from, v: -130 },
    { f: m10.to, v: -20 },
  ],
  lightAmt: [
    { f: m10.from, v: 0.8 },
    { f: m10.to, v: 1 },
  ],
  cool: [
    { f: m10.from, v: 0 },
    { f: m10.to, v: 1 },
  ],
  beam: [
    { f: m10.from, v: 0.4 },
    { f: m10.to, v: 0.12 },
  ],
  moonTop: [
    { f: m10.from, v: 1600 },
    { f: m10.to, v: 805, ease: ease.land },
    { f: S(10).end, v: 828, ease: ease.linear },
  ],
};

export const evidenceSfx: SfxCue[] = [{ name: 'whoosh_down', at: m10.from, gain: 0.35 }];

const MARIA = Array.from({ length: 9 }, (_, i) => ({
  a: -Math.PI / 2 + (rand(i * 3.1) - 0.5) * 0.9,
  d: 0.04 + rand(i * 5.3) * 0.1,
  rx: 90 + rand(i * 7.7) * 220,
  ry: 20 + rand(i * 2.9) * 40,
  o: 0.06 + rand(i * 1.3) * 0.07,
}));

/** 月球边缘：前景的一道大弧，挡住它后面的地球 */
const Moon: React.FC<{ st: ShotState }> = ({ st }) => {
  const top = st.moonTop;
  if (top > 1400) return null;
  const cx = W / 2 + MOON_DX;
  const cy = top + MOON_R;
  const la = (st.lightAngle * Math.PI) / 180;
  return (
    <g>
      <defs>
        <radialGradient
          id="moon"
          gradientUnits="userSpaceOnUse"
          cx={cx + Math.cos(la) * MOON_R * 0.6}
          cy={cy + Math.sin(la) * MOON_R * 0.6}
          r={MOON_R * 1.3}
        >
          <stop offset={0} stopColor={C.moon} />
          <stop offset={0.5} stopColor="#4A4741" />
          <stop offset={1} stopColor={C.moonDark} />
        </radialGradient>
        <clipPath id="moonClip">
          <circle cx={cx} cy={cy} r={MOON_R} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={MOON_R} fill="url(#moon)" />
      <g clipPath="url(#moonClip)">
        {MARIA.map((m, i) => (
          <ellipse
            key={i}
            cx={cx + Math.cos(m.a) * MOON_R * (1 - m.d)}
            cy={cy + Math.sin(m.a) * MOON_R * (1 - m.d)}
            rx={m.rx}
            ry={m.ry}
            fill="#1E1C19"
            opacity={m.o}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={MOON_R} fill="none" stroke={C.ivory} strokeOpacity={0.35} strokeWidth={1.5} />
    </g>
  );
};

export const EvidenceOverlay: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const s10 = S(10);
  const labelIn = clamp((f - (m10.to + 4)) / 10) * clamp((s10.end - f) / 6);
  return (
    <>
      <Moon st={st} />
      <Label
        x={st.cx + st.r * 0.72}
        y={st.cy - st.r * 0.69}
        dx={70}
        dy={-40}
        text={s10.label ?? ''}
        opacity={labelIn}
      />
    </>
  );
};
