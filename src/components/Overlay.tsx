// 镜头外面的几层：附着标签、水印、质感（暗角 颗粒 纸纹）、音效
import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SfxEvent } from "../data/subtitles";
import manifest from "../data/sfx-manifest.json";
import { clamp } from "../lib/motion";
import { Theme } from "../styles/themes";
import { FONT_SANS } from "../styles/fonts";

/** 水印的区域（右上角），字幕 人物 标签都不进这个框；检查脚本用同一个值 */
export const WATERMARK_BOX = { x: 1920 - 300, y: 0, w: 300, h: 110 };

/** 位置 字号 线宽 透明度全程固定；只在浅色画风（木刻 纸）上把颜色换成墨色，否则看不见 */
export const Watermark: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    style={{
      position: "absolute",
      right: 40,
      top: 34,
      padding: "5px 12px 6px",
      border: `1px solid ${dark ? "#1C1712" : "#EDE6D8"}`,
      color: dark ? "#1C1712" : "#EDE6D8",
      fontFamily: FONT_SANS,
      fontWeight: 500,
      fontSize: 22,
      letterSpacing: 1,
      opacity: 0.35,
      lineHeight: 1.2,
    }}
  >
    肆号静匣Logos
  </div>
);

/** 附着标签：小号黑体，可以挂在画面里的某个点旁边（带一根细引线），也可以放在左上角 */
export const Label: React.FC<{ text: string; at?: { x: number; y: number }; side?: "left" | "right"; appear: number; end: number; theme: Theme }> = ({ text, at, side = "left", appear, end, theme }) => {
  const f = useCurrentFrame();
  const o = clamp((f - appear) / 8, 0, 1) * clamp((end - f) / 6, 0, 1);
  if (o <= 0) return null;
  const style: React.CSSProperties = { position: "absolute", fontFamily: FONT_SANS, fontWeight: 500, fontSize: 30, color: theme.label, opacity: o * 0.9, letterSpacing: 2, whiteSpace: "nowrap", textShadow: `0 1px 6px ${theme.textShadow}` };
  if (!at) {
    return (
      <div style={{ ...style, left: 64, top: 52, paddingLeft: 14, borderLeft: `3px solid ${theme.keyword}` }}>
        {text}
      </div>
    );
  }
  const dx = side === "left" ? -150 : 150;
  return (
    <>
      <svg style={{ position: "absolute", left: 0, top: 0, opacity: o * 0.8 }} width={1920} height={1080}>
        <line x1={at.x} y1={at.y} x2={at.x + dx * 0.8} y2={at.y - 40} stroke={theme.label} strokeWidth={1.5} />
        <circle cx={at.x} cy={at.y} r={3.5} fill={theme.label} />
      </svg>
      <div style={{ ...style, top: at.y - 58, ...(side === "left" ? { right: 1920 - (at.x + dx * 0.8) + 8 } : { left: at.x + dx * 0.8 + 8 }) }}>{text}</div>
    </>
  );
};

/** 暗角 + 颗粒；木刻时换成纸纹 */
export const Atmosphere: React.FC<{ theme: Theme; opacity?: number }> = ({ theme, opacity = 1 }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2);
  const paper = theme.material === "woodcut";
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <svg width={1920} height={1080}>
        <defs>
          <radialGradient id={`vig-${theme.id}`} cx="50%" cy="48%" r="72%">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor={paper ? "#3A2E1E" : "#000"} stopOpacity={theme.vignette} />
          </radialGradient>
          <filter id={`grain-${theme.id}`}>
            <feTurbulence type="fractalNoise" baseFrequency={paper ? 0.55 : 0.9} numOctaves={2} seed={paper ? 3 : seed} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 1.6 -0.55" />
          </filter>
        </defs>
        <rect width={1920} height={1080} filter={`url(#grain-${theme.id})`} opacity={theme.grain * (paper ? 2.2 : 1)} style={{ mixBlendMode: paper ? "multiply" : "overlay" }} />
        <rect width={1920} height={1080} fill={`url(#vig-${theme.id})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** 音效：同一时刻有两个音效叠在一起时，两个都先降 3dB 再相加 */
export const SfxLayer: React.FC<{ events: SfxEvent[]; until: number }> = ({ events, until }) => {
  const ev = events.filter((e) => e.frame < until);
  const dur = (e: SfxEvent) => manifest[e.id].durationFrames;
  return (
    <>
      {ev.map((e, i) => {
        const overlaps = ev.some((o, j) => j !== i && o.frame < e.frame + dur(e) && e.frame < o.frame + dur(o) && Math.abs(o.frame - e.frame) < 12);
        const vol = overlaps ? 0.708 : 1;
        return (
          <Sequence key={i} from={e.frame} durationInFrames={dur(e) + 2} layout="none">
            <Html5Audio src={staticFile(manifest[e.id].file)} volume={vol} />
          </Sequence>
        );
      })}
    </>
  );
};
