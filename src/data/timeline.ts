/**
 * 画面节拍与音效时间轴。
 * 所有时间都挂在 script.ts 的字幕屏上（beat(cueId, 偏移帧)），改字幕时间时这里自动跟着走。
 */
import { beat, beatEnd } from './script';

export const B = {
  // ── 一个字 ──────────────────────────────
  send: beat('s0-01', 0), // 第 1 帧：长气泡正在发出
  quickCut: beat('s0-01', 15), // 快切到对方视角
  jump1: beat('s0-01', 24), // 跳切：对不起
  jump2: beat('s0-02', -6), // 跳切：好
  jump3: beat('s0-02', 3), // 跳切：嗯
  thumb: beat('s0-02', 8), // 拇指剪影掠过
  freeze: beat('s0-03', -12), // 定格 + 柔光闪白
  dolly: beat('s0-03', 3), // 推拉变焦推向已读圆点
  mask: beat('s0-03', 18), // 圆形遮罩揭开客厅
  ballGlow: beat('s0-04', -3),
  ramp: beat('s0-04', 12), // 速度渐变推向两人之间
  ballStop: beat('s0-05', 12),
  lookUp: beat('s0-05', 18), // 小蓝抬眼礼貌一笑
  ballClose: beat('s0-06', 0), // 红球特写、变暗
  toS1: beatEnd('s0-06', -8), // 沙发靠背线 → 门框横梁

  // ── 不是冷暴力 ──────────────────────────
  corridorIn: beat('s1-01', 0),
  doorShut: beat('s1-01', 22),
  orangeWalkIn: beat('s1-01', 26),
  knock1: beat('s1-02', 4),
  knock2: beat('s1-02', 12),
  throw1: beat('s1-02', 20),
  doorHit: beat('s1-02', 27),
  whip: beat('s1-03', 0), // 甩镜到右边敞开的门
  pushDoor: beat('s1-04', 0), // 推进门里
  roomIn: beat('s1-05', 0),
  rollThrough: beat('s1-05', 30), // 红球穿过半透明的小蓝
  tiltUp: beat('s1-06', 0), // 摇上屋顶晾衣绳
  clip: [6, 18, 30, 42, 54].map((o) => beat('s1-06', o)),
  pullBack: beat('s1-07', 0), // 沿绳拉远，小橙在另一端很小
  receipts: beat('s1-08', 0), // 卡片掉落变成小票
  throw2: beat('s1-08', 36),
  impact: beat('s1-09', 0), // 红球落地 = 「不是回应」砸下
  wipe: beatEnd('s1-09', 0), // 小票纸带擦出客服大厅
};

/** 画面里出现的非字幕文字（用于预加载字体） */
export const IN_PICTURE_TEXT = ['今天', '好难受', '你知道吗', '312', '我今天有点累', '对不起', '好', '嗯'];

export type SfxName =
  | 'thump'
  | 'thump_heavy'
  | 'slam'
  | 'tick'
  | 'tick_hi'
  | 'tick_mid'
  | 'tick_lo'
  | 'tick_soft'
  | 'knock'
  | 'bounce'
  | 'door_close'
  | 'print_ticks'
  | 'whoosh'
  | 'whoosh_soft'
  | 'whoosh_rise'
  | 'whip'
  | 'muffle_down'
  | 'roll'
  | 'riser'
  | 'low_note'
  | 'pad_warm'
  | 'hollow';

export type SfxEvent = { at: number; sound: SfxName; volume: number };

export const SFX: SfxEvent[] = [
  // 一个字
  { at: B.send, sound: 'tick', volume: 0.55 },
  { at: B.send, sound: 'whoosh', volume: 0.5 },
  { at: B.quickCut, sound: 'thump', volume: 0.5 },
  { at: B.jump1, sound: 'tick_hi', volume: 0.45 },
  { at: B.jump2, sound: 'tick_mid', volume: 0.45 },
  { at: B.jump3, sound: 'tick_lo', volume: 0.5 },
  { at: B.freeze, sound: 'thump', volume: 0.55 },
  { at: B.freeze, sound: 'muffle_down', volume: 0.4 },
  { at: beat('s0-03'), sound: 'slam', volume: 0.8 },
  { at: B.dolly, sound: 'whoosh_rise', volume: 0.45 },
  { at: B.mask, sound: 'whoosh_soft', volume: 0.5 },
  { at: B.mask, sound: 'pad_warm', volume: 0.32 },
  { at: beat('s0-04'), sound: 'slam', volume: 0.8 },
  { at: B.ramp, sound: 'whoosh', volume: 0.42 },
  { at: B.ramp + 4, sound: 'roll', volume: 0.5 },
  { at: B.ballStop, sound: 'tick_soft', volume: 0.5 },
  { at: B.ballClose, sound: 'riser', volume: 0.38 },
  { at: B.toS1, sound: 'whoosh_soft', volume: 0.45 },

  // 不是冷暴力
  { at: B.doorShut, sound: 'door_close', volume: 0.7 },
  { at: B.knock1, sound: 'knock', volume: 0.55 },
  { at: B.knock2, sound: 'knock', volume: 0.55 },
  // 小橙的脚步：走向左门、走向右门
  ...[0, 8, 16].map((o) => ({ at: B.orangeWalkIn + 2 + o, sound: 'tick_soft' as const, volume: 0.22 })),
  ...[0, 8, 16, 24, 32].map((o) => ({ at: B.whip + 8 + o, sound: 'tick_soft' as const, volume: 0.22 })),
  { at: B.throw1, sound: 'whoosh', volume: 0.3 },
  { at: B.doorHit, sound: 'bounce', volume: 0.7 },
  { at: B.doorHit + 2, sound: 'whoosh_rise', volume: 0.45 },
  { at: B.whip, sound: 'whip', volume: 0.6 },
  { at: B.pushDoor, sound: 'riser', volume: 0.38 },
  { at: B.roomIn + 4, sound: 'roll', volume: 0.42 },
  { at: B.rollThrough, sound: 'hollow', volume: 0.5 },
  { at: B.tiltUp, sound: 'whoosh_soft', volume: 0.45 },
  ...B.clip.map((at, i) => ({ at, sound: 'tick' as const, volume: 0.42 - i * 0.03 })),
  { at: B.pullBack, sound: 'low_note', volume: 0.45 },
  { at: B.receipts + 6, sound: 'print_ticks', volume: 0.42 },
  { at: B.throw2, sound: 'whoosh', volume: 0.32 },
  { at: B.impact, sound: 'slam', volume: 0.85 },
  { at: B.impact + 18, sound: 'low_note', volume: 0.3 },
  { at: B.wipe, sound: 'whoosh', volume: 0.45 },
];

/** 右上角"接收表"的读数（0–1） */
export const GAUGE: [number, number][] = [
  [B.corridorIn, 0.62],
  [B.pullBack + 8, 0.62],
  [B.pullBack + 26, 0.42],
  [B.impact, 0.42],
  [B.impact + 14, 0.24],
];
