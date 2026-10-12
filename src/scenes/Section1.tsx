import React from 'react';
import {random} from 'remotion';
import {cue, getScreen, sceneRange} from '../data/script';
import {Cam, fogged, polyPoints, project} from '../lib/camera';
import {easeIn, easeOut, mix, prog, track} from '../lib/anim';
import {C} from '../theme';
import {FigureBody, handOffset, headOffset, Pose, pose, poseAt, RimLit} from '../components/Figure';
import {Helmet, HelmetDefs, HelmetState} from '../components/Helmet';
import {Layer} from '../components/Layer';
import {Dust} from '../components/Light';
import {AnchorFn, LayoutF} from '../components/Subtitle';

/* ------------------------------------------------------------------ */
/* 时间点（全部来自字幕数据）                                          */
/* ------------------------------------------------------------------ */
const s1 = getScreen('s1-1');
const s2 = getScreen('s1-2');
const s3 = getScreen('s1-3');
const s4 = getScreen('s1-4');
const s5 = getScreen('s1-5');
const s6 = getScreen('s1-6');
export const S1 = sceneRange('s1');

const THUDS = [0, 1, 2].map((n) => cue('s1-2', 'thud', n));
const FOLDS = [0, 1].map((n) => cue('s1-4', 'paper_fold', n));
const TAPS = [0, 1].map((n) => cue('s1-4', 'tap', n));
const SWING = cue('s1-5', 'sword');
const CRACK = cue('s1-5', 'paper_crack');
const RING = cue('s1-6', 'metal_ring');

/* ------------------------------------------------------------------ */
/* 世界                                                                */
/* ------------------------------------------------------------------ */
const WX = 330; // 墙
const CEIL = 760;
const END_Z = 3800;
const BAY = 400;
const BAY_START = -800;
const BAY_END = 3400;
const SHELF_YS = [24, 120, 216, 312, 408, 504];
const SHELF_TOP = 600;
const BOOK_X = WX - 30;
/** 人物面朝左（-x）：桌子和头盔在他左手边，右上留给人物、左上留给字 */
const FACE = -1;
const MAN = {x: 70, z: 3000};
const TABLE = {x0: -150, x1: 10, y: 76, z0: 2945, z1: 3065};
const HELM_W = 48;
/** 第一帧：头盔在右侧书架上，和开头最后一帧的头盔同样大小、同样位置 */
const SHELF_HELM = {x: 255, y: 312, z: 1400};
const TABLE_HELM = {x: -25, y: TABLE.y, z: 3000};

const FOG_C = '#4A3D2E';
const BOOK_COLORS = ['#2A2018', '#3B2E21', '#4B3A28', '#5A4630', '#33291F', '#6B5236'];

interface Book {
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  c: number;
}

/** 每个书架格子里的书：位置、高矮、颜色都由 random(seed) 决定，渲染结果固定 */
const makeBay = (side: number, bz: number): Book[][] =>
  SHELF_YS.map((y, si) => {
    const out: Book[] = [];
    let z = bz + 46;
    let k = 0;
    while (z < bz + BAY - 14) {
      const seed = `bk${side}-${bz}-${si}-${k}`;
      const w = 7 + random(`${seed}w`) * 10;
      if (random(`${seed}gap`) < 0.06) {
        z += w * 2;
        k++;
        continue;
      }
      const h = 52 + random(`${seed}h`) * 36;
      out.push({z0: z, z1: Math.min(z + w, bz + BAY - 12), y0: y + 4, y1: y + 4 + h, c: Math.floor(random(`${seed}c`) * BOOK_COLORS.length)});
      z += w + 0.6;
      k++;
    }
    return out;
  });

const BAYS: Array<{z: number; side: number; shelves: Book[][]}> = [];
for (let z = BAY_START; z < BAY_END; z += BAY) {
  for (const side of [-1, 1]) {
    BAYS.push({z, side, shelves: makeBay(side, z)});
  }
}

/** F 版式的遮挡：近景书堆起初盖住字，镜头向右横移后让开 */
const OCC_CAM_X0 = -165;
const OCC_Z = 2700;
const OCC_W = 110;
const OCC_X = OCC_CAM_X0 + ((400 - 960) * (OCC_Z - 2560)) / 1000;

/* ------------------------------------------------------------------ */
/* 相机：一条连续的镜头                                               */
/* ------------------------------------------------------------------ */
const startCam = () => {
  // 开头最后一帧：头盔宽 = HELM_W * 1000/12，帽檐在相机下方 10 个单位
  return {x: SHELF_HELM.x, y: SHELF_HELM.y + 10, z: SHELF_HELM.z - 12};
};

export const section1Cam = (frame: number): Cam => {
  const st = startCam();
  const keys = {
    x: [
      [s1.start, st.x], [s1.start + 34, 30], [s1.end, 0],
      [s2.end - 10, -31], [s3.end - 12, 97],
      [s4.start + 24, -19], [s4.end - 24, -14],
      [s5.start + 2, OCC_CAM_X0], [s5.start + 16, -58], [s5.end - 6, -50],
      [s6.start + 20, -62], [RING + 6, -50], [s6.end, -8], [s6.end + 24, 10],
    ] as Array<[number, number]>,
    y: [
      [s1.start, st.y], [s1.start + 34, 175], [s1.end, 165],
      [s2.end - 10, 120], [s3.end - 12, 97],
      [s4.start + 24, 111], [s4.end - 24, 110],
      [s5.start + 2, 130], [s5.end - 6, 130],
      [s6.start + 20, 150], [RING + 6, 152], [s6.end, 160], [s6.end + 24, 170],
    ] as Array<[number, number]>,
    z: [
      [s1.start, st.z], [s1.start + 34, 160], [s1.end, 900],
      [s2.end - 10, 2580], [s3.end - 12, 2770],
      [s4.start + 24, 2900], [s4.end - 24, 2908],
      [s5.start + 2, 2560], [s5.end - 6, 2580],
      [s6.start + 20, 2700], [RING + 6, 2720], [s6.end, 2830], [s6.end + 24, 2900],
    ] as Array<[number, number]>,
  };
  const drift = Math.sin(frame * 0.021) * 2.5;
  return {
    f: 1000,
    x: track(frame, keys.x) + drift,
    y: track(frame, keys.y) + Math.cos(frame * 0.017) * 1.5,
    z: track(frame, keys.z),
    cx: 960,
    cy: 520,
  };
};

/** 窗光强度：第三屏里日夜快速轮转，结尾窗光过曝 */
const NIGHT_L = 0.3;
const lightAt = (frame: number) => {
  if (frame >= s3.start && frame < s3.end) {
    // 日夜轮转三次，最后停在夜里
    const u = (frame - s3.start) / (s3.end - s3.start);
    const cyc = 0.62 + 0.38 * Math.cos(u * Math.PI * 2 * 3);
    return cyc + (NIGHT_L - cyc) * prog(frame, s3.end - 24, s3.end);
  }
  // 第四屏是深夜：窗外暗下来，只有桌上一支蜡烛；第五屏天亮
  if (frame >= s3.end && frame < s5.start + 24) return track(frame, [[s5.start - 6, NIGHT_L], [s5.start + 24, 1]]);
  return 1;
};
const nightAt = (frame: number) => Math.min(1, (1 - lightAt(frame)) / 0.7);
const candleAt = (frame: number) => track(frame, [[s3.end - 20, 0], [s3.end, 1], [s5.start + 4, 1], [s5.start + 24, 0]]);

/* ------------------------------------------------------------------ */
/* 人物动作                                                            */
/* ------------------------------------------------------------------ */
const SIT_READ: Pose = pose({torso: 20, neck: 24, hipF: 88, knF: 88, anF: 0, hipB: 84, knB: 92, anB: 0, shF: 52, elF: 66, shB: 44, elB: 74});
const SIT_UP: Pose = pose({torso: 2, neck: -14, shF: 40, elF: 60, shB: 30, elB: 70}, SIT_READ);
const SIT_WORK: Pose = pose({torso: 24, neck: 26, shF: 80, elF: 12, shB: 72, elB: 18}, SIT_READ);
const SIT_TAP: Pose = pose({shF: 70, elF: 30}, SIT_WORK);
const STAND_RAISE: Pose = pose({torso: -4, neck: -6, shF: 168, elF: 18, shB: 20, elB: 30, hipF: 14, knF: 10, hipB: -10, knB: 6});
const STRIKE: Pose = pose({torso: 26, neck: 16, shF: 64, elF: 2, shB: -10, elB: 20, hipF: 26, knF: 24, hipB: -14, knB: 8});
const REACH: Pose = pose({torso: 16, neck: 14, shF: 72, elF: 14, shB: 64, elB: 20, hipF: 8, knF: 8, hipB: -6, knB: 6});
const LIFT: Pose = pose({torso: 0, neck: -12, shF: 150, elF: 60, shB: 140, elB: 64});
const WEAR: Pose = pose({torso: 2, neck: 0, shF: 132, elF: 96, shB: 124, elB: 100});
const PROUD: Pose = pose({torso: -2, neck: -6, shF: 10, elF: 16, shB: -4, elB: 10});
const LOOK_UP: Pose = pose({neck: -24, torso: -6}, PROUD);

const manPose = (frame: number): Pose =>
  poseAt(frame, [
    [s1.start, SIT_READ],
    [s3.start + 20, SIT_READ],
    [s3.start + 56, SIT_UP],
    [s3.end - 6, SIT_UP],
    [s4.start + 10, SIT_WORK],
    [TAPS[0] - 6, SIT_WORK],
    [TAPS[0], SIT_TAP],
    [TAPS[0] + 8, SIT_WORK],
    [TAPS[1] - 6, SIT_WORK],
    [TAPS[1], SIT_TAP],
    [TAPS[1] + 8, SIT_WORK],
    [s5.start + 4, SIT_WORK],
    [SWING - 2, STAND_RAISE],
    [CRACK, STRIKE],
    [s5.end, STRIKE],
    [s6.start + 18, REACH],
    [s6.start + 30, REACH],
    [s6.start + 48, LIFT],
    [s6.start + 60, WEAR],
    [s6.start + 70, PROUD],
    [s6.start + 82, PROUD],
    [s6.start + 96, LOOK_UP],
  ]);

const pelvisY = (frame: number) =>
  track(frame, [
    [s5.start + 4, 50],
    [SWING - 6, 92],
  ]) + (frame >= CRACK ? -track(frame, [[CRACK, 0], [CRACK + 4, 6], [s5.end, 2]]) : 0);

/** 头盔状态：书架上的旧物 → 桌上补纸板 → 劈碎 → 重做 → 戴上发光 */
const helmetState = (frame: number): HelmetState => {
  const visor = frame < s4.start ? 1 : track(frame, [[FOLDS[0] - 4, 0], [FOLDS[0] + 14, 0.55], [FOLDS[1] - 4, 0.55], [FOLDS[1] + 14, 1]]);
  const scatter =
    frame < CRACK ? 0 : frame < s6.start ? prog(frame, CRACK, CRACK + 16, easeOut) : 1 - prog(frame, s6.start, s6.start + 18, easeOut);
  return {
    morph: 0,
    glow: track(frame, [[s1.start, 0.5], [s1.start + 24, 0], [s4.start, 0], [s4.start + 20, 0.3], [RING - 4, 0.3], [RING + 12, 1]]),
    // 开场从开头的头盔“倒带”回来：纸板面甲先褪掉，到第四屏再一片片补上
    visor: frame < s4.start ? track(frame, [[s1.start, 1], [s1.start + 26, 0]]) : visor,
    scatter,
    dust: track(frame, [[s1.start, 0], [s1.start + 24, 0.8], [s4.start, 0.8], [s4.end - 20, 0.25], [RING, 0.25], [RING + 10, 0]]),
    seed: frame < s6.start ? 'h1' : 'h2',
  };
};

/* ------------------------------------------------------------------ */
/* 绘制工具                                                            */
/* ------------------------------------------------------------------ */
const Poly: React.FC<{cam: Cam; pts: Array<[number, number, number]>; fill: string; opacity?: number}> = ({cam, pts, fill, opacity}) => {
  const p = polyPoints(cam, pts);
  return p ? <polygon points={p} fill={fill} opacity={opacity} /> : null;
};

/** 轴对齐盒子，只画朝向相机的面 */
const Box: React.FC<{
  cam: Cam;
  x0: number; x1: number; y0: number; y1: number; z0: number; z1: number;
  front: string; side: string; top: string;
}> = ({cam, x0, x1, y0, y1, z0, z1, front, side, top}) => (
  <g>
    {cam.x < x0 ? <Poly cam={cam} pts={[[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]} fill={side} /> : null}
    {cam.x > x1 ? <Poly cam={cam} pts={[[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]} fill={side} /> : null}
    {cam.y > y1 ? <Poly cam={cam} pts={[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]} fill={top} /> : null}
    {cam.z < z0 ? <Poly cam={cam} pts={[[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]} fill={front} /> : null}
  </g>
);

/** 屏幕上这一格书架有多宽（像素）；完全出画时返回 0，用来剔除和决定细节层级 */
const bayScreenWidth = (cam: Cam, bay: (typeof BAYS)[number]) => {
  const x = bay.side * BOOK_X;
  const z0 = Math.max(bay.z, cam.z + 8);
  const z1 = bay.z + BAY;
  if (z1 <= z0) return 0;
  const pts = [project(cam, x, 0, z0), project(cam, x, SHELF_TOP, z0), project(cam, x, 0, z1), project(cam, x, SHELF_TOP, z1)];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  if (maxX < -40 || minX > 1960 || maxY < -40 || minY > 1120) return 0;
  return maxX - minX;
};

const bookPaths = (cam: Cam, bay: (typeof BAYS)[number], widthPx: number) => {
  const x = bay.side * BOOK_X;
  const paths: string[] = BOOK_COLORS.map(() => '');
  const pt = (y: number, z: number) => {
    const p = project(cam, x, y, z);
    return `${Math.round(p.x * 2) / 2} ${Math.round(p.y * 2) / 2}`;
  };
  for (const shelf of bay.shelves) {
    // 远处的书合并成粗一点的块：每块至少约 5 像素宽
    const per = widthPx / Math.max(1, shelf.length);
    const group = Math.max(1, Math.ceil(5 / Math.max(0.1, per)));
    for (let i = 0; i < shelf.length; i += group) {
      const a = shelf[i];
      const b = shelf[Math.min(shelf.length - 1, i + group - 1)];
      if (b.z1 < cam.z + 6) continue;
      const z0 = Math.max(a.z0, cam.z + 6);
      const y1 = group === 1 ? a.y1 : (a.y1 + b.y1) / 2;
      paths[a.c] += `M${pt(a.y0, z0)}L${pt(y1, z0)}L${pt(y1, b.z1)}L${pt(a.y0, b.z1)}Z`;
    }
  }
  return paths;
};

const BayView: React.FC<{cam: Cam; bay: (typeof BAYS)[number]; L: number; widthPx: number}> = ({cam, bay, L, widthPx}) => {
  const d = bay.z + BAY / 2 - cam.z;
  const s = bay.side;
  const fogD = 2600;
  const paths = bookPaths(cam, bay, widthPx);
  const post = fogged(mix('#1E1711', '#3A2D20', L * 0.5), FOG_C, d, fogD);
  const postSide = fogged('#120D09', FOG_C, d, fogD);
  return (
    <g>
      {/* 书架背板 */}
      <Poly cam={cam} pts={[[s * WX, 0, bay.z], [s * WX, SHELF_TOP, bay.z], [s * WX, SHELF_TOP, bay.z + BAY], [s * WX, 0, bay.z + BAY]]} fill={fogged('#0E0A07', FOG_C, d, fogD)} />
      {paths.map((p, i) => (p ? <path key={i} d={p} fill={fogged(mix(BOOK_COLORS[i], '#8A6A40', 0.12 * L), FOG_C, d, fogD)} /> : null))}
      {/* 层板前沿 */}
      {SHELF_YS.map((y) => (
        <Poly key={y} cam={cam} pts={[[s * BOOK_X, y - 2, bay.z], [s * BOOK_X, y + 4, bay.z], [s * BOOK_X, y + 4, bay.z + BAY], [s * BOOK_X, y - 2, bay.z + BAY]]} fill={fogged('#4A3826', FOG_C, d, fogD)} />
      ))}
      {/* 立柱：侧面 + 正面 */}
      <Poly cam={cam} pts={[[s * (WX - 36), 0, bay.z], [s * (WX - 36), CEIL, bay.z], [s * (WX - 36), CEIL, bay.z + 44], [s * (WX - 36), 0, bay.z + 44]]} fill={postSide} />
      <Poly cam={cam} pts={[[s * (WX - 36), 0, bay.z], [s * WX, 0, bay.z], [s * WX, CEIL, bay.z], [s * (WX - 36), CEIL, bay.z]]} fill={post} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* 场景本体                                                            */
/* ------------------------------------------------------------------ */
export const Section1: React.FC<{frame: number}> = ({frame}) => {
  const cam = section1Cam(frame);
  const L = lightAt(frame);
  const night = nightAt(frame);
  const flare = prog(frame, s6.end - 4, s6.end + 24, easeIn);
  const winColor = mix(mix('#F2D59A', '#7C8790', night), '#FFF4DE', flare);
  const far: React.ReactNode[] = [];
  const mid: React.ReactNode[] = [];
  const near: React.ReactNode[] = [];
  // 书架按离相机远近分到三层：远处带雾和模糊，近处虚化掠过
  const order = [...BAYS].sort((a, b) => b.z - a.z);
  for (const bay of order) {
    const dNear = bay.z - cam.z;
    const dFar = bay.z + BAY - cam.z;
    if (dFar < 6) continue;
    const widthPx = bayScreenWidth(cam, bay);
    if (widthPx <= 0) continue;
    const el = <BayView key={`${bay.side}${bay.z}`} cam={cam} bay={bay} L={L} widthPx={widthPx} />;
    if (dNear > 1700) far.push(el);
    else if (dFar < 260) near.push(el);
    else mid.push(el);
  }
  const p = manPose(frame);
  const py = pelvisY(frame);
  const man = project(cam, MAN.x, py, MAN.z);
  const helm = helmetState(frame);
  const wearing = frame >= s6.start + 58;
  const holding = frame >= s6.start + 30 && !wearing;
  // 头盔的位置：书架 → 桌上 → 手里 → 头上
  let helmWorld = frame < s4.start ? SHELF_HELM : TABLE_HELM;
  if (holding) {
    const hF = handOffset(p, 'F');
    const hB = handOffset(p, 'B');
    const hx = MAN.x + (FACE * (hF.x + hB.x)) / 2;
    const hy = py - (hF.y + hB.y) / 2;
    const t = prog(frame, s6.start + 30, s6.start + 40);
    helmWorld = {x: TABLE_HELM.x + (hx - TABLE_HELM.x) * t, y: TABLE_HELM.y + (hy + 8 - TABLE_HELM.y) * t, z: MAN.z};
  }
  const hp = project(cam, helmWorld.x, helmWorld.y, helmWorld.z);
  const helmNode = !wearing ? (
    <Helmet key="helm" state={helm} x={hp.x} y={hp.y} size={HELM_W * hp.s} shadow={!holding} />
  ) : null;
  const helmIsNear = hp.d < 60;
  const rim = {color: C.accent, opacity: 0.85 * (0.55 + 0.45 * L), dx: -1.8, dy: -1.6};
  const bookOpen = frame < s3.end - 4;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0A0806', overflow: 'hidden'}}>
      {/* 后景：墙、地面、天花、尽头的窗和窗外田野、远处书架 */}
      <Layer blur={1.3}>
        <defs>
          <HelmetDefs />
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2B2219" />
            <stop offset="1" stopColor="#0C0907" />
          </linearGradient>
        </defs>
        <Poly cam={cam} pts={[[-WX, 0, cam.z + 5], [WX, 0, cam.z + 5], [WX, 0, END_Z], [-WX, 0, END_Z]]} fill="url(#floorGrad)" />
        <Poly cam={cam} pts={[[-WX, CEIL, cam.z + 5], [WX, CEIL, cam.z + 5], [WX, CEIL, END_Z], [-WX, CEIL, END_Z]]} fill="#0B0806" />
        {[-1, 1].map((s) => (
          <Poly key={s} cam={cam} pts={[[s * WX, SHELF_TOP, cam.z + 5], [s * WX, CEIL, cam.z + 5], [s * WX, CEIL, END_Z], [s * WX, SHELF_TOP, END_Z]]} fill="#15100C" />
        ))}
        <FloorBoards cam={cam} />
        <EndWall cam={cam} frame={frame} winColor={winColor} L={L} night={night} />
        <ClerestoryWindows cam={cam} L={L} winColor={winColor} />
        {far}
      </Layer>
      {/* 中景：书架、桌椅、人、书堆、头盔 */}
      <Layer>
        <defs>
          <HelmetDefs />
        </defs>
        {mid}
        <FloorLight cam={cam} L={L} winColor={winColor} />
        <BookStacks cam={cam} frame={frame} />
        <Chair cam={cam} />
        {/* 人在桌子后面（离相机更远一点），先画人 */}
        <g transform={`translate(${man.x} ${man.y}) scale(${FACE * man.s} ${man.s})`}>
          <RimLit
            rim={{...rim, dx: rim.dx / (FACE * man.s), dy: rim.dy / man.s}}
            fill={C.ink}
            farFill="#1A140F"
            draw={(pass, fill, farFill) => (
              <FigureBody
                pose={p}
                fill={fill}
                farFill={farFill}
                pass={pass}
                helmet={wearing ? helm : null}
                propF={(ps, f) => {
                  if (bookOpen) return <OpenBook pose={p} pass={ps} fill={f} L={L} />;
                  if (frame >= s5.start && frame < s6.start + 12) return <Sword pose={p} frame={frame} pass={ps} fill={f} />;
                  return null;
                }}
              />
            )}
          />
        </g>
        <Table cam={cam} />
        <Candle cam={cam} frame={frame} on={candleAt(frame)} />
        {!helmIsNear ? helmNode : null}
        <Cardboard cam={cam} frame={frame} />
        <Dust seed="s1d" frame={frame} count={42} x={0} y={60} w={1920} h={900} size={2} opacity={0.42 * L} reverse={frame < s1.start + 30} />
      </Layer>
      {/* 体积光 */}
      <Layer blur={14} blend="screen" opacity={0.85}>
        <Beams cam={cam} L={L} winColor={winColor} flare={flare} />
      </Layer>
      {/* F 版式：字在前景之下 */}
      <div style={{position: 'absolute', inset: 0}}>
        <LayoutF s={s5} frame={frame} />
      </div>
      {/* 前景：掠过镜头的书架、遮字的书堆、贴脸的头盔 */}
      <Layer blur={6}>
        <defs>
          <HelmetDefs />
        </defs>
        {near}
        <Occluder cam={cam} frame={frame} />
      </Layer>
      {helmIsNear ? (
        <Layer>
          <defs>
            <HelmetDefs />
          </defs>
          {helmNode}
        </Layer>
      ) : null}
      {/* 结尾窗光过曝 */}
      <div style={{position: 'absolute', inset: 0, background: '#FFF1D6', opacity: flare * 0.9, mixBlendMode: 'screen'}} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 场景零件                                                            */
/* ------------------------------------------------------------------ */
const FloorBoards: React.FC<{cam: Cam}> = ({cam}) => (
  <g>
    {Array.from({length: 11}).map((_, i) => {
      const x = -WX + (i + 1) * 55;
      const a = project(cam, x, 0, Math.max(cam.z + 10, -800));
      const b = project(cam, x, 0, END_Z);
      return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#070504" strokeWidth={1.4} opacity={0.7} />;
    })}
  </g>
);

const EndWall: React.FC<{cam: Cam; frame: number; winColor: string; L: number; night: number}> = ({cam, frame, winColor, L, night}) => {
  const arch: Array<[number, number, number]> = [];
  const wx = 170;
  const y0 = 120;
  const y1 = 470;
  arch.push([-wx, y0, END_Z]);
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (Math.PI * i) / 24;
    arch.push([Math.cos(a) * wx, y1 + Math.sin(a) * wx, END_Z]);
  }
  arch.push([wx, y0, END_Z]);
  const pts = polyPoints(cam, arch) ?? '';
  const tl = project(cam, -wx, y1 + wx, END_Z);
  const br = project(cam, wx, y0, END_Z);
  const hz = project(cam, 0, 300, END_Z + 4000).y; // 窗外地平线
  // 窗外田块：第二屏里一块块被雾吞掉
  const strips = 6;
  const fieldW = br.x - tl.x;
  const clock = project(cam, -255, 470, END_Z - 1);
  const minute = frame < s3.start ? frame * 0.5 : frame < s3.end ? s3.start * 0.5 + (frame - s3.start) * 12 : s3.start * 0.5 + (s3.end - s3.start) * 12 + (frame - s3.end) * 0.5;
  return (
    <g>
      <Poly cam={cam} pts={[[-WX, 0, END_Z], [WX, 0, END_Z], [WX, CEIL, END_Z], [-WX, CEIL, END_Z]]} fill="#17110C" />
      <clipPath id="winClip">
        <polygon points={pts} />
      </clipPath>
      <g clipPath="url(#winClip)">
        <rect x={tl.x - 10} y={tl.y - 10} width={fieldW + 20} height={br.y - tl.y + 20} fill={winColor} />
        <rect x={tl.x - 10} y={hz} width={fieldW + 20} height={br.y - hz + 20} fill={mix('#8C7550', '#3E434A', night)} />
        {Array.from({length: strips}).map((_, i) => {
          const gone = prog(frame, THUDS[0] - 30 + i * 14, THUDS[0] - 12 + i * 14);
          const y = hz + ((br.y - hz) * (i * i)) / (strips * strips);
          const h = ((br.y - hz) * (2 * i + 1)) / (strips * strips);
          return (
            <rect
              key={i}
              x={tl.x - 10}
              y={y}
              width={fieldW + 20}
              height={h + 1}
              fill={['#A58A5A', '#6E6340', '#9A7D4E', '#5F5636', '#8F7449', '#6A5C3B'][i]}
              opacity={(1 - gone) * (0.85 - 0.4 * night)}
            />
          );
        })}
        {/* 窗外远山 */}
        <path d={`M ${tl.x - 10} ${hz} Q ${tl.x + fieldW * 0.3} ${hz - fieldW * 0.08} ${tl.x + fieldW * 0.55} ${hz - fieldW * 0.02} T ${br.x + 10} ${hz - fieldW * 0.05} L ${br.x + 10} ${hz + 2} L ${tl.x - 10} ${hz + 2} Z`} fill={mix('#B49866', '#4A5058', night)} opacity={0.6} />
      </g>
      {/* 窗棂 */}
      <Poly cam={cam} pts={[[-6, y0, END_Z - 1], [6, y0, END_Z - 1], [6, y1 + wx, END_Z - 1], [-6, y1 + wx, END_Z - 1]]} fill="#0E0A07" />
      <Poly cam={cam} pts={[[-wx, 330, END_Z - 1], [wx, 330, END_Z - 1], [wx, 342, END_Z - 1], [-wx, 342, END_Z - 1]]} fill="#0E0A07" />
      <polygon points={pts} fill="none" stroke="#0E0A07" strokeWidth={10 * project(cam, 0, 0, END_Z).s} />
      {/* 窗台 */}
      <Poly cam={cam} pts={[[-wx - 20, y0 - 10, END_Z - 30], [wx + 20, y0 - 10, END_Z - 30], [wx + 20, y0, END_Z], [-wx - 20, y0, END_Z]]} fill={mix('#3A2E22', '#8A6A40', 0.3 * L)} />
      {/* 墙上的钟：第三屏里指针飞转 */}
      <g transform={`translate(${clock.x} ${clock.y}) scale(${clock.s})`}>
        <circle r={40} fill="#0D0907" />
        <circle r={34} fill={mix('#6B5A43', '#A08860', L * 0.6)} />
        {Array.from({length: 12}).map((_, i) => (
          <line key={i} x1={0} y1={-29} x2={0} y2={-25} stroke="#1A130D" strokeWidth={2} transform={`rotate(${i * 30})`} />
        ))}
        <line x1={0} y1={0} x2={0} y2={-26} stroke="#120D09" strokeWidth={2.4} transform={`rotate(${minute * 6})`} strokeLinecap="round" />
        <line x1={0} y1={0} x2={0} y2={-17} stroke="#120D09" strokeWidth={3.4} transform={`rotate(${minute * 0.5 + 120})`} strokeLinecap="round" />
        <circle r={2.6} fill="#120D09" />
      </g>
    </g>
  );
};

const ClerestoryWindows: React.FC<{cam: Cam; L: number; winColor: string}> = ({cam, winColor, L}) => (
  <g>
    {[200, 1000, 1800, 2600].map((z) => (
      <Poly key={z} cam={cam} pts={[[-WX + 1, 620, z + 90], [-WX + 1, 735, z + 90], [-WX + 1, 735, z + 310], [-WX + 1, 620, z + 310]]} fill={winColor} opacity={0.55 + 0.45 * L} />
    ))}
  </g>
);

const FloorLight: React.FC<{cam: Cam; L: number; winColor: string}> = ({cam, L, winColor}) => (
  <g style={{mixBlendMode: 'screen'}}>
    {[200, 1000, 1800, 2600].map((z) => (
      <Poly key={z} cam={cam} pts={[[40, 0.5, z + 380], [240, 0.5, z + 380], [260, 0.5, z + 620], [60, 0.5, z + 620]]} fill={winColor} opacity={0.16 * L} />
    ))}
    <Poly cam={cam} pts={[[-150, 0.5, END_Z], [150, 0.5, END_Z], [300, 0.5, END_Z - 1900], [-300, 0.5, END_Z - 1900]]} fill={winColor} opacity={0.13 * L} />
  </g>
);

const Beams: React.FC<{cam: Cam; L: number; winColor: string; flare: number}> = ({cam, L, winColor, flare}) => {
  // 光束不越过相机：离相机太近的光束淡出，尽头那束只铺到相机前方
  const tail = Math.max(END_Z - 1700, cam.z + 700);
  return (
    <g>
      {[200, 1000, 1800, 2600].map((z) => {
        const fadeNear = Math.min(1, Math.max(0, (z + 90 - cam.z) / 600));
        return fadeNear > 0.01 ? (
          <Poly key={z} cam={cam} pts={[[-WX, 735, z + 90], [-WX, 735, z + 310], [250, 0, z + 620], [60, 0, z + 380]]} fill={winColor} opacity={0.2 * L * fadeNear} />
        ) : null;
      })}
      {tail < END_Z - 200 ? (
        <Poly cam={cam} pts={[[-150, 600, END_Z], [150, 600, END_Z], [320, 0, tail], [-320, 0, tail]]} fill={winColor} opacity={(0.18 + 0.4 * flare) * L} />
      ) : null}
    </g>
  );
};

const Chair: React.FC<{cam: Cam}> = ({cam}) => {
  const c = {front: '#140F0B', side: '#0F0B08', top: '#2A2018'};
  return (
    <g>
      <Box cam={cam} x0={90} x1={100} y0={0} y1={130} z0={MAN.z + 14} z1={MAN.z + 22} {...c} />
      <Box cam={cam} x0={90} x1={100} y0={0} y1={130} z0={MAN.z - 24} z1={MAN.z - 16} {...c} />
      <Box cam={cam} x0={40} x1={100} y0={40} y1={46} z0={MAN.z - 24} z1={MAN.z + 22} {...c} />
      <Box cam={cam} x0={40} x1={46} y0={0} y1={40} z0={MAN.z - 24} z1={MAN.z - 18} {...c} />
    </g>
  );
};

const Table: React.FC<{cam: Cam}> = ({cam}) => {
  const c = {front: '#16100B', side: '#100C08', top: '#3A2D20'};
  return (
    <g>
      <Box cam={cam} x0={TABLE.x0 + 6} x1={TABLE.x0 + 14} y0={0} y1={TABLE.y - 6} z0={TABLE.z0 + 6} z1={TABLE.z0 + 14} {...c} />
      <Box cam={cam} x0={TABLE.x1 - 14} x1={TABLE.x1 - 6} y0={0} y1={TABLE.y - 6} z0={TABLE.z0 + 6} z1={TABLE.z0 + 14} {...c} />
      <Box cam={cam} x0={TABLE.x0} x1={TABLE.x1} y0={TABLE.y - 6} y1={TABLE.y} z0={TABLE.z0} z1={TABLE.z1} {...c} />
    </g>
  );
};

/** 第四屏的蜡烛：深夜里照亮头盔的唯一光源 */
const CANDLE = {x: -80, y: TABLE.y, z: 2985};
const Candle: React.FC<{cam: Cam; frame: number; on: number}> = ({cam, frame, on}) => {
  const p = project(cam, CANDLE.x, CANDLE.y, CANDLE.z);
  const flick = 1 + 0.06 * Math.sin(frame * 0.9) + 0.04 * Math.sin(frame * 2.3 + 1);
  return (
    <g>
      <defs>
        <radialGradient id="candleGlow">
          <stop offset="0" stopColor="#FFE3A8" stopOpacity={0.55} />
          <stop offset="0.35" stopColor={C.accent} stopOpacity={0.16} />
          <stop offset="1" stopColor={C.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      {on > 0.01 ? (
        <circle cx={p.x} cy={p.y - 26 * p.s} r={150 * p.s * flick} fill="url(#candleGlow)" opacity={on} style={{mixBlendMode: 'screen'}} />
      ) : null}
      <Box cam={cam} x0={CANDLE.x - 3} x1={CANDLE.x + 3} y0={CANDLE.y} y1={CANDLE.y + 16} z0={CANDLE.z - 3} z1={CANDLE.z + 3} front="#8C7A5C" side="#5A4A36" top="#B5A07A" />
      <g transform={`translate(${p.x} ${p.y - 16 * p.s}) scale(${p.s})`} opacity={on}>
        <path d={`M 0 ${-9 * flick} C 2.6 -4 2.4 -1 0 0 C -2.4 -1 -2.6 -4 0 ${-9 * flick} Z`} fill="#FFE7B0" />
        <path d="M 0 -4 C 1 -2 1 -1 0 0 C -1 -1 -1 -2 0 -4 Z" fill="#FFFFFF" />
      </g>
    </g>
  );
};

/** 第二屏：书越堆越高（时间取自字幕数据里的 thud 音效） */
const BookStacks: React.FC<{cam: Cam; frame: number}> = ({cam, frame}) => (
  <g>
    {[
      {x: 270, z: 3080},
      {x: 225, z: 3200},
      {x: 300, z: 3290},
    ].map((st, i) => {
      const grow = prog(frame, THUDS[i] - 10, THUDS[i] + 2, easeOut);
      const base = 2 + i;
      const n = Math.round(base + grow * (8 + i * 3));
      return (
        <g key={i}>
          {Array.from({length: n}).map((_, k) => {
            const off = (random(`stk${i}-${k}`) - 0.5) * 10;
            const w = 34 + random(`stkw${i}-${k}`) * 12;
            return (
              <Box
                key={k}
                cam={cam}
                x0={st.x - w / 2 + off}
                x1={st.x + w / 2 + off}
                y0={k * 9}
                y1={k * 9 + 8.4}
                z0={st.z - 22}
                z1={st.z + 22}
                front={k % 3 === 0 ? '#3A2C1F' : k % 3 === 1 ? '#2A2017' : '#46362A'}
                side="#160F0A"
                top="#5A4733"
              />
            );
          })}
        </g>
      );
    })}
  </g>
);

/** 第四屏：他手里的纸板一片片贴到头盔前面，配合折纸声 */
const Cardboard: React.FC<{cam: Cam; frame: number}> = ({cam, frame}) => {
  if (frame < s4.start || frame > s4.end) return null;
  return (
    <g>
      {FOLDS.map((f, i) => {
        const t = prog(frame, f - 12, f + 6, easeOut);
        if (t <= 0 || t >= 0.999) return null;
        // 从他右手边（+x）飞向头盔正面
        const x0 = TABLE_HELM.x + 46 + i * 10;
        const x = x0 + (TABLE_HELM.x + 4 - x0) * t;
        const y = TABLE.y + 26 - 14 * t + Math.sin(t * Math.PI) * 10;
        const p = project(cam, x, y, TABLE_HELM.z - 26);
        const rot = (1 - t) * (i ? 35 : -40);
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s * 0.55}) rotate(${rot})`}>
            <path d="M -12 -8 L 13 -9 L 12 8 L -11 9 Z" fill="#6A5A44" stroke="#2A2219" strokeWidth={1.2} />
            <path d="M -8 -1 L 9 -1" stroke="#2A2219" strokeWidth={1} />
          </g>
        );
      })}
    </g>
  );
};

/** 第五屏：挡住字的近景书堆，镜头横移后让开 */
const Occluder: React.FC<{cam: Cam; frame: number}> = ({cam, frame}) => {
  if (frame < s5.start - 20 || frame > s5.end + 20) return null;
  const x = OCC_X;
  const z = OCC_Z;
  return (
    <g>
      {Array.from({length: 30}).map((_, k) => {
        const w = OCC_W - 14 + random(`occ${k}`) * 14;
        const off = (random(`occo${k}`) - 0.5) * 16;
        return (
          <Box
            key={k}
            cam={cam}
            x0={x - w / 2 + off}
            x1={x + w / 2 + off}
            y0={k * 9}
            y1={k * 9 + 8.5}
            z0={z - 8}
            z1={z + 8}
            front={k % 2 ? '#0D0A07' : '#15100B'}
            side="#070504"
            top="#1F1810"
          />
        );
      })}
    </g>
  );
};

const OpenBook: React.FC<{pose: Pose; pass: 'rim' | 'body'; fill: string; L: number}> = ({pose: p, pass, fill, L}) => {
  const hand = p.torso - p.shF - p.elF;
  const page = pass === 'rim' ? fill : mix('#8E7A5C', '#D8C7A4', L);
  return (
    <g transform={`rotate(${-hand + 60}) translate(-4 -4)`}>
      <path d="M -18 2 L 0 -4 L 0 6 L -18 12 Z" fill={page} />
      <path d="M 0 -4 L 18 -2 L 18 9 L 0 6 Z" fill={page} opacity={pass === 'rim' ? 1 : 0.85} />
      <path d="M -18 12 L 0 6 L 18 9 L 18 11 L 0 8.5 L -18 14 Z" fill={pass === 'rim' ? fill : '#2A2017'} />
    </g>
  );
};

const Sword: React.FC<{pose: Pose; frame: number; pass: 'rim' | 'body'; fill: string}> = ({pose: p, frame, pass, fill}) => {
  const hand = p.torso - p.shF - p.elF;
  // 剑身方向：0 = 竖直向上，90 = 向前，180 = 向下
  const world = track(frame, [[s5.start + 4, 110], [SWING - 2, -20], [CRACK, 118]], easeIn);
  return (
    <g transform={`rotate(${world - hand})`}>
      <path d="M -1.6 4 L 1.6 4 L 1.1 -86 L 0 -94 L -1.1 -86 Z" fill={pass === 'rim' ? fill : '#7A6A55'} />
      <path d="M -9 3 L 9 3 L 9 6 L -9 6 Z" fill={fill} />
      <path d="M -1.8 6 L 1.8 6 L 1.8 16 L -1.8 16 Z" fill={fill} />
      {pass === 'body' ? <path d="M 0 -20 L 0 -90" stroke={C.accent} strokeWidth={0.8} opacity={0.5} /> : null}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* 字幕锚点：E 版式跟着人物的头走，字放在头的后方，不压脸             */
/* ------------------------------------------------------------------ */
const anchorS3: AnchorFn = (frame) => {
  const cam = section1Cam(frame);
  const p = manPose(frame);
  const py = pelvisY(frame);
  const man = project(cam, MAN.x, py, MAN.z);
  const h = headOffset(p);
  const hx = man.x + FACE * h.x * man.s;
  const hy = man.y + h.y * man.s;
  // 人面朝左，字放在后脑勺一侧（右边），与头部保持一个头宽的距离；也避开明亮的窗，保证字看得清
  const winRight = project(cam, 185, 300, END_Z).x;
  return {x: Math.max(hx + 26 * man.s, winRight + 36), y: hy - 130};
};

export const section1Anchors: Record<string, AnchorFn> = {'s1-3': anchorS3};

