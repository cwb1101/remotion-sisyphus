// 字幕定稿 —— 全片唯一的时间来源。
// 画面动画和音效都按 id 引用这里的 start / end，改字幕只改这个文件。
//
// start / end：30fps 下的帧号（end 不含）
// highlights：句中要高亮的词（必须是 text 的子串）
// style：
//   normal  普通字幕
//   slam    第一个重点词放大砸下来，配全屏冲击和音效
//   title   片名 / 金句大字
//   counter 计数器（字幕层按数字滚动显示）

export const FPS = 30;

export type Section = 'opening' | 'myth' | 'punishment' | 'absurd' | 'descent' | 'answer' | 'ending';
export type CueStyle = 'normal' | 'slam' | 'title' | 'counter';

export type Cue = {
  id: string;
  section: Section;
  start: number;
  end: number;
  text: string;
  highlights: string[];
  style: CueStyle;
  /** title 样式下方的一行小字（可选） */
  sub?: string;
};

export const CUES: Cue[] = [
  { id: 'count-1', section: 'opening', start: 0, end: 45, text: '第 1 次', highlights: [], style: 'counter' },
  { id: 'count-1000', section: 'opening', start: 45, end: 105, text: '第 1000 次', highlights: ['1000'], style: 'counter' },
  { id: 'almost', section: 'opening', start: 105, end: 152, text: '每一次，都差一点。', highlights: ['差一点'], style: 'slam' },
  { id: 'happy', section: 'opening', start: 152, end: 212, text: '有人却说：他是幸福的。', highlights: ['幸福'], style: 'normal' },
  { id: 'why', section: 'opening', start: 212, end: 308, text: '一个永远推不上山的人，凭什么幸福？', highlights: ['凭什么'], style: 'slam' },
  { id: 'title', section: 'opening', start: 308, end: 383, text: '西西弗斯', highlights: [], style: 'title', sub: 'SISYPHUS' },
  { id: 'king', section: 'myth', start: 383, end: 473, text: '他是古希腊神话里，科林斯的国王。', highlights: [], style: 'normal' },
  { id: 'cunning', section: 'myth', start: 473, end: 527, text: '他以狡猾出名。', highlights: ['狡猾'], style: 'normal' },
  { id: 'secret', section: 'myth', start: 527, end: 617, text: '一种说法是：他泄露了宙斯的秘密。', highlights: [], style: 'normal' },
  { id: 'death', section: 'myth', start: 617, end: 677, text: '于是，死神来抓他了。', highlights: ['死神'], style: 'slam' },
  { id: 'lock', section: 'myth', start: 677, end: 755, text: '他却用铁链，把死神锁了起来。', highlights: ['锁'], style: 'slam' },
  { id: 'nobody-dies', section: 'myth', start: 755, end: 830, text: '一时间，人间没有人死去。', highlights: ['没有人死去'], style: 'slam' },
  { id: 'died', section: 'myth', start: 830, end: 878, text: '后来，他还是死了。', highlights: [], style: 'normal' },
  { id: 'persephone', section: 'myth', start: 878, end: 950, text: '却又骗过冥后，溜回了人间。', highlights: [], style: 'normal' },
  { id: 'gods', section: 'myth', start: 950, end: 1004, text: '众神不会再放过他。', highlights: [], style: 'normal' },
  { id: 'boulder', section: 'punishment', start: 1004, end: 1082, text: '惩罚是：把一块巨石推上山顶。', highlights: [], style: 'normal' },
  { id: 'near-top', section: 'punishment', start: 1082, end: 1166, text: '每次快到山顶，石头就会滚回去。', highlights: ['快到山顶'], style: 'slam' },
  { id: 'again', section: 'punishment', start: 1166, end: 1214, text: '然后，从头再来。', highlights: [], style: 'normal' },
  { id: 'no-end', section: 'punishment', start: 1214, end: 1286, text: '没有尽头。', highlights: ['没有尽头'], style: 'slam' },
  { id: 'why-this', section: 'punishment', start: 1286, end: 1352, text: '为什么偏偏是这个惩罚？', highlights: [], style: 'normal' },
  { id: 'camus-1942', section: 'punishment', start: 1352, end: 1436, text: '1942年，法国作家加缪写道：', highlights: ['加缪'], style: 'normal' },
  { id: 'gods-thought', section: 'punishment', start: 1436, end: 1526, text: '众神认为，没有比这更可怕的惩罚——', highlights: [], style: 'normal' },
  { id: 'futile', section: 'punishment', start: 1526, end: 1604, text: '无用又无望的劳动。', highlights: ['无用', '无望'], style: 'slam' },
  { id: 'absurd-word', section: 'absurd', start: 1604, end: 1705, text: '加缪用一个词，描述人的这种处境：荒诞。', highlights: ['荒诞'], style: 'slam' },
  { id: 'ask-meaning', section: 'absurd', start: 1705, end: 1783, text: '人总想问：这一切有什么意义？', highlights: ['有什么意义'], style: 'normal' },
  { id: 'silence', section: 'absurd', start: 1783, end: 1867, text: '世界却一言不发。', highlights: ['一言不发'], style: 'slam' },
  { id: 'collision', section: 'absurd', start: 1867, end: 1933, text: '两者撞在一起，就是荒诞。', highlights: [], style: 'normal' },
  { id: 'absurd-hero', section: 'absurd', start: 1933, end: 2005, text: '而西西弗斯，是荒诞的英雄。', highlights: ['荒诞的英雄'], style: 'normal' },
  { id: 'not-pushing', section: 'descent', start: 2005, end: 2100, text: '加缪最在意的，不是他推石头的时候。', highlights: [], style: 'normal' },
  { id: 'walk-down', section: 'descent', start: 2100, end: 2196, text: '而是石头滚落后，他走下山的那段路。', highlights: ['走下山'], style: 'normal' },
  { id: 'lucidity', section: 'descent', start: 2196, end: 2274, text: '加缪说，那是清醒的时刻。', highlights: ['清醒'], style: 'slam' },
  { id: 'he-knows', section: 'descent', start: 2274, end: 2358, text: '他清楚地知道：石头还会滚下来。', highlights: [], style: 'normal' },
  { id: 'torment', section: 'descent', start: 2358, end: 2430, text: '这份清醒，本该是他的折磨。', highlights: ['折磨'], style: 'normal' },
  { id: 'victory', section: 'descent', start: 2430, end: 2502, text: '却也成就了他的胜利。', highlights: ['胜利'], style: 'slam' },
  { id: 'goes-back', section: 'descent', start: 2502, end: 2580, text: '他看清了一切，还是走了回去。', highlights: ['看清'], style: 'normal' },
  { id: 'gods-punish', section: 'descent', start: 2580, end: 2640, text: '众神想用徒劳惩罚他。', highlights: [], style: 'normal' },
  { id: 'not-punished', section: 'descent', start: 2640, end: 2766, text: '可一个看清徒劳的人，不再被它惩罚。', highlights: ['不再被它惩罚'], style: 'slam' },
  { id: 'back-to-q', section: 'answer', start: 2766, end: 2814, text: '回到开头的问题：', highlights: [], style: 'normal' },
  { id: 'q-again', section: 'answer', start: 2814, end: 2909, text: '一个永远推不上山的人，凭什么幸福？', highlights: [], style: 'normal' },
  { id: 'camus-answer', section: 'answer', start: 2909, end: 2957, text: '加缪的回答是：', highlights: [], style: 'normal' },
  { id: 'struggle', section: 'answer', start: 2957, end: 3023, text: '登上顶峰的斗争本身，', highlights: ['登上顶峰的斗争本身'], style: 'slam' },
  { id: 'fill-heart', section: 'answer', start: 3023, end: 3107, text: '足以充实一个人的心。', highlights: [], style: 'normal' },
  { id: 'not-summit', section: 'answer', start: 3107, end: 3161, text: '幸福不在山顶。', highlights: ['不在山顶'], style: 'normal' },
  { id: 'every-step', section: 'answer', start: 3161, end: 3227, text: '在推的每一步里。', highlights: ['每一步'], style: 'normal' },
  { id: 'rolls-again', section: 'ending', start: 3227, end: 3281, text: '石头又滚了下来。', highlights: [], style: 'normal' },
  { id: 'turns', section: 'ending', start: 3281, end: 3353, text: '他转过身，走下山去。', highlights: [], style: 'normal' },
  { id: 'imagine', section: 'ending', start: 3353, end: 3407, text: '必须想象，', highlights: [], style: 'normal' },
  { id: 'happy-final', section: 'ending', start: 3407, end: 3536, text: '西西弗斯是幸福的。', highlights: ['幸福'], style: 'title' },
  { id: 'count-loop', section: 'ending', start: 3536, end: 3596, text: '第 1 次', highlights: [], style: 'counter' },
];
