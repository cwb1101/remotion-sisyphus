/**
 * 字幕定稿 —— 全片唯一的时间来源。
 *
 * - 每屏一条：开始帧、结束帧（不含）、文字、重点词。
 * - 文字里不写任何标点；需要停顿用空格；\n 只用于片尾小字声明的强制换行。
 * - 重点词必须是文字里的原样子串，渲染时染成强调色。
 * - style：slam = 关键句（大字砸下 + 全屏级画面与音效）；note = 片尾小字。
 * - 画面节拍和音效都通过 beat(cueId, offset) 挂在这些屏上，改字幕时间只改这里。
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** 左上角主题标注第一行：本期主题 */
export const THEME = '比冷暴力更磨人的情感漠视';

export type SectionId = 's0' | 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7';

export type Section = {
  id: SectionId;
  /** 左上角第二行的小标题 */
  title: string;
  start: number;
  end: number;
};

export type CueStyle = 'normal' | 'slam' | 'note';

export type Cue = {
  id: string;
  section: SectionId;
  start: number;
  end: number;
  text: string;
  keywords: string[];
  style?: CueStyle;
};

export const SECTIONS: Section[] = [
  { id: 's0', title: '一个字', start: 0, end: 240 },
  { id: 's1', title: '不是冷暴力', start: 240, end: 750 },
  { id: 's2', title: '客服式回应', start: 750, end: 1500 },
  { id: 's3', title: '没有错的伤', start: 1500, end: 1950 },
  { id: 's4', title: '感觉还在', start: 1950, end: 2310 },
  { id: 's5', title: '静止的脸', start: 2310, end: 3240 },
  { id: 's6', title: '不会还是不想', start: 3240, end: 4020 },
  { id: 's7', title: '学着接住', start: 4020, end: 4500 },
];

export const CUES: Cue[] = [
  { id: 's0-01', section: 's0', start: 0, end: 36, text: '你写了三百字', keywords: ['三百字'] },
  { id: 's0-02', section: 's0', start: 36, end: 72, text: 'TA回了一个字', keywords: ['一个字'] },
  { id: 's0-03', section: 's0', start: 72, end: 108, text: '这不是冷暴力', keywords: ['冷暴力'], style: 'slam' },
  { id: 's0-04', section: 's0', start: 108, end: 138, text: '是情感漠视', keywords: ['情感漠视'], style: 'slam' },
  { id: 's0-05', section: 's0', start: 138, end: 180, text: 'TA什么都没做错', keywords: [] },
  { id: 's0-06', section: 's0', start: 180, end: 234, text: '为什么你还这么委屈', keywords: ['委屈'] },
  { id: 's1-01', section: 's1', start: 240, end: 288, text: '冷暴力 是故意的', keywords: ['故意'] },
  { id: 's1-02', section: 's1', start: 288, end: 342, text: 'TA用沉默 来惩罚你', keywords: ['惩罚'] },
  { id: 's1-03', section: 's1', start: 342, end: 390, text: '情感漠视 不一样', keywords: [] },
  { id: 's1-04', section: 's1', start: 390, end: 432, text: '门一直都开着', keywords: ['开着'] },
  { id: 's1-05', section: 's1', start: 432, end: 486, text: '可屋里 好像没有人', keywords: ['没有人'] },
  { id: 's1-06', section: 's1', start: 486, end: 552, text: 'TA每天都回消息 都报备', keywords: [] },
  { id: 's1-07', section: 's1', start: 552, end: 606, text: '你却越来越孤单', keywords: ['孤单'] },
  { id: 's1-08', section: 's1', start: 606, end: 672, text: '因为TA给你的 只是回答', keywords: ['回答'] },
  { id: 's1-09', section: 's1', start: 672, end: 726, text: '不是回应', keywords: ['回应'], style: 'slam' },
  { id: 's2-01', section: 's2', start: 750, end: 810, text: '你问一句 TA答一句', keywords: [] },
  { id: 's2-02', section: 's2', start: 810, end: 876, text: '像一个很礼貌的客服', keywords: ['礼貌'] },
  { id: 's2-03', section: 's2', start: 876, end: 936, text: '你难过 TA说对不起', keywords: ['对不起'] },
  { id: 's2-04', section: 's2', start: 936, end: 996, text: '你再问 还是对不起', keywords: [] },
  { id: 's2-05', section: 's2', start: 996, end: 1038, text: '问题没有解决', keywords: [] },
  { id: 's2-06', section: 's2', start: 1038, end: 1092, text: '只是被盖章结案', keywords: ['盖章'] },
  { id: 's2-07', section: 's2', start: 1092, end: 1164, text: '你想好好谈谈 TA说太累了', keywords: ['太累了'] },
  { id: 's2-08', section: 's2', start: 1164, end: 1218, text: '然后拉下了窗口', keywords: ['窗口'] },
  { id: 's2-09', section: 's2', start: 1218, end: 1290, text: '第二天 TA像什么都没发生', keywords: ['什么都没发生'] },
  { id: 's2-10', section: 's2', start: 1290, end: 1350, text: '照常问你 早饭吃了吗', keywords: [] },
  { id: 's2-11', section: 's2', start: 1350, end: 1416, text: '而你的难过 被清零了', keywords: ['清零'] },
  { id: 's2-12', section: 's2', start: 1416, end: 1476, text: '一切看起来 都很正常', keywords: ['正常'] },
  { id: 's3-01', section: 's3', start: 1500, end: 1566, text: 'TA好像 真的没做错什么', keywords: [] },
  { id: 's3-02', section: 's3', start: 1566, end: 1644, text: '该回的回了 该道歉的也道歉了', keywords: [] },
  { id: 's3-03', section: 's3', start: 1644, end: 1704, text: '可你要的 不是被回复', keywords: ['被回复'] },
  { id: 's3-04', section: 's3', start: 1722, end: 1776, text: '是被接住', keywords: ['被接住'], style: 'slam' },
  { id: 's3-05', section: 's3', start: 1776, end: 1848, text: '所以这份委屈 你说不出口', keywords: [] },
  { id: 's3-06', section: 's3', start: 1848, end: 1908, text: '因为找不到 谁做错了', keywords: [] },
  { id: 's4-01', section: 's4', start: 1950, end: 2004, text: '但别急着说 TA冷血', keywords: ['冷血'] },
  { id: 's4-02', section: 's4', start: 2004, end: 2070, text: 'TA看到流浪猫 会蹲下来', keywords: [] },
  { id: 's4-03', section: 's4', start: 2070, end: 2136, text: '看电影时 会偷偷红了眼', keywords: ['红了眼'] },
  { id: 's4-04', section: 's4', start: 2136, end: 2184, text: 'TA不是没有感觉', keywords: [] },
  { id: 's4-05', section: 's4', start: 2184, end: 2226, text: '只是在你面前', keywords: [] },
  { id: 's4-06', section: 's4', start: 2226, end: 2298, text: '把感觉调成了静音', keywords: ['静音'], style: 'slam' },
  { id: 's5-01', section: 's5', start: 2310, end: 2388, text: '为什么偏偏 在最亲的人面前', keywords: ['最亲的人'] },
  { id: 's5-02', section: 's5', start: 2388, end: 2478, text: '上世纪70年代 有个静止脸实验', keywords: ['静止脸实验'] },
  { id: 's5-03', section: 's5', start: 2478, end: 2544, text: '妈妈先对宝宝 正常说笑', keywords: [] },
  { id: 's5-04', section: 's5', start: 2544, end: 2598, text: '然后突然 面无表情', keywords: ['面无表情'], style: 'slam' },
  { id: 's5-05', section: 's5', start: 2598, end: 2682, text: '宝宝一次次逗她 想把她叫回来', keywords: ['叫回来'] },
  { id: 's5-06', section: 's5', start: 2682, end: 2742, text: '叫不回来 就把头转开', keywords: ['转开'] },
  { id: 's5-07', section: 's5', start: 2742, end: 2802, text: '如果这张脸 不是几分钟', keywords: [] },
  { id: 's5-08', section: 's5', start: 2802, end: 2850, text: '而是一整个童年', keywords: ['童年'] },
  { id: 's5-09', section: 's5', start: 2850, end: 2928, text: '孩子就学会 难过要自己收好', keywords: ['自己收好'] },
  { id: 's5-10', section: 's5', start: 2928, end: 3006, text: '长大后 你一靠近 TA就缩回去', keywords: [] },
  { id: 's5-11', section: 's5', start: 3006, end: 3072, text: '那是TA学会的 自我保护', keywords: ['自我保护'] },
  { id: 's5-12', section: 's5', start: 3072, end: 3138, text: '当然 童年不是唯一的原因', keywords: [] },
  { id: 's5-13', section: 's5', start: 3138, end: 3216, text: '它会留下痕迹 但不决定一切', keywords: [] },
  { id: 's6-01', section: 's6', start: 3240, end: 3282, text: '那你 该怎么办', keywords: [] },
  { id: 's6-02', section: 's6', start: 3282, end: 3354, text: '先分清 TA是不会 还是不想', keywords: ['不会', '不想'] },
  { id: 's6-03', section: 's6', start: 3354, end: 3396, text: '把需求说具体', keywords: ['具体'] },
  { id: 's6-04', section: 's6', start: 3396, end: 3468, text: '比如 我难过时 先抱我一下', keywords: [] },
  { id: 's6-05', section: 's6', start: 3468, end: 3540, text: 'TA愿意笨拙地试 就是不会', keywords: ['笨拙地试'] },
  { id: 's6-06', section: 's6', start: 3540, end: 3588, text: '不会 可以一起学', keywords: [] },
  { id: 's6-07', section: 's6', start: 3588, end: 3654, text: '如果一次次 连试都不肯', keywords: [] },
  { id: 's6-08', section: 's6', start: 3654, end: 3726, text: '那就别再用理解 委屈自己', keywords: ['委屈自己'] },
  { id: 's6-09', section: 's6', start: 3726, end: 3774, text: '如果你就是TA', keywords: [] },
  { id: 's6-10', section: 's6', start: 3774, end: 3846, text: '下次想逃的时候 先说一句', keywords: [] },
  { id: 's6-11', section: 's6', start: 3846, end: 3918, text: '我需要想一想 但我没走', keywords: ['想一想'] },
  { id: 's6-12', section: 's6', start: 3924, end: 3972, text: '然后 记得回来', keywords: [] },
  { id: 's7-01', section: 's7', start: 4020, end: 4098, text: '不是每一次表达 都会被否定', keywords: [] },
  { id: 's7-02', section: 's7', start: 4098, end: 4176, text: '也不是每一次靠近 都会受伤', keywords: [] },
  { id: 's7-03', section: 's7', start: 4182, end: 4230, text: '回应 是可以学会的', keywords: ['学会'], style: 'slam' },
  { id: 's7-04', section: 's7', start: 4236, end: 4296, text: '从接住 一次难过开始', keywords: ['难过'] },
  { id: 's7-05', section: 's7', start: 4356, end: 4500, text: '本片仅作科普 不构成心理诊断\n如有困扰 请寻求专业帮助', keywords: [], style: 'note' },
];

const cueMap = new Map(CUES.map((c) => [c.id, c]));

export const cue = (id: string): Cue => {
  const c = cueMap.get(id);
  if (!c) throw new Error(`Unknown cue ${id}`);
  return c;
};

/** 挂在某一屏上的时间点：该屏开始帧 + offset（帧，可为负） */
export const beat = (id: string, offset = 0): number => cue(id).start + offset;

/** 挂在某一屏结束处的时间点 */
export const beatEnd = (id: string, offset = 0): number => cue(id).end + offset;

export const section = (id: SectionId): Section => {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown section ${id}`);
  return s;
};

export const sectionAt = (frame: number): Section =>
  SECTIONS.find((s) => frame >= s.start && frame < s.end) ?? SECTIONS[SECTIONS.length - 1];
