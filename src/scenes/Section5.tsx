import React from 'react';
import {cue, getScreen, sceneRange} from '../data/script';
import {Cam, polyPoints, project} from '../lib/camera';
import {easeIn, mix, prog, track} from '../lib/anim';
import {C} from '../theme';
import {FigureBody, handOffset, Pose, pose, poseAt, RimLit} from '../components/Figure';
import {Helmet, HelmetDefs, HelmetState} from '../components/Helmet';
import {Layer} from '../components/Layer';
import {Beam, Dust} from '../components/Light';
import {AnchorFn, LayoutF} from '../components/Subtitle';

/* ------------------------------------------------------------------ */
/* 时间点（全部来自字幕数据）                                          */
/* ------------------------------------------------------------------ */
const d1 = getScreen('s5-1');
const d2 = getScreen('s5-2');
const d3 = getScreen('s5-3');
const d4 = getScreen('s5-4');
const d5 = getScreen('s5-5');
const d6 = getScreen('s5-6');
export const S5 = sceneRange('s5');
const CLOSE = cue('s5-4', 'book_close');
const DIM = cue('s5-4', 'metal_decay');
const OUT = cue('s5-6', 'whoosh_rev');

/* ------------------------------------------------------------------ */
/* 世界：一间窗光照进的空房间                                          */
/* ------------------------------------------------------------------ */
const RX = 400;
const CEIL = 640;
const BACK = 1000;
const BED = {x0: -300, x1: -80, z0: 760, z1: 900, y: 55};
const WIN = {x0: -290, x1: -40, y0: 190, y1: 520};
const MAN = {x: -190, z: 830};
const CHAIR = {x: 240, z: 640};
const BOOK = {x: 120, z: 560};

/** 地上的窗光：前半段日夜飞快轮转，之后慢下来 */
const sunAt = (f: number) => {
  const fast = track(f, [[d1.start, 0], [d1.start + 76, 3.2]], (t) => t);
  const slow = (f - d1.start - 76) * 0.002;
  return f < d1.start + 76 ? fast : 3.2 + Math.max(0, slow);
};
// 前半段日夜轮转，醒来之后是阴沉的白天（窗光压暗，字也看得清）
const lightAt = (f: number) => {
  const cyc = 0.55 + 0.45 * Math.cos(sunAt(f) * Math.PI * 2);
  return cyc + (0.34 - cyc) * prog(f, d1.end - 10, d2.start + 10);
};

/* ------------------------------------------------------------------ */
/* 人物                                                                */
/* ------------------------------------------------------------------ */
const P_CURL: Pose = pose({rootRot: -84, torso: 10, neck: 6, shF: 70, elF: 90, shB: 60, elB: 100, hipF: 80, knF: 110, hipB: 70, knB: 116});
const P_SIT: Pose = pose({rootRot: 0, torso: 2, neck: 2, shF: 30, elF: 40, shB: 24, elB: 46, hipF: 90, knF: 6, hipB: 88, knB: 8, anF: 70, anB: 70});
const P_LOOKBACK: Pose = pose({turn: -1, neck: -8}, P_SIT);
const P_BOWED: Pose = pose({turn: 1, neck: 30, torso: 10}, P_SIT);
const P_STRAIGHT: Pose = pose({turn: 1, neck: 0, torso: -2, shF: 42, elF: 60, shB: 36, elB: 64}, P_SIT);
const P_LIE_ARM: Pose = pose({rootRot: -86, torso: 0, neck: -6, shF: -46, elF: 4, shB: 160, elB: 10, hipF: 4, knF: 6, hipB: 2, knB: 4});

const manPose = (f: number): Pose =>
  poseAt(f, [
    [d1.start, P_CURL],
    [d1.start + 78, P_CURL],
    [d1.start + 110, P_SIT],
    [d1.end - 4, P_LOOKBACK],
    [d2.start + 30, P_LOOKBACK],
    [d2.start + 54, P_BOWED],
    [d3.start + 20, P_BOWED],
    [d3.start + 50, P_STRAIGHT],
    [d4.start + 10, P_STRAIGHT],
    [d4.start + 30, P_LIE_ARM],
  ]);
const manPelvisY = (f: number) => track(f, [[d1.start + 78, 64], [d1.start + 110, 66]]);
const present = (f: number) => f < d6.start;

const basinAt = (f: number): HelmetState => ({
  morph: 1,
  glow: track(f, [[d1.start, 0.3], [DIM, 0.3], [DIM + 40, 0]]),
  visor: 0,
  scatter: 0,
  dust: track(f, [[DIM, 0], [DIM + 50, 0.9]]),
  reflection: track(f, [[d1.start, 0.4], [DIM, 0.4], [DIM + 40, 0]]),
});

/* ------------------------------------------------------------------ */
/* 相机                                                                */
/* ------------------------------------------------------------------ */
const OCC_X0 = -330;
const handWorld = (f: number) => {
  const h = handOffset(manPose(f), 'F');
  return {x: MAN.x + h.x, y: manPelvisY(f) - h.y, z: MAN.z};
};
export const section5Cam = (f: number): Cam => {
  const hw = handWorld(d5.start + 40);
  const keys = {
    x: [[d1.start, -120], [d1.end - 4, -140], [d2.start + 20, -263], [d2.end - 2, -268], [d3.start + 40, -360], [d3.end - 2, -350], [d4.start, OCC_X0 + 40], [d4.start + 4, OCC_X0 + 40], [d4.start + 22, CHAIR.x - 30], [d4.end - 2, CHAIR.x - 26], [d5.start + 20, -190], [d5.start + 50, hw.x + 30], [d5.end - 2, hw.x + 34], [d6.start + 20, -60], [OUT, -80], [d6.end, -165]],
    y: [[d1.start, 200], [d1.end - 4, 190], [d2.start + 20, 150], [d2.end - 2, 148], [d3.start + 40, 190], [d3.end - 2, 190], [d4.start + 4, 110], [d4.start + 22, 60], [d4.end - 2, 58], [d5.start + 20, 120], [d5.start + 50, hw.y + 50], [d5.end - 2, hw.y + 48], [d6.start + 20, 230], [OUT, 230], [d6.end, 340]],
    z: [[d1.start, 330], [d1.end - 4, 380], [d2.start + 20, 600], [d2.end - 2, 610], [d3.start + 40, 250], [d3.end - 2, 240], [d4.start + 4, 380], [d4.start + 22, CHAIR.z - 86], [d4.end - 2, CHAIR.z - 80], [d5.start + 20, 470], [d5.start + 50, MAN.z - 270], [d5.end - 2, MAN.z - 260], [d6.start + 20, -60], [OUT, -20], [d6.end, 920]],
    cy: [[d1.start, 540], [d2.start + 20, 560], [d3.start + 40, 540], [d4.start + 22, 560], [d5.start + 50, 560], [d6.start + 20, 540]],
  } as Record<string, Array<[number, number]>>;
  const out = prog(f, OUT, d6.end, easeIn);
  return {
    f: 1000,
    x: track(f, keys.x),
    y: track(f, keys.y),
    z: f < OUT ? track(f, keys.z) : -20 + (BACK - 60 + 20) * out,
    cx: 960,
    cy: track(f, keys.cy),
  };
};

/* ------------------------------------------------------------------ */
/* 绘制                                                                */
/* ------------------------------------------------------------------ */
const Poly: React.FC<{cam: Cam; pts: Array<[number, number, number]>; fill: string; opacity?: number}> = ({cam, pts, fill, opacity}) => {
  const p = polyPoints(cam, pts);
  return p ? <polygon points={p} fill={fill} opacity={opacity} /> : null;
};

const Box: React.FC<{cam: Cam; x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; front: string; side: string; top: string}> = ({cam, x0, x1, y0, y1, z0, z1, front, side, top}) => (
  <g>
    {cam.x < x0 ? <Poly cam={cam} pts={[[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]} fill={side} /> : null}
    {cam.x > x1 ? <Poly cam={cam} pts={[[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]} fill={side} /> : null}
    {cam.y > y1 ? <Poly cam={cam} pts={[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]} fill={top} /> : null}
    {cam.z < z0 ? <Poly cam={cam} pts={[[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]} fill={front} /> : null}
  </g>
);

export const Section5: React.FC<{frame: number}> = ({frame: f}) => {
  const cam = section5Cam(f);
  const L = lightAt(f);
  const winColor = mix('#7E705C', '#D9C49A', L);
  const whiteIn = 1 - prog(f, d1.start, d1.start + 22);
  const flare = prog(f, OUT + 10, d6.end, easeIn);
  const mp = project(cam, MAN.x, manPelvisY(f), MAN.z);
  const p = manPose(f);
  const rim = {color: C.accent, opacity: track(f, [[d1.start, 0.55], [d2.start + 50, 0.12]]), dx: -1.4, dy: -1.6};
  // 地上的窗光斑：随“太阳”移动
  const sunX = Math.sin(sunAt(f) * Math.PI * 2) * 260;
  const patch: Array<[number, number, number]> = [
    [WIN.x0 + 40 + sunX, 0.5, 520],
    [WIN.x1 + 120 + sunX, 0.5, 520],
    [WIN.x1 + 200 + sunX, 0.5, 220],
    [WIN.x0 + 100 + sunX, 0.5, 220],
  ];
  const basin = basinAt(f);
  const bp = project(cam, CHAIR.x, 48, CHAIR.z);
  // 桑丘跪在床边伸手
  const sancho = f >= d5.start && f < d6.start;
  const hw = handWorld(f);
  const reach = track(f, [[d5.start + 30, 0], [d5.start + 70, 1]]);
  const sPose = pose({rootRot: 0, torso: 36, neck: 12, shF: 10 + 26 * reach, elF: 30 - 26 * reach, shB: 20, elB: 50, hipF: 96, knF: 100, hipB: -14, knB: 110, anB: -40});
  const sx = hw.x + 92;
  const spp = project(cam, sx, 44, BED.z0 - 30);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0C0907', overflow: 'hidden'}}>
      <Layer blur={1}>
        <Poly cam={cam} pts={[[-RX, 0, cam.z + 5], [RX, 0, cam.z + 5], [RX, 0, BACK], [-RX, 0, BACK]]} fill="#2A2119" />
        <Poly cam={cam} pts={[[-RX, CEIL, cam.z + 5], [RX, CEIL, cam.z + 5], [RX, CEIL, BACK], [-RX, CEIL, BACK]]} fill="#0E0B08" />
        <Poly cam={cam} pts={[[-RX, 0, cam.z + 5], [-RX, CEIL, cam.z + 5], [-RX, CEIL, BACK], [-RX, 0, BACK]]} fill="#1B1510" />
        <Poly cam={cam} pts={[[RX, 0, cam.z + 5], [RX, CEIL, cam.z + 5], [RX, CEIL, BACK], [RX, 0, BACK]]} fill="#17120D" />
        <Poly cam={cam} pts={[[-RX, 0, BACK], [RX, 0, BACK], [RX, CEIL, BACK], [-RX, CEIL, BACK]]} fill="#211A13" />
        {/* 窗 */}
        <Poly cam={cam} pts={[[WIN.x0, WIN.y0, BACK - 1], [WIN.x1, WIN.y0, BACK - 1], [WIN.x1, WIN.y1, BACK - 1], [WIN.x0, WIN.y1, BACK - 1]]} fill={winColor} />
        <Poly cam={cam} pts={[[(WIN.x0 + WIN.x1) / 2 - 5, WIN.y0, BACK - 2], [(WIN.x0 + WIN.x1) / 2 + 5, WIN.y0, BACK - 2], [(WIN.x0 + WIN.x1) / 2 + 5, WIN.y1, BACK - 2], [(WIN.x0 + WIN.x1) / 2 - 5, WIN.y1, BACK - 2]]} fill="#120E0A" />
        <Poly cam={cam} pts={[[WIN.x0, 350, BACK - 2], [WIN.x1, 350, BACK - 2], [WIN.x1, 360, BACK - 2], [WIN.x0, 360, BACK - 2]]} fill="#120E0A" />
        <Curtain cam={cam} f={f} />
        <Clock cam={cam} f={f} />
        <Poly cam={cam} pts={patch} fill={winColor} opacity={0.22 * L} />
      </Layer>
      <Layer>
        <defs>
          <HelmetDefs />
        </defs>
        {/* 床 */}
        <Box cam={cam} x0={BED.x0} x1={BED.x1} y0={0} y1={BED.y - 14} z0={BED.z0} z1={BED.z1} front="#1A140F" side="#120E0A" top="#2A2119" />
        <Box cam={cam} x0={BED.x0} x1={BED.x0 + 14} y0={0} y1={140} z0={BED.z0} z1={BED.z1} front="#120E0A" side="#0D0A07" top="#2A2119" />
        <Poly cam={cam} pts={[[BED.x0 + 14, BED.y - 14, BED.z0], [BED.x1, BED.y - 14, BED.z0], [BED.x1, BED.y, BED.z0 + 10], [BED.x0 + 14, BED.y, BED.z0 + 10]]} fill={mix('#5A4C3A', '#8C7A5E', L)} />
        <Poly cam={cam} pts={[[BED.x0 + 14, BED.y, BED.z0 + 10], [BED.x1, BED.y, BED.z0 + 10], [BED.x1, BED.y, BED.z1], [BED.x0 + 14, BED.y, BED.z1]]} fill={mix('#4A3E30', '#7A6A52', L)} />
        {/* 他 */}
        {present(f) ? (
          <g transform={`translate(${mp.x} ${mp.y}) scale(${mp.s})`}>
            <RimLit
              rim={{...rim, dx: rim.dx / mp.s, dy: rim.dy / mp.s}}
              fill={C.ink}
              farFill="#1A140F"
              draw={(pass, fill, far) => <FigureBody pose={p} fill={fill} farFill={far} pass={pass} />}
            />
          </g>
        ) : null}
        {/* 被子盖住腿 */}
        {present(f) ? <Blanket cam={cam} f={f} L={L} /> : <Blanket cam={cam} f={f} L={L} flat />}
        {/* 椅子和铜盆 */}
        <Box cam={cam} x0={CHAIR.x - 30} x1={CHAIR.x + 30} y0={40} y1={46} z0={CHAIR.z - 30} z1={CHAIR.z + 30} front="#1A140F" side="#120E0A" top="#3A2E22" />
        {[-1, 1].map((sx2) => (
          <Box key={sx2} cam={cam} x0={CHAIR.x + sx2 * 26 - 3} x1={CHAIR.x + sx2 * 26 + 3} y0={0} y1={40} z0={CHAIR.z - 28} z1={CHAIR.z - 22} front="#120E0A" side="#0D0A07" top="#1A140F" />
        ))}
        <Box cam={cam} x0={CHAIR.x - 30} x1={CHAIR.x + 30} y0={46} y1={150} z0={CHAIR.z + 24} z1={CHAIR.z + 30} front="#16110C" side="#0D0A07" top="#2A2017" />
        {[-24, 0, 24].map((dx) => (
          <Box key={dx} cam={cam} x0={CHAIR.x + dx - 2} x1={CHAIR.x + dx + 2} y0={46} y1={150} z0={CHAIR.z + 22} z1={CHAIR.z + 24} front="#0D0A07" side="#0D0A07" top="#0D0A07" />
        ))}
        <Helmet state={basin} x={bp.x} y={bp.y} size={34 * bp.s} rotate={180} shadow={false} />
        <Book cam={cam} f={f} />
        {/* 桑丘 */}
        {sancho ? (
          <g transform={`translate(${spp.x} ${spp.y}) scale(${-spp.s} ${spp.s})`}>
            <RimLit
              rim={{...rim, opacity: 0.5, dx: -rim.dx / spp.s, dy: rim.dy / spp.s}}
              fill={C.ink}
              draw={(pass, fill, far) => <FigureBody pose={sPose} build="sancho" fill={fill} farFill={far} pass={pass} />}
            />
          </g>
        ) : null}
        <Dust seed="s5d" frame={f} count={36} x={300} y={60} w={1300} h={800} size={2} opacity={0.4 * L} />
      </Layer>
      <Layer blur={12} blend="screen" opacity={0.8}>
        {(() => {
          const top = project(cam, (WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, BACK);
          const bot = project(cam, (WIN.x0 + WIN.x1) / 2 + 120 + sunX, 0, 370);
          return <Beam id="s5b" x1={top.x} y1={top.y} w1={260 * top.s} x2={bot.x} y2={bot.y} w2={360 * bot.s} color="#E9D3A4" opacity={0.6 * L + 0.5 * flare} />;
        })()}
      </Layer>
      {/* F 版式：字在前景门框之下 */}
      <div style={{position: 'absolute', inset: 0}}>
        <LayoutF s={d4} frame={f} />
      </div>
      <Layer blur={6}>
        {f >= d4.start - 10 && f < d5.start + 10 ? (
          <Poly cam={cam} pts={[[OCC_X0 - 60, 0, 520], [OCC_X0 + 60, 0, 520], [OCC_X0 + 60, CEIL, 520], [OCC_X0 - 60, CEIL, 520]]} fill="#080605" />
        ) : null}
      </Layer>
      <div style={{position: 'absolute', inset: 0, background: '#F1E9D8', opacity: Math.max(whiteIn, flare)}} />
    </div>
  );
};

const Blanket: React.FC<{cam: Cam; f: number; L: number; flat?: boolean}> = ({cam, f, L, flat}) => {
  const lying = f >= d4.start + 30 || f < d1.start + 100;
  const hump = flat ? 6 : lying ? 30 : 22;
  const x0 = flat ? BED.x0 + 120 : MAN.x - 10;
  const pts: Array<[number, number, number]> = [];
  for (let i = 0; i <= 10; i++) {
    const x = x0 + (BED.x1 - x0) * (i / 10);
    pts.push([x, BED.y + 4 + Math.sin((i / 10) * Math.PI) * hump, BED.z0 + 6]);
  }
  pts.push([BED.x1, BED.y, BED.z0 + 4], [x0, BED.y, BED.z0 + 4]);
  const p = polyPoints(cam, pts);
  return p ? <polygon points={p} fill={mix('#3E3326', '#6A5A44', L)} /> : null;
};

const Curtain: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const sway = Math.sin(f * 0.04) * 12;
  const pts: Array<[number, number, number]> = [
    [WIN.x1 - 10, WIN.y1 + 20, BACK - 6],
    [WIN.x1 + 50, WIN.y1 + 20, BACK - 6],
    [WIN.x1 + 40 + sway, WIN.y0 - 30, BACK - 10],
    [WIN.x1 - 20 + sway * 0.6, WIN.y0 - 30, BACK - 10],
  ];
  const p = polyPoints(cam, pts);
  return p ? <polygon points={p} fill="#3A2E22" opacity={0.85} /> : null;
};

/** 墙上的钟：最后一屏停住 */
const Clock: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const c = project(cam, 220, 430, BACK - 1);
  const stopped = Math.min(f, d6.start + 2);
  const minute = stopped < d1.start + 76 ? (stopped - d1.start) * 14 : 76 * 14 + (stopped - d1.start - 76) * 0.5;
  return (
    <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
      <circle r={40} fill="#0D0907" />
      <circle r={34} fill="#6B5A43" />
      <line x1={0} y1={0} x2={0} y2={-26} stroke="#120D09" strokeWidth={2.4} transform={`rotate(${minute * 6})`} strokeLinecap="round" />
      <line x1={0} y1={0} x2={0} y2={-17} stroke="#120D09" strokeWidth={3.4} transform={`rotate(${minute * 0.5 + 60})`} strokeLinecap="round" />
      <circle r={2.6} fill="#120D09" />
    </g>
  );
};

/** 地上的书：第四屏自己合上 */
const Book: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const close = prog(f, CLOSE - 14, CLOSE, easeIn);
  const ang = 170 * (1 - close);
  const base = project(cam, BOOK.x, 1, BOOK.z);
  const s = base.s;
  const leaf = (dir: number, a: number) => {
    const rad = (a * Math.PI) / 180;
    return `M 0 0 L ${dir * 22 * Math.cos(rad)} ${-22 * Math.sin(rad) * 0.6} L ${dir * 22 * Math.cos(rad)} ${-22 * Math.sin(rad) * 0.6 + 14} L 0 14 Z`;
  };
  return (
    <g transform={`translate(${base.x} ${base.y - 14 * s}) scale(${s})`}>
      <path d={leaf(-1, 5)} fill="#2A2017" />
      <path d={leaf(1, ang < 90 ? ang : 180 - ang)} transform={ang >= 90 ? 'scale(-1 1)' : undefined} fill="#B8A684" opacity={0.9} />
      <path d={leaf(-1, 5)} fill="#C9B894" opacity={0.85} transform="translate(-1 -1)" />
    </g>
  );
};

export const section5Anchors: Record<string, AnchorFn> = {};
