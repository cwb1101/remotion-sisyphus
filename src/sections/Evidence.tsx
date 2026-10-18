// 第二节 · 实证（第 10–17 屏）
// 换场景：光从左上转到右侧，背景转冷，景别从特写拉成大全景；月球边缘从画面下方升起，
// 地球缩小后从月球边缘后面慢慢升起来（第 10–11 屏）。
// 然后镜头扎到地球边缘看那圈薄光（12）→ 急退成篮球大小，放大镜量出 2 毫米（13–14）
// → 地球沉到画面下方，一粒光点从边缘升空到抛物线顶点（15–16）→ 光熄灭（17，重卡点）。
import React from 'react';
import { Label, Note } from '../components/Label';
import type { SfxCue } from '../components/Soundtrack';
import { clamp, ease, progress, rand, win } from '../film/anim';
import { S, barAtOrAfter, barAtOrBefore, kickAtOrAfter, kickNear, move } from '../film/cues';
import type { ShotKeys, ShotState } from '../film/shot';
import { toScreen } from '../film/shot';
import { C, R, W } from '../film/theme';

const m10 = move(S(10).start, 1.9); // 拉远 + 月球边缘升起
const m12 = move(S(12).start, 1.5); // 扎到地球边缘
const m13 = move(S(13).start, 1.0); // 急退成篮球大小
const m15 = move(S(15).start, 1.3); // 地球沉到画面下方
const launch = kickAtOrAfter(S(16).start); // 光点升空
const apex = S(17).start; // 重卡点：到达顶点，光熄灭
const push17 = { from: barAtOrBefore(apex - 1), to: apex };

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

/** 第 11–17 屏（预览之后）。Film 会先在 S(10).end 把预览段钉住，这里只往后加 */
export const evidenceKeysLate: ShotKeys = {
  s: [
    { f: S(11).end, v: 0.122, ease: ease.linear },
    { f: m12.to, v: 7 },
    { f: m13.from, v: 6.2, ease: ease.linear },
    { f: m13.to, v: 0.24 },
    { f: S(14).end, v: 0.27, ease: ease.linear },
    { f: m15.to, v: 0.68 },
    { f: push17.from, v: 0.7, ease: ease.linear },
    { f: push17.to, v: 0.76, ease: ease.in },
    { f: S(17).end, v: 0.7, ease: ease.out },
  ],
  anchor: [
    { f: m12.from, v: 1 },
    { f: m12.from + Math.round((m12.to - m12.from) * 0.4), v: 0 },
    // 急退时先以地平线为轴缩小，球小下来以后再把钉点换回球心，避免地平线冲出画面顶边
    { f: m13.from, v: 0 },
    { f: m13.from + Math.round((m13.to - m13.from) * 0.55), v: 0, ease: ease.linear },
    { f: m13.to, v: 1 },
  ],
  ay: [
    { f: S(11).end, v: 640, ease: ease.inOut },
    { f: m12.to, v: 650 },
    { f: m13.from, v: 645, ease: ease.linear },
    { f: m13.to, v: 600 },
    { f: m15.from, v: 590, ease: ease.linear },
    { f: m15.to, v: 1300 },
    { f: push17.to, v: 1340, ease: ease.in },
  ],
  lightAngle: [
    { f: m12.to, v: -90 },
    { f: m15.to, v: -60 },
  ],
  rim: [
    { f: m12.from, v: 1 },
    { f: m12.to, v: 2 },
    { f: m13.to, v: 1.3 },
    { f: apex - 1, v: 1.2, ease: ease.linear },
    { f: apex, v: 1.7, ease: ease.linear },
    { f: apex + 30, v: 1, ease: ease.out },
  ],
  cool: [
    { f: m12.to, v: 0.6 },
    { f: m15.to, v: 0.35 },
  ],
  moonTop: [
    { f: S(11).end, v: 845, ease: ease.linear },
    { f: m12.to, v: 2400, ease: ease.in },
  ],
  beam: [
    { f: m12.to, v: 0.08 },
    { f: m15.to, v: 0.55 },
    { f: apex - 1, v: 0.55, ease: ease.linear },
    { f: apex, v: 0, ease: ease.linear },
  ],
  beamDX: [{ f: m15.to, v: 250 }],
  beamRot: [{ f: m15.to, v: -10 }],
  ambient: [
    { f: apex - 1, v: 1 },
    { f: apex, v: 0.42, ease: ease.linear },
    { f: S(17).end - 20, v: 0.5, ease: ease.linear },
  ],
  focus: [
    { f: apex - 1, v: 0 },
    { f: apex, v: 1, ease: ease.linear },
  ],
  speed: [
    { f: apex - 1, v: 1 },
    { f: apex, v: 0, ease: ease.linear },
    { f: barAtOrAfter(apex + 30), v: 0, ease: ease.linear },
    { f: S(17).end - 20, v: 0.3 },
  ],
};

export const evidenceSfx: SfxCue[] = [
  { name: 'whoosh_down', at: m10.from, gain: 0.35 },
  { name: 'bell', at: kickAtOrAfter(S(11).start), gain: 0.3 },
  { name: 'whoosh_up', at: m12.from, gain: 0.4 },
  { name: 'air', at: m12.to - 20, gain: 0.3 },
  { name: 'whoosh_down', at: m13.from, gain: 0.45 },
  { name: 'tick', at: kickAtOrAfter(S(14).start), gain: 0.45 },
  { name: 'tick', at: kickAtOrAfter(S(14).start + 10), gain: 0.45 },
  { name: 'whoosh_up', at: launch, gain: 0.45 },
  { name: 'subdrop', at: apex, gain: 0.7, heavy: true },
  { name: 'boom', at: apex, gain: 1, heavy: true },
];

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

/** 第 14 屏：放大镜。把地球边缘放大，量出那层光有多薄 */
const Lens: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const s14 = S(14);
  const a = win(f, s14.start, s14.end, 10, 8);
  if (a <= 0) return null;
  const grow = ease.out(clamp((f - s14.start) / 12));
  const ang = (-52 * Math.PI) / 180;
  const px = st.cx + Math.cos(ang) * st.r;
  const py = st.cy + Math.sin(ang) * st.r;
  const lx = 1450;
  const ly = 250;
  const lr = 130 * grow;
  const base = ly + 38;
  const band = 30; // 放大后的大气层厚度
  const t1 = kickAtOrAfter(s14.start);
  const t2 = kickAtOrAfter(s14.start + 10);
  return (
    <g opacity={a}>
      <defs>
        <clipPath id="lensClip">
          <circle cx={lx} cy={ly} r={Math.max(1, lr)} />
        </clipPath>
        <linearGradient id="lensAir" x1="0" y1="1" x2="0" y2="0">
          <stop offset={0} stopColor={C.gold} stopOpacity={0.75} />
          <stop offset={1} stopColor={C.gold} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={px} y1={py} x2={lx - lr * 0.7} y2={ly + lr * 0.7} stroke={C.ivory} strokeOpacity={0.5} strokeWidth={1} />
      <circle cx={px} cy={py} r={4} fill={C.gold} />
      <g clipPath="url(#lensClip)">
        <rect x={lx - 140} y={ly - 140} width={280} height={280} fill={C.bg} />
        <rect x={lx - 140} y={base} width={280} height={140} fill={C.earthMid} />
        <rect x={lx - 140} y={base - band} width={280} height={band} fill="url(#lensAir)" />
        <line x1={lx - 140} y1={base} x2={lx + 140} y2={base} stroke={C.ivory} strokeWidth={2} />
        <g opacity={clamp((f - t1) / 4)}>
          <line x1={lx + 20} y1={base} x2={lx + 70} y2={base} stroke={C.ivory} strokeWidth={1.5} />
        </g>
        <g opacity={clamp((f - t2) / 4)}>
          <line x1={lx + 20} y1={base - band} x2={lx + 70} y2={base - band} stroke={C.ivory} strokeWidth={1.5} />
          <line x1={lx + 45} y1={base} x2={lx + 45} y2={base - band} stroke={C.ivory} strokeWidth={1} />
          <text x={lx - 18} y={base - band - 18} textAnchor="middle" fontFamily='"Noto Sans SC", sans-serif' fontSize={30} fill={C.gold}>
            1.9 mm
          </text>
        </g>
      </g>
      <circle cx={lx} cy={ly} r={Math.max(1, lr)} fill="none" stroke={C.ivory} strokeOpacity={0.7} strokeWidth={1.5} />
    </g>
  );
};

/** 第 15–17 屏：一粒光点从地球边缘升空，沿抛物线到顶点，然后停在那里 */
const LAUNCH_ANGLE = (-100 * Math.PI) / 180;
const Flight: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const s15 = S(15);
  const s17 = S(17);
  if (f < s15.start || f >= s17.end) return null;
  const sx = Math.cos(LAUNCH_ANGLE) * R;
  const sy = Math.sin(LAUNCH_ANGLE) * R;
  const pos = (u: number) => toScreen(st, sx - 0.32 * R * u, sy - 0.62 * R * (2 * u - u * u));
  const u = ease.inOut(progress(f, launch, apex));
  const p = pos(u);
  const trail = Array.from({ length: 30 }, (_, i) => pos(Math.max(0, u - i * 0.02)));
  const a = win(f, s15.start, s17.end, 10, 14);
  const pulse = f < launch ? 0.6 + 0.4 * Math.sin(f / 4) : 1;
  return (
    <g opacity={a}>
      {f >= launch ? (
        <path
          d={`M ${trail.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' L ')}`}
          fill="none"
          stroke={C.gold}
          strokeOpacity={0.45}
          strokeWidth={2}
        />
      ) : null}
      <circle cx={p.x} cy={p.y} r={16} fill={C.gold} opacity={0.2 * pulse} />
      <circle cx={p.x} cy={p.y} r={5} fill={C.ivory} opacity={pulse} />
      <Label x={p.x} y={p.y} dx={-50} dy={-50} align="right" text="威廉·沙特纳" opacity={win(f, s15.start + 8, S(16).end)} />
      <Label x={p.x} y={p.y} dx={46} dy={-46} size={44} text="90 岁" opacity={win(f, launch + 10, S(16).end)} />
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
        avoidSubtitle={false}
      />
      <Note y={930} text={S(11).label ?? ''} size={24} opacity={win(f, S(11).start + 10, S(11).end)} />
      <Label x={st.cx - st.r} y={st.cy} dx={-60} dy={-30} align="right" text={S(13).label ?? ''} opacity={win(f, m13.to - 6, S(13).end)} />
      <Lens f={f} st={st} />
      <Note y={930} text={S(14).label ?? ''} opacity={win(f, S(14).start + 12, S(14).end)} size={24} />
      <Flight f={f} st={st} />
      <Note y={930} text={S(16).label ?? ''} size={24} opacity={win(f, launch + 16, S(16).end)} />
      <Note y={575} text={S(17).label ?? ''} opacity={win(f, apex + 20, S(17).end)} />
    </>
  );
};
