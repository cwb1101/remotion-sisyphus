import React from 'react';
import {random} from 'remotion';
import {getScreen, sceneRange} from '../data/script';
import {Cam, fogged, project} from '../lib/camera';
import {easeIn, easeOut, prog, track} from '../lib/anim';
import {C, H, W} from '../theme';
import {FigureBody, Pose, pose, poseAt, RimLit, STAND} from '../components/Figure';
import {HorseBody, HorseState} from '../components/Horse';
import {Helmet, HelmetDefs, HelmetState} from '../components/Helmet';
import {Sail, Windmill} from '../components/Windmill';
import {Layer} from '../components/Layer';
import {Beam, Dust} from '../components/Light';

/* ------------------------------------------------------------------ */
/* 时间点全部来自字幕数据                                              */
/* ------------------------------------------------------------------ */
const o1 = getScreen('o1');
const o2 = getScreen('o2');
const o3 = getScreen('o3');
const o4 = getScreen('o4');
const o5 = getScreen('o5');
export const OPENING = sceneRange('opening');

/** 巨帆遮住镜头的这段时间里切换机位 */
const COVER_IN = o3.start + 4;
const COVER_FULL = o3.start + 16;
const COVER_SWITCH = o3.start + 40;
// 字幕出场（最后 6 帧）结束后巨帆才移开，字不会压在后面露出的画面上
const COVER_OUT0 = o3.end - 2;
const COVER_OUT1 = o4.start + 16;

/* 世界里的位置 */
const RIDER = {x: -150, z: 1500};
const GIANT = {x: 1250, z: 3100};
export const GIANT_B = {x: 1560, z: 3150};
const NEAR_MILL = {x: 820, z: 240};
export const FALL = {x: 900, z: 2760};
export const HELM_Z = 2320;
export const HELM_W = 48; // 世界宽度
export const CAM_B = {x: 1000, y: 26, z: 2200};

const sB = 1000 / (HELM_Z - CAM_B.z);
export const HELM_X_END = CAM_B.x + (1170 - 960) / sB;
const HELM_X_START = CAM_B.x + (-380 - 960) / sB;

/* ------------------------------------------------------------------ */
/* 相机                                                                */
/* ------------------------------------------------------------------ */
export const openingCam = (frame: number): Cam => {
  if (frame < COVER_SWITCH) {
    return {
      f: 1000,
      x: track(frame, [[0, -60], [o2.start, -30], [o2.end - 6, 60], [o3.start + 26, 300]]),
      y: track(frame, [[0, 170], [o2.end - 6, 150]]),
      z: track(frame, [[0, -520], [o2.start, -220], [o2.end - 6, 800], [o3.start + 26, 960]]),
      cx: 960,
      cy: track(frame, [[0, 668], [o2.end, 640]]),
      panX: track(frame, [[o3.start, 0], [o3.start + 16, -380]], easeIn),
    };
  }
  const push = prog(frame, o5.end - 26, o5.end, easeIn);
  return {
    f: 1000,
    x: track(frame, [[COVER_SWITCH, CAM_B.x - 30], [o5.end - 26, CAM_B.x], [o5.end, HELM_X_END]]),
    y: track(frame, [[COVER_SWITCH, CAM_B.y + 6], [o5.end - 26, CAM_B.y], [o5.end, 10]]),
    z: track(frame, [[COVER_SWITCH, CAM_B.z - 30], [o5.end - 26, CAM_B.z + 14]]) * (1 - push) + (HELM_Z - 12) * push,
    cx: 960,
    cy: 520,
  };
};

/* ------------------------------------------------------------------ */
/* 天空、远山、雾                                                      */
/* ------------------------------------------------------------------ */
/** 天空色调；默认是开头的逆光黄昏，其它场景可以换成黎明、阴天 */
export interface SkyTone {
  top: string;
  upper: string;
  mid: string;
  horizon: string;
  ground: string;
  groundDark: string;
  /** 太阳光晕强度 */
  sun: number;
  sunX: number;
}
export const SKY_DUSK: SkyTone = {
  top: '#0C0A08', upper: '#1B1510', mid: '#3E3123', horizon: '#8E6C3E', ground: '#3A2E21', groundDark: '#1A140F', sun: 1, sunX: 1260,
};

export const Sky: React.FC<{cam: Cam; frame: number; dim: number; tone?: SkyTone}> = ({cam, frame, dim, tone = SKY_DUSK}) => {
  const cy = cam.cy + (cam.panY ?? 0);
  const sunX = tone.sunX + (cam.panX ?? 0) * 0.25;
  const sunY = cy - 70;
  const pulse = 0.94 + 0.06 * Math.sin(frame * 0.05);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - dim * 0.85}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${tone.top} 0px, ${tone.upper} ${cy - 420}px, ${tone.mid} ${cy - 170}px, ${tone.horizon} ${cy - 6}px, ${tone.ground} ${cy + 4}px, ${tone.groundDark} ${cy + 170}px, #0B0907 ${H}px)`,
        }}
      />
      {tone.sun > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: sunX - 640,
            top: sunY - 420,
            width: 1280,
            height: 840,
            opacity: tone.sun,
            background: `radial-gradient(closest-side, rgba(244,205,128,${0.75 * pulse}) 0%, rgba(217,164,65,0.42) 18%, rgba(160,110,50,0.16) 45%, rgba(0,0,0,0) 100%)`,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
    </div>
  );
};

export const ridge = (cam: Cam, z: number, amp: number, freq: number, seed: number, color: string, fogD: number) => {
  const pts: string[] = [];
  for (let x = -40000; x <= 40000; x += 500) {
    const y =
      amp * (0.55 + 0.45 * Math.sin(x * freq + seed)) +
      amp * 0.35 * Math.sin(x * freq * 2.7 + seed * 3.1) +
      amp * 0.12 * Math.sin(x * freq * 7.3 + seed);
    const p = project(cam, x, y, z);
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  const d = z - cam.z;
  return (
    <polygon
      key={`r${z}`}
      points={`${pts.join(' ')} ${W + 4000},${H + 200} -4000,${H + 200}`}
      fill={fogged(color, '#7A6040', d, fogD)}
    />
  );
};

export const ridgeHeight = (x: number, amp: number, freq: number, seed: number) =>
  amp * (0.55 + 0.45 * Math.sin(x * freq + seed)) + amp * 0.35 * Math.sin(x * freq * 2.7 + seed * 3.1);

export const FAR_MILLS = [
  [-2700, 6200], [-1800, 5700], [-1000, 6500], [300, 5900], [2200, 6200], [3100, 5600], [4100, 6400], [5200, 6000],
] as const;

export const FogBands: React.FC<{cam: Cam; frame: number; strength: number}> = ({cam, frame, strength}) => {
  const cy = cam.cy + (cam.panY ?? 0);
  return (
    <>
      {[0, 1, 2].map((i) => {
        const y = cy - 60 + i * 70;
        const dx = ((frame * (0.6 + i * 0.35) + i * 400) % 800) - 400;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -600 + dx + (cam.panX ?? 0) * (0.2 + i * 0.1),
              top: y - 90,
              width: W + 1200,
              height: 180 + i * 40,
              background: `linear-gradient(180deg, rgba(122,100,70,0) 0%, rgba(122,100,70,${0.32 * strength}) 50%, rgba(122,100,70,0) 100%)`,
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 草丛和石块                                                          */
/* ------------------------------------------------------------------ */
export interface Clump {
  x: number;
  z: number;
  n: number;
  h: number;
  seed: string;
}

export const makeClumps = (seed: string, count: number, x0: number, x1: number, z0: number, z1: number): Clump[] =>
  Array.from({length: count}).map((_, i) => ({
    x: x0 + random(`${seed}x${i}`) * (x1 - x0),
    z: z0 + random(`${seed}z${i}`) * (z1 - z0),
    n: 5 + Math.floor(random(`${seed}n${i}`) * 6),
    h: 30 + random(`${seed}h${i}`) * 55,
    seed: `${seed}${i}`,
  }));

const CLUMPS_A = makeClumps('ga', 70, -2200, 2600, -260, 2800);
export const CLUMPS_B = makeClumps('gb', 46, 700, 1500, 2235, 3200);

export const Grass: React.FC<{cam: Cam; clumps: Clump[]; frame: number; filter: (d: number) => boolean; fogD: number}> = ({
  cam, clumps, frame, filter, fogD,
}) => (
  <>
    {clumps.map((c) => {
      const p = project(cam, c.x, 0, c.z);
      if (!filter(p.d) || p.x < -600 || p.x > W + 600) return null;
      const fill = fogged(C.ink, '#6E5638', p.d, fogD);
      return (
        <g key={c.seed} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          {Array.from({length: c.n}).map((_, i) => {
            const off = (random(`${c.seed}o${i}`) - 0.5) * 40;
            const hh = c.h * (0.5 + random(`${c.seed}hh${i}`) * 0.6);
            const lean = (random(`${c.seed}l${i}`) - 0.5) * 30 + Math.sin(frame * 0.06 + i + c.x * 0.01) * 6;
            return (
              <path
                key={i}
                d={`M ${off - 2} 0 Q ${off + lean * 0.4} ${-hh * 0.6} ${off + lean} ${-hh} Q ${off + lean * 0.3 + 1} ${-hh * 0.55} ${off + 2.5} 0 Z`}
                fill={fill}
              />
            );
          })}
        </g>
      );
    })}
  </>
);

export const STONES = Array.from({length: 7}).map((_, i) => ({
  x: 700 + random(`st${i}`) * 1000,
  z: 2520 + random(`sz${i}`) * 600,
  r: 5 + random(`sr${i}`) * 12,
}));

/* ------------------------------------------------------------------ */
/* 骑手                                                                */
/* ------------------------------------------------------------------ */
export const RIDE: Pose = pose({
  torso: 3, neck: 4, hipF: 78, knF: 84, anF: -6, hipB: 70, knB: 80, anB: -4,
  shF: 28, elF: 70, shB: 24, elB: 58,
});

export const Lance: React.FC<{angle: number; handAngle: number; tip: number; pass: 'rim' | 'body'; fill: string}> = ({
  angle, handAngle, tip, pass, fill,
}) => (
  <g transform={`rotate(${angle - handAngle})`}>
    <path d="M -2.4 70 L 2.4 70 L 1.7 -330 L 0 -352 L -1.7 -330 Z" fill={fill} />
    <path d="M -10 -6 L 10 -6 L 2.6 -44 L -2.6 -44 Z" fill={fill} />
    {pass === 'body' && tip > 0.01 ? (
      <path d="M 0 -300 L 0 -352" stroke={C.accent} strokeWidth={3.2} opacity={tip} strokeLinecap="round" />
    ) : null}
  </g>
);

/* ------------------------------------------------------------------ */
/* 场景本体                                                            */
/* ------------------------------------------------------------------ */
export const Opening: React.FC<{frame: number}> = ({frame}) => {
  const cam = openingCam(frame);
  const phaseB = frame >= COVER_SWITCH;
  const dim = track(frame, [[COVER_IN, 0], [COVER_FULL, 0.92], [COVER_OUT0, 0.92], [COVER_OUT1, 0]]);
  return (
    <div style={{position: 'absolute', inset: 0, background: C.base, overflow: 'hidden'}}>
      <Sky cam={cam} frame={frame} dim={phaseB ? 0.25 : 0} />
      {phaseB ? <PhaseB frame={frame} cam={cam} /> : <PhaseA frame={frame} cam={cam} />}
      {/* 太阳被巨帆挡住：整场暗下来 */}
      <div style={{position: 'absolute', inset: 0, background: '#050403', opacity: dim}} />
      <GiantSailCover frame={frame} />
    </div>
  );
};

/* 开头前段：平原远景、骑手放平长矛、冲锋 */
const PhaseA: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
  const fogD = 5200;
  const ridges = [
    ridge(cam, 11000, 900, 0.00021, 1.3, '#3A2D20', fogD),
    ridge(cam, 7600, 520, 0.00033, 4.1, '#2C2219', fogD),
    ridge(cam, 5200, 260, 0.00052, 2.2, '#211A13', fogD),
  ];
  // 马与骑手
  const charge = prog(frame, o3.start - 4, o3.start + 40, easeIn);
  const rx = RIDER.x + charge * 1300;
  const rz = RIDER.z + charge * 900;
  const hp = project(cam, rx, 0, rz);
  const galloping = frame >= o3.start - 6;
  const horse: HorseState = {
    gait: galloping ? 'gallop' : 'stand',
    phase: galloping ? (frame - o3.start) * 0.085 : 0,
    rear: track(frame, [[o2.start + 34, 0], [o2.start + 50, 0.22], [o2.start + 64, 0.04], [o2.end, 0]]),
    head: track(frame, [[0, 2], [o1.end, -3], [o2.start + 40, -14], [o2.end, 0]]) + Math.sin(frame * 0.07) * 2,
    tail: Math.sin(frame * 0.05) * 6,
  };
  const lanceAngle = track(frame, [[o2.start + 8, 2], [o2.start + 44, 84]]);
  const tip = track(frame, [[o2.start + 20, 0], [o2.start + 46, 1]]);
  const rider = pose({shF: track(frame, [[o2.start + 8, 28], [o2.start + 44, 44]]), elF: track(frame, [[o2.start + 8, 70], [o2.start + 44, 40]])}, RIDE);
  const handAngle = rider.torso - rider.shF - rider.elF;
  const helmet: HelmetState = {morph: 0, glow: 0.9, visor: 1, scatter: 0};
  // 近处那架风车的帆扫过画面上方
  const nm = project(cam, NEAR_MILL.x, 930, NEAR_MILL.z);
  const nearRot = track(frame, [[0, 18], [o2.start, -58]]);
  const gm = project(cam, GIANT.x, 0, GIANT.z);
  const rim = {color: C.accent, opacity: 0.95, dx: 1.8, dy: -1.4};
  return (
    <>
      <Layer blur={1.6}>
        <defs>
          <HelmetDefs />
        </defs>
        {ridges}
        {FAR_MILLS.map(([x, z], i) => {
          const y = ridgeHeight(x, 260, 0.00052, 2.2) * 0.85;
          const p = project(cam, x, y, z);
          return (
            <Windmill
              key={i}
              x={p.x}
              y={p.y}
              scale={p.s}
              rot={frame * (0.35 + i * 0.07) + i * 23}
              fill={fogged('#15100B', '#7A6040', p.d, 5200)}
              detail={false}
            />
          );
        })}
        {[0, 1, 2, 3, 4].map((i) => (
          <Beam
            key={i}
            id={`ray${i}`}
            x1={1260 + (cam.panX ?? 0) * 0.25}
            y1={cam.cy - 70}
            w1={20}
            x2={1260 + (cam.panX ?? 0) * 0.25 + Math.sin(i * 1.3 + frame * 0.004) * 1500 - 400}
            y2={cam.cy + 900}
            w2={260 + i * 60}
            opacity={0.32}
          />
        ))}
      </Layer>
      <Layer>
        <defs>
          <HelmetDefs />
          <radialGradient id="longShadow">
            <stop offset="0" stopColor="#000" stopOpacity={0.45} />
            <stop offset="1" stopColor="#000" stopOpacity={0} />
          </radialGradient>
        </defs>
        <Grass cam={cam} clumps={CLUMPS_A} frame={frame} filter={(d) => d > 900} fogD={4200} />
        {/* 巨大的那架风车 */}
        <Windmill
          x={gm.x}
          y={gm.y}
          scale={gm.s}
          rot={frame * 0.55 + 10}
          fill={fogged(C.ink, '#7A6040', gm.d, 6500)}
          rim={C.accent}
          rimOpacity={0.55}
          cloth={0.6}
        />
        {/* 投影：逆光，影子朝镜头方向拉长 */}
        <ellipse cx={hp.x + 10 * hp.s} cy={hp.y + 6 * hp.s} rx={120 * hp.s} ry={14 * hp.s} fill="#000" opacity={0.55} />
        <ellipse cx={hp.x - 30 * hp.s} cy={hp.y + 34 * hp.s} rx={150 * hp.s} ry={30 * hp.s} fill="url(#longShadow)" />
        <g transform={`translate(${hp.x} ${hp.y - 128 * hp.s}) scale(${hp.s})`}>
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
                  <g transform="translate(-6 -10)">
                    <FigureBody
                      pose={rider}
                      fill={fill}
                      farFill={far}
                      pass={pass}
                      helmet={helmet}
                      propF={(ps, f) => <Lance angle={lanceAngle} handAngle={handAngle} tip={tip} pass={ps} fill={f} />}
                    />
                  </g>
                }
              />
            )}
          />
        </g>
        <Dust seed="oa" frame={frame} count={34} x={0} y={260} w={W} h={560} size={2.2} opacity={0.5} />
      </Layer>
      {/* 前景：近处草叶 + 近处风车帆，虚化 */}
      <Layer blur={6}>
        <Grass cam={cam} clumps={CLUMPS_A} frame={frame} filter={(d) => d <= 900} fogD={4200} />
        {nm.d > 40 ? (
          <g transform={`translate(${nm.x} ${nm.y}) scale(${nm.s}) rotate(${nearRot})`}>
            {[0, 90, 180, 270].map((a) => (
              <g key={a} transform={`rotate(${a})`}>
                <Sail fill="#070504" cloth={0.85} detail />
              </g>
            ))}
          </g>
        ) : null}
      </Layer>
      <FogBands cam={cam} frame={frame} strength={0.9} />
    </>
  );
};

/* 开头后段：低机位，头盔滚到镜头前，远处的人爬起来回头 */
const PhaseB: React.FC<{frame: number; cam: Cam}> = ({frame, cam}) => {
  const fogD = 2600;
  const rise = o5.start;
  const P_LIE = pose({rootRot: -86, torso: 0, neck: -12, shF: 120, elF: 25, shB: 165, elB: 10, hipF: 22, knF: 34, hipB: 6, knB: 14, anF: 20, anB: 10});
  const P_PROP = pose({rootRot: -42, torso: 12, neck: 10, shF: 30, elF: 50, shB: -38, elB: 4, hipF: 84, knF: 62, hipB: 74, knB: 40});
  const P_KNEEL = pose({rootRot: 0, torso: 22, neck: 12, shF: 44, elF: 34, shB: 18, elB: 30, hipF: 88, knF: 92, anF: 0, hipB: -12, knB: 100, anB: -40});
  const P_STAND = pose({torso: 9, neck: 6, shF: 4, elF: 14, shB: -6, elB: 10}, STAND);
  const P_LOOK = pose({turn: -1, neck: -2, torso: 4}, P_STAND);
  const keys: Array<[number, Pose]> = [
    [rise + 2, P_LIE],
    [rise + 16, P_PROP],
    [rise + 34, P_KNEEL],
    [rise + 54, P_STAND],
    [rise + 62, P_STAND],
    [rise + 76, P_LOOK],
  ];
  const fig = poseAt(frame, keys);
  const pelvisY = track(frame, [[rise + 2, 14], [rise + 16, 18], [rise + 34, 52], [rise + 54, 92]]);
  const fp = project(cam, FALL.x, pelvisY, FALL.z);
  const gp = project(cam, FALL.x, 0, FALL.z);
  const gm = project(cam, GIANT_B.x, 0, GIANT_B.z);
  const horseP = project(cam, 600, 0, 4300);
  // 景深：先虚背景，人起身时焦点移到背景，最后回到头盔并推进
  const bgBlur = track(frame, [[o4.start, 4.5], [rise, 4.5], [rise + 14, 0.4], [o5.end - 26, 0.4], [o5.end - 14, 6]]);
  const helmBlur = track(frame, [[rise, 0], [rise + 14, 8], [o5.end - 26, 8], [o5.end - 16, 0]]);
  // 头盔滚进来
  const roll = prog(frame, o4.start - 8, o4.start + 44, easeOut);
  const hx = HELM_X_START + (HELM_X_END - HELM_X_START) * roll;
  const wobble = Math.exp(-Math.max(0, frame - (o4.start + 40)) / 10) * Math.sin(Math.max(0, frame - (o4.start + 40)) * 0.75) * 9;
  const ang = -260 * (1 - roll) + (roll >= 0.999 ? wobble : 0);
  const hp = project(cam, hx, 0, HELM_Z);
  const k = (HELM_W / 110) * hp.s;
  const rad = (ang * Math.PI) / 180;
  const cyDome = hp.y - 22 * k;
  const ox = hp.x - Math.sin(rad) * 20 * k;
  const oy = cyDome + Math.cos(rad) * 20 * k;
  const helmet: HelmetState = {morph: 0, glow: track(frame, [[o4.start, 0.85], [o5.end - 30, 0.85], [o5.end, 0.5]]), visor: 1, scatter: 0};
  const rim = {color: C.accent, opacity: 0.9, dx: 1.6, dy: -1.6};
  return (
    <>
      <Layer blur={bgBlur}>
        <defs>
          <HelmetDefs />
        </defs>
        {ridge(cam, 9000, 700, 0.00025, 0.7, '#33281C', 4200)}
        {ridge(cam, 6000, 360, 0.0004, 2.9, '#251D15', 4200)}
        {FAR_MILLS.slice(2, 7).map(([x, z], i) => {
          const p = project(cam, x - 600, 120, z);
          return <Windmill key={i} x={p.x} y={p.y} scale={p.s} rot={frame * 0.4 + i * 31} fill={fogged('#15100B', '#7A6040', p.d, 4200)} detail={false} />;
        })}
        <Windmill
          x={gm.x}
          y={gm.y}
          scale={gm.s}
          rot={frame * 0.45 + 40}
          fill={fogged(C.ink, '#6E5638', gm.d, 6000)}
          rim={C.accent}
          rimOpacity={0.6}
        />
        {/* 远处低着头的马 */}
        <g transform={`translate(${horseP.x} ${horseP.y - 128 * horseP.s}) scale(${-horseP.s} ${horseP.s})`}>
          <HorseBody state={{gait: 'stand', phase: 0, rear: 0, head: 34 + Math.sin(frame * 0.05) * 3, tail: Math.sin(frame * 0.04) * 4}} fill={fogged(C.ink, '#6E5638', horseP.d, fogD)} />
        </g>
        <ellipse cx={gp.x} cy={gp.y + 4} rx={110 * gp.s} ry={10 * gp.s} fill="#000" opacity={0.5} />
        <g transform={`translate(${fp.x} ${fp.y}) scale(${fp.s})`}>
          <RimLit
            rim={{...rim, dx: rim.dx / fp.s, dy: rim.dy / fp.s}}
            fill={C.ink}
            farFill="#1C1610"
            draw={(pass, fill, far) => <FigureBody pose={fig} fill={fill} farFill={far} pass={pass} />}
          />
        </g>
        <Grass cam={cam} clumps={CLUMPS_B} frame={frame} filter={(d) => d > 260} fogD={fogD} />
        <Dust seed="ob" frame={frame} count={26} x={300} y={120} w={1500} h={520} size={2} opacity={0.45} />
      </Layer>
      <Layer blur={helmBlur}>
        <defs>
          <HelmetDefs />
        </defs>
        {STONES.map((s, i) => {
          const p = project(cam, s.x, 0, s.z);
          if (p.d < 30) return null;
          return <ellipse key={i} cx={p.x} cy={p.y - s.r * 0.4 * p.s} rx={s.r * p.s} ry={s.r * 0.55 * p.s} fill={fogged('#1A140E', '#6E5638', p.d, fogD)} />;
        })}
        <Grass cam={cam} clumps={CLUMPS_B} frame={frame} filter={(d) => d <= 260} fogD={fogD} />
        <Helmet state={helmet} x={ox} y={oy} size={HELM_W * hp.s} rotate={ang} shadow={roll > 0.9} />
      </Layer>
      <FogBands cam={cam} frame={frame} strength={0.7} />
    </>
  );
};

/* 巨帆从镜头前扫过：既是"砸字"的底，也是机位切换的遮挡 */
const GiantSailCover: React.FC<{frame: number}> = ({frame}) => {
  if (frame < COVER_IN - 6 || frame > COVER_OUT1 + 4) return null;
  const rot = track(frame, [
    [COVER_IN - 6, 150],
    [COVER_FULL, 214],
    [COVER_OUT0, 226],
    [COVER_OUT1 + 4, 300],
  ]);
  const K = 11;
  const leak = 0.5 + 0.5 * Math.sin(frame * 0.2);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <g transform={`translate(2350 -720) rotate(${rot}) scale(${K})`}>
        <Sail fill="#060403" cloth={0.94} detail rim={C.accent} rimOpacity={0.55 + 0.2 * leak} />
      </g>
    </svg>
  );
};
