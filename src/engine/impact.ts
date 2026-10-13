/**
 * 重点词 / 关键句落地时的全屏反应：镜头震动 + 曝光闪一下。
 * 时间全部来自 script.ts（每屏的 slam 帧），音效用的是同一个帧号。
 */
import {random} from 'remotion';
import {SCREENS} from '../data/script';
import {slamFrame} from '../data/timeline';

const HITS = SCREENS.filter((s) => s.keywords.length > 0 || s.impact).map((s) => ({
  f: slamFrame(s),
  amp: s.impact ? 1 : 0.4,
  seed: s.id,
}));

export const impactAt = (frame: number) => {
  let x = 0;
  let y = 0;
  let flash = 0;
  let pulse = 0;
  for (const h of HITS) {
    const dt = frame - h.f;
    if (dt < 0 || dt > 24) continue;
    const env = Math.exp(-dt / (h.amp > 0.5 ? 5 : 3.5));
    const ph = random(h.seed) * 6.28;
    x += h.amp * 11 * env * Math.sin(dt * 2.1 + ph);
    y += h.amp * 8 * env * Math.cos(dt * 2.7 + ph);
    flash += (h.amp > 0.5 ? 0.16 : 0.05) * Math.exp(-dt / 4);
    pulse = Math.max(pulse, h.amp * Math.exp(-dt / 8));
  }
  return {x, y, flash, pulse};
};
