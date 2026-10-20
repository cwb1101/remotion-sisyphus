// 主字幕：单行或上下两行，下行可以晚一拍出；重点词染金，也可以离开字幕行单独放大。
// 位置按总设定自动约束：底边不低于 88%，单行顶边不高于 75%，两行顶边不高于 70%，行距 1.25 倍，左右居中。
import React from "react";
import { useCurrentFrame } from "remotion";
import { Screen } from "../data/subtitles";
import { clamp, easeOut } from "../lib/motion";
import { useTheme } from "../styles/ThemeContext";
import { FONT_SERIF } from "../styles/fonts";

export const VIDEO_W = 1920;
export const VIDEO_H = 1080;
export const FONT_SIZE = 72;
export const MIN_FONT = 64;
export const LINE = 1.25;
const BOTTOM = VIDEO_H * 0.875; // 留一点余量，保证字的底边在 88% 以上
const TOP_LIMIT = { 1: VIDEO_H * 0.75, 2: VIDEO_H * 0.7 };
const EXIT = 4;

/** 字幕块的位置（检查脚本也用这个算出来的框） */
export const subtitleBox = (lines: number) => {
  let size = FONT_SIZE;
  while (size > MIN_FONT && BOTTOM - lines * size * LINE < TOP_LIMIT[lines as 1 | 2]) size -= 1;
  const top = BOTTOM - lines * size * LINE;
  return { size, top, bottom: BOTTOM };
};

type Run = { text: string; key: boolean };
const parse = (line: string): Run[] => {
  const out: Run[] = [];
  const re = /【(.+?)】/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), key: false });
    out.push({ text: m[1], key: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), key: false });
  return out;
};

/** 逐字由虚变实：每个字晚 stagger 帧出现，fade 帧变清楚 */
const Line: React.FC<{ line: string; appear: number; frame: number; size: number; stagger: number; color: string; keyColor: string; shadow: string; exitAlpha: number }> = ({ line, appear, frame, size, stagger, color, keyColor, shadow, exitAlpha }) => {
  const runs = parse(line);
  let i = 0;
  const fade = 6;
  return (
    <div style={{ fontSize: size, lineHeight: `${size * LINE}px`, height: size * LINE, whiteSpace: "pre", fontFamily: FONT_SERIF, fontWeight: 900, letterSpacing: size * 0.06 }}>
      {runs.map((r, ri) =>
        [...r.text].map((ch) => {
          const t = frame - appear - i * stagger;
          i += 1;
          const u = clamp(t / fade, 0, 1);
          const e = easeOut(u);
          return (
            <span
              key={`${ri}-${i}`}
              style={{
                color: r.key ? keyColor : color,
                opacity: e * exitAlpha,
                filter: u < 1 ? `blur(${(1 - e) * 10}px)` : undefined,
                display: "inline-block",
                transform: `translateY(${(1 - e) * 10}px)`,
                textShadow: `0 3px 14px ${shadow}, 0 0 3px ${shadow}`,
              }}
            >
              {ch === " " ? "　" : ch}
            </span>
          );
        }),
      )}
    </div>
  );
};

/** 离开字幕行单独放大的重点词：放在画面左半部（不放右侧，不竖排），砸下来再回弹 */
const FloatWord: React.FC<{ text: string; at: number; frame: number; color: string; shadow: string; exitAlpha: number }> = ({ text, at, frame, color, shadow, exitAlpha }) => {
  const t = frame - at;
  if (t < -4) return null;
  const u = clamp(t / 7, 0, 1);
  const over = t > 7 ? Math.sin((t - 7) * 0.6) * Math.exp(-(t - 7) / 5) * 0.05 : 0;
  const scale = 1.5 - 0.5 * easeOut(u) + over;
  return (
    <div style={{ position: "absolute", left: VIDEO_W * 0.12, width: VIDEO_W * 0.46, top: VIDEO_H * 0.2, textAlign: "center", fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 168, letterSpacing: 24, color, opacity: clamp((t + 4) / 5, 0, 1) * exitAlpha, transform: `scale(${scale})`, textShadow: `0 6px 30px ${shadow}` }}>
      {text.replace(/[【】]/g, "")}
    </div>
  );
};

export const Subtitle: React.FC<{ screen: Screen }> = ({ screen }) => {
  const frame = useCurrentFrame();
  const th = useTheme();
  const lines = [screen.upper, screen.lower].filter(Boolean) as string[];
  if (!lines.length && !screen.float) return null;
  const box = subtitleBox(Math.max(1, lines.length));
  const exitAlpha = clamp((screen.end - frame) / EXIT, 0, 1);
  // 第一屏要在 0.3 秒内读得到：字间隔压到 0.25 帧
  const stagger = screen.start === 0 ? 0.25 : 1;
  return (
    <>
      {screen.float ? <FloatWord text={screen.float.text} at={screen.float.at} frame={frame} color={th.keyword} shadow={th.textShadow} exitAlpha={exitAlpha} /> : null}
      {th.material === "woodcut" ? (
        // 浅色画风：字后面垫一条很淡的纸色，压住背后的刻线，字才不花
        <div style={{ position: "absolute", left: VIDEO_W * 0.22, width: VIDEO_W * 0.56, top: box.top - 14, height: box.bottom - box.top + 22, background: `radial-gradient(ellipse at center, ${th.bg}E6 0%, ${th.bg}B3 55%, ${th.bg}00 75%)`, opacity: exitAlpha }} />
      ) : null}
      <div style={{ position: "absolute", left: 0, width: VIDEO_W, top: box.top, textAlign: "center" }}>
        {lines.map((l, i) => (
          <Line key={i} line={l} appear={i === 1 ? screen.lowerAt : screen.start} frame={frame} size={box.size} stagger={stagger} color={th.text} keyColor={th.keyword} shadow={th.textShadow} exitAlpha={exitAlpha} />
        ))}
      </div>
    </>
  );
};
