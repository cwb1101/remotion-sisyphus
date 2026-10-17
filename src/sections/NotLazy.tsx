import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Figure, figureJoints } from '../components/Figure';
import { Footprints } from '../components/Footprints';
import { at, screen } from '../data/script';
import { type Cam, clamp, ease, mixCam, prog, track } from '../lib/anim';
import { C } from '../theme';
import { HALF_END_BALLOON } from './HalfSeen';
import { cue } from './rigs';
import { StoryStage } from './StoryStage';
import { WALKER_PRINTS, adultsAt, balloonAt, teenProps, teenSwing, walkerVisible } from './story';
import { WalkerActor } from './StoryActors';

/**
 * 不是懒（屏 19–30）：从上一节那颗半亮的球拉出来，换到更冷更暗的夜。
 * 左边气球的环越来越多、右边的脚印槽一个个熄灭；大人指指点点；胸口电量一格格灭掉；
 * 杂念碎片绕着气球转，他用手去推；最后先走路的人从他脚下走过。
 */
export const notLazyCam = (f: number): Cam => {
  const b = balloonAt(f);
  const teen = teenProps(f);
  const j = figureJoints(teen);
  const chest = { x: (j.hip.x + j.neck.x) / 2, y: (j.hip.y + j.neck.y) / 2 };
  const close: Cam = { z: HALF_END_BALLOON.r / b.r, fx: b.cx, fy: b.cy, sx: HALF_END_BALLOON.x, sy: HALF_END_BALLOON.y };
  const wide: Cam = { z: 0.9, fx: 900, fy: 450, sx: 960, sy: 500 };
  const chestCam: Cam = { z: 2.2, fx: chest.x, fy: chest.y, sx: 760, sy: 500 };
  // 气球放在左边、偏上：挂在下面的人落在字幕左侧，不垫在白字后面
  const balloonCam: Cam = { z: 1.5, fx: b.cx, fy: b.cy, sx: 420, sy: 330 };
  const medium: Cam = { z: 1.1, fx: 620, fy: 400, sx: 1120, sy: 470 };
  const wide2: Cam = { z: 0.95, fx: 700, fy: 450, sx: 960, sy: 520 };
  const high: Cam = { z: 0.92, fx: 720, fy: track(f, [[at(27), 450], [at(27) + 50, 300]]), sx: 960, sy: 500 };
  const walkerCam: Cam = { z: 0.85, fx: 760 + 40 * prog(f, at(29), at(31), ease.linear), fy: 360, sx: 960, sy: 470 };
  let cam = close;
  cam = mixCam(cam, wide, prog(f, at(20) - 4, at(20) + 30));
  cam = mixCam(cam, chestCam, prog(f, at(21), at(21) + 22));
  cam = mixCam(cam, balloonCam, prog(f, at(22), at(22) + 20));
  cam = mixCam(cam, medium, prog(f, at(24), at(24) + 22));
  cam = mixCam(cam, wide2, prog(f, at(26) - 6, at(26) + 16));
  cam = mixCam(cam, high, prog(f, at(27), at(27) + 30));
  cam = mixCam(cam, walkerCam, prog(f, at(29) - 10, at(29) + 20));
  // 屏 23–25 气球发抖时镜头也轻轻颤
  const tremble = prog(f, at(23), at(23) + 10) * (1 - prog(f, cue(25), cue(25) + 4));
  return { ...cam, sx: cam.sx + Math.sin(f * 1.9) * 2.5 * tremble, sy: cam.sy + Math.cos(f * 2.3) * 2 * tremble };
};

// ── 杂念碎片 ──
const SHARDS = 26;
const shardAppear = (i: number) => {
  const c22 = cue(22);
  if (i < 7) return c22 + i * 0.4;
  if (i < 14) return c22 + 7.5 + (i - 7) * 0.4;
  if (i < 20) return c22 + 15 + (i - 14) * 0.4;
  return cue(23) + (i - 20) * 4.5;
};
const shardPoly = (i: number, size: number) => {
  const n = 3 + Math.floor(random(`sn${i}`) * 2);
  return Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + random(`sa${i}${k}`) * 0.8;
    const rr = size * (0.5 + random(`sr${i}${k}`) * 0.6);
    return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
  }).join(' ');
};

const Shards: React.FC<{ f: number; cx: number; cy: number; r: number }> = ({ f, cx, cy, r }) => {
  const freeze = cue(25);
  const fallStart = freeze + 12;
  const pushes = [cue(24), cue(24) + 32];
  const pulse = pushes.reduce((m, t) => Math.max(m, Math.exp(-(((f - t) / 6) ** 2))), 0);
  return (
    <g>
      {Array.from({ length: SHARDS }, (_, i) => {
        const t0 = shardAppear(i);
        if (f < t0) return null;
        const w = 0.025 + random(`sw${i}`) * 0.02;
        const tf = Math.min(f, freeze);
        const eff = Math.min(tf, at(23)) - t0 + 2 * Math.max(0, tf - Math.max(at(23), t0));
        const a = random(`sa${i}`) * Math.PI * 2 + w * eff;
        const rad = r * (1.22 + 0.42 * random(`sd${i}`)) + 42 * pulse;
        let x = cx + Math.cos(a) * rad;
        let y = cy + Math.sin(a) * rad * 0.8;
        const fall = Math.max(0, f - fallStart);
        y += 0.32 * fall * fall;
        x += fall * (random(`sx${i}`) - 0.5) * 2;
        const pop = clamp((f - t0) / 4);
        const o = pop * (1 - clamp(fall / 40));
        if (o <= 0) return null;
        const size = 12 + random(`ss${i}`) * 14;
        return (
          <polygon
            key={i}
            points={shardPoly(i, size)}
            transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + random(`sq${i}`) * 90}) scale(${pop})`}
            fill={C.shard}
            opacity={0.85 * o}
          />
        );
      })}
    </g>
  );
};

// ── 胸口电量条 ──
const litAt = (f: number) => {
  if (f >= cue(25)) return 0;
  if (f >= cue(24) + 32) return 1;
  if (f >= cue(24)) return 2;
  return 3;
};
const EnergyBar: React.FC<{ f: number; x: number; y: number }> = ({ f, x, y }) => {
  const show = prog(f, at(21), at(21) + 12) * (1 - prog(f, at(26) - 10, at(26) + 16));
  if (show <= 0) return null;
  const lit = litAt(f);
  const beat = [cue(21), cue(21) + 10.5].reduce((m, t) => Math.max(m, Math.exp(-(((f - t) / 3) ** 2))), 0);
  const lastFlash = f >= cue(25) ? Math.exp(-(f - cue(25)) / 6) : 0;
  const W = 46;
  const H = 15;
  return (
    <g opacity={show}>
      <rect x={x - W / 2 - 3} y={y - H / 2 - 3} width={W + 6} height={H + 6} rx={4} fill="#0B0E1A" stroke={C.act} strokeOpacity={0.55 + 0.3 * beat} strokeWidth={1.6} />
      {Array.from({ length: 5 }, (_, i) => (
        <rect
          key={i}
          x={x - W / 2 + i * (W / 5) + 1}
          y={y - H / 2}
          width={W / 5 - 2}
          height={H}
          rx={1.5}
          fill={C.act}
          opacity={i < lit ? 0.9 + 0.1 * beat : i === 0 ? 0.6 * lastFlash : 0.08}
        />
      ))}
    </g>
  );
};

export const NotLazy: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const cam = notLazyCam(f);
  const teen = teenProps(f);
  const b = balloonAt(f);
  const j = figureJoints(teen);
  const chest = { x: (j.hip.x + j.neck.x) / 2, y: (j.hip.y + j.neck.y) / 2 + 4 };
  const swing = teenSwing(f);
  const tremble = prog(f, at(23), at(23) + 10) * (1 - prog(f, cue(25), cue(25) + 4));
  const bx = b.cx + Math.sin(f * 2.7) * 3 * tremble;
  const by = b.cy + Math.cos(f * 3.1) * 3 * tremble;

  // 屏 19：右边一排 8 个脚印槽，随着左边环变多一个个熄灭
  const slotShow = prog(f, at(19), at(19) + 14) * (1 - prog(f, at(20) - 4, at(20) + 12));
  const lit = 8 - Math.floor(8 * prog(f, cue(19), screen(19).endFrame - 6, ease.linear));
  const dim = f >= cue(25) ? 0.4 * Math.exp(-(f - cue(25)) / 45) + 0.12 * (1 - prog(f, at(26), at(26) + 20)) : 0;

  return (
    <StoryStage
      id="nl"
      f={f}
      cam={cam}
      opacity={opacity}
      overlay={
        <>
          {slotShow > 0 ? (
            <g opacity={slotShow}>
              {Array.from({ length: 8 }, (_, i) => (
                <g key={i}>
                  <ellipse cx={1090 + i * 95} cy={640 + (i % 2) * 22} rx={26} ry={10} fill="none" stroke={C.act} strokeOpacity={0.5} strokeWidth={2} />
                  <ellipse cx={1090 + i * 95} cy={640 + (i % 2) * 22} rx={20} ry={7} fill={C.act} opacity={i < lit ? 0.85 : 0} />
                </g>
              ))}
            </g>
          ) : null}
          {dim > 0 ? <rect width={1920} height={1080} fill="#03040A" opacity={dim} /> : null}
        </>
      }
    >
      <Footprints prints={walkerVisible(f) ? WALKER_PRINTS : []} frame={f} scale={1.1} />
      {adultsAt(f).map((a, i) => (
        <Figure key={i} {...a} />
      ))}
      <ellipse cx={teen.x} cy={760 + 6} rx={50} ry={8} fill="#000" opacity={0.25} />
      <Balloon id="nl-b" {...b} cx={bx} cy={by} />
      <Shards f={f} cx={bx} cy={by} r={b.r} />
      <g transform={`rotate(${swing} ${j.nearHand.x} ${j.nearHand.y})`}>
        <Figure {...teen} />
        <EnergyBar f={f} x={chest.x} y={chest.y} />
      </g>
      {walkerVisible(f) ? <WalkerActor f={f} id="nl-w" /> : null}
    </StoryStage>
  );
};
