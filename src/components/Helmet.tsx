import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';
import {Windmill} from './Windmill';

/**
 * 贯穿全片的物件：头盔 ⇄ 铜盆。
 * 局部坐标：宽约 110 单位，原点在帽檐中线，y 向下。
 */
export interface HelmetState {
  /** 0 = 带纸板面甲的旧铁盔（morion），1 = 理发师铜盆（倒扣） */
  morph: number;
  /** 金色轮廓光强度 0..1 */
  glow: number;
  /** 纸板面甲 0..1（0 = 还没补上） */
  visor: number;
  /** 碎裂 / 散开程度 0..1（0 = 完整） */
  scatter: number;
  /** 灰尘蒙蔽 0..1（祖上旧物，无光泽） */
  dust?: number;
  seed?: string;
  /** 铜盆表面映出的风车 0..1 */
  reflection?: number;
  reflectRot?: number;
}

export const HELMET_DEFAULT: HelmetState = {morph: 0, glow: 0.8, visor: 1, scatter: 0, dust: 0};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 按参数生成外轮廓点：左檐尖 → 檐面 → 盔顶 → 右檐尖 → 檐底回到左 */
const outline = (m: number) => {
  const domeW = lerp(36, 34, m);
  const domeH = lerp(40, 24, m);
  const crest = lerp(13, 0, m);
  const brimW = lerp(55, 58, m);
  const tipUp = lerp(10, 0.5, m);
  const brimSag = lerp(6, 2, m);
  const under = lerp(4, 9, m);
  const pts: Array<[number, number]> = [];
  const brimTop = (x: number) => {
    const u = x / brimW;
    return brimSag * (1 - u * u) - tipUp * Math.pow(Math.abs(u), 3);
  };
  for (let i = 0; i <= 8; i++) {
    const x = lerp(-brimW, -domeW, i / 8);
    pts.push([x, brimTop(x)]);
  }
  for (let i = 1; i < 40; i++) {
    const a = Math.PI - (Math.PI * i) / 40;
    const x = Math.cos(a) * domeW;
    const shape = Math.pow(Math.sin(a), lerp(0.75, 0.6, m));
    const c = crest * Math.exp(-Math.pow(x / 9, 2)) * Math.sin(a);
    pts.push([x, brimTop(x) - shape * domeH - c]);
  }
  for (let i = 0; i <= 8; i++) {
    const x = lerp(domeW, brimW, i / 8);
    pts.push([x, brimTop(x)]);
  }
  for (let i = 1; i < 24; i++) {
    const x = lerp(brimW, -brimW, i / 24);
    const u = x / brimW;
    pts.push([x, brimTop(x) + under * Math.sqrt(Math.max(0, 1 - u * u)) + 1.5]);
  }
  return {pts, domeW, domeH, brimW};
};

const toPath = (pts: Array<[number, number]>) =>
  `M ${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ')} Z`;

/** 只画形体，供人物剪影复用（flat 时整只画成纯色） */
export const HelmetShape: React.FC<{state: HelmetState; flat?: string | null}> = ({state, flat}) => {
  const {pts, domeW, domeH} = outline(state.morph);
  const d = toPath(pts);
  const crestLine = toPath(pts.slice(8, 49)).replace(' Z', '');
  const uid = `hm${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (flat) {
    return <path d={d} fill={flat} />;
  }
  const g = state.glow;
  const dust = state.dust ?? 0;
  // 旧铁盔偏冷暗，铜盆偏暖：形变时颜色一起过渡
  const top = state.morph > 0.5 ? '#7A5A2C' : '#4A3D2C';
  const midC = state.morph > 0.5 ? '#3E2B14' : '#2A2119';
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}b`} x1="0.2" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.45" stopColor={midC} />
          <stop offset="1" stopColor="#0E0B08" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${uid}b)`} />
      {/* 铜盆曲面上映出的风车（被盆面压扁、弯曲） */}
      {(state.reflection ?? 0) > 0.01 ? (
        <g opacity={(state.reflection ?? 0) * 0.85}>
          <clipPath id={`${uid}r`}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${uid}r)`}>
            {[[-20, -2, 0.016, -14], [2, -6, 0.02, 0], [21, -1, 0.015, 14]].map(([x, y, k, sk], i) => (
              <g key={i} transform={`translate(${x} ${y}) skewX(${sk}) scale(${k} ${k * 0.8})`}>
                <Windmill x={0} y={0} scale={1} rot={(state.reflectRot ?? 0) + i * 30} fill="#1E140A" detail={false} />
              </g>
            ))}
            <path d={d} fill="none" stroke="#F4D49A" strokeWidth={1} opacity={0.4} />
          </g>
        </g>
      ) : null}
      {/* 高光带 */}
      <path
        d={`M ${-domeW * 0.62} ${-domeH * 0.35} Q ${-domeW * 0.15} ${-domeH * 1.02} ${domeW * 0.5} ${-domeH * 0.62}`}
        stroke={C.accent}
        strokeWidth={2.4}
        fill="none"
        opacity={0.12 + 0.35 * g * (1 - dust)}
        strokeLinecap="round"
      />
      {/* 纸板面甲：从帽檐前沿垂下来的一块板，铜盆形态下消失 */}
      {state.visor > 0.01 && state.morph < 0.99 ? (
        <g opacity={state.visor * (1 - state.morph)}>
          <path
            d="M -24 4 L 30 4 L 27 30 C 14 34 -10 34 -21 29 Z"
            fill="#5C4E3C"
            stroke="#2A2219"
            strokeWidth={1.4}
          />
          {/* 一道横向窥缝 + 铆钉，纸板糊上去的面甲 */}
          <path d="M -15 11 L 22 11" stroke="#120E0A" strokeWidth={2.6} strokeLinecap="round" />
          {[[-19, 7], [25, 7], [-17, 25], [23, 25]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} fill="#2A2219" />
          ))}
          <path d="M -21 18 L 28 18" stroke="#3A3026" strokeWidth={1} />
        </g>
      ) : null}
      {/* 铜盆的缺口 */}
      {state.morph > 0.02 ? (
        <path d="M -9 8 A 9 7 0 0 0 9 8 Z" fill={C.ink} opacity={state.morph} />
      ) : null}
      {/* 灰尘：一层发灰的薄膜，擦干净后褪去 */}
      {dust > 0.01 ? <path d={d} fill="#5A5044" opacity={dust * 0.35} /> : null}
      {/* 金色轮廓光 */}
      <path d={crestLine} stroke={C.accent} strokeWidth={1.6} fill="none" opacity={g} strokeLinejoin="round" />
      <path d={crestLine} stroke="#FFE2A0" strokeWidth={0.6} fill="none" opacity={g * 0.7} />
    </g>
  );
};

/** 完整物件：带光晕、可碎裂、可聚合 */
export const Helmet: React.FC<{
  state: HelmetState;
  x: number;
  y: number;
  /** 像素宽度 */
  size: number;
  rotate?: number;
  shadow?: boolean;
}> = ({state, x, y, size, rotate = 0, shadow = true}) => {
  const k = size / 110;
  const seed = state.seed ?? 'helmet';
  const pieces = 6;
  const sc = state.scatter;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${k})`}>
      {state.glow > 0.01 ? (
        <ellipse cx={0} cy={-18} rx={90} ry={62} fill="url(#helmetGlow)" opacity={state.glow * 0.85} />
      ) : null}
      {shadow ? <ellipse cx={4} cy={14} rx={62} ry={7} fill="#000" opacity={0.45 * (1 - sc)} /> : null}
      {sc < 0.001 ? (
        <HelmetShape state={state} />
      ) : (
        Array.from({length: pieces}).map((_, i) => {
          const a0 = (i / pieces) * Math.PI * 2;
          const a1 = ((i + 1) / pieces) * Math.PI * 2;
          const r = 140;
          const cx = 0;
          const cy = -14;
          const mid = (a0 + a1) / 2;
          const dist = sc * (60 + random(`${seed}-d${i}`) * 90);
          const rot = sc * (random(`${seed}-r${i}`) - 0.5) * 160;
          const fall = sc * sc * 40;
          return (
            <g
              key={i}
              transform={`translate(${Math.cos(mid) * dist} ${Math.sin(mid) * dist + fall}) rotate(${rot} ${cx} ${cy})`}
            >
              <clipPath id={`${seed}-clip-${i}`}>
                <polygon
                  points={`${cx},${cy} ${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r} ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r}`}
                />
              </clipPath>
              <g clipPath={`url(#${seed}-clip-${i})`}>
                <HelmetShape state={state} />
              </g>
            </g>
          );
        })
      )}
    </g>
  );
};

/** 头盔用到的渐变，放进每个场景的 <defs> */
export const HelmetDefs: React.FC = () => (
  <>
    <linearGradient id="helmetBody" x1="0" y1="-1" x2="0.3" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stopColor="#4A3D2C" />
      <stop offset="0.45" stopColor="#2A2119" />
      <stop offset="1" stopColor="#0E0B08" />
    </linearGradient>
    <radialGradient id="helmetGlow">
      <stop offset="0" stopColor={C.accent} stopOpacity={0.55} />
      <stop offset="0.45" stopColor={C.accent} stopOpacity={0.16} />
      <stop offset="1" stopColor={C.accent} stopOpacity={0} />
    </radialGradient>
  </>
);
