import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { beat, cue, section } from '../data/script';
import { LIGHTS } from '../theme';
import { camTrack } from '../lib/camera';
import { clamp, ease, impulse, lerp, prog, rgba, rnd, shake, v, vlerp } from '../lib/anim';
import { crawl, N } from '../lib/snake';
import { Saw, SAW } from '../components/Saw';
import { Snake } from '../components/Snake';
import { Ground } from '../components/Ground';
import { finalCoil, HEAD, SectionDef } from './story';

/**
 * S1 钩子（屏 1–3）：
 * 锯齿特写填满画面 → 拉远露出缠死在锯子上的暗色蛇身 → 蛇身碎成粒子（大字“没能离开”）
 * → 倒带：粒子飞回左边聚成一条活蛇，镜头左移，接 S2。
 */
const S = section('S1');
const C1 = cue(1);
const F_GLINT = beat(1, 'glint');
const F_SLAM = beat(2, 'slam');
const F_REWIND = beat(3, 'rewind');
const SAW_C = v(SAW.x0 + SAW.length / 2, SAW.y + SAW.w / 2);

const PER = 5; // 每节蛇身碎成几颗粒子
type P = { seg: number; k: number; born: number; jx: number; jy: number; vx: number; vy: number; r: number; delay: number; curl: number };

const useParticles = () =>
  useMemo(() => {
    const out: P[] = [];
    for (let i = 0; i < N; i++)
      for (let k = 0; k < PER; k++) {
        const id = `${i}-${k}`;
        out.push({
          seg: i,
          k,
          born: F_SLAM + (i / N) * 18 + rnd(`b${id}`) * 6,
          jx: (rnd(`jx${id}`) - 0.5) * 22,
          jy: (rnd(`jy${id}`) - 0.5) * 22,
          vx: -1.4 - rnd(`vx${id}`) * 2.6,
          vy: -0.9 - rnd(`vy${id}`) * 2.2,
          r: 2.2 + rnd(`r${id}`) * 3.4,
          delay: rnd(`d${id}`) * 16,
          curl: (rnd(`c${id}`) - 0.5) * 340,
        });
      }
    return out;
  }, []);

const camera = (f: number) => {
  const c = camTrack(f, [
    [S.start, { x: 1532, y: 596, z: 3.7 }],
    [C1.start + 78, { x: 1262, y: 612, z: 1.22 }, ease.inOut],
    [F_REWIND + 2, { x: 1236, y: 604, z: 1.44 }, ease.linear],
    [F_REWIND + 62, { x: 330, y: 690, z: 0.95 }, ease.inOut],
    [S.end, { x: 300, y: 690, z: 0.95 }, ease.linear],
  ]);
  const s = shake(f, 16 * impulse(f, F_SLAM, 7), 1);
  return { ...c, x: c.x + s.x, y: c.y + s.y };
};

const World: SectionDef['World'] = ({ frame, cam, light }) => {
  const parts = useParticles();
  const coilSegs = useMemo(() => finalCoil(), []);
  const startSegs = useMemo(() => crawl(HEAD.sStart), []);
  const dissolve = (i: number) => {
    const t0 = F_SLAM + (i / N) * 18;
    return 1 - clamp((frame - t0) / 9);
  };
  const reform = clamp((frame - (S.end - 26)) / 22);
  const glint = frame >= C1.start + 10 && frame <= C1.start + 62 ? lerp(SAW.x0 - 120, SAW.x0 + SAW.length + 120, prog(frame, F_GLINT - 22, F_GLINT + 22)) : null;
  const flash = 0.8 * impulse(frame, F_SLAM, 6);

  return (
    <g>
      <Ground frame={frame} cam={cam} light={light} wind={0.6} />
      {/* 结局：暗色蛇身缠在锯子上 */}
      {frame < F_SLAM + 30 && <Snake id="s1u" segs={coilSegs} layer="under" dim={1} crack={0.2} segOpacity={dissolve} shadow={false} />}
      <Saw id="s1saw" layer="body" glint={glint} holeColor={light.ground} />
      {frame < F_SLAM + 30 && <Snake id="s1o" segs={coilSegs} layer="over" dim={1} crack={0.2} segOpacity={dissolve} />}
      <Saw id="s1t" layer="teeth" glint={glint} flash={flash} />
      {/* 粒子：先飘散，倒带时飞回左侧聚成活蛇 */}
      {frame >= F_SLAM &&
        parts.map((p, n) => {
          if (frame < p.born) return null;
          const home = coilSegs[p.seg];
          const born = { x: home.x + p.jx, y: home.y + p.jy };
          const drift = (t: number) => {
            const tt = Math.max(0, t - p.born);
            const k = 1 - Math.exp(-tt / 26);
            return { x: born.x + p.vx * 26 * k * 2.2, y: born.y + p.vy * 26 * k * 2.2 - tt * 0.15 };
          };
          let pos = drift(Math.min(frame, F_REWIND));
          let o = clamp((frame - p.born) / 4);
          if (frame >= F_REWIND) {
            const from = drift(F_REWIND);
            const to = { x: startSegs[p.seg].x + p.jx * 0.4, y: startSegs[p.seg].y + p.jy * 0.4 };
            const t = ease.inOut(clamp((frame - F_REWIND - 2 - p.delay) / 44));
            const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + p.curl };
            const a = vlerp(from, mid, t);
            const b = vlerp(mid, to, t);
            pos = vlerp(a, b, t);
            o *= 1 - reform;
          }
          const warm = p.k === 0;
          return (
            <circle key={n} cx={pos.x} cy={pos.y} r={p.r} fill={warm ? rgba('#FF8A6A', 0.85) : rgba('#B8D8C8', 0.9)} opacity={o} />
          );
        })}
      {/* 倒带聚形：活蛇淡入 */}
      {reform > 0 && <Snake id="s1new" segs={startSegs} opacity={reform} />}
    </g>
  );
};

/** 倒带时的横向流光线（屏幕空间）。 */
const Overlay: SectionDef['Overlay'] = ({ frame }) => {
  const t = frame - F_REWIND;
  if (t < 0 || t > 64) return null;
  const a = Math.sin((t / 64) * Math.PI);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={1920} height={1080}>
        {Array.from({ length: 9 }, (_, i) => {
          const y = 120 + i * 82 + rnd(`ry${i}`) * 30;
          const speed = 38 + rnd(`rs${i}`) * 40;
          const x = 1920 - ((t * speed + rnd(`rx${i}`) * 1920) % 2600);
          return <rect key={i} x={x} y={y} width={260 + rnd(`rw${i}`) * 300} height={2} fill={rgba('#4FD1C5', 0.28 * a)} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const S1Hook: SectionDef = {
  id: 'S1',
  start: S.start,
  end: S.end,
  camera,
  light: () => LIGHTS.night,
  lightAt: (f) => vlerp(SAW_C, v(320, 690), ease.inOut(prog(f, F_REWIND, F_REWIND + 60))),
  World,
  Overlay,
};
export const S1_END_CAM = camera(S.end);
