// 全片：一个连续镜头。世界层（布景 + 各节角色）在镜头里，字幕 标签 水印 音效在镜头外。
// 画风按 sections 切换，换画风的那一刻落在小节线上，前后各几帧交叉淡化（被镜头的推近遮住）
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CameraRig, toScreen, useCamera } from "./components/Camera";
import { Atmosphere, Label, SfxLayer, Watermark } from "./components/Overlay";
import { Subtitle } from "./components/Subtitle";
import { screenAt, screens, sections, sfx } from "./data/subtitles";
import { bar } from "./lib/rhythm";
import { clamp } from "./lib/motion";
import { Defs } from "./styles/Defs";
import { ThemeProvider } from "./styles/ThemeContext";
import { Theme, THEMES } from "./styles/themes";
import { HeroState, solveHero } from "./sections/hero";
import { HookSection } from "./sections/HookSection";
import { LAYERS, Layer, NurserySet } from "./sections/NurserySet";
import { EmperorGroup, emperorRig } from "./sections/SetupSection";
import { TrialSection } from "./sections/TrialSection";
import { SetupSection } from "./sections/SetupSection";
import { SHOTS } from "./sections/world";
import { worldPoint } from "./components/rig";

/** 预览：开头加第一节，到第 12 小节结束（28.8 秒） */
export const PREVIEW_END = bar(13);

const CAMERA = sections.flatMap((s) => s.camera);

const SECTION_COMPONENTS: Record<string, React.FC<{ layer: Layer; st: HeroState; frame: number }>> = {
  hook: HookSection,
  setup: SetupSection,
  trial: TrialSection,
};

/** 当前帧的画风；在小节线前后 6 帧内和上一节的画风交叉 */
const XFADE = 6;
const themesAt = (f: number): { theme: Theme; alpha: number }[] => {
  const i = sections.findIndex((s) => f >= s.start && f < s.end);
  const cur = sections[Math.max(0, i)];
  const prev = sections[i - 1];
  const next = sections[i + 1];
  if (prev && prev.style !== cur.style && f < cur.start + XFADE) {
    const a = clamp((f - cur.start + XFADE) / (2 * XFADE), 0, 1);
    return [{ theme: THEMES[prev.style], alpha: 1 }, { theme: THEMES[cur.style], alpha: a }];
  }
  if (next && next.style !== cur.style && f >= next.start - XFADE) {
    const a = clamp((f - next.start + XFADE) / (2 * XFADE), 0, 1);
    return [{ theme: THEMES[cur.style], alpha: 1 }, { theme: THEMES[next.style], alpha: a }];
  }
  return [{ theme: THEMES[cur.style], alpha: 1 }];
};

const World: React.FC<{ frame: number; st: HeroState; cam: ReturnType<typeof useCamera> }> = ({ frame, st, cam }) => {
  const sec = sections.find((s) => frame >= s.start && frame < s.end) ?? sections[0];
  const Sec = SECTION_COMPONENTS[sec.id] ?? TrialSection;
  const emperorUntil = sections.find((s) => s.id === "setup")!.end;
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <CameraRig cam={cam}>
        {LAYERS.map((layer) => (
          <g key={layer}>
            <NurserySet layer={layer} frame={frame} />
            {frame < emperorUntil ? <EmperorGroup layer={layer} frame={frame} /> : null}
            <Sec layer={layer} st={st} frame={frame} />
          </g>
        ))}
      </CameraRig>
    </svg>
  );
};

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCamera(CAMERA, SHOTS);
  const st = solveHero(frame);
  const layers = themesAt(frame);
  const scr = screenAt(frame);
  const subTheme = THEMES[scr?.style ?? "main"];

  // 附着标签：第 3 屏第一个标签挂在皇帝头旁边，语言名写在纸卷上（世界层里），其余放左上角
  const labelEls: React.ReactNode[] = [];
  if (scr) {
    scr.labels.forEach((text, i) => {
      if (scr.n === 3 && i > 0) return;
      let at: { x: number; y: number } | undefined;
      if (scr.n === 3 && i === 0) {
        const head = worldPoint(emperorRig(frame), "head");
        at = toScreen(cam, { x: head.x + 30, y: head.y - 70 });
      }
      labelEls.push(<Label key={`${scr.n}-${i}`} text={text} at={at} side="right" appear={scr.start + (at ? 18 : 0)} end={scr.end} theme={subTheme} />);
    });
  }

  return (
    <AbsoluteFill style={{ background: layers[0].theme.bg }}>
      {layers.map(({ theme, alpha }) => (
        <AbsoluteFill key={theme.id} style={{ opacity: alpha }}>
          <ThemeProvider theme={theme}>
            <World frame={frame} st={st} cam={cam} />
            <Atmosphere theme={theme} />
          </ThemeProvider>
        </AbsoluteFill>
      ))}
      <ThemeProvider theme={subTheme}>
        {labelEls}
        {scr ? <Subtitle screen={scr} /> : null}
      </ThemeProvider>
      <Watermark dark={layers[layers.length - 1].alpha > 0.5 ? layers[layers.length - 1].theme.material === "woodcut" : layers[0].theme.material === "woodcut"} />
      <SfxLayer events={sfx} until={PREVIEW_END} />
    </AbsoluteFill>
  );
};

export { screens };
