import React, {useId} from 'react';
import {C} from '../theme';

/**
 * 贯穿全片的物件：一只盛水的玻璃杯。
 * 状态全部由参数驱动，各节复用：
 *  - bulge：水面高出杯口的弯月面（0 平，1 满到鼓起）
 *  - ripple / ripplePhase：水面波纹振幅与相位
 *  - spill：溢出水滴沿杯壁下滑进度（0..1，1 = 到达杯脚）
 *  - puddle：桌面水渍扩散（0..1）
 *  - caustic：杯影里的焦散亮斑强度；causticTint 0..1 给焦散染一点强调色
 *  - light：受光强度（窗光变化时同步提亮）
 * 坐标：杯底中心为原点，h 为杯高。
 */
export const Glass: React.FC<{
  x: number;
  y: number;
  h: number;
  bulge?: number;
  ripple?: number;
  ripplePhase?: number;
  spill?: number;
  puddle?: number;
  caustic?: number;
  causticTint?: number;
  light?: number;
}> = ({x, y, h, bulge = 1, ripple = 0, ripplePhase = 0, spill = 0, puddle = 0, caustic = 0.5, causticTint = 0, light = 1}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wt = 0.62 * h;
  const wb = 0.5 * h;
  const bt = 0.075 * h;
  const lx = (yy: number) => -wb / 2 + ((-wb / 2 + wt / 2) * yy) / h; // 左壁 x（yy 为离杯底的高度）
  const rx = (yy: number) => -lx(yy);

  // 水面（弯月面 + 波纹）
  const N = 28;
  const surface: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const px = -wt / 2 + u * wt;
    const dome = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
    const wave = ripple * Math.sin(u * Math.PI * 5 - ripplePhase) * dome;
    surface.push([px, -h - bulge * 0.05 * h * dome - wave * 0.014 * h]);
  }
  const surfPath = surface.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  const waterPath = `${surfPath} L${rx(bt).toFixed(2)},${-bt} L${lx(bt).toFixed(2)},${-bt} Z`;

  // 溢出水滴：沿右侧外壁滑下（先慢后快）
  const s = Math.min(1, Math.max(0, spill));
  const dropY = -h + s * (h - 0.02 * h);
  const dropX = rx(-dropY) + 0.012 * h;
  const tint = causticTint;
  const causticColor = `rgb(${244 - 150 * tint * 0.6},${240 - 88 * tint * 0.6},${232 - 41 * tint * 0.6})`;

  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id={`water${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#4F4B46" stopOpacity={0.42} />
          <stop offset="0.22" stopColor="#FFFFFF" stopOpacity={0.05} />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.14 * light} />
          <stop offset="0.85" stopColor="#4F4B46" stopOpacity={0.2} />
          <stop offset="1" stopColor="#3E3B37" stopOpacity={0.5} />
        </linearGradient>
        <linearGradient id={`trail${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.15} />
        </linearGradient>
        <filter id={`soft${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={0.012 * h} />
        </filter>
        <filter id={`softer${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={0.035 * h} />
        </filter>
      </defs>

      {/* 投影：光从左上来，影子落向右前方；影中有一块透过水聚起的焦散亮斑 */}
      <path
        d={`M${-wb / 2},0 L${wb / 2},0 L${wb / 2 + 1.05 * h},${0.05 * h} L${-wb / 2 + 0.95 * h},${0.075 * h} Z`}
        fill={C.dark}
        opacity={0.34}
        filter={`url(#softer${id})`}
      />
      <ellipse
        cx={0.5 * h}
        cy={0.036 * h}
        rx={0.15 * h}
        ry={0.018 * h}
        fill={causticColor}
        opacity={caustic * light}
        filter={`url(#soft${id})`}
      />

      {/* 桌面水渍 */}
      {puddle > 0 && (
        <g>
          <ellipse cx={wb / 2 + 0.05 * h} cy={0.012 * h} rx={0.085 * h * puddle} ry={0.016 * h * puddle} fill="#4A4742" opacity={0.42} />
          <ellipse
            cx={wb / 2 + 0.04 * h}
            cy={0.008 * h}
            rx={0.06 * h * puddle}
            ry={0.008 * h * puddle}
            fill="none"
            stroke="#F4F0E8"
            strokeWidth={0.005 * h}
            opacity={0.55 * puddle}
          />
        </g>
      )}

      {/* 杯身：极淡的透明体 */}
      <path d={`M${lx(h)},${-h} L${lx(0)},0 L${rx(0)},0 L${rx(h)},${-h} Z`} fill="#FFFFFF" opacity={0.07 * light} />
      {/* 水：一层很淡的灰 + 两侧折射暗边 */}
      <path d={waterPath} fill="#46423D" opacity={0.2} />
      <path d={waterPath} fill={`url(#water${id})`} />
      {/* 透过水看到的窗：柱面透镜把它左右翻到杯子右半边 */}
      <ellipse cx={0.1 * h} cy={-0.55 * h} rx={0.1 * h} ry={0.3 * h} fill="#FFFFFF" opacity={0.22 * light} filter={`url(#softer${id})`} />
      {/* 被水折射、错开了位置的桌沿 */}
      <line x1={lx(0.3 * h) + 0.02 * h} y1={-0.3 * h} x2={rx(0.3 * h) - 0.02 * h} y2={-0.3 * h} stroke="#E9E4D9" strokeWidth={0.006 * h} opacity={0.35} />
      <rect x={lx(0.3 * h) + 0.01 * h} y={-0.3 * h} width={rx(0.3 * h) - lx(0.3 * h) - 0.02 * h} height={0.22 * h} fill="#5E5A54" opacity={0.12} />
      {/* 杯底厚玻璃 */}
      <path d={`M${lx(bt)},${-bt} L${lx(0)},0 L${rx(0)},0 L${rx(bt)},${-bt} Z`} fill="#FFFFFF" opacity={0.2 * light} />
      <line x1={lx(0)} y1={0} x2={rx(0)} y2={0} stroke={C.dark} strokeWidth={0.008 * h} opacity={0.45} />

      {/* 杯壁：左壁朝窗受光，右壁带一道暗折射线 */}
      <line x1={lx(h)} y1={-h} x2={lx(0)} y2={0} stroke="#F5F1E9" strokeWidth={0.014 * h} opacity={0.8 * light} />
      <line x1={lx(h) + 0.03 * h} y1={-h + 0.02 * h} x2={lx(0) + 0.028 * h} y2={-0.1 * h} stroke="#FFFFFF" strokeWidth={0.006 * h} opacity={0.35 * light} />
      <line x1={rx(h)} y1={-h} x2={rx(0)} y2={0} stroke="#36332F" strokeWidth={0.011 * h} opacity={0.55} />
      <line x1={rx(h) - 0.025 * h} y1={-h + 0.03 * h} x2={rx(0) - 0.022 * h} y2={-0.08 * h} stroke="#FFFFFF" strokeWidth={0.008 * h} opacity={0.3 * light} />

      {/* 杯口 */}
      <ellipse cx={0} cy={-h} rx={wt / 2} ry={0.03 * h} fill="none" stroke="#F5F1E9" strokeWidth={0.008 * h} opacity={0.75 * light} />
      {/* 弯月面高光 */}
      <path d={surfPath} fill="none" stroke="#FBF8F2" strokeWidth={0.01 * h} opacity={0.95 * light} />

      {/* 溢出的那一滴与它留下的水痕 */}
      {spill > 0 && spill < 1.001 && (
        <g>
          <path
            d={`M${rx(h) + 0.006 * h},${-h} L${dropX - 0.004 * h},${dropY}`}
            stroke={`url(#trail${id})`}
            strokeWidth={0.012 * h}
            fill="none"
            opacity={0.85}
          />
          {spill < 0.999 && (
            <g>
              <ellipse cx={dropX} cy={dropY} rx={0.022 * h} ry={0.03 * h} fill="#77736C" stroke="#E9E4D9" strokeWidth={0.004 * h} />
              <ellipse cx={dropX - 0.007 * h} cy={dropY - 0.01 * h} rx={0.007 * h} ry={0.009 * h} fill="#FFFFFF" opacity={0.95} />
            </g>
          )}
        </g>
      )}
    </g>
  );
};
