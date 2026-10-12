import React from 'react';
import {random} from 'remotion';
import {cue, getScreen, sceneRange} from '../data/script';
import {Cam, fogged, project} from '../lib/camera';
import {easeIn, easeOut, prog, track} from '../lib/anim';
import {C} from '../theme';
import {FigureBody, gait, Pose, pose, poseAt, RimLit, STAND} from '../components/Figure';
import {HorseBody} from '../components/Horse';
import {Helmet, HelmetDefs, HelmetState} from '../components/Helmet';
import {Windmill} from '../components/Windmill';
import {Layer} from '../components/Layer';
import {Dust} from '../components/Light';
import {AnchorFn, phrases, textWidth} from '../components/Subtitle';
import {CAM_B, CLUMPS_B, FALL, FAR_MILLS, FogBands, GIANT_B, Grass, HELM_W, HELM_X_END, HELM_Z, Lance, ridge, RIDE, Sky, SkyTone, STONES} from './Opening';

/**
 * 尾声：回到开头"终于清醒"那一刻的同一个机位、同一个构图——
 * 铜盆在前景右下，他在后景。开头他爬起来、回头看；现在他转身走进雾里，不再回头。
 */
const e1 = getScreen('ep-1');
const e2 = getScreen('ep-2');
const e3 = getScreen('ep-3');
const e4 = getScreen('ep-4');
const e5 = getScreen('ep-5');
export const EP = sceneRange('ep');
const RING = cue('ep-4', 'metal_ring');

const PALE: SkyTone = {
  top: '#0E0C0A', upper: '#1E1914', mid: '#3E352A', horizon: '#8A7A62', ground: '#3A3026', groundDark: '#1A1510', sun: 0.25, sunX: 1260,
};
const WARM: SkyTone = {...PALE, horizon: '#A5824C', mid: '#4A3B29', sun: 1};

/* 他：站着望风车 → 转身 → 走进雾里 */
const P_STOOP: Pose = pose({torso: 12, neck: 14, shF: 2, elF: 8, shB: -4, elB: 6}, STAND);
const walkAway = (f: number) => f >= e3.start + 34;
const alonsoX = (f: number) => (walkAway(f) ? track(f, [[e3.start + 34, FALL.x], [e4.start + 60, FALL.x - 260]], (t) => t) : FALL.x);
const alonsoZ = (f: number) => (walkAway(f) ? track(f, [[e3.start + 34, FALL.z], [e4.start + 60, FALL.z + 900]], (t) => t) : FALL.z);
const alonsoFace = (f: number) => (f >= e3.start + 24 ? -1 : 1);
const alonsoPose = (f: number): Pose => {
  if (walkAway(f)) return pose({...gait((f - e3.start) / 18, 0.8), neck: 10, torso: 12}, STAND);
  return poseAt(f, [
    [e1.start, P_STOOP],
    [e2.start, P_STOOP],
    [e2.start + 20, pose({neck: -6}, P_STOOP)],
    [e3.start + 14, pose({neck: 20, torso: 16}, P_STOOP)],
  ]);
};
const alonsoFade = (f: number) => 1 - prog(f, e4.start + 10, e4.start + 64);

/* 回忆里的骑士：从他身上冲出去，冲到半路散成金色的尘 */
const ghostX = (f: number) => track(f, [[e2.start + 4, FALL.x], [e3.start + 24, GIANT_B.x - 260]], easeIn);
const ghostZ = (f: number) => track(f, [[e2.start + 4, FALL.z], [e3.start + 24, GIANT_B.z - 220]], easeIn);
const ghostOpacity = (f: number) => track(f, [[e2.start, 0], [e2.start + 14, 1], [e3.start + 6, 1], [e3.start + 26, 0]]);
const DISSOLVE = e3.start + 6;

const basinAt = (f: number): HelmetState => ({
  morph: 1,
  glow: track(f, [[e1.start, 0], [RING - 6, 0], [RING + 14, 1]]),
  visor: 0,
  scatter: 0,
  dust: track(f, [[e1.start, 0.6], [RING - 6, 0.6], [RING + 10, 0]]),
});

export const epilogueCam = (f: number): Cam => {
  const push = prog(f, e4.start, e5.end, (t) => t);
  return {
    f: 1000,
    x: track(f, [[e1.start, CAM_B.x - 40], [e3.end, CAM_B.x], [e5.end, HELM_X_END - 24]]),
    y: track(f, [[e1.start, CAM_B.y + 8], [e3.end, CAM_B.y], [e5.end, 18]]),
    z: track(f, [[e1.start, CAM_B.z - 60], [e3.end, CAM_B.z]]) + push * 50,
    cx: 960,
    cy: track(f, [[e1.start, 520], [e5.end, 540]]),
  };
};

export const Epilogue: React.FC<{frame: number}> = ({frame: f}) => {
  const cam = epilogueCam(f);
  const fogD = 2600;
  const whiteIn = 1 - prog(f, e1.start, e1.start + 24);
  const sunBreak = prog(f, e4.start + 10, RING + 10);
  const tone: SkyTone = {
    ...PALE,
    sun: PALE.sun + (WARM.sun - PALE.sun) * sunBreak,
    horizon: sunBreak > 0.5 ? WARM.horizon : PALE.horizon,
    mid: sunBreak > 0.5 ? WARM.mid : PALE.mid,
  };
  const gm = project(cam, GIANT_B.x, 0, GIANT_B.z);
  const ap = project(cam, alonsoX(f), 92, alonsoZ(f));
  const face = alonsoFace(f);
  const rim = {color: C.accent, opacity: 0.35 + 0.5 * sunBreak, dx: 1.6, dy: -1.6};
  // 回忆里的骑士
  const go = ghostOpacity(f);
  const gp = project(cam, ghostX(f), 0, ghostZ(f));
  const helm = basinAt(f);
  const hp = project(cam, HELM_X_END, 0, HELM_Z);
  const k = (HELM_W / 110) * hp.s;
  return (
    <div style={{position: 'absolute', inset: 0, background: C.base, overflow: 'hidden'}}>
      <Sky cam={cam} frame={f} dim={0.2} tone={tone} />
      <Layer blur={track(f, [[e1.start, 0.6], [e4.start, 0.6], [e4.start + 40, 3]])}>
        <defs>
          <HelmetDefs />
        </defs>
        {ridge(cam, 9000, 700, 0.00025, 0.7, '#33281C', 4200)}
        {ridge(cam, 6000, 360, 0.0004, 2.9, '#251D15', 4200)}
        {FAR_MILLS.slice(2, 7).map(([x, z], i) => {
          const p = project(cam, x - 600, 120, z);
          return <Windmill key={i} x={p.x} y={p.y} scale={p.s} rot={f * 0.4 + i * 31} fill={fogged('#15100B', '#7A6040', p.d, 4200)} detail={false} />;
        })}
        <Windmill x={gm.x} y={gm.y} scale={gm.s} rot={f * 0.45 + 40} fill={fogged(C.ink, '#6E5638', gm.d, 6000)} rim={C.accent} rimOpacity={0.2 + 0.4 * sunBreak} />
        {/* 回忆里的骑士：半透明，只留一圈金边 */}
        {go > 0.01 ? (
          <g opacity={go * 0.78} transform={`translate(${gp.x} ${gp.y - 128 * gp.s}) scale(${gp.s})`}>
            <RimLit
              rim={{color: C.accent, opacity: 0.95, dx: 2 / gp.s, dy: -2 / gp.s}}
              fill="rgba(24,18,12,0.88)"
              draw={(pass, fill, far) => (
                <HorseBody
                  state={{gait: 'gallop', phase: (f - e2.start) * 0.085, rear: 0, head: -6, tail: Math.sin(f * 0.1) * 8}}
                  fill={fill}
                  farFill={far}
                  rider={
                    <g transform="translate(-6 -10)">
                      <FigureBody
                        pose={pose({torso: 14, shF: 44, elF: 40}, RIDE)}
                        fill={fill}
                        farFill={far}
                        pass={pass}
                        helmet={{morph: 1, glow: 1, visor: 0, scatter: 0}}
                        propF={(ps, fl) => <Lance angle={84} handAngle={14 - 44 - 40} tip={1} pass={ps} fill={fl} />}
                      />
                    </g>
                  }
                />
              )}
            />
          </g>
        ) : null}
        <GhostDust cam={cam} f={f} />
        {/* 他 */}
        <ellipse cx={ap.x} cy={ap.y + 92 * ap.s} rx={36 * ap.s} ry={5 * ap.s} fill="#000" opacity={0.45 * alonsoFade(f)} />
        <g opacity={alonsoFade(f)} transform={`translate(${ap.x} ${ap.y}) scale(${face * ap.s} ${ap.s})`}>
          <RimLit
            rim={{...rim, dx: (face * rim.dx) / ap.s, dy: rim.dy / ap.s}}
            fill={C.ink}
            farFill="#1C1610"
            draw={(pass, fill, far) => <FigureBody pose={alonsoPose(f)} fill={fill} farFill={far} pass={pass} />}
          />
        </g>
        <Grass cam={cam} clumps={CLUMPS_B} frame={f} filter={(d) => d > 260} fogD={fogD} />
        <Dust seed="epd" frame={f} count={30} x={200} y={120} w={1600} h={600} size={2} opacity={0.35 + 0.3 * sunBreak} />
      </Layer>
      <Layer>
        <defs>
          <HelmetDefs />
        </defs>
        {STONES.map((s, i) => {
          const p = project(cam, s.x, 0, s.z);
          if (p.d < 30) return null;
          return <ellipse key={i} cx={p.x} cy={p.y - s.r * 0.4 * p.s} rx={s.r * p.s} ry={s.r * 0.55 * p.s} fill={fogged('#1A140E', '#6E5638', p.d, fogD)} />;
        })}
        <Grass cam={cam} clumps={CLUMPS_B} frame={f} filter={(d) => d <= 260} fogD={fogD} />
        {/* 前景的铜盆：和开头那顶头盔同一个位置 */}
        <Helmet state={helm} x={hp.x} y={hp.y - 2 * k} size={HELM_W * hp.s} rotate={0} shadow />
      </Layer>
      <FogBands cam={cam} frame={f} strength={0.75} />
      <div style={{position: 'absolute', inset: 0, background: '#F1E9D8', opacity: whiteIn}} />
    </div>
  );
};

/** 骑士散成金色的尘 */
const GhostDust: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const t = f - DISSOLVE;
  if (t < 0 || t > 70) return null;
  const c = project(cam, ghostX(DISSOLVE + 10), 150, ghostZ(DISSOLVE + 10));
  const e = easeOut(t / 70);
  return (
    <g style={{mixBlendMode: 'screen'}}>
      {Array.from({length: 90}).map((_, i) => {
        const ang = random(`gd${i}`) * Math.PI * 2;
        const sp = (40 + random(`gds${i}`) * 260) * c.s;
        const rise = e * (60 + random(`gdr${i}`) * 140) * c.s;
        return (
          <circle
            key={i}
            cx={c.x + Math.cos(ang) * sp * e + Math.sin(t * 0.05 + i) * 6}
            cy={c.y + Math.sin(ang) * sp * e * 0.5 - rise}
            r={(1.2 + random(`gdz${i}`) * 2.6) * Math.max(0.8, c.s)}
            fill="#F1D296"
            opacity={(1 - e) * 0.9}
          />
        );
      })}
    </g>
  );
};

/* 第二屏：字跟着回忆里的骑士走，排在他身后上方 */
const anchorGhost: AnchorFn = (f) => {
  const cam = epilogueCam(f);
  const p = project(cam, ghostX(f), 260, ghostZ(f));
  const lines = phrases(e2.text);
  const w = Math.max(...lines.map((l) => textWidth(l, 68)));
  return {x: p.x - w - 40, y: p.y - 200};
};

export const epilogueAnchors: Record<string, AnchorFn> = {'ep-2': anchorGhost};
