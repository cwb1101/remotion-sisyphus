import React from 'react';
import {random} from 'remotion';
import {cue, getScreen, sceneRange} from '../data/script';
import {Cam, fogged, polyPoints, project} from '../lib/camera';
import {clamp, easeIn, easeOut, mix, prog, track} from '../lib/anim';
import {C, W} from '../theme';
import {FigureBody, gait, gaitBob, headOffset, Pose, pose, poseAt, RimLit, STAND} from '../components/Figure';
import {Dress, FigureFront, FRONT_IDLE, FrontPose} from '../components/FigureFront';
import {HelmetDefs, HelmetState} from '../components/Helmet';
import {Layer} from '../components/Layer';
import {Beam, Dust} from '../components/Light';
import {AnchorFn, LayoutF} from '../components/Subtitle';

/* ------------------------------------------------------------------ */
/* 时间点（全部来自字幕数据）                                          */
/* ------------------------------------------------------------------ */
const b1 = getScreen('s3-1');
const b2 = getScreen('s3-2');
const b3 = getScreen('s3-3');
const b4 = getScreen('s3-4');
export const S3 = sceneRange('s3');
const MASK_WAVE = cue('s3-2', 'rustle_wave');
const SLAM = b4.start + (b4.delay ?? 0);
const PUSH = cue('s3-4', 'whoosh_rev');

/* ------------------------------------------------------------------ */
/* 世界：横向的石柱大厅，相机朝 +z 看，人物沿 x 走                     */
/* ------------------------------------------------------------------ */
const WALK_Z = 900;
const BACK_Z = 2400;
const CEIL = 1150;
const GALLERY_Y = 420;
const GALLERY_Z = 2150;
const CROWD_Z = 1500;
const DAIS = {x0: 1300, x1: 1720, z0: 1250, z1: 1700, h: 75};
const FOG = '#5A4A38';

const qxAt = (f: number) =>
  track(f, [
    [b1.start, -1500],
    [b2.start, -800],
    [b3.start, 600],
    [b3.start + 26, 780],
  ], (t) => t);
const walkingAt = (f: number) => f < b3.start + 26;

interface Member {
  x: number;
  z: number;
  dress: Dress;
  k: number;
  seed: string;
}
const crowd = (seed: string, x0: number, x1: number, step: number, z: number): Member[] => {
  const out: Member[] = [];
  let i = 0;
  for (let x = x0; x <= x1; x += step) {
    const r = random(`${seed}${i}`);
    out.push({
      x: x + (random(`${seed}x${i}`) - 0.5) * step * 0.5,
      z: z + (random(`${seed}z${i}`) - 0.5) * 50,
      dress: r < 0.3 ? 'gown' : r < 0.55 ? 'hat' : r < 0.7 ? 'scarf' : 'coat',
      k: 0.92 + random(`${seed}k${i}`) * 0.14,
      seed: `${seed}${i}`,
    });
    i++;
  }
  return out;
};
const GALLERY = crowd('gal', -2800, 2800, 78, GALLERY_Z + 80);
// 地面这一排让出中间的过道（他从前面走过，人群站在后面）
const FLOOR = crowd('flr', -1800, 2800, 92, CROWD_Z).filter((m) => m.x < DAIS.x0 - 40 || m.x > DAIS.x1 + 40);
/** 最后镜头穿进去的那张面具 */
const MASK_TARGET = FLOOR.reduce((best, m) => (Math.abs(m.x - 980) < Math.abs(best.x - 980) ? m : best), FLOOR[0]);

/* ------------------------------------------------------------------ */
/* 人物                                                                */
/* ------------------------------------------------------------------ */
const quixotePose = (f: number): Pose => {
  if (walkingAt(f)) {
    return pose({...gait((f - b1.start) / 15, 0.9), neck: 2}, STAND);
  }
  return poseAt(f, [
    [b3.start + 26, pose({torso: 3, neck: 4}, STAND)],
    [b3.start + 44, pose({torso: -4, neck: -26, shF: 8, shB: -6}, STAND)],
    [b4.start, pose({torso: -4, neck: -26, shF: 8, shB: -6}, STAND)],
    [b4.start + 30, pose({torso: 6, neck: 10, shF: 4, shB: -2}, STAND)],
  ]);
};
const qPelvisY = (f: number) => 92 + (walkingAt(f) ? gaitBob((f - b1.start) / 15, 0.9) : 0);

const basinAt = (f: number): HelmetState => ({
  morph: 1,
  glow: track(f, [[b1.start, 0.85], [b3.start + 30, 0.85], [b3.start + 50, 1], [SLAM, 1], [SLAM + 10, 0.55]]),
  visor: 0,
  scatter: 0,
  reflection: 0.6,
  reflectRot: f * 0.6,
});

/** 头上铜盆的世界坐标：开场时镜头贴着它（接上一节的特写） */
const basinWorld = (f: number) => {
  const h = headOffset(quixotePose(f));
  return {x: qxAt(f) + h.x + 0.5, y: qPelvisY(f) - h.y + 7.6, z: WALK_Z};
};

const crowdPose = (m: Member, f: number, floor: boolean): FrontPose => {
  const q = qxAt(f);
  const turn = clamp((q - m.x) / 500, -1, 1) * 4;
  if (!floor) {
    return {...FRONT_IDLE, turn, armL: 6 + random(`${m.seed}a`) * 10, armR: 6 + random(`${m.seed}b`) * 10};
  }
  // 他走过时，地面的人依次鞠躬；随后面具像波浪一样举起来
  const passT = clamp((q - m.x + 200) / 300);
  const bow = f < b3.start ? Math.sin(passT * Math.PI) * 0.8 : 0;
  const delay = ((m.x + 1800) / 4600) * 40;
  const mask = prog(f, MASK_WAVE + delay, MASK_WAVE + delay + 12);
  const laugh = f >= SLAM ? Math.sin((f - SLAM) * 0.45 + m.x * 0.01) * 9 * prog(f, SLAM, SLAM + 10) : 0;
  return {
    ...FRONT_IDLE,
    turn,
    bow,
    mask,
    laugh,
    armR: 6 + mask * 14,
    elR: 8 + mask * 120,
    step: f >= SLAM ? Math.sin((f - SLAM) * 0.3 + m.x) * 0.3 : 0,
  };
};

/* ------------------------------------------------------------------ */
/* 相机                                                                */
/* ------------------------------------------------------------------ */
const FRONT_CAM_Z = 250;
const FRONT_Z = 430;
export const section3Cam = (f: number): Cam => {
  const b = basinWorld(Math.max(f, b1.start));
  const start = {x: b.x, y: b.y + 2, z: b.z - 6};
  const pull = prog(f, b1.start, b1.start + 46, easeOut);
  const q = qxAt(f);
  const wide = {x: q + 240, y: 560, z: -900};
  if (f < b2.start) {
    return {
      f: 1000,
      x: start.x + (wide.x - start.x) * pull,
      y: start.y + (wide.y - start.y) * pull,
      z: start.z + (wide.z - start.z) * Math.pow(pull, 0.6),
      cx: 960,
      cy: 540 - 200 * pull,
    };
  }
  const push = prog(f, PUSH, b4.end, easeIn);
  const mtHead = {x: MASK_TARGET.x, y: 165, z: MASK_TARGET.z};
  const keys = {
    x: [[b2.start, q + 240], [b2.start + 18, q + 140], [b3.start - 1, qxAt(b3.start - 1) + 140], [b3.start + 22, 640], [b3.end - 2, 650], [b4.start + 20, MASK_TARGET.x - 20], [PUSH, MASK_TARGET.x - 20]] as Array<[number, number]>,
    y: [[b2.start, 560], [b2.start + 18, 170], [b3.start - 1, 170], [b3.start + 22, 70], [b3.end - 2, 66], [b4.start + 20, 330], [PUSH, 330]] as Array<[number, number]>,
    z: [[b2.start, -900], [b2.start + 18, FRONT_CAM_Z], [b3.start - 1, FRONT_CAM_Z + 20], [b3.start + 22, WALK_Z - 270], [b3.end - 2, WALK_Z - 255], [b4.start + 20, MASK_TARGET.z - 450], [PUSH, MASK_TARGET.z - 430]] as Array<[number, number]>,
    cy: [[b2.start, 340], [b2.start + 18, 560], [b3.start - 1, 560], [b3.start + 22, 700], [b3.end - 2, 700], [b4.start + 20, 430], [PUSH, 430]] as Array<[number, number]>,
  };
  // s3-2 期间镜头跟着人横移
  const tracking = f >= b2.start + 18 && f < b3.start ? 1 : 0;
  const x = tracking ? q + 140 : track(f, keys.x);
  const base = {x, y: track(f, keys.y), z: track(f, keys.z), cy: track(f, keys.cy)};
  return {
    f: 1000,
    x: base.x + (mtHead.x - base.x) * push,
    y: base.y + (mtHead.y - 4 - base.y) * push,
    z: base.z + (mtHead.z - 8 - base.z) * push,
    cx: 960,
    cy: base.cy + (540 - base.cy) * push,
  };
};

/* ------------------------------------------------------------------ */
/* 绘制                                                                */
/* ------------------------------------------------------------------ */
const Poly: React.FC<{cam: Cam; pts: Array<[number, number, number]>; fill: string; opacity?: number}> = ({cam, pts, fill, opacity}) => {
  const p = polyPoints(cam, pts);
  return p ? <polygon points={p} fill={fill} opacity={opacity} /> : null;
};

const Floor: React.FC<{cam: Cam}> = ({cam}) => {
  // 棋盘格地面：只画深色格子，合成一条 path
  const T = 160;
  const z0 = Math.max(Math.ceil((cam.z + 30) / T) * T, -800);
  let d = '';
  const xs = Math.floor((cam.x - 3200) / T) * T;
  for (let z = z0; z < BACK_Z; z += T) {
    for (let x = xs; x < cam.x + 3200; x += T) {
      if (((x / T + z / T) & 1) !== 0) continue;
      const p = polyPoints(cam, [[x, 0, z], [x + T, 0, z], [x + T, 0, z + T], [x, 0, z + T]]);
      if (p) d += `M${p.replace(/ /g, 'L')}Z`;
    }
  }
  return (
    <g>
      <Poly cam={cam} pts={[[cam.x - 6000, 0, cam.z + 20], [cam.x + 6000, 0, cam.z + 20], [cam.x + 6000, 0, BACK_Z], [cam.x - 6000, 0, BACK_Z]]} fill="#3A2E22" />
      <path d={d} fill="#1A140F" opacity={0.85} />
    </g>
  );
};

const BackWall: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const wins = [];
  for (let x = -3000; x <= 3000; x += 600) {
    const arch: Array<[number, number, number]> = [[x - 110, 560, BACK_Z - 1]];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI - (Math.PI * i) / 12;
      arch.push([x + Math.cos(a) * 110, 870 + Math.sin(a) * 110, BACK_Z - 1]);
    }
    arch.push([x + 110, 560, BACK_Z - 1]);
    const p = polyPoints(cam, arch);
    if (p) wins.push(<polygon key={x} points={p} fill={mix('#E9CC92', '#FFF0D0', 0.3 + 0.2 * Math.sin(f * 0.02 + x))} />);
  }
  return (
    <g>
      <Poly cam={cam} pts={[[cam.x - 7000, 0, BACK_Z], [cam.x + 7000, 0, BACK_Z], [cam.x + 7000, CEIL, BACK_Z], [cam.x - 7000, CEIL, BACK_Z]]} fill="#211910" />
      {wins}
      {/* 看台 */}
      <Poly cam={cam} pts={[[cam.x - 7000, GALLERY_Y - 30, GALLERY_Z], [cam.x + 7000, GALLERY_Y - 30, GALLERY_Z], [cam.x + 7000, GALLERY_Y, GALLERY_Z], [cam.x - 7000, GALLERY_Y, GALLERY_Z]]} fill="#140F0A" />
    </g>
  );
};

const Balustrade: React.FC<{cam: Cam}> = ({cam}) => {
  const items = [];
  for (let x = Math.floor((cam.x - 3200) / 40) * 40; x < cam.x + 3200; x += 40) {
    const p = polyPoints(cam, [[x - 7, GALLERY_Y, GALLERY_Z], [x + 7, GALLERY_Y, GALLERY_Z], [x + 7, GALLERY_Y + 60, GALLERY_Z], [x - 7, GALLERY_Y + 60, GALLERY_Z]]);
    if (p) items.push(<polygon key={x} points={p} fill="#140F0A" />);
  }
  return (
    <g>
      {items}
      <Poly cam={cam} pts={[[cam.x - 7000, GALLERY_Y + 56, GALLERY_Z - 4], [cam.x + 7000, GALLERY_Y + 56, GALLERY_Z - 4], [cam.x + 7000, GALLERY_Y + 70, GALLERY_Z - 4], [cam.x - 7000, GALLERY_Y + 70, GALLERY_Z - 4]]} fill="#1C1510" />
    </g>
  );
};

/** 一根石柱：柱身 + 柱头 + 柱础；near 时画成近景深色 */
const Column: React.FC<{cam: Cam; x: number; z: number; w: number; fill: string}> = ({cam, x, z, w, fill}) => (
  <g>
    <Poly cam={cam} pts={[[x - w / 2, 0, z], [x + w / 2, 0, z], [x + w / 2, CEIL, z], [x - w / 2, CEIL, z]]} fill={fill} />
    <Poly cam={cam} pts={[[x - w * 0.8, 0, z - 2], [x + w * 0.8, 0, z - 2], [x + w * 0.75, 30, z - 2], [x - w * 0.75, 30, z - 2]]} fill={fill} />
    <Poly cam={cam} pts={[[x - w * 0.85, 940, z - 2], [x + w * 0.85, 940, z - 2], [x + w * 0.7, 990, z - 2], [x - w * 0.7, 990, z - 2]]} fill={fill} />
  </g>
);

const Dais: React.FC<{cam: Cam}> = ({cam}) => (
  <g>
    {[0, 1, 2].map((k) => {
      const zf = DAIS.z0 - (2 - k) * 40;
      const y1 = (k + 1) * (DAIS.h / 3);
      return <Poly key={k} cam={cam} pts={[[DAIS.x0 - (2 - k) * 40, 0, zf], [DAIS.x1 + (2 - k) * 40, 0, zf], [DAIS.x1 + (2 - k) * 40, y1, zf], [DAIS.x0 - (2 - k) * 40, y1, zf]]} fill={k % 2 ? '#2A2017' : '#33281D'} />;
    })}
    <Poly cam={cam} pts={[[DAIS.x0, DAIS.h, DAIS.z0], [DAIS.x1, DAIS.h, DAIS.z0], [DAIS.x1, DAIS.h, DAIS.z1], [DAIS.x0, DAIS.h, DAIS.z1]]} fill="#46382A" />
  </g>
);

const Front: React.FC<{cam: Cam; m: Member; p: FrontPose; y?: number; fill: string; k?: number}> = ({cam, m, p, y = 92, fill, k = 1}) => {
  const pr = project(cam, m.x, y, m.z);
  if (pr.x < -200 || pr.x > W + 200 || pr.d < 30) return null;
  return (
    <g transform={`translate(${pr.x} ${pr.y}) scale(${pr.s * m.k * k})`}>
      <FigureFront pose={p} fill={fill} dress={m.dress} />
    </g>
  );
};

export const Section3: React.FC<{frame: number}> = ({frame: f}) => {
  const cam = section3Cam(f);
  const q = qxAt(f);
  const qp = quixotePose(f);
  const man = project(cam, q, qPelvisY(f), WALK_Z);
  const basin = basinAt(f);
  const rim = {color: C.accent, opacity: 0.9, dx: -1.4, dy: -1.8};
  // 他第一次真正相信自己是骑士：金光最亮，头顶一圈光晕
  const aura = track(f, [[b3.start + 30, 0], [b3.start + 54, 1], [SLAM, 1], [SLAM + 12, 0.2]]);
  const head = headOffset(qp);
  const auraP = {x: man.x + (head.x + 0.5) * man.s, y: man.y + (head.y - 8) * man.s};
  const columnsBack = [];
  for (let x = -3200; x <= 3200; x += 500) {
    const pr = project(cam, x, 0, 1900);
    if (pr.x < -400 || pr.x > W + 400) continue;
    columnsBack.push(<Column key={x} cam={cam} x={x} z={1900} w={70} fill={fogged('#241B13', FOG, pr.d, 3200)} />);
  }
  const colsFront = [];
  for (let x = -2700; x <= 2700; x += 900) {
    const pr = project(cam, x, 0, FRONT_Z);
    if (pr.d < 20 || pr.x < -1200 || pr.x > W + 1200) continue;
    colsFront.push(<Column key={x} cam={cam} x={x} z={FRONT_Z} w={120} fill="#0A0705" />);
  }
  const lords: Array<{m: Member; p: FrontPose}> = [
    {m: {x: 1450, z: 1480, dress: 'coat', k: 1.06, seed: 'duke'}, p: {...FRONT_IDLE, armR: track(f, [[b2.start + 20, 6], [b2.start + 40, 118]]), elR: 30, turn: -3}},
    {m: {x: 1580, z: 1480, dress: 'gown', k: 1.0, seed: 'duchess'}, p: {...FRONT_IDLE, armL: track(f, [[b2.start + 26, 6], [b2.start + 46, 110]]), elL: 30, turn: -3}},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0D0A07', overflow: 'hidden'}}>
      <Layer blur={1.4}>
        <BackWall cam={cam} f={f} />
        {GALLERY.map((m) => (
          <Front key={m.seed} cam={cam} m={m} p={crowdPose(m, f, false)} y={GALLERY_Y + 92 - 60} fill={fogged('#120D09', FOG, 1500, 3200)} />
        ))}
        <Balustrade cam={cam} />
      </Layer>
      <Layer blur={10} blend="screen" opacity={0.75}>
        {[-1800, -600, 600, 1800].map((x) => {
          const top = project(cam, x, 860, BACK_Z);
          const bot = project(cam, x - 500, 0, 1000);
          return <Beam key={x} id={`hb${x}`} x1={top.x} y1={top.y} w1={180 * top.s} x2={bot.x} y2={bot.y} w2={420 * bot.s} color="#E9C989" opacity={0.55} />;
        })}
      </Layer>
      <Layer>
        <defs>
          <HelmetDefs />
          <radialGradient id="auraG">
            <stop offset="0" stopColor="#FFE6A8" stopOpacity={0.75} />
            <stop offset="0.4" stopColor={C.accent} stopOpacity={0.25} />
            <stop offset="1" stopColor={C.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
        <Floor cam={cam} />
        {columnsBack}
        <Dais cam={cam} />
        {lords.map(({m, p}) => (
          <Front key={m.seed} cam={cam} m={m} p={p} y={DAIS.h + 92} fill="#0F0B08" />
        ))}
        {FLOOR.map((m) => (
          <Front key={m.seed} cam={cam} m={m} p={crowdPose(m, f, true)} fill={fogged('#0F0B08', FOG, project(cam, m.x, 0, m.z).d, 4200)} />
        ))}
        {/* 他 */}
        <ellipse cx={man.x} cy={man.y + 92 * man.s} rx={40 * man.s} ry={6 * man.s} fill="#000" opacity={0.5} />
        {aura > 0.01 ? <circle cx={auraP.x} cy={auraP.y} r={150 * man.s} fill="url(#auraG)" opacity={aura} style={{mixBlendMode: 'screen'}} /> : null}
        <g transform={`translate(${man.x} ${man.y}) scale(${man.s})`}>
          <RimLit
            rim={{...rim, dx: rim.dx / man.s, dy: rim.dy / man.s}}
            fill={C.ink}
            farFill="#1A140F"
            draw={(pass, fill, far) => <FigureBody pose={qp} fill={fill} farFill={far} pass={pass} helmet={basin} />}
          />
        </g>
        <Petals f={f} />
        <Dust seed="s3d" frame={f} count={40} x={0} y={0} w={W} h={1080} size={2} opacity={0.38} />
      </Layer>
      {/* F 版式：字在近景石柱之下 */}
      <div style={{position: 'absolute', inset: 0}}>
        <LayoutF s={b2} frame={f} />
      </div>
      <Layer blur={7}>{colsFront}</Layer>
      {/* 最后穿进面具：白色填满画面 */}
      <div style={{position: 'absolute', inset: 0, background: '#E6DDCB', opacity: prog(f, b4.end - 6, b4.end)}} />
    </div>
  );
};

/** 第三屏：香水和花瓣从光里落下（陪衬） */
const Petals: React.FC<{f: number}> = ({f}) => {
  const on = track(f, [[b3.start, 0], [b3.start + 16, 1], [b4.start + 10, 1], [b4.start + 30, 0]]);
  if (on <= 0.01) return null;
  return (
    <g opacity={on}>
      {Array.from({length: 46}).map((_, i) => {
        const t = f - b3.start;
        const x0 = random(`pt${i}`) * W;
        const sp = 1.2 + random(`pts${i}`) * 2;
        const y = ((random(`pty${i}`) * 1200 + t * sp * 3) % 1200) - 60;
        const x = x0 + Math.sin(t * 0.05 + i) * 30;
        const rot = t * (2 + i % 5) + i * 40;
        return <ellipse key={i} cx={x} cy={y} rx={5} ry={2.4} transform={`rotate(${rot} ${x} ${y})`} fill={i % 3 ? '#E9C989' : '#C9A26A'} opacity={0.75} />;
      })}
    </g>
  );
};

export const section3Anchors: Record<string, AnchorFn> = {};
