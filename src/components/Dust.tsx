// 失焦尘埃：三层景深。镜头拉远时尘埃往中心流（像在后退），推近时往外流；
// 按“对数半径”循环，所以缩放几个数量级也不会堆在一起。
import React from 'react';
import { rand } from '../film/anim';
import { C, H, W } from '../film/theme';

export interface Beam {
  /** 光束中线上的一点 */
  x: number;
  y: number;
  /** 光束方向（度） */
  angle: number;
  halfWidth: number;
  intensity: number;
}

interface DustProps {
  logS: number;
  panX: number;
  panY: number;
  /** 变速后的时间（帧），break 时走得慢 */
  tau: number;
  ambient: number;
  beam: Beam | null;
}

const N = 150;
const RHO_MIN = 18;
const RHO_MAX = 1500;
const L = Math.log(RHO_MAX / RHO_MIN);

const PARTICLES = Array.from({ length: N }, (_, i) => {
  const layer = i % 3;
  const depth = [0.3, 0.65, 1][layer];
  return {
    theta: rand(i * 7.1) * Math.PI * 2,
    u0: rand(i * 3.3 + 1) * L,
    depth,
    size: [2.2, 4, 9][layer] * (0.6 + rand(i * 5.7) * 0.9),
    alpha: [0.5, 0.35, 0.16][layer] * (0.5 + rand(i * 9.1) * 0.7),
    gold: rand(i * 1.9) < 0.35,
    wob: rand(i * 4.4) * Math.PI * 2,
    drift: 0.0009 + rand(i * 2.2) * 0.0012,
  };
});

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const wrap = (v: number, lo: number, hi: number) => {
  const span = hi - lo;
  return ((((v - lo) % span) + span) % span) + lo;
};

export const Dust: React.FC<DustProps> = ({ logS, panX, panY, tau, ambient, beam }) => {
  const bdx = beam ? Math.cos((beam.angle * Math.PI) / 180) : 0;
  const bdy = beam ? Math.sin((beam.angle * Math.PI) / 180) : 0;
  return (
    <g>
      <defs>
        {['ivory', 'gold'].map((c) => (
          <radialGradient key={c} id={`dust-${c}`}>
            <stop offset={0} stopColor={c === 'gold' ? C.gold : C.ivory} stopOpacity={1} />
            <stop offset={0.35} stopColor={c === 'gold' ? C.gold : C.ivory} stopOpacity={0.45} />
            <stop offset={1} stopColor={c === 'gold' ? C.gold : C.ivory} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>
      {PARTICLES.map((p, i) => {
        const u = wrap(p.u0 + p.depth * 0.55 * logS + p.drift * 3 * tau, 0, L);
        const rho = RHO_MIN * Math.exp(u);
        const th = p.theta + p.depth * 0.0006 * tau;
        let x = W / 2 + rho * Math.cos(th) + Math.sin(tau * 0.02 + p.wob) * 6 * p.depth + panX * p.depth;
        let y = H / 2 + rho * Math.sin(th) * 0.62 + Math.cos(tau * 0.017 + p.wob) * 5 * p.depth + panY * p.depth;
        x = wrap(x, -120, W + 120);
        y = wrap(y, -120, H + 120);
        // 对数半径分布在中心最密，靠近中心的淡掉，避免堆成一团
        let a = p.alpha * smooth(0, 0.7, u) * smooth(80, 420, rho) * ambient;
        if (beam && beam.intensity > 0) {
          const dist = Math.abs((x - beam.x) * bdy - (y - beam.y) * bdx);
          a *= 1 + 3.2 * beam.intensity * Math.exp(-((dist / beam.halfWidth) ** 2));
        }
        const size = p.size * (0.7 + 0.5 * (u / L));
        return (
          <circle key={i} cx={x} cy={y} r={size * 2.4} fill={`url(#dust-${p.gold ? 'gold' : 'ivory'})`} opacity={Math.min(1, a)} />
        );
      })}
    </g>
  );
};
