import React from 'react';
import {random} from 'remotion';
import {cue, getScreen, sceneRange} from '../data/script';
import {Cam, project} from '../lib/camera';
import {ease, easeIn, easeOut, mix, prog, track} from '../lib/anim';
import {C, H, W} from '../theme';
import {FigureBody, gait, headOffset, Pose, pose, poseAt, RimLit, STAND} from '../components/Figure';
import {HorseBody, HorseState} from '../components/Horse';
import {Helmet, HelmetDefs, HelmetState} from '../components/Helmet';
import {Layer} from '../components/Layer';
import {Dust} from '../components/Light';
import {AnchorFn} from '../components/Subtitle';
import {Lance, RIDE} from './Opening';

/* ------------------------------------------------------------------ */
/* 时间点（全部来自字幕数据）                                          */
/* ------------------------------------------------------------------ */
const c1 = getScreen('s4-1');
const c2 = getScreen('s4-2');
const c3 = getScreen('s4-3');
const c4 = getScreen('s4-4');
const c5 = getScreen('s4-5');
const c6 = getScreen('s4-6');
export const S4 = sceneRange('s4');
const CLASH = cue('s4-3', 'clash');
const TOUCH = cue('s4-3', 'metal_touch');
const AWAY = cue('s4-5', 'hooves_away');
const RUN = cue('s4-5', 'run_sand');
const CRASH = cue('s4-6', 'wave_crash');
const FOAM = cue('s4-6', 'whoosh_rev');

/* ------------------------------------------------------------------ */
/* 世界：海平线在远处，沙滩沿 x 展开                                   */
/* ------------------------------------------------------------------ */
const SHORE_Z = 2600;
const RIDE_Z = 1500;
const Q0 = -420;
const K0 = 420;
const MEET = 0;
const LIE = {x: -40, z: RIDE_Z};
const SILVER = '#DCD6CA';

const qHorseX = (f: number) => track(f, [[c3.start + 4, Q0], [CLASH, MEET - 60]], easeIn);
const kHorseX = (f: number) =>
  f < AWAY ? track(f, [[c3.start + 4, K0], [CLASH, MEET + 110], [CLASH + 14, MEET + 160]], easeIn) : track(f, [[AWAY, MEET + 160], [c6.start + 30, 2400]], easeIn);
const knightFacing = (f: number) => (f >= AWAY ? 1 : -1);

/* ------------------------------------------------------------------ */
/* 人物动作                                                            */
/* ------------------------------------------------------------------ */
const P_LIE: Pose = pose({rootRot: 82, torso: 0, neck: -6, shF: 40, elF: 70, shB: 20, elB: 90, hipF: 70, knF: 110, hipB: 60, knB: 120, anF: 0, anB: 0});
const P_LOOK: Pose = pose({neck: -30}, P_LIE);

const lyingPose = (f: number) => poseAt(f, [[CLASH + 22, P_LIE], [c4.start + 30, P_LIE], [c4.start + 56, P_LOOK], [c5.start + 30, P_LOOK], [c5.start + 50, P_LIE]]);

const basinAt = (f: number): HelmetState => ({
  morph: 1,
  glow: track(f, [[c1.start, 0.7], [CLASH, 0.7], [CLASH + 10, 0.25], [c6.start, 0.25], [CRASH, 0.4], [CRASH + 24, 0.05]]),
  visor: 0,
  scatter: 0,
});

/* ------------------------------------------------------------------ */
/* 相机                                                                */
/* ------------------------------------------------------------------ */
/** 白月骑士盾牌的位置：开场镜头贴着它（接上一节的面具） */
const shieldWorld = (f: number) => ({x: kHorseX(f) - 18, y: 128 + 40, z: RIDE_Z - 30});

export const section4Cam = (f: number): Cam => {
  const sh = shieldWorld(c1.start);
  const pull = prog(f, c1.start, c1.start + 56, ease);
  const startCam = {x: sh.x, y: sh.y, z: sh.z - 8};
  const wide = {x: 0, y: 190, z: -360};
  if (f < c1.start + 56) {
    return {
      f: 1000,
      x: startCam.x + (wide.x - startCam.x) * pull,
      y: startCam.y + (wide.y - startCam.y) * pull,
      z: startCam.z + (wide.z - startCam.z) * Math.pow(pull, 0.5),
      cx: 960,
      cy: 560 - 40 * pull,
    };
  }
  const lieHead = {x: LIE.x + 60, y: 30, z: LIE.z};
  const keys = {
    x: [[c1.start + 56, 0], [c1.end - 2, 20], [c2.start + 24, 640], [c2.end - 2, 650], [c3.start + 10, 0], [CLASH + 10, -20], [TOUCH - 10, lieHead.x - 60], [c3.end - 2, lieHead.x - 70], [c4.start + 20, lieHead.x - 110], [c4.end - 2, lieHead.x - 105], [c5.start + 24, -400], [c5.end - 2, -380], [c6.start + 14, 120], [CRASH + 16, 130], [c6.end, 180]],
    y: [[c1.start + 56, 190], [c1.end - 2, 190], [c2.start + 24, 196], [c2.end - 2, 190], [c3.start + 10, 230], [CLASH + 10, 220], [TOUCH - 10, 70], [c3.end - 2, 66], [c4.start + 20, 40], [c4.end - 2, 40], [c5.start + 24, 120], [c5.end - 2, 125], [c6.start + 14, 260], [CRASH + 16, 200], [c6.end, 40]],
    z: [[c1.start + 56, -360], [c1.end - 2, -300], [c2.start + 24, 1000], [c2.end - 2, 1040], [c3.start + 10, -200], [CLASH + 10, 0], [TOUCH - 10, LIE.z - 330], [c3.end - 2, LIE.z - 310], [c4.start + 20, LIE.z - 190], [c4.end - 2, LIE.z - 180], [c5.start + 24, 700], [c5.end - 2, 740], [c6.start + 14, -900], [CRASH + 16, -700], [c6.end, 300]],
    cy: [[c1.start + 56, 520], [c2.start + 24, 500], [c2.end - 2, 500], [c3.start + 10, 520], [TOUCH - 10, 600], [c4.start + 20, 640], [c5.start + 24, 560], [c6.start + 14, 520], [c6.end, 480]],
  } as Record<string, Array<[number, number]>>;
  return {f: 1000, x: track(f, keys.x), y: track(f, keys.y), z: track(f, keys.z), cx: 960, cy: track(f, keys.cy)};
};

/* ------------------------------------------------------------------ */
/* 场景本体                                                            */
/* ------------------------------------------------------------------ */
export const Section4: React.FC<{frame: number}> = ({frame: f}) => {
  const cam = section4Cam(f);
  const sun = prog(f, c6.start, c6.end, ease);
  const fallen = f >= CLASH;
  const rimQ = {color: C.accent, opacity: 0.85, dx: 1.6, dy: -1.6};
  const rimK = {color: SILVER, opacity: 0.95, dx: 1.6, dy: -1.6};
  // 堂吉诃德的马
  const qhp = project(cam, fallen ? track(f, [[CLASH, MEET - 60], [CLASH + 30, MEET - 260]]) : qHorseX(f), 0, RIDE_Z + (fallen ? 120 : 0));
  const charging = f >= c3.start && f < CLASH;
  const qHorse: HorseState = {
    gait: charging ? 'gallop' : fallen && f < CLASH + 30 ? 'gallop' : 'stand',
    phase: (f - c3.start) * 0.09,
    rear: 0,
    head: fallen ? 18 : Math.sin(f * 0.05) * 3,
    tail: Math.sin(f * 0.05) * 5,
  };
  const qRider = pose({
    neck: track(f, [[c2.start + 60, 4], [c2.start + 70, 18], [c2.start + 80, 2]]),
    shF: charging ? 44 : 28,
    elF: charging ? 40 : 70,
    torso: charging ? 14 : 3,
  }, RIDE);
  // 白月骑士
  const kx = kHorseX(f);
  const khp = project(cam, kx, 0, RIDE_Z + 40);
  const kGallop = (f >= c3.start && f < CLASH + 14) || f >= AWAY;
  const kHorse: HorseState = {gait: kGallop ? 'gallop' : 'stand', phase: (f - c3.start) * 0.09 + 0.4, rear: 0, head: Math.sin(f * 0.04) * 3 - 4, tail: Math.sin(f * 0.06) * 4};
  const kLanceAngle = track(f, [[c2.start + 18, 6], [c2.start + 42, 120], [c2.end - 10, 120], [c3.start + 6, 84], [CLASH + 10, 84], [CLASH + 30, 110], [c5.start + 10, 110], [c5.start + 30, 10]]);
  const kRider = pose({shF: 36, elF: 50}, RIDE);
  const kHand = kRider.torso - kRider.shF - kRider.elF;
  const visorUp = prog(f, c5.start + 20, c5.start + 40);
  // 倒地的他
  const lp = lyingPose(f);
  const flyT = prog(f, CLASH, CLASH + 22, easeOut);
  const lx = LIE.x - 40 * (1 - flyT);
  const ly = fallen && f < CLASH + 22 ? 128 * (1 - flyT) + Math.sin(flyT * Math.PI) * 50 + 14 : 14;
  const lpr = project(cam, lx, ly, LIE.z);
  const spin = fallen && f < CLASH + 22 ? 82 * flyT : 82;
  const lyingNow = pose({rootRot: spin}, lp);
  // 枪尖抵住面甲：长矛单独画（在骑士手中时随骑士）
  const tipOn = f >= TOUCH - 18 && f < c5.start + 20;
  const lh = headOffset(lyingNow);
  const headW = {x: lx + lh.x, y: ly - lh.y, z: LIE.z};
  const tipSlide = prog(f, TOUCH - 18, TOUCH, easeOut);
  const tremble = f >= c4.start ? Math.sin(f * 1.7) * 1.2 + Math.sin(f * 3.1) * 0.6 : 0;
  const tipW = {x: headW.x + 30 + 120 * (1 - tipSlide), y: headW.y + 6 + tremble, z: LIE.z - 6};
  const tipP = project(cam, tipW.x, tipW.y, tipW.z);
  const tailP = project(cam, tipW.x + 420, tipW.y + 130, tipW.z + 10);
  // 桑丘跑来跪下
  const sRun = f >= RUN - 6;
  const sx = track(f, [[RUN - 6, -1400], [RUN + 40, LIE.x - 120]], (t) => t);
  const sKneel = f >= RUN + 40;
  const sPose = sKneel
    ? pose({rootRot: 0, torso: 30, neck: 18, shF: 70, elF: 20, shB: 50, elB: 30, hipF: 88, knF: 92, hipB: -12, knB: 100, anB: -40})
    : pose({...gait((f - RUN) / 13, 1, true)}, STAND);
  const spy = sKneel ? 52 : 92;
  const sp = project(cam, sx, spy, LIE.z - 60);
  // 铜盆：落马后滚到浪边
  const basin = basinAt(f);
  const bx = track(f, [[CLASH + 6, LIE.x + 40], [CLASH + 40, 260]], easeOut);
  const bz = track(f, [[CLASH + 6, LIE.z], [CLASH + 40, SHORE_Z - 260]], easeOut);
  const bp = project(cam, bx, 0, bz);
  const bRot = track(f, [[CLASH + 6, -80], [CLASH + 40, 160], [CLASH + 52, 172]]);
  // 浪：s4-6 一道浪冲过铜盆，随后一道浪冲向镜头，白沫铺满画面
  const wash = track(f, [[CRASH - 10, 0], [CRASH + 6, 1], [CRASH + 30, 0]]);
  const foam = prog(f, FOAM - 4, c6.end, easeIn);
  return (
    <div style={{position: 'absolute', inset: 0, background: C.base, overflow: 'hidden'}}>
      <SeaSky cam={cam} f={f} sun={sun} />
      <Layer blur={1.2}>
        <Sea cam={cam} f={f} />
      </Layer>
      <Layer>
        <defs>
          <HelmetDefs />
        </defs>
        <Sand cam={cam} f={f} />
        {/* 铜盆在沙上、浪边 */}
        {fallen ? <Helmet state={basin} x={bp.x} y={bp.y} size={34 * bp.s} rotate={f < CLASH + 52 ? bRot : 172 + Math.sin(f * 0.1) * 2 * wash} shadow={false} /> : null}
        <WashOver cam={cam} f={f} amount={wash} x={bx} z={bz} />
        {/* 白月骑士 */}
        <ellipse cx={khp.x} cy={khp.y + 4} rx={110 * khp.s} ry={10 * khp.s} fill="#000" opacity={0.35} />
        <g transform={`translate(${khp.x} ${khp.y - 128 * khp.s}) scale(${knightFacing(f) * khp.s} ${khp.s})`}>
          <RimLit
            rim={{...rimK, dx: (knightFacing(f) * rimK.dx) / khp.s, dy: rimK.dy / khp.s}}
            fill="#0E0C0A"
            farFill="#1C1915"
            draw={(pass, fill, far) => (
              <HorseBody
                state={kHorse}
                fill={fill}
                farFill={far}
                rider={
                  <g transform="translate(-6 -10)">
                    <FigureBody
                      pose={kRider}
                      build="plain"
                      fill={fill}
                      farFill={far}
                      pass={pass}
                      helmet={{morph: 0, glow: 0, visor: 1 - visorUp, scatter: 0}}
                      propF={(ps, fl) => (tipOn ? null : <Lance angle={kLanceAngle} handAngle={kHand} tip={0} pass={ps} fill={fl} />)}
                      propB={(ps) => <MoonShield pass={ps} fill={fill} />}
                    />
                  </g>
                }
              />
            )}
          />
        </g>
        {/* 他的马（落马后空鞍跑开） */}
        <g transform={`translate(${qhp.x} ${qhp.y - 128 * qhp.s}) scale(${(fallen ? -1 : 1) * qhp.s} ${qhp.s})`}>
          <RimLit
            rim={{...rimQ, dx: ((fallen ? -1 : 1) * rimQ.dx) / qhp.s, dy: rimQ.dy / qhp.s}}
            fill={C.ink}
            farFill="#1A140F"
            draw={(pass, fill, far) => (
              <HorseBody
                state={qHorse}
                fill={fill}
                farFill={far}
                rider={
                  !fallen ? (
                    <g transform="translate(-6 -10)">
                      <FigureBody
                        pose={qRider}
                        fill={fill}
                        farFill={far}
                        pass={pass}
                        helmet={basin}
                        propF={(ps, fl) => <Lance angle={charging ? 84 : 10} handAngle={qRider.torso - qRider.shF - qRider.elF} tip={0.6} pass={ps} fill={fl} />}
                      />
                    </g>
                  ) : null
                }
              />
            )}
          />
        </g>
        {/* 倒在沙上蜷缩的他 */}
        {fallen ? (
          <g transform={`translate(${lpr.x} ${lpr.y}) scale(${lpr.s})`}>
            <RimLit
              rim={{...rimQ, dx: rimQ.dx / lpr.s, dy: rimQ.dy / lpr.s}}
              fill={C.ink}
              farFill="#1A140F"
              draw={(pass, fill, far) => <FigureBody pose={lyingNow} fill={fill} farFill={far} pass={pass} />}
            />
          </g>
        ) : null}
        {/* 抵住面甲的枪尖 */}
        {tipOn ? (
          <g>
            <line x1={tailP.x} y1={tailP.y} x2={tipP.x} y2={tipP.y} stroke="#0E0C0A" strokeWidth={Math.max(2, 4 * tipP.s)} strokeLinecap="round" />
            <line x1={tailP.x} y1={tailP.y} x2={tipP.x} y2={tipP.y} stroke={SILVER} strokeWidth={Math.max(0.6, 0.9 * tipP.s)} opacity={0.6} transform="translate(0 -1.5)" />
            <circle cx={tipP.x} cy={tipP.y} r={2.4 * tipP.s} fill={SILVER} opacity={0.9} />
          </g>
        ) : null}
        {/* 桑丘 */}
        {sRun ? (
          <g transform={`translate(${sp.x} ${sp.y}) scale(${sp.s})`}>
            <RimLit
              rim={{...rimQ, dx: rimQ.dx / sp.s, dy: rimQ.dy / sp.s}}
              fill={C.ink}
              draw={(pass, fill, far) => <FigureBody pose={sPose} build="sancho" fill={fill} farFill={far} pass={pass} />}
            />
          </g>
        ) : null}
        <SandGrains f={f} />
        <Dust seed="s4d" frame={f} count={26} x={0} y={160} w={W} h={600} size={2} opacity={0.35} />
      </Layer>
      {/* 冲向镜头的浪：白沫铺满画面，接下一节的窗光 */}
      <FoamWall f={f} amount={foam} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 零件                                                                */
/* ------------------------------------------------------------------ */
/** 白月盾：圆盾上一轮发光的月亮 */
const MoonShield: React.FC<{pass: 'rim' | 'body'; fill: string}> = ({pass, fill}) => (
  <g transform="translate(6 -4)">
    <ellipse cx={0} cy={0} rx={15} ry={18} fill={pass === 'rim' ? fill : '#1C1915'} />
    {pass === 'body' ? (
      <>
        <circle cx={0} cy={0} r={9} fill={SILVER} opacity={0.92} />
        <circle cx={3.6} cy={-2} r={8} fill="#1C1915" opacity={0.25} />
      </>
    ) : null}
  </g>
);

const SeaSky: React.FC<{cam: Cam; f: number; sun: number}> = ({cam, sun}) => {
  const hz = project(cam, 0, 0, 1e6).y;
  const glow = 0.45 + 0.55 * sun;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, #0E0C0A 0px, #221C16 ${hz - 420}px, #4E4234 ${hz - 160}px, ${mix('#9C8260', '#D8B67A', sun)} ${hz - 4}px, #2A241D ${hz + 2}px, #15110D ${H}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1180 - 600,
          top: hz - 420 + (1 - sun) * 60,
          width: 1200,
          height: 840,
          background: `radial-gradient(closest-side, rgba(250,214,140,${0.7 * glow}) 0%, rgba(217,164,65,${0.3 * glow}) 22%, rgba(0,0,0,0) 100%)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* 日出：一线日轮从海平线升起 */}
      <div
        style={{
          position: 'absolute',
          left: 1180 - 46,
          top: hz - 46 * sun - 2,
          width: 92,
          height: 92,
          borderRadius: '50%',
          background: '#F7DCA0',
          opacity: sun,
          clipPath: `inset(0 0 ${Math.max(0, 92 - 46 * sun - 4)}px 0)`,
        }}
      />
    </div>
  );
};

const Sea: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const lines = [];
  for (let i = 0; i < 40; i++) {
    const z = SHORE_Z + Math.pow(i / 40, 2) * 60000;
    const p = project(cam, 0, 0, z);
    if (p.y > H + 10) continue;
    const off = Math.sin(f * 0.05 + i * 1.7) * 30;
    const w = 300 + random(`sl${i}`) * 900;
    const x = 200 + random(`sx${i}`) * 1500 + off;
    lines.push(<line key={i} x1={x} y1={p.y} x2={x + w * Math.min(1, p.s * 3 + 0.3)} y2={p.y} stroke="#C9A86A" strokeWidth={Math.max(0.8, 3 * p.s)} opacity={0.18 + 0.2 * Math.sin(f * 0.08 + i)} />);
  }
  const near = project(cam, 0, 0, SHORE_Z);
  const hz = project(cam, 0, 0, 1e6).y;
  return (
    <g>
      <rect x={0} y={hz} width={W} height={Math.max(0, near.y - hz)} fill="#2C251D" />
      {lines}
    </g>
  );
};

const Sand: React.FC<{cam: Cam; f: number}> = ({cam, f}) => {
  const shore = project(cam, 0, 0, SHORE_Z);
  const wet = project(cam, 0, 0, SHORE_Z - 260);
  const lap = Math.sin(f * 0.04) * 0.5 + 0.5;
  return (
    <g>
      <defs>
        <linearGradient id="sandG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A3E30" />
          <stop offset="1" stopColor="#120E0B" />
        </linearGradient>
      </defs>
      <rect x={-10} y={shore.y} width={W + 20} height={H - shore.y + 10} fill="url(#sandG)" />
      {/* 湿沙带反光 */}
      <rect x={-10} y={shore.y} width={W + 20} height={Math.max(2, wet.y - shore.y)} fill="#9C8260" opacity={0.25 + 0.1 * lap} />
      <path d={`M -10 ${shore.y + (wet.y - shore.y) * lap * 0.6} Q ${W / 2} ${shore.y + (wet.y - shore.y) * (0.4 + lap * 0.5)} ${W + 10} ${shore.y + (wet.y - shore.y) * lap * 0.5}`} stroke="#E9DCC0" strokeWidth={2} fill="none" opacity={0.35} />
    </g>
  );
};

const WashOver: React.FC<{cam: Cam; f: number; amount: number; x: number; z: number}> = ({cam, amount, x, z}) => {
  if (amount <= 0.01) return null;
  const p = project(cam, x, 0, z);
  return <ellipse cx={p.x} cy={p.y} rx={160 * p.s * (0.6 + amount)} ry={22 * p.s} fill="#E9DCC0" opacity={0.55 * amount} />;
};

const SandGrains: React.FC<{f: number}> = ({f}) => {
  const on = track(f, [[c4.start, 0], [c4.start + 10, 1], [c4.end, 1], [c4.end + 10, 0]]);
  if (on <= 0.01) return null;
  return (
    <g opacity={on}>
      {Array.from({length: 60}).map((_, i) => {
        const t = f - c4.start;
        const y = 600 + random(`sg${i}`) * 420;
        const x = ((random(`sgx${i}`) * W + t * (6 + random(`sgv${i}`) * 8)) % (W + 40)) - 20;
        return <circle key={i} cx={x} cy={y - Math.sin(t * 0.1 + i) * 8} r={1.2 + random(`sgr${i}`) * 1.6} fill="#C9B08A" opacity={0.5} />;
      })}
    </g>
  );
};

const FoamWall: React.FC<{f: number; amount: number}> = ({f, amount}) => {
  if (amount <= 0.01) return null;
  const top = H - amount * (H + 260);
  // 浪头：一串圆滑的卷曲弧线
  const crest = (offset: number, amp: number) => {
    let d = `M -20 ${H + 20} L -20 ${top + offset}`;
    for (let i = 0; i < 8; i++) {
      const x0 = (i / 8) * (W + 40) - 20;
      const x1 = ((i + 1) / 8) * (W + 40) - 20;
      const peak = top + offset - amp * (0.6 + 0.4 * Math.sin(i * 2.1 + f * 0.12));
      d += ` Q ${(x0 + x1) / 2} ${peak} ${x1} ${top + offset + Math.sin(i + f * 0.2) * 10}`;
    }
    return `${d} L ${W + 20} ${H + 20} Z`;
  };
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <path d={crest(0, 70)} fill="#E9DFCB" opacity={Math.min(1, 0.55 + amount)} />
      <path d={crest(60, 50)} fill="#F6F0E3" opacity={Math.min(1, 0.4 + amount)} />
      <path d={crest(130, 40)} fill="#FFFFFF" opacity={0.5 * amount} />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* 字幕锚点：第三屏的字沿着长矛排在枪尖后上方，不压他的脸               */
/* ------------------------------------------------------------------ */
const anchorLance: AnchorFn = (f) => {
  const cam = section4Cam(f);
  if (f < TOUCH - 18) {
    // 枪尖还没到：字在两骑交锋处的上方
    const k = project(cam, kHorseX(f), 330, RIDE_Z + 40);
    return {x: k.x - 200, y: k.y - 240};
  }
  const lp = lyingPose(f);
  const lh = headOffset(pose({rootRot: 82}, lp));
  const tip = project(cam, LIE.x + lh.x + 30, 14 - lh.y + 6, LIE.z - 6);
  return {x: tip.x + 160, y: tip.y - 300};
};

export const section4Anchors: Record<string, AnchorFn> = {'s4-3': anchorLance};
