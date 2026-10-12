import React from 'react';

/**
 * 瘦马剪影（罗西南特），面朝 +x。原点在马鞍处，y 向下；蹄底约在 y=128。
 * gait: stand / walk / gallop，phase 为步态相位（0..1 循环），rear 为前蹄抬起程度。
 */
export interface HorseState {
  gait: 'stand' | 'walk' | 'gallop';
  phase: number;
  /** 0..1 人立 */
  rear: number;
  /** 低头 / 抬头（度） */
  head: number;
  tail: number;
}

const limb = (L: number, w1: number, w2: number) => {
  const a = w1 / 2;
  const b = w2 / 2;
  return `M ${-a} 0 C ${-a * 1.1} ${L * 0.3} ${-b * 1.05} ${L * 0.75} ${-b} ${L} L ${b} ${L} C ${b * 1.05} ${L * 0.75} ${a * 1.1} ${L * 0.3} ${a} 0 Z`;
};

const BARREL =
  'M -60 2 C -52 -9 -38 -4 -20 -3 C 0 -2 22 -6 38 -10 C 50 -12 60 -2 62 12 C 64 26 56 40 40 42 C 18 46 -10 46 -36 42 C -54 38 -70 28 -70 12 C -70 6 -66 2 -60 2 Z';
const NECK = 'M -8 6 C -6 -14 2 -38 12 -54 L 30 -50 C 26 -32 22 -12 20 10 Z';
const HEAD =
  'M 10 -58 C 16 -66 28 -64 34 -58 C 42 -48 52 -34 56 -24 C 58 -18 52 -14 46 -17 C 38 -22 26 -34 16 -42 C 11 -46 8 -52 10 -58 Z';
const EARS = 'M 14 -60 L 15 -73 L 20 -62 Z M 19 -61 L 23 -72 L 25 -60 Z';
const EARS_DONKEY = 'M 13 -60 L 6 -86 L 19 -62 Z M 19 -61 L 18 -88 L 26 -60 Z';
const MANE = 'M -6 2 C -6 -14 2 -38 12 -56 L 8 -50 L 5 -40 L 0 -32 L -2 -22 L -6 -12 Z';

export const HorseBody: React.FC<{
  state: HorseState;
  fill: string;
  farFill?: string;
  /** 骑手等附在马鞍上的东西，在马的坐标系里画（人立时随马身转动） */
  rider?: React.ReactNode;
  /** 驴：长耳朵、短脖子（桑丘的坐骑） */
  donkey?: boolean;
}> = ({state, fill, farFill, rider, donkey}) => {
  const far = farFill ?? fill;
  const ph = state.phase * Math.PI * 2;
  let amp = 0;
  let bob = 0;
  if (state.gait === 'walk') {
    amp = 16;
    bob = Math.sin(ph * 2) * 1.5;
  } else if (state.gait === 'gallop') {
    amp = 38;
    bob = Math.sin(ph * 2) * 6;
  }
  const swing = (offset: number) => Math.sin(ph + offset * Math.PI * 2) * amp;
  const bend = (offset: number) => Math.max(0, Math.sin(ph + offset * Math.PI * 2 + 1.2)) * amp * 1.4;
  const rear = state.rear;
  // 前腿：上段 44 下段 46；后腿带后弯的飞节
  const front = (x: number, off: number, color: string) => {
    const s = swing(off) - rear * 70;
    const k = bend(off) + rear * 95;
    return (
      <g transform={`translate(${x} 30) rotate(${-s})`}>
        <path d={limb(44, 13, 7)} fill={color} />
        <g transform={`translate(0 44) rotate(${k})`}>
          <path d={limb(46, 6, 5)} fill={color} />
          <path d="M -4.5 44 L 5 44 L 6 52 L -5 52 Z" fill={color} />
        </g>
      </g>
    );
  };
  const hind = (x: number, off: number, color: string) => {
    const s = swing(off + 0.5) * 0.9 + rear * 22;
    const k = -bend(off + 0.5) * 0.6 - 28 - rear * 10;
    return (
      <g transform={`translate(${x} 26) rotate(${-s + 14})`}>
        <path d={limb(50, 17, 8)} fill={color} />
        <g transform={`translate(0 50) rotate(${k})`}>
          <path d={limb(36, 6.5, 5)} fill={color} />
          <g transform={`translate(0 36) rotate(${-k - (-s + 14) * 0.6})`}>
            <path d={limb(24, 5, 4.6)} fill={color} />
            <path d="M -4.5 22 L 5 22 L 6 30 L -5 30 Z" fill={color} />
          </g>
        </g>
      </g>
    );
  };
  return (
    <g transform={`translate(0 ${-bob}) rotate(${-rear * 28} -58 30)`}>
      {front(40, 0.5, far)}
      {hind(-52, 0.5, far)}
      {/* 尾巴 */}
      <path
        d={`M -66 4 C -82 ${16 + state.tail} -84 ${48 + state.tail} -${76 - state.tail * 0.3} 78 C -72 60 -72 34 -60 10 Z`}
        fill={fill}
      />
      <path d={BARREL} fill={fill} />
      {/* 瘦马的胯骨和肋骨起伏 */}
      <path d="M -58 4 C -54 -6 -46 -8 -40 -2 Z" fill={fill} />
      <g transform={`translate(44 -4) rotate(${state.head})`}>
        <path d={NECK} fill={fill} />
        <path d={MANE} fill={fill} />
        <path d={HEAD} fill={fill} />
        <path d={donkey ? EARS_DONKEY : EARS} fill={fill} />
      </g>
      {front(32, 0, fill)}
      {hind(-44, 0, fill)}
      {rider}
    </g>
  );
};
