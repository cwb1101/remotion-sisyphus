import raw from './script.json';

export type Tier = 'weak' | 'mid' | 'strong';

export type Highlight = { word: string; color: string };

export type BigWordSpec = {
  text: string;
  color: string;
  // 屏幕坐标（不受镜头影响），必须落在 rules.bigWordZone 里
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SfxCue = { type: string; tier: Tier; atFrame: number; variant?: number };

export type Screen = {
  id: number;
  section: string;
  startFrame: number;
  endFrame: number;
  text: string;
  highlights: Highlight[];
  sfxTier: Tier | null;
  sfx: SfxCue[];
  bigWord: BigWordSpec | null;
};

export type Section = { id: string; title: string; startFrame: number; endFrame: number };

type ScriptFile = {
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  preview: { startFrame: number; endFrame: number; lastScreen: number };
  film: { startFrame: number; endFrame: number; lastScreen: number; segments: number[][] };
  rules: {
    accentColors: { think: string; act: string };
    textColor: string;
    subtitle: { fontSize: number; maxWidth: number; left: number; right: number; bottomMargin: number; maxLines: number };
    forbiddenTextZoneX: number;
    bigWordZone: { minX: number; maxX: number; minY: number; maxY: number };
    watermark: { text: string; x: number; y: number; w: number; h: number; fontSize: number; opacity: number; borderWidth: number };
  };
  sections: Section[];
  screens: Screen[];
};

export const script = raw as ScriptFile;
export const { fps, width, height, rules } = script;

export const screen = (id: number): Screen => {
  const s = script.screens.find((x) => x.id === id);
  if (!s) throw new Error(`screen ${id} not in script.json`);
  return s;
};

export const section = (id: string): Section => {
  const s = script.sections.find((x) => x.id === id);
  if (!s) throw new Error(`section ${id} not in script.json`);
  return s;
};

/** 某一屏开始后第 offset 帧对应的全片帧号——画面动作的时间点都从这里取。 */
export const at = (id: number, offset = 0) => screen(id).startFrame + offset;

/** 当前帧正在显示的字幕屏（只显示 id ≤ lastScreen 的屏；预览默认到 preview.lastScreen） */
export const activeScreen = (frame: number, lastScreen = script.preview.lastScreen) =>
  script.screens.find((s) => s.id <= lastScreen && frame >= s.startFrame && frame < s.endFrame) ?? null;

export const bigWordScreens = script.screens.filter((s) => s.bigWord);
