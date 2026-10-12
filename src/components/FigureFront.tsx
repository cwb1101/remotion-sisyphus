import React from 'react';
import {C} from '../theme';

/**
 * 正面（或背面）人物剪影：用于看台上成群的小人、公爵夫妇。
 * 局部坐标原点在骨盆，y 向下，身高约 175，与侧面人物同一比例。
 */
export interface FrontPose {
  /** 双臂外展角度（度）：0 = 垂在身侧，90 = 平举，160 = 举过头 */
  armL: number;
  armR: number;
  /** 肘部弯曲（度），正值向内弯 */
  elL: number;
  elR: number;
  /** 迈步 -1..1 */
  step: number;
  /** 头部左右偏转（像素级位移，模拟转头） */
  turn: number;
  /** 鞠躬 0..1 */
  bow: number;
  /** 面具举到脸上 0..1 */
  mask: number;
  /** 面具笑得前仰后合的摆动角度 */
  laugh: number;
}

export const FRONT_IDLE: FrontPose = {armL: 6, armR: 6, elL: 8, elR: 8, step: 0, turn: 0, bow: 0, mask: 0, laugh: 0};

export type Dress = 'coat' | 'gown' | 'hat' | 'scarf';

const limb = (L: number, w1: number, w2: number) => {
  const a = w1 / 2;
  const b = w2 / 2;
  return `M ${-a} 0 C ${-a * 1.1} ${L * 0.35} ${-b * 1.05} ${L * 0.7} ${-b} ${L} A ${b} ${b} 0 0 0 ${b} ${L} C ${b * 1.05} ${L * 0.7} ${a * 1.1} ${L * 0.35} ${a} 0 A ${a} ${a} 0 0 0 ${-a} 0 Z`;
};

export const FigureFront: React.FC<{
  pose: FrontPose;
  fill: string;
  dress?: Dress;
  /** 面具颜色 */
  maskColor?: string;
}> = ({pose: p, fill, dress = 'coat', maskColor = '#E6DDCB'}) => {
  const bowDrop = p.bow * 18;
  const torsoH = 50 - p.bow * 14;
  const arm = (side: 1 | -1, ang: number, el: number) => (
    <g transform={`translate(${side * 17} ${-torsoH + 4 + bowDrop}) rotate(${side * -ang})`}>
      <path d={limb(30, 8, 6.5)} fill={fill} />
      <g transform={`translate(0 30) rotate(${side * el})`}>
        <path d={limb(27, 6.4, 4.8)} fill={fill} />
        <circle cx={0} cy={29} r={3.6} fill={fill} />
      </g>
    </g>
  );
  const headY = -torsoH - 18 + bowDrop * 1.4;
  const hx = p.turn;
  return (
    <g>
      {/* 腿 */}
      <g transform={`translate(-6 2) rotate(${p.step * 8})`}>
        <path d={limb(88, 11, 6)} fill={fill} />
      </g>
      <g transform={`translate(6 2) rotate(${-p.step * 8})`}>
        <path d={limb(88, 11, 6)} fill={fill} />
      </g>
      {dress === 'gown' ? <path d={`M -12 ${-12} L 12 -12 L 30 90 C 10 96 -10 96 -30 90 Z`} fill={fill} /> : null}
      {/* 躯干 */}
      <path
        d={`M -12 6 C -14 -10 -20 ${-torsoH + 16 + bowDrop} -19 ${-torsoH + 6 + bowDrop} C -14 ${-torsoH + bowDrop} 14 ${-torsoH + bowDrop} 19 ${-torsoH + 6 + bowDrop} C 20 ${-torsoH + 16 + bowDrop} 14 -10 12 6 Z`}
        fill={fill}
      />
      {dress === 'coat' ? <path d="M -13 0 L 13 0 L 17 30 L -17 30 Z" fill={fill} /> : null}
      {arm(-1, p.armL, p.elL)}
      {arm(1, p.armR, p.elR)}
      {/* 颈、头 */}
      <rect x={-3.5 + hx * 0.4} y={headY + 6} width={7} height={10} fill={fill} />
      <ellipse cx={hx} cy={headY} rx={9} ry={11} fill={fill} />
      {dress === 'hat' ? (
        <g>
          <ellipse cx={hx} cy={headY - 8} rx={17} ry={3.4} fill={fill} />
          <path d={`M ${hx - 9} ${headY - 8} C ${hx - 9} ${headY - 22} ${hx + 9} ${headY - 22} ${hx + 9} ${headY - 8} Z`} fill={fill} />
        </g>
      ) : null}
      {dress === 'scarf' ? <path d={`M ${hx - 11} ${headY - 2} C ${hx - 12} ${headY - 16} ${hx + 12} ${headY - 16} ${hx + 11} ${headY - 2} L ${hx + 13} ${headY + 12} L ${hx - 13} ${headY + 12} Z`} fill={fill} /> : null}
      {/* 面具：从胸前举到脸上，笑的时候左右摆 */}
      {p.mask > 0.01 ? (
        <g transform={`translate(${hx + (1 - p.mask) * 10} ${headY + (1 - p.mask) * 34}) rotate(${p.laugh})`} opacity={Math.min(1, p.mask * 1.6)}>
          <ellipse cx={0} cy={0} rx={8.6} ry={10.8} fill={maskColor} />
          <ellipse cx={-3.4} cy={-2.6} rx={2.2} ry={1.3} fill={C.ink} />
          <ellipse cx={3.4} cy={-2.6} rx={2.2} ry={1.3} fill={C.ink} />
          <path d="M -4 4 Q 0 8.5 4 4 Q 0 6 -4 4 Z" fill={C.ink} />
        </g>
      ) : null}
    </g>
  );
};
