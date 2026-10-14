import {CUTS_SEC, MUSIC, SCENES, VIDEO} from './config';

const toFrame = (sec: number) => Math.round(sec * VIDEO.fps);

export const framesPerBeat = () => (60 / MUSIC.bpm) * VIDEO.fps;

// 第 b 拍在成片中的帧号
export const beatFrame = (b: number) =>
  toFrame(MUSIC.offsetSec + (b * 60) / MUSIC.bpm);

// 每个场景的起止帧，长度 = 场景数 + 1。切点都落在拍子上
export const getCutFrames = (): number[] => {
  if (CUTS_SEC) {
    if (CUTS_SEC.length !== SCENES.length + 1) {
      throw new Error(
        `CUTS_SEC 需要 ${SCENES.length + 1} 个值，现在是 ${CUTS_SEC.length} 个`,
      );
    }
    return CUTS_SEC.map(toFrame);
  }
  const cuts = [0];
  let beats = 0;
  for (const scene of SCENES) {
    beats += scene.beats;
    cuts.push(beatFrame(beats));
  }
  return cuts;
};

export const getTotalFrames = () => {
  const cuts = getCutFrames();
  return cuts[cuts.length - 1];
};

// 每一拍的「顿」：拍点那一帧为 1，之后几帧内衰减到 0
export const beatPunch = (globalFrame: number) => {
  const fpb = framesPerBeat();
  const sinceBeat = (globalFrame - toFrame(MUSIC.offsetSec)) % fpb;
  if (sinceBeat < 0) {
    return 0;
  }
  return Math.exp(-sinceBeat / 2.5);
};
