import React from 'react';
import { beat, cue } from '../data/script';
import { Cam } from '../lib/camera';
import { Light } from '../theme';
import { Vec } from '../lib/anim';
import { bendHead, coil, crawl, makeHeadS, Seg } from '../lib/snake';

/** 每一节对外暴露的东西：相机、光线、光源位置、世界画面、屏幕叠加层。 */
export type SectionDef = {
  id: string;
  start: number;
  end: number;
  camera: (f: number) => Cam;
  light: (f: number) => Light;
  lightAt: (f: number) => Vec;
  World: React.FC<{ frame: number; cam: Cam; light: Light }>;
  Overlay?: React.FC<{ frame: number; cam: Cam }>;
  /** 光池额外增亮（冲击时） */
  lightBoost?: (f: number) => number;
  /** 本节开头与上一节画面交叉溶解的帧数（不经过黑场） */
  blendIn?: number;
  /** 本节结尾把整个画面收成卡片、翻面露出下一节（null = 不变形） */
  card?: (f: number) => Card | null;
};

/** 卡片变形：以画面中心缩放，sx 为水平压缩（翻面），showNext 时卡片里显示下一节。 */
export type Card = { scale: number; sx: number; tx: number; ty: number; radius: number; showNext: boolean };

// —— 蛇的故事时间线：全部从字幕数据文件的节拍点推出来 ——
export const F_CRAWL = cue(4).start;
export const F_SCRATCH = beat(5, 'scratch');
export const F_STOP = beat(8, 'turn');
export const HEAD = makeHeadS(F_CRAWL, F_SCRATCH, F_STOP);

export const BEND = -2.2; // 回头的总转角（逆时针，头转回来对着锯齿）
export const R_LOOSE = 90;
export const R_FINAL = 62;

/** S2 结束时的姿态（停下并回头），也是 S3 缠绕前的基础姿态。 */
export const restPose = (bend = BEND): Seg[] => bendHead(crawl(HEAD.sStop), bend);
/** 最后缠死在锯子上的姿态（S3 结尾 = S1 开场看到的“结局”）。 */
export const finalCoil = (): Seg[] => coil(restPose(), 1, R_FINAL);
