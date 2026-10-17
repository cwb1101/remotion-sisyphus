import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Figure } from '../components/Figure';
import { Footprints } from '../components/Footprints';
import { at } from '../data/script';
import { type Cam, clamp, ease, mixCam, prog, track } from '../lib/anim';
import { C } from '../theme';
import { notLazyCam } from './NotLazy';
import { cue } from './rigs';
import { StoryStage } from './StoryStage';
import { WalkerActor } from './StoryActors';
import { BLOCK_X, BOOKS_X, DOOR_X, SG, TRIP_X, WALKER_PRINTS, balloonAt, teenProps, walkerX } from './story';

/**
 * 先走路的人（屏 31–38）：镜头从悬着的少年身上移开，降到地面高度跟着他走，天色开始泛青。
 * 他走到哪、地面亮到哪；跨书、推门、绊倒、跳起来；脚印连成一条路；最后分屏和少年对照。
 */
const SPLIT_IN = at(38);
const SPLIT_OUT = at(39);
export const splitX = (f: number) => track(f, [[SPLIT_IN, 1920], [SPLIT_IN + 18, 960], [SPLIT_OUT, 960], [SPLIT_OUT + 20, 1920]]);

export const walkersCam = (f: number): Cam => {
  const wx = walkerX(f);
  const follow: Cam = { z: 1.25, fx: wx + 150, fy: 640, sx: 960, sy: 520 };
  const back: Cam = { z: 0.8, fx: wx - 300, fy: 560, sx: 960, sy: 520 };
  const near: Cam = { z: 0.95, fx: wx - 120, fy: 560, sx: 960, sy: 540 };
  const panel: Cam = { z: 1.0, fx: wx, fy: 520, sx: 1440, sy: 520 };
  let cam = mixCam(notLazyCam(Math.min(f, at(31))), follow, prog(f, at(31), at(31) + 54));
  cam = mixCam(cam, back, prog(f, at(35), at(35) + 40));
  cam = mixCam(cam, near, prog(f, at(36), at(36) + 34));
  cam = mixCam(cam, panel, prog(f, SPLIT_IN - 6, SPLIT_IN + 16));
  return cam;
};

export const Walkers: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const cam = walkersCam(f);
  const wx = walkerX(f);
  const lineStart = WALKER_PRINTS.find((p) => p.born >= at(32))?.x ?? wx;
  const lit = prog(f, at(32), at(32) + 14);
  const door = prog(f, cue(33), cue(33) + 10, ease.out);
  const joyT = cue(34) + 36;
  const joy = clamp((f - joyT) / 30);
  const prints = WALKER_PRINTS.filter((p) => p.born <= f);
  const pathDraw = prog(f, at(35) + 4, at(35) + 44);
  const split = f >= SPLIT_IN - 1 ? splitX(f) : undefined;
  const beam = prog(f, SPLIT_IN + 10, SPLIT_IN + 30);
  const teen = teenProps(f);
  const b = balloonAt(f);

  return (
    <StoryStage
      id="wk"
      f={f}
      cam={cam}
      opacity={opacity}
      clipX={split}
      overlay={
        split !== undefined && split < 1919 ? (
          <g>
            <line x1={split} y1={0} x2={split} y2={1080} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={14} />
            <line x1={split} y1={0} x2={split} y2={1080} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={2} />
          </g>
        ) : null
      }
    >
      {/* 屏 32：他走到哪，前方地面亮到哪 */}
      {lit > 0 ? (
        <g opacity={lit}>
          <line x1={lineStart} y1={SG} x2={wx + 230} y2={SG} stroke={C.act} strokeWidth={4} opacity={0.75} />
          <circle cx={wx + 230} cy={SG} r={9 + 3 * Math.sin(f / 4)} fill={C.act} opacity={0.5} />
        </g>
      ) : null}
      {/* 屏 33：一摞书、一扇门、一块方块；屏 34 绊倒他的小方块 */}
      <g>
        <rect x={BLOCK_X - 50} y={SG - 96} width={100} height={96} fill="#202741" stroke="#3A4366" strokeWidth={2} />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={BOOKS_X - 38 + i * 4} y={SG - 16 * (i + 1)} width={76 - i * 8} height={14} rx={2} fill="#2E3757" stroke="#56628C" strokeWidth={2} />
        ))}
        <g>
          <line x1={DOOR_X - 36} y1={SG} x2={DOOR_X - 36} y2={SG - 200} stroke="#56628C" strokeWidth={5} />
          <line x1={DOOR_X + 36} y1={SG} x2={DOOR_X + 36} y2={SG - 200} stroke="#56628C" strokeWidth={5} />
          <line x1={DOOR_X - 40} y1={SG - 200} x2={DOOR_X + 40} y2={SG - 200} stroke="#56628C" strokeWidth={5} />
          <rect x={DOOR_X - 33} y={SG - 196} width={66 * (1 - 0.82 * door)} height={194} fill="#2E3757" stroke="#56628C" strokeWidth={2} />
          <rect x={DOOR_X - 33 + 66 * (1 - 0.82 * door)} y={SG - 196} width={66 * 0.82 * door} height={194} fill="#FFD7A8" opacity={0.08 * door} />
        </g>
        <rect x={TRIP_X - 16} y={SG - 26} width={32} height={26} rx={2} fill="#2E3757" stroke="#56628C" strokeWidth={2} />
      </g>
      {/* 屏 35：脚印连成一条发光的路 */}
      {pathDraw > 0 && prints.length > 1 ? (
        <g>
          <polyline points={prints.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.act} strokeWidth={14} strokeOpacity={0.12} pathLength={1} strokeDasharray={`${pathDraw} 1`} />
          <polyline points={prints.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.act} strokeWidth={3.5} strokeOpacity={0.75} pathLength={1} strokeDasharray={`${pathDraw} 1`} />
        </g>
      ) : null}
      <Footprints prints={WALKER_PRINTS} frame={f} scale={1.1} />
      {/* 屏 37：他举起灯，脚印从近到远依次闪一下 */}
      {f > at(37)
        ? [...prints]
            .reverse()
            .map((p, k) => {
              const t = f - (at(37) + 14 + k * 1.6);
              if (t < 0 || t > 16) return null;
              return <ellipse key={k} cx={p.x} cy={p.y} rx={26} ry={9} fill={C.act} opacity={0.6 * Math.sin((Math.PI * t) / 16)} />;
            })
        : null}
      {/* 屏 34：跳起来那一下，色② 微粒向四周炸开 */}
      {joy > 0 && joy < 1
        ? Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2 + random(`jy${i}`) * 0.3;
            const d = 40 + joy * (140 + random(`jd${i}`) * 80);
            return <circle key={i} cx={wx + Math.cos(a) * d} cy={SG - 150 + Math.sin(a) * d * 0.8} r={3.5} fill={C.act} opacity={0.9 * (1 - joy)} />;
          })
        : null}
      {/* 少年还悬在原处（镜头离开他往右走） */}
      <ellipse cx={teen.x} cy={SG + 6} rx={50} ry={8} fill="#000" opacity={0.25} />
      <Balloon id="wk-b" {...b} />
      <Figure {...teen} />
      <WalkerActor f={f} id="wk-w" beam={beam} />
    </StoryStage>
  );
};

