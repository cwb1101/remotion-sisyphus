import React from 'react';
import {random} from 'remotion';
import {cue, getScreen, sceneRange} from '../data/script';
import {Cam, fogged, project} from '../lib/camera';
import {easeIn, easeOut, prog, track} from '../lib/anim';
import {C, W} from '../theme';
import {FigureBody, gait, headOffset, Pose, pose, poseAt, RimLit, STAND} from '../components/Figure';
import {HorseBody, HorseState} from '../components/Horse';
import {HelmetDefs, HelmetState} from '../components/Helmet';
import {Sail, Windmill} from '../components/Windmill';
import {Layer} from '../components/Layer';
import {Dust} from '../components/Light';
import {AnchorFn, LayoutF, phrases, textWidth} from '../components/Subtitle';
import {FAR_MILLS, FogBands, Grass, Lance, makeClumps, ridge, ridgeHeight, RIDE, Sky, SkyTone} from './Opening';

/* ------------------------------------------------------------------ */
/* 时间点（全部来自字幕数据）                                          */
/* ------------------------------------------------------------------ */
const a1 = getScreen('s2-1');
const a2 = getScreen('s2-2');
const a3 = getScreen('s2-3');
const a4 = getScreen('s2-4');
const a5 = getScreen('s2-5');
const a6 = getScreen('s2-6');
const a7 = getScreen('s2-7');
const a8 = getScreen('s2-8');
export const S2 = sceneRange('s2');
const HIT = cue('s2-4', 'wood_crack');
const MORPH = cue('s2-8', 'shimmer');
const PUSH = cue('s2-8', 'whoosh_rev');

/* ------------------------------------------------------------------ */
/* 世界                                                                */
/* ------------------------------------------------------------------ */
const ROAD_Z = 1200;
/** 他冲向的那架风车（离得最近、最大） */
const MILL_T = {x: 900, z: 2050};
/** 摔倒的位置 */
const LAND = {x: 1010, z: 1880};
/** 山脊上的风车阵 */
const ROW = Array.from({length: 7}).map((_, i) => ({
  x: -1100 + i * 720 + (random(`row${i}`) - 0.5) * 160,
  z: 3200 + random(`rowz${i}`) * 500,
}));
const RIDGE_AMP = 180;
const CLUMPS = makeClumps('s2g', 90, -2600, 2600, -400, 2600);

const DAWN: SkyTone = {
  top: '#0F0C09', upper: '#241D16', mid: '#54463A', horizon: '#B29B76', ground: '#4A3E30', groundDark: '#1F1913', sun: 0.42, sunX: 760,
};

/* ------------------------------------------------------------------ */
/* 人物位置与动作                                                      */
/* ------------------------------------------------------------------ */
const qx = (f: number) =>
  f < a4.start
    ? track(f, [[a1.start, -1500], [a2.start + 40, -700]], (t) => t)
    : track(f, [[a4.start, -700], [HIT, MILL_T.x - 90]], easeIn);
const qz = (f: number) => (f < a4.start ? ROAD_Z : track(f, [[a4.start, ROAD_Z], [HIT, MILL_T.z - 70]], easeIn));
const sx = (f: number) => (f < a4.start ? qx(f) - 230 : -930);

const walking = (f: number) => f < a2.start + 40;

/** 骑手姿势：行进中 → 回头 → 放平长矛冲锋 */
const riderPose = (f: number): Pose =>
  poseAt(f, [
    [a1.start, RIDE],
    [a3.start + 18, RIDE],
    [a3.start + 32, pose({turn: -1, neck: -4}, RIDE)],
    [a3.start + 58, pose({turn: -1, neck: -4}, RIDE)],
    [a3.start + 72, RIDE],
    [a4.start + 4, pose({torso: 14, shF: 44, elF: 40}, RIDE)],
  ]);
const lanceAngle = (f: number) => track(f, [[a4.start, 8], [a4.start + 16, 84]]);

/** 摔下之后：躺 → 撑起 → 跪 → 站 → 弯腰拾矛 → 站直 */
const P_LIE = pose({rootRot: -84, torso: 0, neck: -16, shF: 140, elF: 30, shB: 170, elB: 10, hipF: 24, knF: 40, hipB: 6, knB: 18, anF: 20, anB: 10});
const P_PROP = pose({rootRot: -52, torso: 8, neck: -38, shF: 30, elF: 50, shB: -42, elB: 4, hipF: 82, knF: 60, hipB: 72, knB: 36});
const P_KNEEL = pose({rootRot: 0, torso: 22, neck: 8, shF: 40, elF: 30, shB: 16, elB: 30, hipF: 88, knF: 92, hipB: -12, knB: 100, anB: -40});
const P_STAND = pose({torso: 8, neck: 4}, STAND);
const P_BEND = pose({torso: 52, neck: 20, shF: 70, elF: 6, shB: 40, elB: 10, hipF: 14, knF: 20, hipB: -6, knB: 16});
const P_HOLD = pose({torso: 2, neck: -4, shF: 36, elF: 74}, STAND);

const groundPose = (f: number): Pose =>
  poseAt(f, [
    [HIT + 26, P_LIE],
    [a6.start + 20, P_LIE],
    [a6.start + 44, P_PROP],
    [a7.start + 8, P_PROP],
    [a7.start + 30, P_KNEEL],
    [a7.start + 50, P_STAND],
    [a7.start + 62, P_STAND],
    [a7.start + 74, P_BEND],
    [a7.start + 86, P_HOLD],
    [a8.start + 30, P_HOLD],
    [a8.start + 60, pose({neck: -14}, P_HOLD)],
  ]);
const groundPelvis = (f: number) =>
  track(f, [[a6.start + 20, 14], [a6.start + 44, 20], [a7.start + 8, 20], [a7.start + 30, 54], [a7.start + 50, 92], [a7.start + 62, 92], [a7.start + 74, 84], [a7.start + 86, 92]]);

/** 头盔：一直戴着；摔倒后金边一闪一闪地回来；第八屏化成铜盆 */
const helmetAt = (f: number): HelmetState => {
  let glow = 0.85;
  if (f >= HIT && f < a7.start) {
    const flick = 0.5 + 0.5 * Math.sin((f - a6.start) * 0.55) * Math.sin((f - a6.start) * 0.17);
    glow = track(f, [[HIT, 0.85], [HIT + 10, 0.1], [a6.start + 30, 0.2], [a6.end, 0.8]]) * (0.6 + 0.4 * flick);
  }
  const morph = prog(f, MORPH, MORPH + 40);
  return {
    morph,
    glow: Math.max(glow, morph * 0.95),
    visor: 1,
    scatter: 0,
    reflection: prog(f, MORPH + 20, MORPH + 50),
    reflectRot: f * 0.6,
  };
};

/* ------------------------------------------------------------------ */
/* 相机                                                                */
/* ------------------------------------------------------------------ */
/** 第八屏：他头上铜盆的世界坐标（推镜头穿进铜盆用） */
const basinWorld = (f: number) => {
  const p = groundPose(f);
  const h = headOffset(p);
  return {x: LAND.x - h.x - 0.5, y: 92 - h.y + 7.6, z: LAND.z};
};

export const section2Cam = (f: number): Cam => {
  const b = basinWorld(Math.min(f, S2.end));
  const keys = {
    x: [
      [a1.start, -1350], [a2.start, -980], [a2.end - 6, 260],
      [a3.start + 20, -760], [a3.end - 4, -770],
      [a4.start + 30, 120], [HIT, 760], [a4.end - 2, 840],
      [a5.start, 960], [a5.start + 36, 940], [a5.end - 6, 1100],
      [a6.start + 14, 880], [a6.end - 8, 890],
      [a7.start + 14, 720], [a7.end - 6, 760],
      [a8.start + 18, b.x - 18], [PUSH, b.x - 16], [a8.end, b.x],
    ] as Array<[number, number]>,
    y: [
      [a1.start, 170], [a2.end - 6, 190],
      [a3.start + 20, 150], [a3.end - 4, 150],
      [a4.start + 30, 150], [a4.end - 2, 130],
      [a5.start, 120], [a5.start + 36, 120], [a5.end - 6, 300],
      [a6.start + 14, 46], [a6.end - 8, 44],
      [a7.start + 14, 170], [a7.end - 6, 160],
      [a8.start + 18, b.y + 2], [PUSH, b.y + 2], [a8.end, b.y],
    ] as Array<[number, number]>,
    z: [
      [a1.start, -820], [a2.start, -700], [a2.end - 6, -520],
      [a3.start + 20, 560], [a3.end - 4, 590],
      [a4.start + 30, 760], [HIT, 1150], [a4.end - 2, 1180],
      [a5.start, 1560], [a5.start + 36, 1520], [a5.end - 6, 260],
      [a6.start + 14, 1610], [a6.end - 8, 1640],
      [a7.start + 14, 760], [a7.end - 6, 820],
      [a8.start + 18, LAND.z - 64], [PUSH, LAND.z - 58], [a8.end, LAND.z - 6],
    ] as Array<[number, number]>,
  };
  const push = prog(f, PUSH, a8.end, easeIn);
  // 冲锋时镜头跟着人走（带一点滞后），撞上之后再停下
  const follow = f >= a4.start && f < HIT ? prog(f, a4.start, a4.start + 10) : 0;
  return {
    f: 1000,
    x: track(f, keys.x) * (1 - follow) + (qx(f) + 330) * follow,
    y: track(f, keys.y),
    z: f < PUSH ? track(f, keys.z) : LAND.z - 58 + (52 * push),
    cx: 960,
    cy: track(f, [[a1.start, 640], [a3.start + 20, 600], [a5.end - 6, 660], [a6.start + 14, 560], [a7.start + 14, 620], [a8.start + 18, 540]]),
  };
};

/* ------------------------------------------------------------------ */
/* 场景本体                                                            */
/* ------------------------------------------------------------------ */
export const Section2: React.FC<{frame: number}> = ({frame: f}) => {
  const cam = section2Cam(f);
  const fogD = 4600;
  const rim = {color: C.accent, opacity: 0.9, dx: -1.6, dy: -1.6};
  const whiteIn = 1 - prog(f, a1.start, a1.start + 26);
  const mt = project(cam, MILL_T.x, 0, MILL_T.z);
  const millRot = f * 0.9 + 30;
  const helmet = helmetAt(f);
  const onHorse = f < HIT;
  // 冲锋撞上风帆：人和马被挑起再摔下
  const fly = prog(f, HIT, HIT + 26, (t) => t);
  const flyArc = Math.sin(fly * Math.PI) * 170;
  const horseFallen = f >= HIT;
  const horseRot = horseFallen ? track(f, [[HIT, 0], [HIT + 26, 80], [a5.start + 46, 80], [a5.end - 10, 0]]) : 0;
  const horseX = horseFallen ? track(f, [[HIT, MILL_T.x - 90], [HIT + 26, LAND.x - 200]]) : qx(f);
  const horseZ = horseFallen ? track(f, [[HIT, MILL_T.z - 70], [HIT + 26, LAND.z + 140]]) : qz(f);
  const hp = project(cam, horseX, horseFallen ? Math.sin(fly * Math.PI) * 60 : 0, horseZ);
  const horse: HorseState = {
    gait: f >= a4.start && f < HIT ? 'gallop' : walking(f) ? 'walk' : 'stand',
    phase: f >= a4.start ? (f - a4.start) * 0.09 : f * 0.022,
    rear: 0,
    head: horseFallen ? 20 : f < a4.start ? Math.sin(f * 0.06) * 3 : -8,
    tail: Math.sin(f * 0.05) * 6,
  };
  const rp = riderPose(f);
  const handAngle = rp.torso - rp.shF - rp.elF;
  // 桑丘和驴
  const dp = project(cam, sx(f), 0, ROAD_Z + 30);
  const sReach = f >= a3.start && f < a4.start ? track(f, [[a3.start + 4, 0], [a3.start + 22, 1], [a3.end - 10, 1], [a3.end, 0.4]]) : 0;
  const sanchoPose = pose({shF: 28 + sReach * 60, elF: 70 - sReach * 60, hipF: 74, knF: 70, hipB: 66, knB: 66, torso: 6 + sReach * 8, neck: 4}, RIDE);
  const donkey: HorseState = {gait: walking(f) ? 'walk' : 'stand', phase: f * 0.026 + 0.3, rear: 0, head: Math.sin(f * 0.05) * 4 - 6, tail: Math.sin(f * 0.07) * 5};
  // 落地之后的他
  const gp = groundPose(f);
  const flyX = track(f, [[HIT, MILL_T.x - 90], [HIT + 26, LAND.x]]);
  const flyZ = track(f, [[HIT, MILL_T.z - 70], [HIT + 26, LAND.z]]);
  const manY = f < HIT + 26 ? 128 + flyArc : groundPelvis(f);
  const mp = project(cam, f < HIT + 26 ? flyX : LAND.x, manY, f < HIT + 26 ? flyZ : LAND.z);
  const spin = f < HIT + 26 ? track(f, [[HIT, 0], [HIT + 26, -84]]) : 0;
  const flyingPose = pose({rootRot: spin, shF: 150, elF: 20, shB: 170, elB: 10, hipF: 40, knF: 50, hipB: 10, knB: 30});
  const face = f >= HIT + 26 ? -1 : 1;
  // 第七屏：桑丘走过来扶他
  const s7x = track(f, [[a7.start, LAND.x - 260], [a7.start + 34, LAND.x - 70]]);
  const s7walk = f >= a7.start && f < a7.start + 34;
  const sanchoFoot = pose(
    {...(s7walk ? gait((f - a7.start) / 20) : {}), shF: s7walk ? 20 : 60, elF: s7walk ? 14 : 30, torso: s7walk ? 6 : 14},
    STAND,
  );
  const s7p = project(cam, s7x, 90, LAND.z - 40);
  return (
    <div style={{position: 'absolute', inset: 0, background: C.base, overflow: 'hidden'}}>
      <Sky cam={cam} frame={f} dim={0} tone={DAWN} />
      <Layer blur={1.4}>
        <defs>
          <HelmetDefs />
        </defs>
        {ridge(cam, 12000, 820, 0.00018, 2.4, '#3A2F23', fogD)}
        {ridge(cam, 8200, 480, 0.0003, 0.9, '#30271D', fogD)}
        {FAR_MILLS.map(([x, z], i) => {
          const p = project(cam, x * 1.4, ridgeHeight(x, 480, 0.0003, 0.9) * 0.9, z + 2400);
          return <Windmill key={i} x={p.x} y={p.y} scale={p.s} rot={f * 0.3 + i * 40} fill={fogged('#16110C', '#8A7458', p.d, fogD)} detail={false} />;
        })}
        {ridge(cam, 3300, RIDGE_AMP, 0.0006, 1.7, '#241C15', fogD)}
        {ROW.map((m, i) => {
          const p = project(cam, m.x, ridgeHeight(m.x, RIDGE_AMP, 0.0006, 1.7) * 0.8 - 20, m.z);
          // 第二屏：风车从雾里一架架浮出来
          const emerge = prog(f, a2.start + i * 5, a2.start + 30 + i * 5);
          return (
            <Windmill
              key={i}
              x={p.x}
              y={p.y}
              scale={p.s}
              rot={f * (0.5 + i * 0.05) + i * 33}
              fill={fogged('#120E0A', '#8A7458', p.d * (2.2 - 1.2 * emerge), fogD)}
              detail={p.s > 0.25}
              rim={C.accent}
              rimOpacity={0.3 * emerge}
            />
          );
        })}
      </Layer>
      <Layer>
        <defs>
          <HelmetDefs />
        </defs>
        <Grass cam={cam} clumps={CLUMPS} frame={f} filter={(d) => d > 700} fogD={fogD} />
        {/* 冲向的那架风车 */}
        <Windmill x={mt.x} y={mt.y} scale={mt.s} rot={millRot} fill={fogged(C.ink, '#7A6448', mt.d, 7000)} rim={C.accent} rimOpacity={0.6} cloth={0.65} />
        {/* 桑丘骑驴（前五屏） */}
        {f < a5.start ? (
          <g transform={`translate(${dp.x} ${dp.y - 104 * dp.s}) scale(${dp.s * 0.82})`}>
            <RimLit
              rim={{...rim, dx: rim.dx / dp.s, dy: rim.dy / dp.s}}
              fill={C.ink}
              farFill="#1A140F"
              draw={(pass, fill, far) => (
                <HorseBody
                  state={donkey}
                  fill={fill}
                  farFill={far}
                  donkey
                  rider={
                    <g transform="translate(-6 -6) scale(1.1)">
                      <FigureBody pose={sanchoPose} build="sancho" fill={fill} farFill={far} pass={pass} />
                    </g>
                  }
                />
              )}
            />
          </g>
        ) : null}
        {/* 马（骑手在马上时一起画） */}
        <g transform={`translate(${hp.x} ${hp.y - 128 * hp.s}) scale(${hp.s}) rotate(${horseRot} 0 128)`}>
          <RimLit
            rim={{...rim, dx: rim.dx / hp.s, dy: rim.dy / hp.s}}
            fill={C.ink}
            farFill="#1A140F"
            draw={(pass, fill, far) => (
              <HorseBody
                state={horse}
                fill={fill}
                farFill={far}
                rider={
                  onHorse ? (
                    <g transform="translate(-6 -10)">
                      <FigureBody
                        pose={rp}
                        fill={fill}
                        farFill={far}
                        pass={pass}
                        helmet={helmet}
                        propF={(ps, fl) => <Lance angle={lanceAngle(f)} handAngle={handAngle} tip={f >= a4.start ? 1 : 0.4} pass={ps} fill={fl} />}
                      />
                    </g>
                  ) : null
                }
              />
            )}
          />
        </g>
        {/* 摔下来的他 */}
        {!onHorse ? (
          <g transform={`translate(${mp.x} ${mp.y}) scale(${face * mp.s} ${mp.s})`}>
            <RimLit
              rim={{...rim, dx: rim.dx / (face * mp.s), dy: rim.dy / mp.s}}
              fill={C.ink}
              farFill="#1A140F"
              draw={(pass, fill, far) => (
                <FigureBody
                  pose={f < HIT + 26 ? flyingPose : gp}
                  fill={fill}
                  farFill={far}
                  pass={pass}
                  helmet={helmet}
                  propF={f >= a7.start + 80 ? (ps, fl) => <HalfLance handAngle={gp.torso - gp.shF - gp.elF} fill={fl} pass={ps} /> : undefined}
                />
              )}
            />
          </g>
        ) : null}
        {/* 第七屏：桑丘走来 */}
        {f >= a7.start && f < a8.start ? (
          <g transform={`translate(${s7p.x} ${s7p.y}) scale(${-s7p.s} ${s7p.s})`}>
            <RimLit
              rim={{...rim, dx: -rim.dx / s7p.s, dy: rim.dy / s7p.s}}
              fill={C.ink}
              draw={(pass, fill, far) => <FigureBody pose={sanchoFoot} build="sancho" fill={fill} farFill={far} pass={pass} />}
            />
          </g>
        ) : null}
        {/* 落在地上的断矛 */}
        {f >= a5.start && f < a7.start + 80 ? <BrokenLance cam={cam} /> : null}
        <ImpactBurst cam={cam} f={f} />
        <Dust seed="s2d" frame={f} count={30} x={0} y={200} w={W} h={700} size={2} opacity={0.4} />
      </Layer>
      {/* 第六屏：风车叶片的影子一下下扫过他 */}
      <SailShadows f={f} cam={cam} />
      <FogBands cam={cam} frame={f} strength={0.85} />
      {/* F 版式：字在扫过的风帆之下 */}
      <div style={{position: 'absolute', inset: 0}}>
        <LayoutF s={a4} frame={f} />
      </div>
      <Layer blur={5}>
        <Grass cam={cam} clumps={CLUMPS} frame={f} filter={(d) => d <= 700} fogD={fogD} />
        <SweepSail f={f} />
        <FallingPieces f={f} />
      </Layer>
      <div style={{position: 'absolute', inset: 0, background: '#F4EAD5', opacity: whiteIn}} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 零件                                                                */
/* ------------------------------------------------------------------ */
const HalfLance: React.FC<{handAngle: number; fill: string; pass: 'rim' | 'body'}> = ({handAngle, fill}) => (
  <g transform={`rotate(${4 - handAngle})`}>
    <path d="M -2.4 60 L 2.4 60 L 2.2 -150 L 4 -156 L 0 -162 L -3 -154 L -2.2 -150 Z" fill={fill} />
    <path d="M -10 -6 L 10 -6 L 2.6 -44 L -2.6 -44 Z" fill={fill} />
  </g>
);

/** 第四屏：一片巨大的风帆从镜头前扫过，先盖住字再让开 */
const SweepSail: React.FC<{f: number}> = ({f}) => {
  const t0 = a4.start + 18;
  const t1 = a4.start + 44;
  if (f < t0 - 4 || f > t1 + 4) return null;
  const rot = track(f, [[t0 - 4, -40], [t1 + 4, 70]]);
  return (
    <g transform={`translate(-260 -820) rotate(${rot}) scale(3.2)`}>
      <g transform="rotate(180)">
        <Sail fill="#060403" cloth={0.9} detail rim={C.accent} rimOpacity={0.4} />
      </g>
    </g>
  );
};

/** 撞击点的尘土爆开 */
const ImpactBurst: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const t = f - HIT;
  if (t < 0 || t > 40) return null;
  const p = project(cam, MILL_T.x - 60, 110, MILL_T.z - 60);
  const e = easeOut(t / 40);
  return (
    <g style={{mixBlendMode: 'screen'}}>
      {Array.from({length: 60}).map((_, i) => {
        const ang = random(`ib${i}`) * Math.PI * 2;
        const sp = (60 + random(`ibs${i}`) * 220) * p.s;
        return (
          <circle
            key={i}
            cx={p.x + Math.cos(ang) * sp * e}
            cy={p.y + Math.sin(ang) * sp * e * 0.6 + e * e * 50 * p.s}
            r={(2 + random(`ibr${i}`) * 4) * Math.max(0.6, p.s)}
            fill="#D9B377"
            opacity={(1 - e) * 0.75}
          />
        );
      })}
    </g>
  );
};

/** 第五屏开头：断成几截的长矛贴着镜头慢慢落下（特写） */
const FallingPieces: React.FC<{f: number}> = ({f}) => {
  const t = f - a5.start;
  if (t < -2 || t > 46) return null;
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const y = -300 + (t + i * 6) * (26 + i * 6);
        const x = 520 + i * 420 + Math.sin(t * 0.05 + i) * 40;
        const rot = -30 + i * 50 + t * (1.2 - i * 0.5);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <path d="M -14 -260 L 14 -260 L 12 200 L 22 214 L 4 220 L -6 236 L -10 214 L -16 210 Z" fill="#0B0806" />
            <path d="M 12 -250 L 12 190" stroke={C.accent} strokeWidth={4} opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
};

const BrokenLance: React.FC<{cam: Cam}> = ({cam}) => {
  const a = project(cam, LAND.x - 120, 2, LAND.z - 40);
  const b = project(cam, LAND.x + 60, 2, LAND.z - 10);
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={4 * a.s} strokeLinecap="round" />
      <path d={`M ${b.x} ${b.y} l ${10 * b.s} ${-3 * b.s} l ${-4 * b.s} ${5 * b.s} z`} fill={C.ink} />
    </g>
  );
};

/** 第六屏：叶片挡住阳光，影子一道道扫过画面 */
const SailShadows: React.FC<{f: number; cam: Cam}> = ({f, cam}) => {
  const on = track(f, [[a6.start, 0], [a6.start + 12, 1], [a6.end - 10, 1], [a6.end + 6, 0]]);
  if (on <= 0.01) return null;
  const hub = project(cam, MILL_T.x, 930, MILL_T.z);
  const rot = f * 0.9 + 30;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.55 * on}}>
      {[0, 90, 180, 270].map((k) => {
        const a = ((rot + k + 90) * Math.PI) / 180;
        const a2 = a + 0.09;
        const R = 4000;
        return (
          <polygon
            key={k}
            points={`${hub.x},${hub.y} ${hub.x + Math.cos(a) * R},${hub.y + Math.sin(a) * R} ${hub.x + Math.cos(a2) * R},${hub.y + Math.sin(a2) * R}`}
            fill="#3A2C1E"
          />
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* 字幕锚点：第三屏的字跟着桑丘，放在他身后（左上），不压脸           */
/* ------------------------------------------------------------------ */
const anchorCall: AnchorFn = (f) => {
  const cam = section2Cam(f);
  const p = project(cam, sx(f), 178, ROAD_Z + 30);
  const lines = phrases(a3.text);
  const w = Math.max(...lines.map((l, i) => textWidth(l, 68) + i * 34));
  return {x: p.x - 70 * p.s - w, y: p.y - 150};
};

export const section2Anchors: Record<string, AnchorFn> = {'s2-3': anchorCall};
