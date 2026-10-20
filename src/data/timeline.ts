/**
 * 画面节拍与音效时间轴。
 * 所有时间都挂在 script.ts 的字幕屏上（beat(cueId, 偏移帧)），改字幕时间时这里自动跟着走。
 */
import { beat, beatEnd } from './script';

export const B = {
  // ── 一个字 ──────────────────────────────
  send: beat('s0-01', 0), // 第 1 帧：写满三百字的长气泡，停住看清
  sendGo: beat('s0-01', 28), // 按下发送，气泡上滑
  quickCut: beat('s0-02', 0), // 快切到对方视角：你的长消息 + TA 正在输入
  reply: beat('s0-02', 8), // 「嗯」弹出
  punch: beat('s0-02', 24), // 跳切推近「嗯」
  thumb: beat('s0-02', 26), // 拇指剪影停一下又移开
  freeze: beat('s0-03', 0), // 定格 + 柔光闪白（与「这不是冷暴力」同拍）
  dolly: beat('s0-03', 8), // 推拉变焦推向已读圆点
  mask: beat('s0-03', 28), // 圆形遮罩揭开客厅
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
export const IN_PICTURE_TEXT = ['今天', '好难受', '你知道吗', '0123456789', '嗯', '对不起', '早饭吃了吗', '示意', '我在听', '你慢慢说', '肆号静匣Logos'];

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
  ...[3, 8, 12, 17].map((o) => ({ at: B.send + o, sound: 'tick_soft' as const, volume: 0.22 })), // 打字
  { at: B.sendGo, sound: 'tick', volume: 0.55 },
  { at: B.sendGo + 1, sound: 'whoosh', volume: 0.5 },
  { at: B.quickCut, sound: 'thump', volume: 0.5 },
  { at: B.reply, sound: 'tick_lo', volume: 0.6 },
  { at: B.punch, sound: 'tick_mid', volume: 0.45 },
  { at: B.freeze, sound: 'slam', volume: 0.8 },
  { at: B.freeze, sound: 'muffle_down', volume: 0.35 },
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

// ═══════════════════════ 第 2–7 节 ═══════════════════════

/** 客服式回应 */
export const B2 = {
  hallIn: beat('s2-01', 0), // 承接上一节擦出的大厅，推近主柜台
  placeBall: beat('s2-01', 20), // 小橙把红球放上柜台
  slide: beat('s2-01', 30), // 红球从玻璃下的小窗口滑过去
  scan: beat('s2-01', 42), // 小蓝扫码，显示屏打勾
  pullWide: beat('s2-02', 0), // 拉远：无数个一模一样的柜台
  stampIn: beat('s2-03', 0),
  stamps: [beat('s2-03', 16), beat('s2-04', 6), beat('s2-04', 20), beat('s2-04', 31), beat('s2-04', 40), beat('s2-04', 47), beat('s2-04', 53)],
  box: beat('s2-05', 0), // 纸箱滑进来
  boxDrop: beat('s2-05', 12),
  boxClose: beat('s2-05', 24),
  tape: beat('s2-06', 4), // 封条打勾
  boxLift: beat('s2-06', 14), // 纸箱被举上货架，镜头上摇
  knock: [beat('s2-07', 10), beat('s2-07', 18)],
  yawn: beat('s2-07', 34),
  sign: beat('s2-07', 50),
  shutter: beat('s2-08', 0), // 卷帘落下
  lightsOff: beat('s2-08', 26),
  morning: beat('s2-09', 0), // 卷帘纹理 → 百叶窗升起，第二天早上
  toast: beat('s2-09', 24),
  askMsg: beat('s2-10', 12),
  tear: beat('s2-11', 6), // 撕日历
  poster: beat('s2-12', 0), // 拉远：一切明亮整洁，只有红球是暗的
  toS3: beatEnd('s2-12', 4), // 推进木纹桌面 → 下一节天平底座
};

/** 没有错的伤 */
export const B3 = {
  open: beat('s3-01', 0),
  cards: Array.from({ length: 14 }, (_, i) => beat('s3-01', 8 + i * 9)),
  spot: beat('s3-03', 0), // 暗场，只剩顶光
  toss: beat('s3-03', 16), // 小橙把红球抛起
  apex: beatEnd('s3-03', 0), // 最高点悬停，全静音
  fall: beat('s3-04', 0), // 「是被接住」：落下，穿过一双空的虚线手
  hover: beat('s3-05', 0), // 离地一指处停住，小橙坐在地上
  deflate: beat('s3-05', 30),
  standees: beat('s3-06', 0), // 四周的小蓝纸板立牌都在点头
  flip: beatEnd('s3-06', 4), // 立牌翻面 → 雨夜街道
};

/** 感觉还在 */
export const B4 = {
  ice: beat('s4-01', 0),
  crack: beat('s4-01', 22),
  shatter: beat('s4-02', -4),
  crouch: beat('s4-02', 22), // 蹲下给猫打伞
  toCinema: beatEnd('s4-02', -12), // 推进路灯光 → 放映机光束
  cinema: beat('s4-03', 0),
  wipeEye: beat('s4-03', 30),
  pocket: beat('s4-04', 0), // 口袋里的蓝球在跳
  door: beat('s4-05', 0), // 回到家门口
  mute: beat('s4-06', 0), // 拧到静音
  toS5: beatEnd('s4-06', 0),
};

/** 静止的脸 */
export const B5 = {
  split: beat('s5-01', 0),
  lab: beat('s5-02', 0),
  play: beat('s5-03', 0),
  still: beat('s5-04', 0),
  tries: beat('s5-05', 0),
  turn: beat('s5-06', 0),
  corridor: beat('s5-07', 0),
  childhood: beat('s5-08', 0),
  pocket: beat('s5-09', 0),
  adult: beat('s5-10', 0),
  shell: beat('s5-10', 34),
  inside: beat('s5-11', 0),
  threads: beat('s5-12', 0),
  knot: beat('s5-13', 0),
  toS6: beatEnd('s5-13', 0),
};

/** 不会还是不想 */
export const B6 = {
  fork: beat('s6-01', 0),
  split: beat('s6-02', 0),
  note: beat('s6-03', 0),
  stick: beat('s6-04', 0),
  hug1: beat('s6-05', 0),
  hug2: beat('s6-06', 0),
  tries: beat('s6-07', 0),
  leave: beat('s6-08', 0),
  mirror: beat('s6-09', 0),
  talk: beat('s6-10', 0),
  stop: beat('s6-10', 34),
  offerBlue: beat('s6-11', 0),
  sitBack: beat('s6-12', 0),
  toS7: beatEnd('s6-12', 8),
};

/** 学着接住 */
export const B7 = {
  dawn: beat('s7-01', 0),
  toss1: beat('s7-01', 22),
  catch1: beat('s7-01', 44),
  toss2: beat('s7-02', 8),
  catch2: beat('s7-02', 38),
  arcs: beat('s7-03', 0),
  phone: beat('s7-04', 0), // 回到开头那块手机屏：这次 TA 不再只回「嗯」
  reply: beat('s7-04', 22),
  pullOut: beatEnd('s7-04', 0), // 拉回沙发，再拉出窗外
  end: 4500,
};

const tk = (at: number, volume: number, sound: SfxName = 'tick_soft'): SfxEvent => ({ at, sound, volume });

export const SFX_REST: SfxEvent[] = [
  // ── 客服式回应 ──
  { at: B2.hallIn, sound: 'whoosh_soft', volume: 0.4 },
  tk(B2.placeBall, 0.45),
  { at: B2.slide, sound: 'roll', volume: 0.3 },
  tk(B2.scan, 0.4, 'tick_hi'),
  { at: B2.pullWide, sound: 'whoosh_soft', volume: 0.4 },
  ...B2.stamps.map((at, i) => ({ at, sound: 'thump' as const, volume: 0.55 - i * 0.035 })),
  { at: B2.box, sound: 'whoosh', volume: 0.3 },
  { at: B2.boxDrop + 8, sound: 'bounce', volume: 0.4 },
  tk(B2.boxClose, 0.4),
  { at: B2.tape, sound: 'whoosh', volume: 0.25 },
  { at: B2.boxLift, sound: 'whoosh_rise', volume: 0.35 },
  ...B2.knock.map((at) => ({ at, sound: 'knock' as const, volume: 0.5 })),
  { at: B2.yawn, sound: 'muffle_down', volume: 0.28 },
  tk(B2.sign, 0.4, 'tick'),
  { at: B2.shutter + 4, sound: 'roll', volume: 0.45 },
  { at: B2.shutter + 30, sound: 'thump', volume: 0.5 },
  ...[0, 4, 8, 12].map((o) => tk(B2.lightsOff + o, 0.3)),
  { at: B2.morning, sound: 'whoosh_soft', volume: 0.4 },
  { at: B2.morning + 6, sound: 'pad_warm', volume: 0.3 },
  { at: B2.toast, sound: 'bounce', volume: 0.4 },
  tk(B2.askMsg, 0.45, 'tick_mid'),
  { at: B2.tear, sound: 'whoosh', volume: 0.35 },
  { at: B2.poster, sound: 'riser', volume: 0.3 },
  { at: B2.toS3, sound: 'whoosh_soft', volume: 0.4 },
  // ── 没有错的伤 ──
  ...B3.cards.map((at, i) => tk(at + 8, 0.24 + (i % 3) * 0.02, 'tick')),
  { at: B3.spot, sound: 'low_note', volume: 0.35 },
  { at: B3.spot, sound: 'muffle_down', volume: 0.3 },
  { at: B3.toss, sound: 'whoosh_rise', volume: 0.4 },
  { at: B3.fall, sound: 'slam', volume: 0.85 },
  { at: B3.hover, sound: 'hollow', volume: 0.4 },
  { at: B3.deflate, sound: 'muffle_down', volume: 0.3 },
  ...[0, 5, 10, 15].map((o) => tk(B3.standees - 4 + o, 0.3)),
  { at: B3.flip, sound: 'whoosh', volume: 0.3 },
  { at: B3.flip + 14, sound: 'whoosh_soft', volume: 0.35 },
  // ── 感觉还在 ──
  { at: B4.crack, sound: 'knock', volume: 0.35 },
  { at: B4.shatter, sound: 'bounce', volume: 0.4 },
  { at: B4.shatter + 1, sound: 'whoosh', volume: 0.35 },
  ...[0, 8, 16].map((o) => tk(B4.shatter + 10 + o, 0.2)),
  tk(B4.crouch, 0.3),
  { at: B4.crouch + 8, sound: 'riser', volume: 0.25 },
  { at: B4.toCinema, sound: 'whoosh_rise', volume: 0.4 },
  { at: B4.cinema, sound: 'pad_warm', volume: 0.3 },
  { at: B4.wipeEye, sound: 'muffle_down', volume: 0.2 },
  ...[0, 34].map((o) => ({ at: B4.pocket + 4 + o, sound: 'thump' as const, volume: 0.28 })),
  { at: B4.door - 6, sound: 'whoosh_soft', volume: 0.35 },
  tk(B4.door + 8, 0.35),
  { at: B4.mute, sound: 'slam', volume: 0.85 },
  ...(['tick_hi', 'tick_mid', 'tick', 'tick_lo', 'tick_soft'] as SfxName[]).map((sd, i) => tk(B4.mute + 8 + i * 6, 0.34, sd)),
  { at: B4.mute + 36, sound: 'muffle_down', volume: 0.35 },
  // ── 静止的脸 ──
  { at: B5.split, sound: 'whoosh_soft', volume: 0.4 },
  { at: B5.lab - 4, sound: 'whoosh_soft', volume: 0.3 },
  { at: B5.lab + 6, sound: 'print_ticks', volume: 0.2 },
  ...[10, 36, 62].map((o) => tk(B5.play + o, 0.3)),
  { at: B5.still, sound: 'slam', volume: 0.85 },
  { at: B5.still, sound: 'muffle_down', volume: 0.3 },
  ...Array.from({ length: 7 }, (_, k) => tk(B5.tries + 20 + k * 11, 0.32 - k * 0.025, 'tick_hi')),
  { at: B5.turn, sound: 'low_note', volume: 0.4 },
  { at: B5.corridor, sound: 'whoosh_soft', volume: 0.35 },
  { at: B5.corridor + 6, sound: 'pad_warm', volume: 0.25 },
  ...[0, 14, 28, 42].map((o) => tk(B5.childhood + o, 0.28)),
  { at: B5.pocket + 4, sound: 'muffle_down', volume: 0.3 },
  { at: B5.pocket + 30, sound: 'low_note', volume: 0.3 },
  { at: B5.pocket + 50, sound: 'print_ticks', volume: 0.22 },
  { at: B5.adult, sound: 'whoosh_soft', volume: 0.35 },
  ...[8, 16, 24, 32].map((o) => tk(B5.adult + o, 0.2)),
  { at: B5.shell, sound: 'whoosh_rise', volume: 0.35 },
  { at: B5.shell + 26, sound: 'thump', volume: 0.45 },
  { at: B5.inside, sound: 'hollow', volume: 0.35 },
  ...[10, 44].map((o) => ({ at: B5.inside + o, sound: 'thump' as const, volume: 0.22 })),
  { at: B5.threads, sound: 'riser', volume: 0.3 },
  ...[12, 18, 24].map((o) => tk(B5.threads + o, 0.25, 'tick')),
  tk(B5.knot, 0.35, 'tick_lo'),
  { at: B5.toS6 - 6, sound: 'whoosh_soft', volume: 0.4 },
  // ── 不会还是不想 ──
  { at: B6.fork + 6, sound: 'pad_warm', volume: 0.3 },
  { at: B6.split - 2, sound: 'whip', volume: 0.45 },
  { at: B6.note + 4, sound: 'print_ticks', volume: 0.25 },
  tk(B6.stick, 0.4, 'tick'),
  ...[0, 8, 16].map((o) => tk(B6.hug1 + o, 0.2)),
  { at: B6.hug1 + 22, sound: 'thump', volume: 0.35 },
  { at: B6.hug1 + 24, sound: 'riser', volume: 0.25 },
  { at: B6.hug2, sound: 'pad_warm', volume: 0.35 },
  tk(B6.hug2 + 10, 0.3, 'tick'),
  ...[2, 22, 42].flatMap((o) => [
    { at: B6.tries + o, sound: 'whoosh' as const, volume: 0.28 },
    { at: B6.tries + o + 12, sound: 'bounce' as const, volume: 0.28 },
    { at: B6.tries + o + 14, sound: 'roll' as const, volume: 0.22 },
  ]),
  { at: B6.leave, sound: 'low_note', volume: 0.35 },
  ...[8, 16, 24, 32, 40].map((o) => tk(B6.leave + o, 0.18)),
  { at: B6.mirror - 6, sound: 'whip', volume: 0.45 },
  ...[8, 16, 24].map((o) => tk(B6.talk + o, 0.2)),
  tk(B6.stop, 0.35, 'tick_lo'),
  { at: B6.offerBlue + 4, sound: 'riser', volume: 0.35 },
  { at: B6.offerBlue + 16, sound: 'hollow', volume: 0.25 },
  { at: B6.sitBack + 16, sound: 'thump', volume: 0.3 },
  { at: B6.sitBack + 14, sound: 'whoosh_soft', volume: 0.3 },
  { at: B6.toS7 - 8, sound: 'whoosh_rise', volume: 0.4 },
  // ── 学着接住 ──
  { at: B7.dawn, sound: 'pad_warm', volume: 0.35 },
  { at: B7.toss1, sound: 'whoosh', volume: 0.32 },
  { at: B7.catch1, sound: 'thump', volume: 0.35 },
  tk(B7.catch1 + 1, 0.3),
  { at: B7.toss2, sound: 'whoosh', volume: 0.32 },
  { at: B7.toss2 + 18, sound: 'bounce', volume: 0.3 },
  { at: B7.catch2, sound: 'thump', volume: 0.4 },
  { at: B7.catch2 + 2, sound: 'pad_warm', volume: 0.3 },
  { at: B7.arcs, sound: 'slam', volume: 0.85 },
  ...[12, 24, 36].map((o) => tk(B7.arcs + o, 0.3, 'tick_mid')),
  { at: B7.phone - 6, sound: 'whoosh_soft', volume: 0.35 },
  tk(B7.reply, 0.45, 'tick_lo'),
  { at: B7.reply + 2, sound: 'pad_warm', volume: 0.35 },
  { at: B7.pullOut - 6, sound: 'whoosh_soft', volume: 0.35 },
  { at: B7.pullOut + 50, sound: 'riser', volume: 0.3 },
  { at: B7.pullOut + 84, sound: 'pad_warm', volume: 0.32 },
];

SFX.push(...SFX_REST);

/**
 * 氛围垫音：每节一个柔和和弦（只有正弦叠加，没有噪声），在节与节之间交叉淡化。
 * duck：有意的静音和"静音"那一刻把垫音压下去。
 */
export const BED_CHORDS: { from: number; hz: number[] }[] = [
  { from: 0, hz: [110, 164.8, 220, 261.6] }, // Am
  { from: 240, hz: [87.3, 130.8, 174.6, 220] }, // F
  { from: 750, hz: [98, 146.8, 196, 246.9] }, // G
  { from: 1500, hz: [73.4, 110, 146.8, 174.6] }, // Dm
  { from: 1950, hz: [87.3, 130.8, 174.6, 261.6] }, // F
  { from: 2310, hz: [110, 164.8, 220, 261.6] }, // Am
  { from: 3240, hz: [65.4, 130.8, 164.8, 196] }, // C
  { from: 4020, hz: [87.3, 130.8, 174.6, 220, 261.6] }, // Fmaj
];

export const BED_DUCK: { from: number; to: number; level: number }[] = [
  { from: B3.apex, to: B3.fall, level: 0 }, // 「是被接住」之前 0.6 秒的彻底静音（有意）
  { from: B4.mute + 30, to: B4.toS5, level: 0.35 }, // 拧到静音：世界变闷
  { from: B7.end - 9, to: B7.end, level: 0 }, // 片尾 0.3 秒静音
];

/** 右上角"接收表"的读数（0–1） */
export const GAUGE: [number, number][] = [
  [B.corridorIn, 0.62],
  [B.pullBack + 8, 0.62],
  [B.pullBack + 26, 0.42],
  [B.impact, 0.42],
  [B.impact + 14, 0.24],
  [B2.stamps[6], 0.24],
  [B2.stamps[6] + 16, 0.14],
  [B2.tear, 0.14],
  [B2.tear + 20, 0.06],
  [B4.pocket, 0.06],
  [B4.pocket + 20, 0.2],
  [B4.mute, 0.2],
  [B4.mute + 30, 0.04],
  [B6.hug2, 0.04],
  [B6.hug2 + 24, 0.45],
  [B6.offerBlue, 0.45],
  [B6.offerBlue + 30, 0.62],
  [B7.catch2, 0.62],
  [B7.catch2 + 20, 0.85],
  [B7.arcs + 20, 1],
];

/** 接收表在片尾淡出 */
export const GAUGE_END = B7.phone;
