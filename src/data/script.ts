import raw from './subtitles.json';

/** 版式代号，见 subtitles.json 的 layouts 说明 */
export type Layout = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface SfxCue {
  /** public/sfx/<sound>.wav */
  sound: string;
  /** 相对本屏开始帧的偏移（帧） */
  at: number;
  volume?: number;
}

export interface ScreenOptions {
  side?: 'left' | 'right';
  big?: string;
  anchor?: 'lowerLeft' | 'upperRight';
  corner?: 'topLeft' | 'bottomLeft' | 'topRight';
  note?: string;
  index?: string;
  x?: number;
  y?: number;
}

export interface Screen {
  id: string;
  scene: string;
  /** 开始帧（含） */
  start: number;
  /** 结束帧（不含） */
  end: number;
  text: string;
  highlight: string[];
  layout: Layout;
  emphasis?: 'slam';
  /** 字幕相对开始帧延后出现的帧数（用于先给画面动作让位） */
  delay?: number;
  options?: ScreenOptions;
  sfx?: SfxCue[];
}

export interface SceneDef {
  id: string;
  name: string;
  bed?: {sound: string; volume: number};
  /** 与上一节交叠的帧数：上一节继续渲染，本节在其上淡入（0 = 物件填满画面的匹配剪辑） */
  transitionIn?: number;
}

interface ScriptFile {
  fps: number;
  width: number;
  height: number;
  previewTail: number;
  endTail: number;
  scenes: SceneDef[];
  screens: Screen[];
}

export const SCRIPT = raw as unknown as ScriptFile;
export const FPS = SCRIPT.fps;
export const SCREENS: Screen[] = SCRIPT.screens;

/** 字幕入场 / 出场所占帧数（检查脚本用同样的数字） */
export const ENTER_FRAMES = 8;
export const EXIT_FRAMES = 6;

export const getScreen = (id: string): Screen => {
  const s = SCREENS.find((x) => x.id === id);
  if (!s) {
    throw new Error(`字幕数据里找不到屏 ${id}`);
  }
  return s;
};

export const sceneRange = (sceneId: string) => {
  const list = SCREENS.filter((s) => s.scene === sceneId);
  if (list.length === 0) {
    throw new Error(`字幕数据里找不到场景 ${sceneId}`);
  }
  return {
    start: Math.min(...list.map((s) => s.start)),
    end: Math.max(...list.map((s) => s.end)),
  };
};

export const lastFrame = Math.max(...SCREENS.map((s) => s.end));
/** 预览：开头 + 第一节 */
export const PREVIEW_DURATION = sceneRange('s1').end + SCRIPT.previewTail;
/** 成片：最后一屏之后留一段淡出 */
export const FULL_DURATION = lastFrame + SCRIPT.endTail;

/** 屏内时间点：屏开始帧 + 屏时长 * 比例，场景动画都用它对齐字幕 */
export const at = (id: string, fraction = 0, offsetFrames = 0) => {
  const s = getScreen(id);
  return s.start + (s.end - s.start) * fraction + offsetFrames;
};

/** 某屏里第 n 个指定音效的绝对帧——画面动作和音效对齐都从这里取 */
export const cue = (id: string, sound: string, n = 0): number => {
  const s = getScreen(id);
  const list = (s.sfx ?? []).filter((c) => c.sound === sound);
  if (list.length <= n) {
    throw new Error(`屏 ${id} 里没有第 ${n + 1} 个 ${sound} 音效`);
  }
  return s.start + list[n].at;
};
