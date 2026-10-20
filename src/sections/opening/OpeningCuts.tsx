import React from 'react';
import {AbsoluteFill} from 'remotion';
import {beat} from '../../data/script';
import {Person, POSES, Kettle, handWorld, mixPose, type Pose} from '../../components/Person';
import {Clock, Stamp} from '../../components/Props';
import {C} from '../../theme';
import {bell, ease, hash, lerp, prog} from '../../lib/anim';

// 开头 0–2.4 秒的"剪辑段"：屏幕空间里的快节奏镜头
// 0.0 卧室·躺（印章懒惰） → 0.7 跳切·坐（印章嫉妒） → 1.4 甩镜·地铁（印章暴怒）
// → 2.0 定格裂成三联 → 2.2 推向手机 → 2.4 匹配剪辑进试管（之后交给世界镜头）

const F = {
  jump: beat('o1', 'jumpCut'),
  envy: beat('o2', 'stampEnvy'),
  whip: beat('o2', 'whip'),
  door: beat('o2', 'doorClose'),
  rage: beat('o2', 'stampRage'),
  freeze: beat('o2', 'freeze'),
  push: beat('o2', 'pushPhone'),
  match: beat('o3', 'matchCut'),
};

export const CUTS_END = F.match;

// ── 卧室 ──────────────────────────────────────────

const SIT = {x: 840, y: 914, scale: 1.5};
const LIE = {x: 930, y: 714, scale: 1.5};

const sitPose = (t: number): Pose => {
  const p = POSES.sit(t);
  const ph = POSES.phone(t);
  return {...p, armBack: ph.armBack, armFront: ph.armFront, headTilt: 12, lean: 2};
};
const liePose = (t: number): Pose => ({...POSES.phone(t), lean: 0, headTilt: 70, armFront: [107, -10], armBack: [100, -20], legFront: [8, -16], legBack: [4, -10]});

/** 坐姿时手机屏幕中心（场景坐标），三联定格推镜头要对准它 */
export const phoneCenterB = () => {
  const h = handWorld(sitPose(F.freeze - F.jump), {x: SIT.x, y: SIT.y, scale: SIT.scale});
  return {x: h.x + 34, y: h.y - 40};
};

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

// ── 三联定格 ──────────────────────────────────────

const PANEL = {w: 400, h: 700, y: 140, gap: 40};
const panelX = (i: number) => 960 - (PANEL.w * 3 + PANEL.gap * 2) / 2 + i * (PANEL.w + PANEL.gap);
/** 每格裁切的场景区域（宽高比与格子一致） */
const CROP_W = (1080 * PANEL.w) / PANEL.h;
const CROPS = [
  {x: 520, w: CROP_W},
  {x: 600, w: CROP_W},
  {x: 470, w: CROP_W},
];

const PanelScene: React.FC<{i: number; layer: 'base' | 'stamp'}> = ({i, layer}) => {
  if (i === 0) return <Bedroom t={F.jump - 3} variant="lie" layer={layer} />;
  if (i === 1) return <Bedroom t={F.freeze - F.jump} variant="sit" layer={layer} />;
  return <Subway t={F.freeze - F.whip} layer={layer} />;
};

/** 定格后的一格（也给试管倒影复用） */
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

const Triptych: React.FC<{frame: number}> = ({frame}) => {
  const split = ease.out(prog(frame, F.freeze, 5));
  // 2.2 秒起加速推向中间一格的手机，2.4 秒正好切
  const pushT = ease.inStrong(prog(frame, F.push, F.match - F.push));
  const ph = phoneCenterB();
  const s1 = PANEL.w / CROPS[1].w;
  const target = {x: panelX(1) + (ph.x - CROPS[1].x) * s1, y: PANEL.y + ph.y * (PANEL.h / 1080)};
  const zoom = Math.exp(lerp(0, Math.log(9), pushT));
  const cx = lerp(960, target.x, Math.min(1, pushT * 1.6));
  const cy = lerp(540, target.y, Math.min(1, pushT * 1.6));
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
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
      <rect width={1920} height={1080} fill="#0B0F14" />
      <g transform={`translate(960 540) scale(${zoom}) translate(${-cx} ${-cy})`}>
        {[0, 1, 2].map((i) => {
          // 从整屏（当前地铁画面）裂成三格：内容保持等比缩放，只有裁切框在变
          const sc = lerp(1, PANEL.w / CROPS[i].w, split);
          const tx = lerp(0, panelX(i) - sc * CROPS[i].x, split);
          const ty = lerp(0, PANEL.y, split);
          const x = lerp(0, panelX(i), split);
          const y = lerp(0, PANEL.y, split);
          const w = lerp(1920, PANEL.w, split);
          const h = lerp(1080, PANEL.h, split);
          const settle = 1 + 0.025 * (1 - ease.out(prog(frame, F.freeze + 3, 8)));
          const r = lerp(0, 16, split);
          return (
            <g key={i} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${settle}) translate(${-x - w / 2} ${-y - h / 2})`}>
              <clipPath id={`panel${i}`}>
                <rect x={x} y={y} width={w} height={h} rx={r} />
              </clipPath>
              <g clipPath={`url(#panel${i})`}>
                <g transform={`translate(${tx} ${ty}) scale(${sc})`}>
                  <g filter="url(#freezegray)">
                    <PanelScene i={i} layer="base" />
                  </g>
                  <PanelScene i={i} layer="stamp" />
                </g>
              </g>
              <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={C.paper} strokeOpacity={0.25 * split} strokeWidth={2} />
            </g>
          );
        })}
        {/* 计数器：七个圆点亮起三个（不用 3/7 这种带斜杠的文字） */}
        {Array.from({length: 7}, (_, i) => {
          const lit = i >= 1 && i <= 3;
          const p = lit ? ease.outBack(prog(frame, F.freeze + 1 + (i - 1) * 2, 6)) : split;
          return (
            <circle
              key={i}
              cx={960 + (i - 3) * 46}
              cy={92}
              r={11 * p}
              fill={lit ? C.accent : 'none'}
              stroke={lit ? 'none' : C.paper}
              strokeOpacity={0.5}
              strokeWidth={2.5}
            />
          );
        })}
      </g>
    </svg>
  );
};

// ── 剪辑段总控 ────────────────────────────────────

export const OpeningCuts: React.FC<{frame: number}> = ({frame}) => {
  if (frame >= F.match) return null;

  if (frame >= F.freeze) {
    return (
      <AbsoluteFill>
        <Triptych frame={frame} />
      </AbsoluteFill>
    );
  }

  // 0–0.7 秒：躺着，缓推
  if (frame < F.jump) {
    const push = 1 + 0.045 * ease.outSoft(prog(frame, 0, F.jump));
    return (
      <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '52% 58%'}}>
        <Bedroom t={frame} variant="lie" stampP={frame >= 0 ? 0.62 + 0.38 * ease.out(prog(frame, 0, 6)) : 0} />
      </AbsoluteFill>
    );
  }

  // 0.7 秒跳切（同机位、景别小跳一档） → 1.4 秒甩镜到地铁
  const whipStart = F.whip - 4;
  const w = ease.inOut(prog(frame, whipStart, 8));
  const blur = bell(prog(frame, whipStart, 8)) * 60;
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
          <Bedroom t={tB} variant="sit" stampP={prog(frame, F.envy, 9)} />
        </AbsoluteFill>
      </AbsoluteFill>
      {w > 0 ? (
        <AbsoluteFill style={{transform: `translateX(${(1 - w) * 1920}px)`}}>
          <Subway t={frame - F.whip} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
