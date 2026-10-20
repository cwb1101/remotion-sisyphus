import React from 'react';
import {AbsoluteFill} from 'remotion';
import {LABEL_STEP, beat, cue} from '../data/script';
import {Layer, ScreenLayer, useCam, type Cam} from '../lib/camera';
import {Person, POSES, handWorld, mixPose, type Expression, type Pose} from '../components/Person';
import {TubeRack, TUBE_W} from '../components/DesireGauge';
import {PaperTag} from '../components/Props';
import {CARD, FrozenPanel, OpeningCuts, WORLD_START} from './opening/OpeningCuts';
import {C, FONT_SERIF} from '../theme';
import {bell, ease, hash, lerp, mixColor, prog} from '../lib/anim';
import {SINS, W, rackTubeX} from '../world';

// 〇 不犯法的罪（0–10 秒）
// 0–2.4 秒是屏幕空间的剪辑段；2.4 秒匹配剪辑进入世界镜头：
// 试管架（拉远+速度渐变）→ 中央大字 → 甩镜 → 卷轴墙 → 时间刻度尺往回卷 → 交给第一节的沙漠

export type Slot = 'back' | 'main' | 'front' | 'screen';

const F = {
  reveal: beat('o3', 'reveal'),
  labels: beat('o3', 'labels'),
  peek: beat('o3', 'peek'),
  flash: beat('o4', 'flash'),
  land: beat('o4', 'land'),
  scratch: beat('o4', 'scratch'),
  tag: beat('o4', 'tagDetach'),
  whip: beat('o5', 'whip'),
  scroll: beat('o5', 'scrollRoll'),
  roll: beat('o6', 'rulerRoll'),
  rollEnd: beat('o6', 'rollEnd'),
  end: cue('o6').end,
};

/** 纸签在屏幕上的位置（"致命"两个字缩小后飞到这里） */
export const TAG_SCREEN = {x: 560, y: 250};

// ── 主角在本节的运动（第一节从这里接着走） ─────────

export const heroS0 = (frame: number, cam: Cam): {x: number; y: number; pose: Pose; expr: Expression; facing: 1 | -1; light: number} => {
  const y = W.floor0;
  if (frame < F.whip) {
    const x = lerp(-780, -640, ease.out(prog(frame, F.peek, 14)));
    const t = frame;
    let pose = POSES.peek(t);
    let expr: Expression = 'surprised';
    if (frame >= F.land) {
      pose = mixPose(POSES.peek(t), POSES.lookUp(t), ease.inOut(prog(frame, F.land, 5)));
    }
    if (frame >= F.scratch) {
      pose = mixPose(POSES.lookUp(t), POSES.scratch(t), ease.inOut(prog(frame, F.scratch, 5)));
      expr = 'confused';
    }
    return {x, y, pose, expr, facing: 1, light: 0};
  }
  if (frame < F.roll) {
    // 甩镜后从画面右侧追着纸签跑进来
    const off = lerp(760, 90, ease.out(prog(frame, F.whip + 12, 24)));
    return {x: cam.x + off / cam.s, y, pose: POSES.run(frame), expr: 'focused', facing: -1, light: 0};
  }
  // 站在刻度尺上，世界在脚下往回卷；停下后举起手电往前走
  const x = cam.x + 90 / cam.s;
  const stop = ease.inOut(prog(frame, F.roll, 8));
  const walk = ease.inOut(prog(frame, F.rollEnd, 8));
  let pose = mixPose(POSES.run(frame), POSES.lookUp(frame), stop);
  if (walk > 0) {
    const w = POSES.walk(frame, 0.3);
    const h = POSES.hold(frame);
    pose = mixPose(pose, {...w, armFront: h.armFront, lean: 6}, walk);
  }
  return {x, y, pose, expr: walk > 0.5 ? 'focused' : 'surprised', facing: -1, light: prog(frame, F.rollEnd + 6, 6)};
};

/** 手电：画在手里，光锥朝面向方向 */
export const Flashlight: React.FC<{on: number}> = ({on}) => (
  <g>
    <defs>
      <linearGradient id="cone" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#FFF3D6" stopOpacity={0.5} />
        <stop offset="1" stopColor="#FFF3D6" stopOpacity={0} />
      </linearGradient>
    </defs>
    {on > 0 ? <path d="M-6 -24 L-150 -640 L150 -640 L6 -24 Z" fill="url(#cone)" opacity={on} /> : null}
    <rect x={-9} y={-22} width={18} height={30} rx={5} fill={C.gray} />
    <rect x={-11} y={-28} width={22} height={8} rx={3} fill={C.paperDim} />
  </g>
);

const Hero: React.FC<{frame: number}> = ({frame}) => {
  const {cam} = useCam();
  if (frame < F.peek || frame >= F.end) return null;
  const h = heroS0(frame, cam);
  return (
    <Person
      x={h.x}
      y={h.y}
      scale={1.25}
      facing={h.facing}
      pose={h.pose}
      expr={h.expr}
      frame={frame}
      holding={frame >= F.roll ? <Flashlight on={h.light} /> : undefined}
    />
  );
};

// ── 试管架（2.4–5.5 秒） ─────────────────────────

/** 三支被"盖章"的试管里映出三联定格；面板序号：0 懒惰 1 嫉妒 2 暴怒 */
const REFLECT: Record<number, number> = {1: 1, 2: 2, 3: 0};

const Rack: React.FC<{frame: number}> = ({frame}) => {
  if (frame < WORLD_START || frame > F.whip + 24) return null;
  const order = [0, 4, 5, 6];
  // 「暴怒」那支等定格卡片飞进来才变红、映出画面
  const land = ease.inOut(prog(frame, F.reveal + CARD - 8, 12));
  const tubes = SINS.map((name, i) => {
    const stamped = i === 1 || i === 3 || (i === 2 && land > 0);
    const k = order.indexOf(i);
    const lit = k >= 0 ? ease.out(prog(frame, F.labels + k * LABEL_STEP, 8)) : 1;
    const level = i === 2 ? lerp(0.14, 0.82, land) : stamped ? 0.82 : 0.14;
    return {
      x: rackTubeX(i),
      level,
      label: name,
      labelOpacity: k >= 0 ? lit : i === 2 ? land : 1,
      glow: stamped ? 0.8 * (i === 2 ? land : 1) : 0.25 * lit,
      reflection: stamped ? (
        <g opacity={0.55 * (i === 2 ? land : 1)} transform="translate(0 70)">
          <FrozenPanel i={REFLECT[i]} w={TUBE_W} h={168} />
        </g>
      ) : undefined,
    };
  });
  return <TubeRack x={0} y={W.rack.y} tubes={tubes} frame={frame} />;
};

// ── 卷轴墙（远景，向左铺开） ──────────────────────

const ScrollWall: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.whip - 4 || frame > cue('c1').start + 40) return null;
  const d = 0.8;
  const right = W.scroll.right * d;
  const left = lerp(right - 200, W.scroll.left * d, ease.out(prog(frame, F.scroll, 54)));
  const top = -330;
  const h = 400;
  const fade = 1 - prog(frame, beat('o6', 'dusk'), 40);
  return (
    <g opacity={fade}>
      <rect x={left} y={top} width={right - left} height={h} fill="#7D6B50" />
      <rect x={left} y={top} width={right - left} height={14} fill="#5E4F3A" />
      <rect x={left} y={top + h - 14} width={right - left} height={14} fill="#5E4F3A" />
      {/* 抽象的手写行：只有笔画，没有字 */}
      {Array.from({length: 7}, (_, row) =>
        Array.from({length: 26}, (_, j) => {
          const x = right - 60 - j * 58 - hash(row * 31 + j) * 20;
          if (x < left + 30) return null;
          const w = 18 + hash(row * 7 + j * 3) * 34;
          return <rect key={`${row}-${j}`} x={x - w} y={top + 50 + row * 46} width={w} height={6} rx={3} fill="#3A3024" opacity={0.55} />;
        }),
      )}
      {/* 卷轴滚筒 */}
      <rect x={left - 26} y={top - 30} width={52} height={h + 60} rx={22} fill="#4A3A2A" />
      <rect x={left - 12} y={top - 30} width={10} height={h + 60} fill="#6B543C" />
      <rect x={right - 10} y={top - 30} width={40} height={h + 60} rx={18} fill="#4A3A2A" />
    </g>
  );
};

// ── 时间刻度尺 ────────────────────────────────────

const Ruler: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.roll - 20 || frame > cue('c1').start + 50) return null;
  const rise = ease.out(prog(frame, F.roll - 16, 14));
  const {right, left, y} = W.ruler;
  const n = Math.floor((right - left) / 26);
  return (
    <g transform={`translate(0 ${(1 - rise) * 120})`} opacity={rise * (1 - prog(frame, cue('c1').start + 10, 30))}>
      <rect x={left} y={y} width={right - left} height={44} rx={6} fill="#CDBE9E" />
      <rect x={left} y={y + 36} width={right - left} height={8} fill="#A8987A" />
      {Array.from({length: n}, (_, i) => {
        const x = right - i * 26;
        const major = i % 5 === 0;
        return <rect key={i} x={x - 1.5} y={y} width={3} height={major ? 26 : 13} fill={major ? C.accent : C.line} opacity={major ? 0.9 : 0.6} />;
      })}
    </g>
  );
};

/** 年份读数：2026 往回滚，停在公元4世纪（屏幕空间） */
const YearReadout: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.roll || frame >= cue('c1').start + 24) return null;
  // 数字每 2 帧换一次，避免逐帧乱跳看着闪
  const stepped = F.roll + Math.floor((frame - F.roll) / 2) * 2;
  const p = ease.out(prog(stepped, F.roll, F.rollEnd - F.roll));
  // 先显示 2026，之后按整十年往回滚（避免出现 404 这类容易误读的数字）
  const year = stepped === F.roll ? 2026 : Math.max(400, Math.round(lerp(2026, 400, p) / 10) * 10);
  const done = frame >= F.rollEnd;
  const slam = ease.outBack(prog(frame, F.rollEnd, 8));
  const inP = ease.out(prog(frame, F.roll, 6));
  const out = 1 - prog(frame, cue('c1').start + 6, 18);
  const text = done ? '公元4世纪' : String(year);
  const scale = done ? 1.25 - 0.25 * slam : 1;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 1000 - 380,
          width: 760,
          top: 150,
          textAlign: 'center',
          fontFamily: FONT_SERIF,
          fontWeight: 900,
          fontSize: done ? 120 : 132,
          color: done ? C.mustard : C.paper,
          opacity: inP * out * (done ? 1 : 0.85),
          transform: `scale(${scale})`,
          letterSpacing: '0.04em',
          textShadow: '0 6px 30px rgba(0,0,0,0.4)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ── 远近层的氛围元素 ─────────────────────────────

const Bokeh: React.FC<{frame: number; depth: number; count: number; spread: number; cx: number; opacity: number; size: number; color?: string}> = ({
  frame,
  depth,
  count,
  spread,
  cx,
  opacity,
  size,
  color = C.paper,
}) => (
  <g>
    {Array.from({length: count}, (_, i) => {
      const x = cx * depth + (hash(i) - 0.5) * spread + Math.sin(frame * 0.02 + i) * 20;
      const y = (hash(i + 50) - 0.5) * 900 - ((frame * (0.4 + hash(i + 7))) % 900) * 0.3;
      return <circle key={i} cx={x} cy={y} r={size * (0.4 + hash(i + 13))} fill={color} opacity={opacity * (0.3 + hash(i + 21) * 0.7)} />;
    })}
  </g>
);

const Floor: React.FC<{frame: number}> = ({frame}) => {
  const warm = prog(frame, F.whip, 20);
  // 进入暮色后地面渐变成沙漠的颜色，和第一节的沙地接上
  const sand = prog(frame, beat('o6', 'dusk'), 40);
  const far = sand > 0 ? mixColor('#120E0B', '#3A2930', sand) : warm > 0 ? '#120E0B' : '#0B1116';
  return (
    <g>
      <rect x={-900} y={W.floor0} width={2000} height={900} fill="#0B1116" />
      <rect x={-4400} y={W.floor0} width={3600} height={900} fill={far} />
      <rect x={-4400} y={W.floor0} width={5500} height={4} fill={C.paper} opacity={0.08} />
    </g>
  );
};

const Spotlight: React.FC<{frame: number}> = ({frame}) => {
  if (frame > F.whip + 20) return null;
  return (
    <g>
      <defs>
        <radialGradient id="spot" cx="0.5" cy="0.4">
          <stop offset="0" stopColor="#3B5566" stopOpacity={0.55} />
          <stop offset="1" stopColor="#3B5566" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={-20} rx={900} ry={620} fill="url(#spot)" opacity={0.6 + 0.4 * bell(prog(frame, F.flash, 12))} />
      <path d="M-160 -900 L160 -900 L700 260 L-700 260 Z" fill="#9FC3D6" opacity={0.05} />
    </g>
  );
};

// ── 屏幕层：闪白、纸签 ────────────────────────────

const Flash: React.FC<{frame: number}> = ({frame}) => {
  const t = prog(frame, F.flash, 14);
  if (t <= 0 || t >= 1) return null;
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, rgba(255,250,240,0.95), rgba(255,250,240,0.2) 55%, rgba(255,250,240,0) 80%)',
        opacity: bell(t) * 0.35,
      }}
    />
  );
};

const Tag: React.FC<{frame: number}> = ({frame}) => {
  const {vel} = useCam();
  const appear = prog(frame, F.whip - 4, 4);
  const leave = ease.in(prog(frame, cue('c1').start + 4, 22));
  if (appear <= 0 || leave >= 1) return null;
  // 甩镜时纸签被"甩"得晃起来
  const kick = Math.max(-30, Math.min(30, vel.x * 0.08));
  const swing = Math.sin(frame * 0.12) * 6 + kick;
  // 竖直往上飞出画面，不从左上角主题标注上经过
  const x = TAG_SCREEN.x;
  const y = lerp(TAG_SCREEN.y - 80, -420, leave);
  return (
    <ScreenLayer>
      <PaperTag x={x} y={y} text="致命" swing={swing} scale={0.82} opacity={appear} string={320} />
    </ScreenLayer>
  );
};

// ── 组装 ──────────────────────────────────────────

export const Section0: React.FC<{frame: number; slot: Slot}> = ({frame, slot}) => {
  if (frame >= cue('c1').start + 60) return null;
  const world = frame >= WORLD_START;
  if (slot === 'back') {
    if (!world) return null;
    return (
      <>
        <Layer depth={0.35}>
          <Bokeh frame={frame} depth={0.35} count={26} spread={2600} cx={-600} opacity={0.18} size={14} />
        </Layer>
        <Layer depth={0.8}>
          <ScrollWall frame={frame} />
        </Layer>
      </>
    );
  }
  if (slot === 'main') {
    if (!world) return null;
    return (
      <Layer>
        <Spotlight frame={frame} />
        <Floor frame={frame} />
        <Ruler frame={frame} />
        <Rack frame={frame} />
        <Hero frame={frame} />
      </Layer>
    );
  }
  if (slot === 'front') {
    if (!world) return null;
    return (
      <Layer depth={1.5}>
        <Bokeh frame={frame} depth={1.5} count={10} spread={3000} cx={-1200} opacity={0.12} size={26} color="#BFD3E0" />
      </Layer>
    );
  }
  return (
    <>
      <OpeningCuts frame={frame} />
      <YearReadout frame={frame} />
      <Tag frame={frame} />
      <Flash frame={frame} />
    </>
  );
};
