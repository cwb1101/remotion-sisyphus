// 第六节 · 回答（第 36–38 屏）
// 从第 9 屏的构图慢慢拉成全景：球、大圆环、所有尘埃一起进画，光变亮（36–37，一眼看到全部）
// → 金句砸下，所有朱红边界同时断开、碎成金色尘埃（38，重卡点）。边界的画法在 Mechanism.tsx 的 Bonds 里。
import type { SfxCue } from '../components/Soundtrack';
import { ease, hit } from '../film/anim';
import { S, barAtOrBefore, move } from '../film/cues';
import type { ShotKeys } from '../film/shot';
import { BREAK } from './Mechanism';

const m36 = move(S(36).start, 1.6); // 拉成全景
const punch = { from: barAtOrBefore(BREAK - 1), to: BREAK };

export const answerKeys: ShotKeys = {
  s: [
    { f: S(36).start, v: 0.42 },
    { f: m36.to, v: 0.2 },
    { f: punch.from, v: 0.175, ease: ease.linear },
    { f: punch.to, v: 0.2, ease: ease.in },
    { f: S(38).end, v: 0.19, ease: ease.out },
  ],
  lightAmt: [
    { f: S(36).start, v: 0.8 },
    { f: m36.to, v: 1 },
  ],
  beam: [
    { f: S(36).start, v: 0.45 },
    { f: m36.to, v: 0.3 },
  ],
  ambient: [
    { f: S(36).start, v: 1 },
    { f: m36.to, v: 1.06 },
    { f: BREAK - 1, v: 1.06, ease: ease.linear },
    { f: BREAK, v: 1.2, ease: ease.linear },
    { f: BREAK + 24, v: 1.05, ease: ease.out },
  ],
  speed: [
    { f: BREAK - 1, v: 1 },
    { f: BREAK, v: 2.4, ease: ease.linear },
    { f: BREAK + 40, v: 1, ease: ease.out },
  ],
  rim: [
    { f: BREAK - 1, v: 1 },
    { f: BREAK, v: 1.9, ease: ease.linear },
    { f: BREAK + 25, v: 1.15, ease: ease.out },
  ],
};

export const answerSfx: SfxCue[] = [
  { name: 'rev_swell', at: BREAK - 72, gain: 0.45, frames: 72 },
  { name: 'boom', at: BREAK, gain: 1, heavy: true },
  { name: 'air', at: BREAK, gain: 0.4 },
];

export const answerFlash = (f: number) => 0.26 * hit(f, BREAK, 3);
