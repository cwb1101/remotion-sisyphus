import {Cue, SCENES, SCREENS, SceneId, Screen, SfxId} from './script';

export const screen = (id: string): Screen => {
  const s = SCREENS.find((x) => x.id === id);
  if (!s) throw new Error(`screen ${id} not found in script.ts`);
  return s;
};

export const screensOf = (scene: SceneId) => SCREENS.filter((s) => s.scene === scene);

/** 场景时间段 = 该场景第一屏 start 到最后一屏 end */
export const sceneRange = (scene: SceneId) => {
  const list = screensOf(scene);
  return {start: list[0].start, end: list[list.length - 1].end};
};

/** 一条 cue 展开成绝对帧号 */
export const cueFrames = (s: Screen, cue: Cue) =>
  Array.from({length: cue.count ?? 1}, (_, i) => s.start + cue.at + i * (cue.every ?? 0));

/** 某屏里某种音效的所有绝对帧号（画面动作和音效共用这个时间） */
export const cueTimes = (id: string, sfx: SfxId) => {
  const s = screen(id);
  return (s.sfx ?? []).filter((c) => c.id === sfx).flatMap((c) => cueFrames(s, c));
};

/** 重点词砸下来的帧：取本屏 slam 音效，没有就用默认 */
export const SLAM_DEFAULT = 10;
export const slamFrame = (s: Screen) => {
  const c = (s.sfx ?? []).find((x) => x.id === 'slam');
  return s.start + (c ? c.at : SLAM_DEFAULT);
};

/** 场景 → 组件 → 预览范围 */
export const PREVIEW_SCENES: SceneId[] = ['opening', 'corridor'];
/** 场景之间推镜过渡的重叠帧数 */
export const OVERLAP = 24;
export const PREVIEW_TAIL = 30;
export const previewDuration = () =>
  sceneRange(PREVIEW_SCENES[PREVIEW_SCENES.length - 1]).end + PREVIEW_TAIL;

export {SCENES, SCREENS};
