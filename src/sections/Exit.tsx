import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Figure, figureJoints } from '../components/Figure';
import { Footprints } from '../components/Footprints';
import { impactFrame } from '../components/BigWord';
import { at, screen } from '../data/script';
import { type Cam, clamp, ease, mixCam, prog, shake, track } from '../lib/anim';
import { C } from '../theme';
import { cue } from './rigs';
import { StoryStage } from './StoryStage';
import { SG, TEEN_PRINTS, balloonAt, endingPan, teenHover, teenProps, teenX } from './story';

/**
 * 出口（屏 39–52）：分屏收回，回到少年。天快亮了。
 * 他第一次低头，拉绳、放掉多余的光、脚尖落地；扔出纸飞机、在地上划一道；
 * 一边走一边让绳子变短，最后把气球系在手腕上变成小灯，镜头越过他看向前方的路。
 */
export const exitCam = (f: number): Cam => {
  const b = balloonAt(f);
  const hipY = SG - 94 - teenHover(f);
  const tx = teenX(f);
  const left: Cam = { z: 0.85, fx: 630, fy: 380, sx: 480, sy: 470 };
  const full: Cam = { z: track(f, [[at(39), 0.95], [at(41), 1.02]]), fx: 640, fy: 380, sx: 820, sy: 470 };
  const descend: Cam = { z: 1.0, fx: 640, fy: hipY - 120, sx: 860, sy: 470 };
  const feet: Cam = { z: 1.35, fx: 620, fy: 700, sx: 900, sy: 600 };
  const plane: Cam = { z: 0.95, fx: 900, fy: 520, sx: 960, sy: 520 };
  const crouch: Cam = { z: 1.35, fx: 660, fy: 700, sx: 860, sy: 600 };
  // 屏 48 的“做”砸在 x 640–900，人要一直走在它右边，直到大字退场
  const sxT = track(f, [[at(46) + 8, 700], [at(47), 820], [cue(48) - 6, 1150], [screen(49).endFrame + 22, 1150], [at(51), 980]]);
  const walk: Cam = { z: 1.0, fx: tx + 960 - sxT, fy: 540, sx: 960, sy: 540 };
  const bal: Cam = { z: 1.5, fx: b.cx, fy: b.cy, sx: 420, sy: 330 };
  const wrap: Cam = { z: 1.2, fx: tx + 40, fy: 580, sx: 900, sy: 540 };
  let cam = left;
  cam = mixCam(cam, full, prog(f, at(39), at(39) + 28));
  cam = mixCam(cam, descend, prog(f, at(41) - 6, at(41) + 20));
  cam = mixCam(cam, feet, prog(f, cue(43) - 8, cue(43) + 12));
  cam = mixCam(cam, plane, prog(f, at(44), at(44) + 20));
  cam = mixCam(cam, crouch, prog(f, at(45), at(45) + 16));
  cam = mixCam(cam, walk, prog(f, at(46), at(46) + 22));
  cam = mixCam(cam, bal, prog(f, at(50) - 2, at(50) + 18));
  cam = mixCam(cam, wrap, prog(f, at(51) - 4, at(51) + 18));
  cam = mixCam(cam, endingPan(f), prog(f, at(52) - 2, at(52) + 32));
  const sh = shake(f, impactFrame(screen(48)), 12, 7);
  return { ...cam, sx: cam.sx + sh.x, sy: cam.sy + sh.y };
};

export const Exit: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const cam = exitCam(f);
  const teen = teenProps(f);
  const b = balloonAt(f);

  // 屏 42：气球放掉多余的光
  const rel = clamp((f - cue(42)) / 50);
  // 屏 43：脚尖落地，第一个脚印亮一圈
  const land = clamp((f - cue(43)) / 24);
  // 屏 44：纸飞机从远侧手里飞出去
  const thr = cue(44);
  const planeT = f - thr;
  const p0 = figureJoints(teenProps(thr)).farHand;
  const plane = { x: p0.x + planeT * 24, y: p0.y - planeT * 5 - Math.sin(planeT / 6) * 10, rot: -12 + Math.sin(planeT / 6) * 8 };
  // 屏 45：蹲下划一道
  const lineX0 = figureJoints(teenProps(at(45) + 14)).farHand.x;
  const lineDraw = prog(f, cue(45), cue(45) + 24, ease.out);
  // 屏 48：砸“做”——涟漪从大字下方的脚印荡开，全屏一层绿光
  const hit = impactFrame(screen(48));
  const bw = screen(48).bigWord!;
  const ripX = (bw.x + bw.w / 2 - cam.sx) / cam.z + cam.fx;
  const wave = clamp((f - hit) / 40);
  const prints = TEEN_PRINTS;

  return (
    <StoryStage
      id="ex"
      f={f}
      cam={cam}
      opacity={opacity}
      overlay={f >= hit ? <rect width={1920} height={1080} fill={C.act} opacity={0.16 * Math.exp(-(f - hit) / 12)} /> : null}
    >
      {lineDraw > 0 ? <line x1={lineX0} y1={SG + 3} x2={lineX0 + 96 * lineDraw} y2={SG + 3} stroke={C.act} strokeWidth={5} strokeLinecap="round" /> : null}
      <Footprints prints={prints} frame={f} scale={1.15} />
      {land > 0 && land < 1 ? (
        <ellipse cx={prints[0].x} cy={SG + 7} rx={20 + 160 * land} ry={6 + 26 * land} fill="none" stroke={C.act} strokeWidth={4 * (1 - land) + 1} opacity={0.8 * (1 - land)} />
      ) : null}
      {f >= hit && wave < 1
        ? [0, 0.18].map((d, i) => {
            const w = clamp(wave - d);
            return <ellipse key={i} cx={ripX} cy={SG} rx={40 + w * 1500} ry={10 + w * 70} fill="none" stroke={C.act} strokeWidth={10 * (1 - w) + 1.5} opacity={0.7 * (1 - w)} />;
          })
        : null}
      <ellipse cx={teen.x} cy={SG + 6} rx={48} ry={8} fill="#000" opacity={f < cue(43) ? 0.25 : 0.3} />
      {rel > 0 && rel < 1
        ? Array.from({ length: 34 }, (_, i) => {
            const a = random(`rl${i}`) * Math.PI * 2;
            const d = b.r * (1 + rel * (1.2 + random(`rd${i}`)));
            return <circle key={i} cx={b.cx + Math.cos(a) * d} cy={b.cy + Math.sin(a) * d - rel * 60} r={3} fill="#FFD7A8" opacity={0.85 * (1 - rel)} />;
          })
        : null}
      <Balloon id="ex-b" {...b} />
      <Figure {...teen} />
      {planeT >= 0 && planeT < 60 ? (
        <polygon points="-18,-9 20,0 -18,9 -10,0" fill="#E9E4D8" transform={`translate(${plane.x} ${plane.y}) rotate(${plane.rot})`} opacity={1 - clamp((planeT - 44) / 16)} />
      ) : null}
    </StoryStage>
  );
};
