import React, { useMemo } from 'react';
import { beat, cue, section, WARM } from '../data/script';
import { LIGHTS, PALETTE } from '../theme';
import { camTrack, mixLight } from '../lib/camera';
import { clamp, ease, impulse, lerp, mix, prog, rgba, rnd, track, v, Vec, vlerp } from '../lib/anim';
import { N, WOUND_SEG } from '../lib/snake';
import { Saw, SAW } from '../components/Saw';
import { Snake } from '../components/Snake';
import { Ground } from '../components/Ground';
import { Balance, panCenters } from '../components/Balance';
import { Card, SectionDef } from './story';
import { s3State } from './S3Escalate';
import { S3Escalate } from './S3Escalate';

/**
 * S4 揭晓（屏 16–21）：光线从暖红退回冷夜色。
 * 蛇身在锯条那一线碎成粒子往上飘（锯子“0 cm”）→ 粒子聚成暖色光球落进天平右盘，
 * 左盘只有一枚小锯齿 → 推近小锯齿旁那道小口子 → 光球里浮出“扑咬”“缠绕”两道残影
 * → 整个场景收成一张卡片，翻面露出下一节的地平线。
 */
const S = section('S4');
const C16 = cue(16);
const C17 = cue(17);
const C18 = cue(18);
const C19 = cue(19);
const C20 = cue(20);
const C21 = cue(21);
const F_ONE = beat(19, 'one');
const F_TWO = beat(19, 'two');
const F_FLIP = beat(21, 'flipMid');

const START = s3State(S.start); // 从 S3 最后一帧的状态接着演
const BAL = { x: 760, y: 250, arm: 300, drop: 150 };
const angleAt = (f: number) => {
  const fill = ease.inOut(prog(f, C17.start + 8, C17.start + 60));
  const settle = f > C17.start + 60 ? Math.exp(-(f - C17.start - 60) / 14) * Math.sin((f - C17.start - 60) * 0.45) * 3 : 0;
  return 19 * fill + settle;
};
const pans = (f: number) => panCenters({ ...BAL, angle: angleAt(f) });

// 粒子：每节蛇身 4 颗
const PER = 4;
type P = { seg: number; born: number; jx: number; jy: number; vx: number; up: number; delay: number; curl: number; r: number };

const camera = (f: number) => {
  const tooth = pans(C18.start + 10).left;
  const c = camTrack(f, [
    [S.start, S3Escalate.camera(S.start)],
    [S.start + 55, { x: 1180, y: 560, z: 1.15 }, ease.inOut],
    [C17.start + 14, { x: 880, y: 430, z: 0.94 }, ease.inOut],
    [C18.start, { x: 860, y: 425, z: 0.98 }, ease.linear],
    [C18.start + 16, { x: tooth.x + 40, y: tooth.y - 30, z: 2.5 }, ease.out],
    [C18.end, { x: tooth.x + 30, y: tooth.y - 34, z: 2.62 }, ease.linear],
    [C19.start + 20, { x: 930, y: 410, z: 1.0 }, ease.inOut],
    [C20.start, { x: 940, y: 405, z: 1.04 }, ease.linear],
    [S.end, { x: 960, y: 400, z: 1.08 }, ease.linear],
  ]);
  return c;
};

/** “扑咬”残影：一条 S 形，头部前冲 */
const strikeGhost = (o: Vec, t: number) =>
  Array.from({ length: 18 }, (_, i) => {
    const u = i / 17;
    return `${o.x - 160 + u * 280 + Math.pow(u, 3) * 60 * t},${o.y + Math.sin(u * Math.PI * 2.2) * 34 * (1 - u * 0.5) - Math.pow(u, 4) * 40 * t}`;
  }).join(' ');
/** “缠绕”残影：绕一根短杆的螺旋 */
const coilGhost = (o: Vec, t: number) =>
  Array.from({ length: 60 }, (_, i) => {
    const u = i / 59;
    const th = u * Math.PI * 2 * 2.4;
    const R = lerp(70, 46, t);
    return `${o.x - 120 + u * 240 + Math.sin(th) * 14},${o.y + Math.cos(th) * R}`;
  }).join(' ');

const World: SectionDef['World'] = ({ frame, cam, light }) => {
  const parts = useMemo(() => {
    const out: P[] = [];
    for (let i = 0; i < N; i++)
      for (let k = 0; k < PER; k++) {
        const id = `${i}-${k}`;
        out.push({
          seg: i,
          born: S.start + 5 + Math.abs(i - 14) * 0.7 + rnd(`b4${id}`) * 6,
          jx: (rnd(`x4${id}`) - 0.5) * 24,
          jy: (rnd(`y4${id}`) - 0.5) * 24,
          vx: (rnd(`v4${id}`) - 0.5) * 2.4,
          up: 1.6 + rnd(`u4${id}`) * 2.2,
          delay: rnd(`d4${id}`) * 26,
          curl: (rnd(`c4${id}`) - 0.5) * 260,
          r: 2.2 + rnd(`r4${id}`) * 3.2,
        });
      }
    return out;
  }, []);

  const p = pans(frame);
  const orbC = v(p.right.x, p.right.y - 34);
  const balIn = ease.out(prog(frame, C17.start - 6, C17.start + 14));
  const dissolveSeg = (i: number) => {
    const t0 = S.start + 5 + Math.abs(i - 14) * 0.7;
    return 1 - clamp((frame - t0) / 8);
  };
  // 锯子降温：齿变回原长，暖色退去
  const toothGrow = lerp(START.toothGrow, 1, ease.inOut(prog(frame, S.start + 4, S.start + 48)));
  const teethWarm = START.teethWarm * (1 - ease.inOut(prog(frame, S.start + 4, S.start + 48)));
  const glint = frame >= S.start + 12 && frame <= S.start + 62 ? lerp(SAW.x0 - 120, SAW.x0 + SAW.length + 120, prog(frame, S.start + 12, S.start + 62)) : null;

  // 光球：粒子到得越多越大
  let arrived = 0;
  const dots = parts.map((q, n) => {
    if (frame < q.born) return null;
    const home = START.segs[q.seg];
    const born = { x: home.x + q.jx, y: home.y + q.jy };
    const drift = (t: number) => {
      const tt = Math.max(0, t - q.born);
      const k = 1 - Math.exp(-tt / 30);
      return { x: born.x + q.vx * 30 * k, y: born.y - q.up * 34 * k };
    };
    const t1 = C17.start + 2 + q.delay;
    let pos = drift(Math.min(frame, t1));
    let o = clamp((frame - q.born) / 4);
    let col = mix(WARM, '#B8C4C8', clamp((frame - q.born) / 50));
    if (frame >= t1) {
      const from = drift(t1);
      const t = ease.inOut(clamp((frame - t1) / 26));
      const mid = { x: (from.x + orbC.x) / 2, y: Math.min(from.y, orbC.y) - 80 + q.curl * 0.3 };
      pos = vlerp(vlerp(from, mid, t), vlerp(mid, orbC, t), t);
      col = mix(col, WARM, t);
      if (t >= 1) {
        arrived++;
        o = 0;
      }
    }
    return <circle key={n} cx={pos.x} cy={pos.y} r={q.r} fill={col} opacity={o} />;
  });
  const orbR = 10 + 52 * (arrived / parts.length);
  const orbPulse = 1 + 0.05 * Math.sin(frame * 0.25) + 0.12 * impulse(frame, F_ONE, 8) + 0.12 * impulse(frame, F_TWO, 8);

  // 左盘：一枚从锯子上“借”来的小锯齿
  const toothFly = ease.inOut(prog(frame, C17.start + 2, C17.start + 26));
  const toothFrom = v(1010, SAW.y - 8);
  const toothPos = (lp: Vec) => vlerp(vlerp(toothFrom, v((toothFrom.x + lp.x) / 2, lp.y - 160), toothFly), vlerp(v((toothFrom.x + lp.x) / 2, lp.y - 160), v(lp.x, lp.y - 14), toothFly), toothFly);
  const woundIn = ease.out(prog(frame, C18.start + 4, C18.start + 18));

  const ghostT1 = prog(frame, F_ONE, F_ONE + 10);
  const ghostT2 = prog(frame, F_TWO, F_TWO + 10);
  const ghostFade = (t0: number) => (frame < t0 ? 0 : Math.min(1, (frame - t0) / 6) * (0.35 + 0.65 * Math.exp(-(frame - t0) / 30)));

  return (
    <g>
      <Ground frame={frame} cam={cam} light={light} wind={0.4} />
      <Snake id="s4u" segs={START.segs} layer="under" warmth={1} crack={1} segOpacity={dissolveSeg} shadow={false} />
      <Saw id="s4saw" layer="body" glint={glint} holeColor={light.ground} />
      <Snake id="s4o" segs={START.segs} layer="over" warmth={1} crack={1} headGlow={START.headGlow * dissolveSeg(0)} wound={{ index: WOUND_SEG, amount: 0.8 }} segOpacity={dissolveSeg} />
      <Saw id="s4t" layer="teeth" toothGrow={toothGrow} warm={teethWarm} glint={glint} flash={0.6 * impulse(frame, C16.start + 4, 10)} />
      {balIn > 0 && (
        <g transform={`translate(0 ${(1 - balIn) * 60})`}>
          <Balance
            {...BAL}
            angle={angleAt(frame)}
            opacity={balIn}
            left={(lp) => (
              <g>
                {frame >= C17.start + 2 && (
                  <path
                    d={(() => {
                      const tp = toothPos(lp);
                      return `M${tp.x - 15} ${tp.y + 8} L${tp.x + 6} ${tp.y - 22} L${tp.x + 15} ${tp.y + 8} Z`;
                    })()}
                    fill={PALETTE.steelLight}
                    stroke="#3A404B"
                    strokeWidth={1.2}
                  />
                )}
                {woundIn > 0 && (
                  <g opacity={woundIn}>
                    <ellipse cx={lp.x + 40} cy={lp.y - 22} rx={14} ry={3} fill={WARM} opacity={0.6} />
                    <ellipse cx={lp.x + 40} cy={lp.y - 22} rx={10} ry={1.3} fill="#FFD2C4" />
                  </g>
                )}
              </g>
            )}
            right={() =>
              arrived > 0 ? (
                <g>
                  <circle cx={orbC.x} cy={orbC.y} r={orbR * 1.8 * orbPulse} fill={rgba(WARM, 0.12)} />
                  <circle cx={orbC.x} cy={orbC.y} r={orbR * orbPulse} fill={rgba(WARM, 0.85)} />
                  <circle cx={orbC.x - orbR * 0.3} cy={orbC.y - orbR * 0.3} r={orbR * 0.35} fill={rgba('#FFD2C4', 0.5)} />
                </g>
              ) : null
            }
          />
        </g>
      )}
      {dots}
      {/* 屏 19：光球里浮出“那一口”和“那一缠” */}
      {ghostT1 > 0 && (
        <g>
          <polyline points={strikeGhost(v(orbC.x + 260, orbC.y - 230), ghostT1)} fill="none" stroke={rgba(WARM, ghostFade(F_ONE))} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          {(() => {
            const pts = strikeGhost(v(orbC.x + 260, orbC.y - 230), ghostT1).split(' ').map((s) => s.split(',').map(Number));
            const [hx, hy] = pts[pts.length - 1];
            const [px, py] = pts[pts.length - 2];
            const a = (Math.atan2(hy - py, hx - px) * 180) / Math.PI;
            return <ellipse cx={hx} cy={hy} rx={24} ry={15} transform={`rotate(${a} ${hx} ${hy})`} fill={rgba(WARM, ghostFade(F_ONE))} />;
          })()}
        </g>
      )}
      {ghostT2 > 0 && (
        <g opacity={ghostFade(F_TWO)}>
          <rect x={orbC.x + 120} y={orbC.y - 22} width={290} height={20} rx={4} fill={rgba('#C3CBD8', 0.5)} />
          <polyline points={coilGhost(v(orbC.x + 265, orbC.y - 12), ghostT2)} fill="none" stroke={WARM} strokeWidth={12} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

/** 屏 20–21：收成卡片 → 翻面 → 背面是下一节，展开成全屏。 */
const card = (f: number): Card | null => {
  if (f < C20.start + 3) return null;
  const shrink = ease.inOut(prog(f, C20.start + 3, C20.start + 40));
  if (f < F_FLIP) {
    const flip = ease.in(prog(f, C21.start + 5, F_FLIP));
    return { scale: lerp(1, 0.56, shrink), sx: 1 - flip, tx: -110 * shrink, ty: -30 * shrink, radius: 30 * shrink, showNext: false };
  }
  const open = ease.out(prog(f, F_FLIP, F_FLIP + 14));
  const grow = ease.inOut(prog(f, F_FLIP + 10, S.end));
  return { scale: lerp(0.56, 1, grow), sx: open, tx: lerp(-110, 0, grow), ty: lerp(-30, 0, grow), radius: lerp(30, 0, grow), showNext: true };
};

export const S4Reveal: SectionDef = {
  id: 'S4',
  start: S.start,
  end: S.end,
  camera,
  light: (f) => mixLight(LIGHTS.tense, LIGHTS.night, ease.inOut(prog(f, S.start, S.start + 50))),
  lightAt: (f) => vlerp(v(SAW.x0 + SAW.length / 2, SAW.y), v(860, 420), ease.inOut(prog(f, C17.start, C17.start + 30))),
  lightBoost: (f) => 0.14 * impulse(f, C17.start + 2, 14) + 0.06 * impulse(f, F_ONE, 8) + 0.06 * impulse(f, F_TWO, 8),
  World,
  card,
};
