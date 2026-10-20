// 字幕定稿：全片唯一的时间来源。
// 画面节点（beats）和音效（SFX）都从这里取时间，改字幕只改这个文件。
//
// 约定
// - 帧率 30，start 含、end 不含
// - text 是上屏文字：不写任何标点，停顿用空格
// - keywords 是要高亮的重点词，必须原样出现在 text 里
// - display: 'slam' 表示这一屏不放底部字幕，改成画面中央大字砸下来
// - beats 是这一屏里的画面/音效节点，数值是相对本屏 start 的帧偏移

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** 左上角主题标注第一行 */
export const TOPIC = '七宗罪 凭什么叫致命';

export type SectionId = 's0' | 's1';

export type Section = {
  id: SectionId;
  /** 左上角主题标注第二行 */
  title: string;
};

export const SECTIONS: Section[] = [
  {id: 's0', title: '不犯法的罪'},
  {id: 's1', title: '致命是源头'},
];

export type Cue = {
  id: string;
  section: SectionId;
  start: number;
  end: number;
  text: string;
  keywords: string[];
  display?: 'subtitle' | 'slam';
  beats?: Record<string, number>;
};

export const CUES: Cue[] = [
  // ── 〇 不犯法的罪 ──────────────────────────────
  {
    id: 'o1',
    section: 's0',
    start: 0,
    end: 24,
    text: '8点之前',
    keywords: [],
    // 第 0 帧印章「懒惰」已盖上；0.7s 跳切到 07:40
    beats: {stampSloth: 0, alarm: 4, jumpCut: 21},
  },
  {
    id: 'o2',
    section: 's0',
    start: 24,
    end: 72,
    text: '你已经犯了三宗罪',
    keywords: ['三宗罪'],
    // 0.9s 印章「嫉妒」；1.4s 甩镜到地铁；1.7s 印章「暴怒」；2.0s 定格三联；2.2s 推向手机
    beats: {stampEnvy: 3, whip: 18, doorClose: 21, stampRage: 27, freeze: 36, pushPhone: 42},
  },
  {
    id: 'o3',
    section: 's0',
    start: 72,
    end: 114,
    text: '但没有一条犯法',
    keywords: ['犯法'],
    // 2.4s 匹配剪辑进试管；3.0s 速度渐变 + 四个标签依次亮；3.5s 主角探头
    beats: {matchCut: 0, ramp: 18, labels: 18, peek: 33},
  },
  {
    id: 'o4',
    section: 's0',
    start: 114,
    end: 150,
    text: '凭什么叫致命',
    keywords: ['致命'],
    display: 'slam',
    // 3.8s 柔光闪白 + 大字落下；4.0s 最重的一下；4.5s「致命」脱出变纸签
    beats: {flash: 0, land: 6, scratch: 12, tagDetach: 21},
  },
  {
    id: 'o5',
    section: 's0',
    start: 150,
    end: 222,
    text: '答案藏在 一个古老的词里',
    keywords: ['古老的词'],
    // 5.0s 甩镜离开试管架；5.8s 卷轴向左铺开
    beats: {whip: 0, scrollRoll: 24},
  },
  {
    id: 'o6',
    section: 's0',
    start: 222,
    end: 300,
    text: '先从 一千六百多年前说起',
    keywords: [],
    // 刻度尺年份往回滚，减速停在公元4世纪
    beats: {rulerRoll: 0, rollEnd: 48, dusk: 30},
  },

  // ── 一 致命是源头 ──────────────────────────────
  {
    id: 'c1',
    section: 's1',
    start: 300,
    end: 378,
    text: '沙漠里的修士 写下八种念头',
    keywords: ['念头'],
    beats: {arrive: 0, smokeRise: 12},
  },
  {
    id: 'c2',
    section: 's1',
    start: 378,
    end: 444,
    text: '提醒自己 别被它们缠上',
    keywords: ['缠上'],
    beats: {pressIn: 6, tubesBorn: 36},
  },
  {
    id: 'c3',
    section: 's1',
    start: 444,
    end: 504,
    text: '后来这张清单 一改再改',
    keywords: [],
    beats: {travel: 0, hand1: 6, hand2: 24, hand3: 42},
  },
  {
    id: 'c4',
    section: 's1',
    start: 504,
    end: 558,
    text: '八条 变成了七条',
    keywords: ['七条'],
    beats: {grow: 0, eight: 4, merge: 18, seven: 30},
  },
  {
    id: 'c5',
    section: 's1',
    start: 558,
    end: 636,
    text: '它的拉丁原名里 藏着一个字',
    keywords: [],
    beats: {plinth: 0, magnifier: 18, capJump: 60},
  },
  {
    id: 'c6',
    section: 's1',
    start: 636,
    end: 672,
    text: '头',
    keywords: ['头'],
    display: 'slam',
    beats: {slam: 0},
  },
  {
    id: 'c7',
    section: 's1',
    start: 672,
    end: 738,
    text: '不是判死罪 是源头',
    keywords: ['源头'],
    beats: {gavel: 0, strike: 12, spring: 30},
  },
  {
    id: 'c8',
    section: 's1',
    start: 738,
    end: 798,
    text: '每一条 都会生出别的错',
    keywords: ['生出别的错'],
    beats: {pipes: 0, overflow: 18, cups: 36},
  },
  {
    id: 'c9',
    section: 's1',
    start: 798,
    end: 840,
    text: '这才是致命',
    keywords: ['致命'],
    display: 'slam',
    beats: {pullBack: 0, tagLand: 4},
  },
];

export const DURATION = CUES[CUES.length - 1].end;

// ── 查询工具 ──────────────────────────────────────

const cueById = new Map(CUES.map((c) => [c.id, c]));

export const cue = (id: string): Cue => {
  const c = cueById.get(id);
  if (!c) throw new Error(`没有这一屏：${id}`);
  return c;
};

/** 某一屏某个节点的绝对帧号，例如 beat('o2', 'freeze') */
export const beat = (id: string, name?: string): number => {
  const c = cue(id);
  if (!name) return c.start;
  const off = c.beats?.[name];
  if (off === undefined) throw new Error(`${id} 没有节点 ${name}`);
  return c.start + off;
};

export const sectionRange = (id: SectionId) => {
  const cs = CUES.filter((c) => c.section === id);
  return {start: cs[0].start, end: cs[cs.length - 1].end};
};

export const cueAt = (frame: number): Cue | undefined =>
  CUES.find((c) => frame >= c.start && frame < c.end);

// ── 音效时间轴 ────────────────────────────────────
// sound 对应 public/sfx/<sound>.wav（由 scripts/gen-sfx.ts 合成）
// at 是绝对帧号，全部从上面的字幕和节点推出来

export type SoundName =
  | 'thumpSoft'
  | 'thump'
  | 'thumpHeavy'
  | 'click'
  | 'tick'
  | 'whoosh'
  | 'whip'
  | 'glass'
  | 'riser'
  | 'paper'
  | 'bubble'
  | 'bubbles'
  | 'tickRoll'
  | 'freeze'
  | 'doorAir'
  | 'wood'
  | 'pad';

export type SfxCue = {sound: SoundName; at: number; gain: number};

const s1 = sectionRange('s1');

export const SFX: SfxCue[] = [
  // 开头 0–5 秒
  {sound: 'thump', at: beat('o1', 'stampSloth'), gain: 0.8},
  {sound: 'tick', at: beat('o1', 'alarm'), gain: 0.5},
  {sound: 'tick', at: beat('o1', 'alarm') + 7, gain: 0.45},
  {sound: 'click', at: beat('o1', 'jumpCut'), gain: 0.55},
  {sound: 'thumpSoft', at: beat('o2', 'stampEnvy'), gain: 0.7},
  {sound: 'whip', at: beat('o2', 'whip') - 2, gain: 0.7},
  {sound: 'doorAir', at: beat('o2', 'doorClose'), gain: 0.6},
  {sound: 'thump', at: beat('o2', 'stampRage'), gain: 0.95},
  {sound: 'freeze', at: beat('o2', 'freeze'), gain: 0.75},
  {sound: 'click', at: beat('o2', 'freeze'), gain: 0.5},
  {sound: 'glass', at: beat('o3', 'matchCut'), gain: 0.6},
  {sound: 'whoosh', at: beat('o3', 'matchCut') + 1, gain: 0.55},
  ...[0, 1, 2, 3].map((i) => ({sound: 'click' as const, at: beat('o3', 'labels') + i * 4, gain: 0.42})),
  {sound: 'riser', at: beat('o4', 'flash') - 6, gain: 0.55},
  {sound: 'thumpHeavy', at: beat('o4', 'land'), gain: 0.95},
  {sound: 'paper', at: beat('o4', 'tagDetach'), gain: 0.5},
  // 5–10 秒
  {sound: 'whip', at: beat('o5', 'whip') - 2, gain: 0.6},
  {sound: 'paper', at: beat('o5', 'scrollRoll'), gain: 0.45},
  {sound: 'tickRoll', at: beat('o6', 'rulerRoll'), gain: 0.5},
  {sound: 'thumpSoft', at: beat('o6', 'rollEnd'), gain: 0.75},
  // 一 致命是源头
  {sound: 'pad', at: s1.start, gain: 0.32},
  ...Array.from({length: 8}, (_, i) => ({sound: 'click' as const, at: beat('c1', 'smokeRise') + i * 5, gain: 0.3})),
  ...Array.from({length: 8}, (_, i) => ({sound: 'glass' as const, at: beat('c2', 'tubesBorn') + i * 3, gain: 0.26})),
  {sound: 'whoosh', at: beat('c3', 'travel'), gain: 0.45},
  {sound: 'paper', at: beat('c3', 'hand1'), gain: 0.42},
  {sound: 'paper', at: beat('c3', 'hand2'), gain: 0.42},
  {sound: 'paper', at: beat('c3', 'hand3'), gain: 0.42},
  {sound: 'thumpSoft', at: beat('c4', 'eight'), gain: 0.7},
  {sound: 'bubble', at: beat('c4', 'merge'), gain: 0.6},
  {sound: 'thump', at: beat('c4', 'seven'), gain: 0.85},
  {sound: 'whoosh', at: beat('c5', 'magnifier'), gain: 0.35},
  {sound: 'wood', at: beat('c5', 'capJump'), gain: 0.5},
  {sound: 'wood', at: beat('c5', 'capJump') + 4, gain: 0.45},
  {sound: 'thumpHeavy', at: beat('c6', 'slam'), gain: 0.95},
  {sound: 'paper', at: beat('c7', 'strike'), gain: 0.5},
  {sound: 'bubbles', at: beat('c7', 'spring'), gain: 0.5},
  {sound: 'bubbles', at: beat('c8', 'overflow'), gain: 0.55},
  ...[0, 1, 2].map((i) => ({sound: 'click' as const, at: beat('c8', 'cups') + i * 6, gain: 0.45})),
  {sound: 'riser', at: beat('c9', 'pullBack') - 14, gain: 0.5},
  {sound: 'thumpHeavy', at: beat('c9', 'pullBack'), gain: 0.95},
];

/** 背景和弦垫底的长度（帧），音效合成脚本按它生成 pad.wav */
export const PAD_FRAMES = s1.end - s1.start;
