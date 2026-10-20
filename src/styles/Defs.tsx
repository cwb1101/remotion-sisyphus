// SVG 滤镜和图案：轮廓光、木刻排线、纸纹。放在世界层的 <svg> 里，所有组件按 id 引用
import React from "react";
import { THEMES } from "./themes";

export const RIM = "rim-light";
export const HATCH = "hatch";
export const HATCH_DENSE = "hatch-dense";
export const CARVE = "carve-lines";
export const SOFT = "soft-blur";
export const WOODGRAIN = "wood-grain";

export const Defs: React.FC = () => {
  const ink = THEMES.woodcut.ink;
  return (
    <defs>
      {/* 舞台侧光：左侧窗光打出的一圈金色轮廓光 */}
      <filter id={RIM} x="-10%" y="-10%" width="120%" height="120%">
        <feOffset in="SourceAlpha" dx="3.2" dy="1.2" result="off" />
        <feComposite in="SourceAlpha" in2="off" operator="out" result="edge" />
        <feGaussianBlur in="edge" stdDeviation="0.6" result="edgeSoft" />
        <feFlood floodColor={THEMES.main.rim ?? "#DDBD74"} floodOpacity="0.95" />
        <feComposite in2="edgeSoft" operator="in" result="rim" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="rim" />
        </feMerge>
      </filter>
      <filter id={SOFT} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="18" />
      </filter>
      {/* 木刻：衣服暗部的斜排线 */}
      <pattern id={HATCH} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
        <rect width="7" height="7" fill="none" />
        <line x1="0" y1="0" x2="0" y2="7" stroke={ink} strokeWidth="2.2" />
      </pattern>
      <pattern id={HATCH_DENSE} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <line x1="0" y1="0" x2="0" y2="5" stroke={ink} strokeWidth="2.4" />
      </pattern>
      {/* 木刻：墙和地面上的刻刀线（略带抖动的平行线） */}
      <pattern id={CARVE} width="240" height="22" patternUnits="userSpaceOnUse">
        <path d="M0 11 C40 8 80 14 120 10 S200 13 240 11" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M20 3 L70 3.6" stroke={ink} strokeWidth="1.4" />
        <path d="M150 18 L215 17.2" stroke={ink} strokeWidth="1.4" />
      </pattern>
      {/* 主视觉：木头的纹理 */}
      <pattern id={WOODGRAIN} width="160" height="26" patternUnits="userSpaceOnUse">
        <path d="M0 6 C40 3 90 9 160 5" fill="none" stroke={THEMES.main.woodLine} strokeWidth="1.6" opacity="0.7" />
        <path d="M0 16 C50 19 100 13 160 17" fill="none" stroke={THEMES.main.woodLine} strokeWidth="1.2" opacity="0.55" />
        <ellipse cx="110" cy="11" rx="9" ry="3" fill="none" stroke={THEMES.main.woodLine} strokeWidth="1" opacity="0.5" />
      </pattern>
    </defs>
  );
};
