// 第四节 · 落到观众（第 22–28 屏）
// 镜头猛退，一束很宽的斜光横过画面，地球缩成光里的一粒尘（22）→ 一拍之内塌成不到一个像素的光点，
// 旁边放大出一个像素格（23，重卡点）→ 沿画面内缘描出这一帧的边框（24）→ 聚光收拢到光点（25）
// → 光点呼吸（26）→ 一根细线从光点伸向镜头，指向观众（27）→ 光束转动，它只是满屏尘埃里的一粒（28）。
import React from 'react';
import { Note } from '../components/Label';
import type { SfxCue } from '../components/Soundtrack';
import { clamp, ease, hit, progress, win } from '../film/anim';
import { S, kickAtOrAfter, kickNear } from '../film/cues';
import type { ShotKeys, ShotState } from '../film/shot';
import { C, FONT_SANS, H, W, WATERMARK_ZONE } from '../film/theme';

const back = { from: S(22).start, to: kickNear(S(22).start + 43) }; // 猛退
const pix = S(23).start; // 重卡点：塌成 0.12 像素
const collapse = { from: back.to, to: pix };
const DOT = { x: 1120, y: 560 };
const PAN = 380; // 第 22–28 屏镜头一路横移的距离（像素）

// 第 24 屏：边框依次描过四条边，每到一个角正好一个底鼓
const c0 = S(24).start;
const corners = [c0, kickAtOrAfter(c0 + 18), kickAtOrAfter(c0 + 40), kickAtOrAfter(c0 + 60), kickAtOrAfter(c0 + 100)];

export const viewerKeys: ShotKeys = {
  s: [
    { f: back.from, v: 0.32 },
    { f: back.to, v: 0.035 },
    { f: collapse.to, v: 0.0006, ease: ease.in },
    { f: S(25).start, v: 0.0007, ease: ease.linear },
    { f: S(28).end, v: 0.0009, ease: ease.linear },
  ],
  // 光点比一个像素还小、四周又压暗，画面里能动的东西很少：镜头一路缓慢横移
  ax: [
    { f: back.from, v: 960 },
    { f: back.to, v: DOT.x },
    { f: S(28).end, v: DOT.x - PAN, ease: ease.linear },
  ],
  ay: [
    { f: back.from, v: 600 },
    { f: back.to, v: DOT.y },
  ],
  beam: [
    { f: back.from, v: 0.15 },
    { f: back.to, v: 0.75 },
    { f: pix, v: 0.9, ease: ease.linear },
    { f: S(24).start, v: 0.65 },
    { f: S(28).end, v: 0.6, ease: ease.linear },
  ],
  // 让光束中线穿过那粒光点
  beamDX: [
    { f: back.from, v: 0 },
    { f: back.to, v: DOT.x - 650 - 12 },
    // 跟着光点一起横移，保持光束穿过它；本节结束前一直有值，否则会提前往下一节的值漂
    { f: S(28).end, v: DOT.x - PAN - 650 - 12, ease: ease.linear },
  ],
  beamRot: [
    { f: S(24).start, v: 0 },
    { f: S(28).start, v: 12, ease: ease.linear },
    { f: S(28).end, v: 18 },
  ],
  cool: [
    { f: back.from, v: 0 },
    { f: back.to, v: 0.25 },
  ],
  ambient: [
    { f: pix - 1, v: 1 },
    { f: pix, v: 1.15, ease: ease.linear },
    { f: pix + 20, v: 1, ease: ease.out },
  ],
  speed: [
    { f: pix - 1, v: 1 },
    { f: pix, v: 2.2, ease: ease.linear },
    { f: pix + 40, v: 1, ease: ease.out },
  ],
};

export const viewerSfx: SfxCue[] = [
  { name: 'whoosh_down', at: back.from, gain: 0.5 },
  { name: 'rev_swell', at: pix - 72, gain: 0.45, frames: 72 },
  { name: 'boom', at: pix, gain: 1, heavy: true },
  { name: 'tick', at: pix, gain: 0.5 },
  ...corners.slice(1).map((at) => ({ name: 'tick', at, gain: 0.4 })),
  { name: 'swell', at: S(27).start, gain: 0.35 },
  { name: 'air', at: S(28).start, gain: 0.3 },
];

/** 第 23 屏：放大出一个像素格，只有 12% 被点亮 */
const PixelCell: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  // 在重卡点那一帧就要完整出现
  const a = win(f, pix - 1, S(23).end, 1, 8);
  if (a <= 0) return null;
  const pop = 1 + 0.25 * hit(f, pix, 4);
  const side = 140 * pop;
  const cx = st.cx + 260;
  const cy = st.cy - 230;
  const lit = side * Math.sqrt(0.12);
  return (
    <g opacity={a}>
      <line x1={st.cx} y1={st.cy} x2={cx - side / 2} y2={cy + side / 2} stroke={C.ivory} strokeOpacity={0.5} strokeWidth={1} />
      <rect x={cx - side / 2} y={cy - side / 2} width={side} height={side} fill="none" stroke={C.ivory} strokeOpacity={0.8} strokeWidth={1.5} />
      <rect x={cx - lit / 2} y={cy - lit / 2} width={lit} height={lit} fill={C.gold} opacity={0.9} />
      <text x={cx + side / 2 + 16} y={cy - side / 2 + 26} fontFamily={FONT_SANS} fontSize={26} fill={C.ivory} fillOpacity={0.8}>
        1 像素
      </text>
      <text x={cx + side / 2 + 16} y={cy + 10} fontFamily={FONT_SANS} fontSize={30} fill={C.gold}>
        0.12
      </text>
    </g>
  );
};

/** 第 24 屏：沿画面内缘描边框（右上角绕开水印区） */
const FrameTrace: React.FC<{ f: number }> = ({ f }) => {
  const a = win(f, S(24).start, S(25).start + 18, 1, 18);
  if (a <= 0) return null;
  const m = 36;
  const topRight = WATERMARK_ZONE.x - 20;
  const pts: [number, number][] = [
    [topRight, m],
    [m, m],
    [m, H - m],
    [W - m, H - m],
    [W - m, WATERMARK_ZONE.y + WATERMARK_ZONE.h + 10],
  ];
  // 第 k 段在 corners[k]→corners[k+1] 之间画完
  const seg = pts.slice(0, -1).map((p, k) => {
    const q = pts[k + 1];
    const t = ease.inOut(progress(f, corners[k], corners[k + 1]));
    return t > 0 ? `M ${p[0]} ${p[1]} L ${p[0] + (q[0] - p[0]) * t} ${p[1] + (q[1] - p[1]) * t}` : '';
  });
  return (
    <g opacity={a}>
      <path d={seg.join(' ')} fill="none" stroke={C.ivory} strokeOpacity={0.75} strokeWidth={1.5} />
      <text x={m + 24} y={m + 54} fontFamily={FONT_SANS} fontSize={28} fill={C.ivory} fillOpacity={0.8 * clamp((f - corners[1]) / 8)}>
        {S(24).label}
      </text>
    </g>
  );
};

/** 第 25–28 屏：聚光收拢到光点，再慢慢放开 */
const Spotlight: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const close = ease.inOut(progress(f, S(25).start, kickNear(S(25).start + 60)));
  const open = ease.inOut(progress(f, S(27).end - 20, S(28).end));
  const k = close * (1 - open);
  if (k <= 0.001) return null;
  const hole = 1500 - 1380 * k;
  return (
    <g>
      <defs>
        <radialGradient id="spot" gradientUnits="userSpaceOnUse" cx={st.cx} cy={st.cy} r={hole}>
          <stop offset={0.15} stopColor="#000" stopOpacity={0} />
          <stop offset={1} stopColor="#000" stopOpacity={0.75 * k} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#spot)" />
    </g>
  );
};

/** 第 26 屏光点的呼吸光；第 27 屏从光点伸向镜头的细线 */
const Breath: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const a = win(f, pix + 8, S(28).end, 12, 20);
  const grow = ease.out(progress(f, S(27).start, kickNear(S(27).start + 40)));
  const back2 = ease.inOut(progress(f, S(28).start, S(28).start + 20));
  const reach = grow * (1 - back2);
  const tx = 960;
  const ty = 900;
  const ex = st.cx + (tx - st.cx) * reach;
  const ey = st.cy + (ty - st.cy) * reach;
  const w = 1 + 9 * reach;
  const nx = -(ey - st.cy);
  const ny = ex - st.cx;
  const len = Math.hypot(nx, ny) || 1;
  const ox = (nx / len) * w;
  const oy = (ny / len) * w;
  return (
    <g>
      {a > 0 ? <circle cx={st.cx} cy={st.cy} r={16 + 6 * Math.sin(f / 9)} fill="none" stroke={C.gold} strokeOpacity={0.35 * a} strokeWidth={1.5} /> : null}
      {reach > 0.01 ? (
        <polygon points={`${st.cx},${st.cy} ${ex + ox},${ey + oy} ${ex - ox},${ey - oy}`} fill={C.ivory} opacity={0.6} />
      ) : null}
    </g>
  );
};

export const ViewerOverlay: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => (
  <>
    <Spotlight f={f} st={st} />
    <Note y={930} text={S(22).label ?? ''} size={24} opacity={win(f, back.from + 16, S(22).end)} />
    <PixelCell f={f} st={st} />
    <Note y={930} text={S(23).label ?? ''} size={24} opacity={win(f, pix + 16, S(23).end)} />
    <FrameTrace f={f} />
    <Breath f={f} st={st} />
  </>
);

export const viewerFlash = (f: number) => 0.24 * hit(f, pix, 3);
