import React, {useId} from 'react';
import {COLORS} from '../theme';
import {clamp, hash, mixColor} from '../lib/anim';

// 贯穿全片的物件：一个圆。
// 它在不同段落里扮演不同角色——石头、西西弗斯、宙斯、死神、冥后、众神、片名的太阳——
// 通过 variant、尺寸、发光、挤压、锯齿边缘来变形。所有尺寸都是世界坐标。

export type OrbVariant = 'stone' | 'ember' | 'void' | 'ring' | 'pale';

const PALETTE: Record<OrbVariant, {light: string; base: string; dark: string; glow: string}> = {
  stone: {light: '#F1EBE0', base: COLORS.stone, dark: COLORS.stoneShade, glow: '#FFF3E0'},
  ember: {light: COLORS.emberHot, base: COLORS.ember, dark: COLORS.emberDeep, glow: COLORS.ember},
  void: {light: '#1A1A20', base: COLORS.void, dark: '#000000', glow: '#000000'},
  ring: {light: COLORS.white, base: COLORS.white, dark: COLORS.white, glow: '#FFF6E8'},
  pale: {light: '#F2F0FA', base: COLORS.pale, dark: '#55526A', glow: '#D8D4F0'},
};

export type OrbProps = {
  x: number;
  y: number;
  r: number;
  variant?: OrbVariant;
  /** 0..1+，外圈光晕强度 */
  glow?: number;
  /** 0..1，熄灭成灰色（只对 ember 有意义） */
  dim?: number;
  /** 旋转角度（度），石头滚动时表面纹理跟着转 */
  rotation?: number;
  /** 挤压：正值横向压扁 */
  squash?: number;
  /** 0..1，边缘变成锯齿 */
  jag?: number;
  /** 圆环线宽（ring / void 用） */
  ringWidth?: number;
  opacity?: number;
  seed?: number;
  frame?: number;
};

const jaggedPath = (r: number, jag: number, seed: number, frame: number) => {
  const n = 64;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const spike = i % 2 === 0 ? 1 : -1;
    const k = 1 + jag * (0.06 * spike + 0.05 * Math.sin(a * 7 + frame * 0.4 + seed));
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(a) * r * k).toFixed(2)} ${(Math.sin(a) * r * k).toFixed(2)}`;
  }
  return d + 'Z';
};

export const Orb: React.FC<OrbProps> = ({
  x, y, r, variant = 'stone', glow = 0, dim = 0, rotation = 0, squash = 0, jag = 0, ringWidth = 8, opacity = 1, seed = 1, frame = 0,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = PALETTE[variant];
  const d = clamp(dim);
  const light = mixColor(d, p.light, '#8A8580');
  const base = mixColor(d, p.base, COLORS.ash);
  const dark = mixColor(d, p.dark, '#2A2826');
  const g = glow * (1 - d);
  if (r <= 0 || opacity <= 0) return null;

  const body =
    variant === 'ring' ? (
      <>
        <circle r={r} fill="none" stroke={p.glow} strokeWidth={ringWidth * 4} opacity={0.18 * Math.max(0.3, g)} />
        <circle r={r} fill="none" stroke={base} strokeWidth={ringWidth} />
      </>
    ) : jag > 0 ? (
      <path d={jaggedPath(r, jag, seed, frame)} fill={`url(#${id}b)`} />
    ) : (
      <circle r={r} fill={`url(#${id}b)`} />
    );

  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <defs>
        <radialGradient id={`${id}b`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={p.glow} stopOpacity={0.55} />
          <stop offset="0.4" stopColor={p.glow} stopOpacity={0.18} />
          <stop offset="1" stopColor={p.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      {g > 0 && <circle r={r * (1.8 + g * 1.4)} fill={`url(#${id}g)`} opacity={Math.min(1, g)} />}
      <g transform={`scale(${1 + squash} ${1 - squash})`}>
        {body}
        {variant === 'void' && <circle r={r} fill="none" stroke={COLORS.voidEdge} strokeWidth={ringWidth * 0.5} opacity={0.9} />}
        {variant === 'stone' && (
          <g transform={`rotate(${rotation})`} opacity={0.55}>
            {[0, 1, 2, 3].map((i) => (
              <circle
                key={i}
                cx={Math.cos(i * 1.9 + seed) * r * 0.5}
                cy={Math.sin(i * 1.9 + seed) * r * 0.5}
                r={r * (0.08 + hash(i + seed) * 0.08)}
                fill={dark}
              />
            ))}
            <path
              d={`M${-r * 0.7} ${-r * 0.1} Q ${-r * 0.2} ${r * 0.15} ${r * 0.15} ${-r * 0.2} T ${r * 0.75} ${r * 0.05}`}
              fill="none"
              stroke={dark}
              strokeWidth={Math.max(1.5, r * 0.03)}
            />
          </g>
        )}
      </g>
    </g>
  );
};
