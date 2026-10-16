import React from 'react';
import { PALETTE } from '../theme';
import { WARM } from '../data/script';
import { lerp, mix } from '../lib/anim';

/**
 * 侧视几何野马（与人物同一套扁平画法：圆角躯干 + 胶囊四肢，不画五官）。
 * 原点在两条后腿之间的地面上。
 */
export type HorseProps = {
  x: number;
  y: number;
  scale?: number;
  /** 1 = 面朝右，-1 = 面朝左 */
  facing?: 1 | -1;
  /** 奔跑相位（弧度） */
  phase?: number;
  /** 0 = 站立，1 = 全速奔跑 */
  run?: number;
  /** 前蹄扬起 0..1 */
  rear?: number;
  /** 跪下 0..1 */
  kneel?: number;
  /** 侧躺 0..1 */
  lie?: number;
  /** 暴怒（描边变暖）0..1 */
  rage?: number;
  opacity?: number;
};

const LEG = { thigh: 62, shin: 64, w: 18 };

const Leg: React.FC<{ hip: [number, number]; a: number; b: number; fill: string; stroke: string }> = ({ hip, a, b, fill, stroke }) => (
  <g transform={`translate(${hip[0]} ${hip[1]}) rotate(${a})`}>
    <rect x={-LEG.w / 2} y={-LEG.w / 2} width={LEG.w} height={LEG.thigh + LEG.w} rx={LEG.w / 2} fill={fill} stroke={stroke} strokeWidth={1.6} />
    <g transform={`translate(0 ${LEG.thigh}) rotate(${b})`}>
      <rect x={-LEG.w / 2 + 2} y={-LEG.w / 2} width={LEG.w - 4} height={LEG.shin + LEG.w - 4} rx={(LEG.w - 4) / 2} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <rect x={-11} y={LEG.shin - 6} width={22} height={12} rx={4} fill={mix(fill, '#000000', 0.3)} />
    </g>
  </g>
);

export const Horse: React.FC<HorseProps> = ({ x, y, scale = 1, facing = 1, phase = 0, run = 0, rear = 0, kneel = 0, lie = 0, rage = 0, opacity = 1 }) => {
  const body = PALETTE.personBody;
  const far = mix(body, '#000000', 0.3);
  const stroke = mix(PALETTE.personRim, WARM, rage);
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  // 奔跑：前后腿成对交替；跪：前腿折起；躺：四腿伸平
  const g = run * (1 - kneel);
  const frontA = (k: number) => lerp(lerp(-38 * Math.sin(phase + k) * g, -70, rear), 70, kneel) * (1 - lie) + -82 * lie;
  const frontB = (k: number) => lerp(lerp(30 * Math.max(0, Math.cos(phase + k)) * g, 95, rear), -140, kneel) * (1 - lie) + 10 * lie;
  const backA = (k: number) => lerp(34 * Math.sin(phase + k + 1.4) * g, 20, kneel) * (1 - lie) + -78 * lie;
  const backB = (k: number) => lerp(-26 * Math.max(0, Math.cos(phase + k + 1.4)) * g, -40, kneel) * (1 - lie) + 6 * lie;
  const lift = 126 - 70 * kneel - 40 * lie; // 髋部离地高度
  const bodyRot = -24 * rear + 6 * c * g * 0.4 + 6 * kneel + 4 * lie;
  const bob = -6 * Math.abs(s) * g;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`} opacity={opacity}>
      <ellipse cx={60} cy={4} rx={150 + 30 * lie} ry={12} fill="rgba(0,0,0,0.4)" />
      <g transform={`translate(0 ${-lift + bob}) rotate(${bodyRot})`}>
        {/* 远侧两条腿 */}
        <Leg hip={[118, 4]} a={frontA(Math.PI)} b={frontB(Math.PI)} fill={far} stroke={stroke} />
        <Leg hip={[4, 4]} a={backA(Math.PI)} b={backB(Math.PI)} fill={far} stroke={stroke} />
        {/* 尾巴 */}
        <path d={`M-14 -18 C${-60} ${-10 + 10 * s * g} ${-78} ${30 + 6 * c} ${-70 - 30 * g} ${60 - 30 * g}`} fill="none" stroke={stroke} strokeWidth={12} strokeLinecap="round" opacity={0.85} />
        {/* 躯干 */}
        <rect x={-30} y={-46} width={190} height={78} rx={39} fill={body} stroke={stroke} strokeWidth={2} />
        {/* 脖子 + 头 */}
        <g transform={`translate(140 -24) rotate(${-38 + 18 * rear - 10 * g * s * 0.3 + 40 * kneel * 0.4 + 30 * lie})`}>
          <rect x={-18} y={-108} width={42} height={116} rx={20} fill={body} stroke={stroke} strokeWidth={2} />
          <g transform={`translate(4 -102) rotate(${64 - 20 * rear})`}>
            <rect x={-16} y={-14} width={82} height={36} rx={17} fill={body} stroke={stroke} strokeWidth={2} />
            <path d="M-4 -12 L4 -34 L12 -12 Z" fill={body} stroke={stroke} strokeWidth={1.6} />
          </g>
        </g>
        {/* 近侧两条腿 */}
        <Leg hip={[124, 8]} a={frontA(0)} b={frontB(0)} fill={body} stroke={stroke} />
        <Leg hip={[10, 8]} a={backA(0)} b={backB(0)} fill={body} stroke={stroke} />
      </g>
    </g>
  );
};

/** 马身上几个关键点（相对原点，面朝右、站立时），给粒子溶解用。 */
export const HORSE_POINTS: [number, number][] = [
  [-20, -126], [20, -150], [60, -160], [100, -150], [140, -130], [150, -170], [160, -210], [175, -235], [210, -230],
  [10, -60], [20, -20], [120, -60], [130, -20], [-50, -110], [-70, -70], [80, -110], [40, -110],
];
