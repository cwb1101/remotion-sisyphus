import React from 'react';
import {AbsoluteFill} from 'remotion';
import {beat} from '../../data/script';
import {Person, POSES, Kettle, handWorld, mixPose, type Pose} from '../../components/Person';
import {Clock, Stamp} from '../../components/Props';
import {TUBE_W} from '../../components/DesireGauge';
import {toScreen, useCam} from '../../lib/camera';
import {C} from '../../theme';
import {bell, ease, hash, lerp, prog} from '../../lib/anim';
import {rackTubeX} from '../../world';

// 开头 0–4 秒的"剪辑段"：每个镜头至少停 1 秒，让人看清
// 0.0 卧室·躺（印章懒惰） → 1.2 跳切·坐（印章嫉妒） → 2.33 甩镜·地铁（印章暴怒）
// → 3.27 定格去色 → 3.4 定格画面缩成一张卡片，飞进「暴怒」试管，镜头同时拉远（交给世界镜头）

const F = {
  jump: beat('o2', 'jumpCut'),
  envy: beat('o2', 'stampEnvy'),
  whip: beat('o2', 'whip'),
  door: beat('o2', 'doorClose'),
  rage: beat('o2', 'stampRage'),
  freeze: beat('o2', 'freeze'),
  reveal: beat('o3', 'reveal'),
};

/** 甩镜时长（帧） */
const WHIP = 12;
/** 卡片缩进试管用时（帧） */
export const CARD = 24;
/** 世界镜头从这一帧开始在卡片后面渲染 */
export const WORLD_START = F.reveal - 2;
export const CUTS_END = F.reveal + CARD + 2;

// ── 卧室 ──────────────────────────────────────────

const SIT = {x: 840, y: 914, scale: 1.5};
const LIE = {x: 930, y: 714, scale: 1.5};

const sitPose = (t: number): Pose => {
  const p = POSES.sit(t);
  const ph = POSES.phone(t);
  return {...p, armBack: ph.armBack, armFront: ph.armFront, headTilt: 12, lean: 2};
};
const liePose = (t: number): Pose => ({...POSES.phone(t), lean: 0, headTilt: 70, armFront: [107, -10], armBack: [100, -20], legFront: [8, -16], legBack: [4, -10]});

const Phone: React.FC<{screen?: boolean}> = ({screen}) => (
  <g transform="rotate(-6)">
    <rect x={-40} y={-128} width={74} height={128} rx={12} fill={C.line} />
    {screen ? (
      <g>
        <rect x={-34} y={-122} width={62} height={116} rx={7} fill="#5E8FB8" />
        <rect x={-34} y={-58} width={62} height={52} rx={7} fill={C.mustard} />
        <path d="M-12 -58 L4 -84 L20 -58 Z" fill={C.accent} />
        <line x1={4} y1={-84} x2={4} y2={-40} stroke={C.line} strokeWidth={2.5} />
        <circle cx={14} cy={-104} r={8} fill="#F6E7B0" />
      </g>
    ) : (
      <rect x={-34} y={-122} width={62} height={116} rx={7} fill="#BFE3FF" opacity={0.9} />
    )}
  </g>
);

export const Bedroom: React.FC<{t: number; variant: 'lie' | 'sit'; layer?: 'base' | 'stamp' | 'all'; stampP?: number}> = ({
  t,
  variant,
  layer = 'all',
  stampP = 1,
}) => {
  const base = layer !== 'stamp';
  const stamp = layer !== 'base';
  const pose = variant === 'lie' ? liePose(t) : sitPose(t);
  const pos = variant === 'lie' ? LIE : SIT;
  const hand = handWorld(pose, {...pos, rotate: variant === 'lie' ? -90 : 0});
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <defs>
        <linearGradient id="bwall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141D28" />
          <stop offset="1" stopColor="#1E2B3A" />
        </linearGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.mustard} stopOpacity={0.3} />
          <stop offset="1" stopColor={C.mustard} stopOpacity={0} />
        </linearGradient>
        <radialGradient id="phoneglow">
          <stop offset="0" stopColor="#BFE3FF" stopOpacity={0.55} />
          <stop offset="1" stopColor="#BFE3FF" stopOpacity={0} />
        </radialGradient>
      </defs>
      {base ? (
        <g>
          <rect width={1920} height={1080} fill="url(#bwall)" />
          {/* 窗与窗帘缝 */}
          <rect x={1170} y={140} width={420} height={440} rx={10} fill="#0D141D" />
          <rect x={1180} y={150} width={400} height={420} fill="#2B3B55" opacity={0.6} />
          <path d="M1160 130 Q1250 360 1190 600 L1370 600 Q1330 360 1360 130 Z" fill="#33465D" />
          <path d="M1392 130 Q1420 360 1384 600 L1600 600 Q1560 360 1600 130 Z" fill="#33465D" />
          <path d="M1362 140 L1390 140 L980 1080 L640 1080 Z" fill="url(#beam)" />
          {Array.from({length: 14}, (_, i) => {
            const k = (t * 0.6 + hash(i) * 400) % 400;
            return <circle key={i} cx={1300 - k * 1.3 + hash(i + 9) * 120} cy={260 + k * 1.8} r={2 + hash(i + 3) * 2} fill="#FFE9B0" opacity={0.35} />;
          })}
          {/* 地板 */}
          <rect y={860} width={1920} height={220} fill="#10161F" />
          {/* 床 */}
          <rect x={350} y={520} width={46} height={350} rx={10} fill="#3A4A5E" />
          <rect x={360} y={760} width={960} height={70} rx={14} fill="#3A4A5E" />
          <rect x={372} y={736} width={930} height={40} rx={14} fill="#4C5E76" />
          <rect x={380} y={826} width={26} height={44} fill="#2C394A" />
          <rect x={1270} y={826} width={26} height={44} fill="#2C394A" />
          {variant === 'lie' ? <ellipse cx={520} cy={720} rx={110} ry={34} fill="#D8CFBF" /> : <ellipse cx={500} cy={720} rx={110} ry={30} fill="#D8CFBF" />}
          {/* 手机冷光 */}
          <circle cx={hand.x} cy={hand.y} r={260} fill="url(#phoneglow)" />
          {variant === 'lie' ? (
            <g>
              <Person {...LIE} rotate={-90} pose={pose} expr="sleepy" frame={t + 3} shadow={false} holding={<g transform="translate(0 -6) scale(0.7)"><Phone /></g>} holdUpright />
              {/* 被子 */}
              <path d="M690 760 Q700 640 820 650 Q930 600 1040 640 Q1200 660 1300 700 L1300 770 L690 770 Z" fill="#BDB4A4" />
              <path d="M760 690 Q900 660 1000 690 M1060 680 Q1150 690 1240 720" stroke="#9E9585" strokeWidth={5} fill="none" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <path d="M900 770 Q1000 700 1120 720 Q1220 730 1300 740 L1300 770 Z" fill="#BDB4A4" />
              <Person {...SIT} pose={pose} expr="sour" frame={t + 5} holding={<g transform="translate(20 10)"><Phone screen /></g>} holdUpright />
            </g>
          )}
          {/* 前景床头柜与闹钟 */}
          <rect x={110} y={690} width={220} height={190} rx={10} fill="#283647" />
          <rect x={126} y={760} width={188} height={8} rx={4} fill="#1C2733" />
          <Clock x={220} y={612} hour={7} minute={variant === 'lie' ? 0 : 40} r={58} ring={variant === 'lie' ? bell(prog(t, 4, 14)) : 0} />
        </g>
      ) : null}
      {stamp ? (
        variant === 'lie' ? (
          <Stamp x={1010} y={640} text="懒惰" p={stampP} rotate={-10} />
        ) : (
          <Stamp x={1070} y={500} text="嫉妒" p={stampP} rotate={7} size={140} />
        )
      ) : null}
    </svg>
  );
};

// ── 地铁 ──────────────────────────────────────────

export const Subway: React.FC<{t: number; layer?: 'base' | 'stamp' | 'all'; frozen?: boolean}> = ({t, layer = 'all'}) => {
  const base = layer !== 'stamp';
  const stamp = layer !== 'base';
  const f = F.whip + t; // 对应的绝对帧
  const door = ease.inOut(prog(f, F.door - 3, 8)); // 0 开 → 1 关
  const depart = ease.in(prog(f, F.rage + 3, 14));
  const run = 1 - prog(f, F.door + 2, 6);
  const pose = mixPose(POSES.stopShort(t), POSES.run(t + 10), run);
  const px = lerp(360, 600, ease.out(prog(f, F.whip - 2, 12)));
  const steam = prog(f, F.door + 1, 8);
  const expr = f >= F.rage ? 'angry' : f >= F.door ? 'annoyed' : 'focused';
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      {base ? (
        <g>
          <rect width={1920} height={1080} fill="#151C25" />
          <rect y={90} width={1920} height={18} fill={C.mustard} opacity={0.45} />
          {Array.from({length: 12}, (_, i) => (
            <rect key={i} x={i * 170} y={120} width={150} height={40} rx={4} fill="#1D2631" />
          ))}
          {/* 列车（关门后起步向右） */}
          <g transform={`translate(${depart * 700} 0)`}>
            <rect x={-80} y={180} width={2100} height={640} rx={40} fill="#3A4756" />
            <rect x={-80} y={180} width={2100} height={50} rx={20} fill="#2D3845" />
            {[120, 360, 1360, 1600].map((wx, i) => (
              <g key={i}>
                <rect x={wx} y={270} width={200} height={190} rx={18} fill="#F3EDE2" opacity={0.16} />
                <circle cx={wx + 70 + (i % 2) * 50} cy={350} r={24} fill={C.gray} opacity={0.5} />
                <rect x={wx + 46 + (i % 2) * 50} y={378} width={48} height={82} rx={18} fill={C.gray} opacity={0.5} />
              </g>
            ))}
            {/* 车门 */}
            <rect x={740} y={220} width={440} height={600} fill="#1E2833" />
            <rect x={lerp(540, 760, door)} y={232} width={200} height={588} rx={8} fill="#4B5A6B" />
            <rect x={lerp(1180, 960, door)} y={232} width={200} height={588} rx={8} fill="#4B5A6B" />
            <rect x={lerp(570, 790, door)} y={280} width={140} height={220} rx={10} fill="#8FA3B8" opacity={0.25} />
            <rect x={lerp(1210, 990, door)} y={280} width={140} height={220} rx={10} fill="#8FA3B8" opacity={0.25} />
          </g>
          {/* 站台 */}
          <rect y={830} width={1920} height={250} fill="#0E1319" />
          <rect y={872} width={1920} height={8} fill={C.mustard} opacity={0.75} />
          <Person x={px} y={900} scale={1.5} pose={pose} expr={expr} frame={t} onHead={<Kettle amount={steam} frame={t} />} />
          {/* 前景：车灯在门玻璃上的拖影 */}
          {depart > 0
            ? [0, 1, 2].map((i) => (
                <rect key={i} x={-400 + depart * 2600 - i * 300} y={300 + i * 120} width={520} height={6} rx={3} fill={C.paper} opacity={0.25 * (1 - i * 0.25)} />
              ))
            : null}
        </g>
      ) : null}
      {stamp ? <Stamp x={930} y={420} text="暴怒" p={prog(f, F.rage, 9)} rotate={-6} size={160} /> : null}
    </svg>
  );
};

// ── 试管里的倒影：三个场景的定格小图 ──────────────

const PANEL = {w: 400, h: 700};
const CROP_W = (1080 * PANEL.w) / PANEL.h;
/** 每张小图裁切的场景区域（宽高比与试管里的倒影一致） */
const CROPS = [
  {x: 520, w: CROP_W},
  {x: 600, w: CROP_W},
  {x: 470, w: CROP_W},
];

const PanelScene: React.FC<{i: number; layer: 'base' | 'stamp'}> = ({i, layer}) => {
  if (i === 0) return <Bedroom t={F.jump - 4} variant="lie" layer={layer} />;
  if (i === 1) return <Bedroom t={F.whip - F.jump - 6} variant="sit" layer={layer} />;
  return <Subway t={F.freeze - F.whip} layer={layer} />;
};

/** 定格后的一张小图（去色，只留朱红印章），给试管倒影用；面板序号 0 懒惰 1 嫉妒 2 暴怒 */
export const FrozenPanel: React.FC<{i: number; w: number; h: number}> = ({i, w, h}) => {
  const crop = CROPS[i];
  const s = w / crop.w;
  return (
    <g>
      <defs>
        <filter id="freezegray" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope={0.82} />
            <feFuncG type="linear" slope={0.82} />
            <feFuncB type="linear" slope={0.82} />
          </feComponentTransfer>
        </filter>
      </defs>
      <g transform={`scale(${s}) translate(${-crop.x} 0)`}>
        <g filter="url(#freezegray)">
          <PanelScene i={i} layer="base" />
        </g>
        <PanelScene i={i} layer="stamp" />
      </g>
      <rect width={w} height={h} fill="none" />
    </g>
  );
};

// ── 剪辑段总控 ────────────────────────────────────

export const OpeningCuts: React.FC<{frame: number}> = ({frame}) => {
  const {cam} = useCam();
  if (frame >= CUTS_END) return null;

  // 0–1.2 秒：躺着，缓推
  if (frame < F.jump) {
    const push = 1 + 0.05 * ease.outSoft(prog(frame, 0, F.jump));
    return (
      <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '52% 58%'}}>
        <Bedroom t={frame} variant="lie" stampP={0.62 + 0.38 * ease.out(prog(frame, 0, 6))} />
      </AbsoluteFill>
    );
  }

  // 1.2 秒跳切（同机位、景别小跳一档） → 2.33 秒甩镜到地铁
  if (frame < F.freeze) {
    const whipStart = F.whip - WHIP / 2;
    const w = ease.inOut(prog(frame, whipStart, WHIP));
    const blur = bell(prog(frame, whipStart, WHIP)) * 48;
    const tB = frame - F.jump;
    const punch = 1.08 + 0.03 * prog(frame, F.jump, whipStart - F.jump);
    return (
      <AbsoluteFill style={{filter: blur > 0.5 ? 'url(#whipblur)' : undefined}}>
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id="whipblur" x="-5%" y="0" width="110%" height="100%">
            <feGaussianBlur stdDeviation={`${blur} 0`} />
          </filter>
        </svg>
        <AbsoluteFill style={{transform: `translateX(${-w * 1920}px)`}}>
          <AbsoluteFill style={{transform: `scale(${punch})`, transformOrigin: '46% 56%'}}>
            <Bedroom t={tB} variant="sit" stampP={prog(frame, F.envy, 10)} />
          </AbsoluteFill>
        </AbsoluteFill>
        {w > 0 ? (
          <AbsoluteFill style={{transform: `translateX(${(1 - w) * 1920}px)`}}>
            <Subway t={frame - F.whip} />
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    );
  }

  // 3.27 秒定格：画面慢慢褪成灰，印章保留朱红；
  // 3.4 秒起定格画面缩成一张卡片，飞进「暴怒」试管，后面的世界镜头同时拉远
  const gray = ease.inOut(prog(frame, F.freeze, 8));
  const shrink = ease.inOut(prog(frame, F.reveal, CARD));
  const target = toScreen(cam, rackTubeX(2), -60);
  const endScale = (TUBE_W * cam.s * 0.92) / 1920;
  const sc = lerp(1, endScale, shrink);
  const cx = lerp(960, target.x, shrink);
  const cy = lerp(540, target.y, shrink);
  const fade = 1 - prog(frame, F.reveal + CARD - 6, 6);
  const frozenT = F.freeze - F.whip;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${cx - 960}px, ${cy - 540}px) scale(${sc})`,
        opacity: fade,
        overflow: 'hidden',
        borderRadius: 40 * shrink,
        boxShadow: shrink > 0 ? `0 0 0 ${18 * shrink}px rgba(239,232,220,0.85), 0 30px 80px rgba(0,0,0,${0.5 * shrink})` : undefined,
      }}
    >
      <AbsoluteFill style={{filter: `grayscale(${gray}) brightness(${1 - 0.18 * gray})`}}>
        <Subway t={frozenT} layer="base" />
      </AbsoluteFill>
      <AbsoluteFill>
        <Subway t={frozenT} layer="stamp" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
