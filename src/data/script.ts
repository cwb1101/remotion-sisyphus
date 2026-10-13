/**
 * 字幕定稿 —— 全片唯一的时间来源。
 *
 * 每屏一条：开始帧 / 结束帧（30fps，左闭右开）、文字、重点词、版式、所属场景、音效。
 * 画面里所有动作（人物走位、物件变化、镜头运动）和所有音效都按这里的帧号排，
 * 改字幕、改时长，只改这个文件，然后重新 `npm run render:preview`。
 *
 * text 里的 "\n" 是手动换行：
 *   - stagger-*：第一行是小字，第二行是大字
 *   - lower-left-paragraph / top-left / follow：段落换行
 * sfx.at 是相对本屏 start 的帧数；every + count 表示按间隔重复。
 * 每屏的 "slam" 音效同时决定重点词砸下来的那一帧。
 */

export const FPS = 30;

export type Layout =
  | 'bottom-center' // 底部居中一行
  | 'bottom-left-note' // 底部左对齐 + 英文小注（杂志式）
  | 'lower-left-paragraph' // 左下角小段落
  | 'stagger-bottom' // 大小字错位，放在下方
  | 'stagger-left' // 大小字错位，放在左侧
  | 'follow' // 字跟着人物移动（只在左半和下方）
  | 'occluded' // 字被前景挡住再露出（底部）
  | 'top-left' // 左上（画面下半被人物或物件占住时）
  | 'center'; // 画面正中（只给关键句）

export type SceneId =
  | 'opening'
  | 'corridor'
  | 'mirrors'
  | 'seawall'
  | 'arches'
  | 'room'
  | 'ridge'
  | 'stairs';

export type SfxId =
  | 'tick'
  | 'steps'
  | 'steps-far'
  | 'slam'
  | 'pitch-down'
  | 'whoosh'
  | 'bell'
  | 'door'
  | 'wood'
  | 'hush'
  | 'beep'
  | 'silence-hit';

export type Cue = {id: SfxId; at: number; every?: number; count?: number; volume?: number};

export type Screen = {
  id: string;
  scene: SceneId;
  start: number;
  end: number;
  text: string;
  keywords: string[];
  layout: Layout;
  /** 英文小注 / 出处（思源黑体小字） */
  note?: string;
  /** 关键句：全屏级别的画面和音效 */
  impact?: boolean;
  sfx?: Cue[];
};

export type Scene = {id: SceneId; title: string; bed?: string};

export const SCENES: Scene[] = [
  {id: 'opening', title: '§0 开头·石柱大厅', bed: 'bed-hall'},
  {id: 'corridor', title: '§1 少掉的那些人·长廊', bed: 'bed-corridor'},
  {id: 'mirrors', title: '§2 问法变了·无限镜面'},
  {id: 'seawall', title: '§3 肩并肩·海平线'},
  {id: 'arches', title: '§4 只有一扇门·拱门'},
  {id: 'room', title: '§5 说不出口·空房间'},
  {id: 'ridge', title: '§6 代价·雾中山脊'},
  {id: 'stairs', title: '§7 回答·旋转楼梯'},
];

// prettier-ignore
export const SCREENS: Screen[] = [
  {id: "s01", scene: "opening", start: 0, end: 90, text: "100个美国男人里，", keywords: [], layout: "bottom-center"},
  {id: "s02", scene: "opening", start: 90, end: 195, text: "有15个，连一个知心朋友都没有。", keywords: ["15个"], layout: "bottom-left-note", note: "15 in 100 have no close friend", sfx: [{id: "tick", at: 12, every: 4, count: 15, volume: 0.5}, {id: "steps-far", at: 20, every: 17, count: 6, volume: 0.25}, {id: "slam", at: 10, volume: 0.7}]},
  {id: "s03", scene: "opening", start: 195, end: 285, text: "三十年前，\n这个数字是3。", keywords: ["3"], layout: "lower-left-paragraph", note: "1990 → 2021 · Survey Center on American Life", sfx: [{id: "pitch-down", at: 0, volume: 0.6}, {id: "slam", at: 12, volume: 0.6}]},
  {id: "s04", scene: "opening", start: 285, end: 360, text: "如果\n他们真的更孤独，", keywords: [], layout: "stagger-bottom", sfx: [{id: "whoosh", at: 0, volume: 0.35}]},
  {id: "s05", scene: "opening", start: 360, end: 480, text: "为什么我们很少听见他们说出口？", keywords: ["说出口"], layout: "center", impact: true, sfx: [{id: "bell", at: 8, volume: 0.9}, {id: "slam", at: 10, volume: 0.8}]},
  {id: "s06", scene: "corridor", start: 480, end: 585, text: "他们的朋友，不是一下子没的。", keywords: [], layout: "bottom-center", sfx: [{id: "whoosh", at: 60, volume: 0.6}, {id: "steps", at: 14, every: 17, count: 6, volume: 0.55}]},
  {id: "s07", scene: "corridor", start: 585, end: 690, text: "是一扇门、一扇门，\n慢慢关上的。", keywords: ["慢慢"], layout: "follow", sfx: [{id: "door", at: 10, every: 18, count: 5, volume: 0.7}, {id: "slam", at: 12, volume: 0.6}, {id: "steps", at: 3, every: 17, count: 6, volume: 0.5}]},
  {id: "s08", scene: "corridor", start: 690, end: 810, text: "1990年，过半的男人\n有六个以上好朋友。", keywords: ["六个以上"], layout: "top-left", sfx: [{id: "steps", at: 20, every: 17, count: 5, volume: 0.45}, {id: "slam", at: 14, volume: 0.6}]},
  {id: "s09", scene: "corridor", start: 810, end: 915, text: "到2021年，只剩27%。", keywords: ["27%"], layout: "bottom-left-note", note: "Men with 6+ close friends: 55% → 27%", sfx: [{id: "wood", at: 16, every: 12, count: 5, volume: 0.8}, {id: "slam", at: 12, volume: 0.8}]},
  {id: "s10", scene: "corridor", start: 915, end: 1005, text: "没有吵架，\n也没有告别。", keywords: [], layout: "lower-left-paragraph", sfx: [{id: "hush", at: 0, volume: 0.7}]},
  {id: "s11", scene: "corridor", start: 1005, end: 1125, text: "只是某天想找人说话，\n才发现名单很短。", keywords: ["名单很短"], layout: "stagger-bottom", sfx: [{id: "beep", at: 40, volume: 0.5}, {id: "slam", at: 16, volume: 0.6}, {id: "silence-hit", at: 96, volume: 0.6}]},
  {id: "s12", scene: "mirrors", start: 1125, end: 1254, text: "大样本研究里，男女的孤独，整体相差不大。", keywords: [], layout: "bottom-left-note", note: "Maes et al., 2019 · 399,798 people"},
  {id: "s13", scene: "mirrors", start: 1254, end: 1359, text: "只是从童年到青年，\n男生略高一点。", keywords: ["略高"], layout: "stagger-left"},
  {id: "s14", scene: "mirrors", start: 1359, end: 1449, text: "但如果直接问：“你孤独吗？”", keywords: [], layout: "bottom-center"},
  {id: "s15", scene: "mirrors", start: 1449, end: 1554, text: "男人比女人，更少回答“是”。", keywords: [], layout: "bottom-left-note", note: "Borys & Perlman, 1985 · 39 datasets"},
  {id: "s16", scene: "mirrors", start: 1554, end: 1659, text: "换成不提“孤独”\n二字的问卷——", keywords: [], layout: "lower-left-paragraph"},
  {id: "s17", scene: "mirrors", start: 1659, end: 1788, text: "差距常常消失；有时，男人的分数反而更高。", keywords: ["反而更高"], layout: "center", impact: true},
  {id: "s18", scene: "mirrors", start: 1788, end: 1878, text: "他们不是不孤独，\n是不肯认。", keywords: ["认"], layout: "follow"},
  {id: "s19", scene: "mirrors", start: 1878, end: 1992, text: "研究者让人读\n同一个孤独者的故事，", keywords: [], layout: "top-left"},
  {id: "s20", scene: "mirrors", start: 1992, end: 2097, text: "主角换成男人，大家更想疏远他。", keywords: ["疏远"], layout: "bottom-left-note", note: "Lonely men were rejected more"},
  {id: "s21", scene: "seawall", start: 2097, end: 2202, text: "男人的友谊，多半是肩并肩的。", keywords: ["肩并肩"], layout: "bottom-center"},
  {id: "s22", scene: "seawall", start: 2202, end: 2322, text: "一起打球、喝酒、打游戏，看着同一个方向。", keywords: [], layout: "bottom-left-note", note: "side by side — Wright, 1982"},
  {id: "s23", scene: "seawall", start: 2322, end: 2412, text: "女人之间，\n更常面对面地聊。", keywords: ["面对面"], layout: "stagger-left"},
  {id: "s24", scene: "seawall", start: 2412, end: 2517, text: "肩并肩的关系，\n靠的是一起做的事。", keywords: ["一起做的事"], layout: "lower-left-paragraph"},
  {id: "s25", scene: "seawall", start: 2517, end: 2607, text: "毕业、换工作、搬家，事一停——", keywords: [], layout: "occluded"},
  {id: "s26", scene: "seawall", start: 2607, end: 2682, text: "人就散了。", keywords: ["散了"], layout: "center", impact: true},
  {id: "s27", scene: "seawall", start: 2682, end: 2787, text: "不是谁不在乎，\n是没人先开口约。", keywords: [], layout: "stagger-bottom"},
  {id: "s28", scene: "arches", start: 2787, end: 2892, text: "朋友少了，\n很多男人就把心事，", keywords: [], layout: "follow"},
  {id: "s29", scene: "arches", start: 2892, end: 2982, text: "全交给一个人：伴侣。", keywords: ["一个人"], layout: "top-left"},
  {id: "s30", scene: "arches", start: 2982, end: 3057, text: "已婚男人比已婚女人，", keywords: [], layout: "bottom-left-note", note: "Survey Center on American Life, 2021"},
  {id: "s31", scene: "arches", start: 3057, end: 3147, text: "更依赖伴侣给的情感支持。", keywords: ["情感支持"], layout: "bottom-center"},
  {id: "s32", scene: "arches", start: 3147, end: 3222, text: "这扇门\n一旦关上——", keywords: [], layout: "stagger-bottom"},
  {id: "s33", scene: "arches", start: 3222, end: 3312, text: "他手里的绳，空了。", keywords: ["空了"], layout: "center", impact: true},
  {id: "s34", scene: "arches", start: 3312, end: 3402, text: "身后，\n没有第二扇亮着的门。", keywords: [], layout: "lower-left-paragraph"},
  {id: "s35", scene: "arches", start: 3402, end: 3552, text: "没有伴侣的男人里，五分之一连一个好朋友都没有。", keywords: ["五分之一"], layout: "bottom-left-note", note: "1 in 5 single men: no close friend"},
  {id: "s36", scene: "room", start: 3552, end: 3657, text: "从小听到大：男儿有泪不轻弹。", keywords: [], layout: "bottom-center"},
  {id: "s37", scene: "room", start: 3657, end: 3762, text: "于是难受，被翻译成了我没事。", keywords: ["我没事"], layout: "occluded"},
  {id: "s38", scene: "room", start: 3762, end: 3837, text: "或者，\n我最近很忙。", keywords: ["我最近很忙"], layout: "stagger-left"},
  {id: "s39", scene: "room", start: 3837, end: 3942, text: "凌晨三点，\n他想找个人说说话。", keywords: [], layout: "top-left"},
  {id: "s40", scene: "room", start: 3942, end: 4032, text: "翻了一遍，不知道该打给谁。", keywords: [], layout: "bottom-center"},
  {id: "s41", scene: "room", start: 4032, end: 4137, text: "孤独最重的部分，常常是说不出口。", keywords: ["说不出口"], layout: "bottom-left-note", note: "The heaviest part is the silence."},
  {id: "s42", scene: "ridge", start: 4137, end: 4212, text: "这不只是\n情绪。", keywords: [], layout: "stagger-bottom"},
  {id: "s43", scene: "ridge", start: 4212, end: 4356, text: "世卫组织估计，全球约六分之一的人受孤独困扰。", keywords: ["六分之一"], layout: "bottom-left-note", note: "WHO Commission on Social Connection, 2025"},
  {id: "s44", scene: "ridge", start: 4356, end: 4461, text: "每小时，约有100人\n的死亡与它有关。", keywords: ["100人"], layout: "lower-left-paragraph", note: "≈ 871,000 deaths a year"},
  {id: "s45", scene: "ridge", start: 4461, end: 4581, text: "中风、心脏病、抑郁的风险，\n都会跟着上升。", keywords: [], layout: "follow"},
  {id: "s46", scene: "ridge", start: 4581, end: 4671, text: "而他，\n还以为自己只是累了。", keywords: ["累了"], layout: "top-left"},
  {id: "s47", scene: "stairs", start: 4671, end: 4776, text: "所以，为什么很少听见他们说？", keywords: [], layout: "bottom-center"},
  {id: "s48", scene: "stairs", start: 4776, end: 4866, text: "因为没人问，也没地方说，", keywords: [], layout: "bottom-left-note", note: "No one asks. Nowhere to say it."},
  {id: "s49", scene: "stairs", start: 4866, end: 4941, text: "说了，\n还怕被看轻。", keywords: [], layout: "stagger-bottom"},
  {id: "s50", scene: "stairs", start: 4941, end: 5046, text: "可先开口的，不一定要是他。", keywords: [], layout: "center", impact: true},
  {id: "s51", scene: "stairs", start: 5046, end: 5121, text: "也可以\n是你。", keywords: [], layout: "follow"},
  {id: "s52", scene: "stairs", start: 5121, end: 5211, text: "一句“最近怎么样”，\n就够了。", keywords: [], layout: "lower-left-paragraph"},
  {id: "s53", scene: "stairs", start: 5211, end: 5316, text: "男人的孤独，往往不是身边没人，", keywords: [], layout: "bottom-left-note", note: "Not alone — just unheard."},
  {id: "s54", scene: "stairs", start: 5316, end: 5421, text: "是没有一个，\n能说话的位置。", keywords: ["位置"], layout: "stagger-bottom"},
  {id: "s55", scene: "stairs", start: 5421, end: 5571, text: "你上一次和朋友说真心话，\n是什么时候？", keywords: [], layout: "center", impact: true}

];
