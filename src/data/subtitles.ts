/**
 * 字幕定稿 —— 全片唯一的字幕来源。
 *
 * 改字幕只改这个文件。画面、音效、卡点都按 id 引用这里的 start / end，
 * 再到 beatmap.json 里找最近的小节 / 底鼓，所以改了时间，动画和音效会一起跟着走。
 *
 * - start / end：30fps 帧号，end 不含（下一屏从这一帧开始）
 * - text：屏幕上的文字；highlight：要高亮的词（必须是 text 的子串，每屏最多一个）
 * - heavy：重卡点名（全片 3–5 个，必须落在 beatmap.dropFrame 或 accents 上）
 * - label：附着在物件上的小字标签 / 注释
 * - tone：重点词颜色，默认金色；'vermilion' = 朱红（只给情绪反转用）
 *
 * 规则校验：npm run check
 */

export type SectionId = 'hook' | 'evidence' | 'naming' | 'viewer' | 'mechanism' | 'answer' | 'return';

export interface Screen {
  id: number;
  section: SectionId;
  start: number;
  end: number;
  text: string;
  highlight: string | null;
  heavy?: string;
  label?: string;
  tone?: 'vermilion';
}

export const SCREENS: Screen[] = [
  { id: 1, section: 'hook', start: 1, end: 87, text: "你见过的每一条地平线，", highlight: null },
  { id: 2, section: 'hook', start: 87, end: 172, text: "都是直的。", highlight: "直的" },
  { id: 3, section: 'hook', start: 172, end: 258, text: "升到400公里高——", highlight: null, label: "高度 0 → 400 km" },
  { id: 4, section: 'hook', start: 258, end: 343, text: "它就弯了。", highlight: "弯", label: "国际空间站轨道高度约 400 km" },
  { id: 5, section: 'hook', start: 343, end: 429, text: "再远一点，它合成一个圆。", highlight: null },
  { id: 6, section: 'hook', start: 429, end: 515, text: "不少人，从这里看过地球。", highlight: null },
  { id: 7, section: 'hook', start: 515, end: 600, text: "回来后，说自己变了。", highlight: "变了" },
  { id: 8, section: 'hook', start: 600, end: 686, text: "可他们只是，看了一眼。", highlight: null },
  { id: 9, section: 'hook', start: 686, end: 857, text: "看一眼地球，为什么能改变一个人？", highlight: "改变一个人", heavy: "主线问题" },
  { id: 10, section: 'evidence', start: 857, end: 985, text: "1968年，阿波罗8号绕月。", highlight: null, label: "《地球升起》· 1968.12.24" },
  { id: 11, section: 'evidence', start: 985, end: 1114, text: "「我们去探索月球，却发现了地球。」", highlight: "地球", label: "比尔·安德斯 · NASA 口述历史 · 1997" },
  { id: 12, section: 'evidence', start: 1114, end: 1199, text: "那圈薄光，就是全部的空气。", highlight: null },
  { id: 13, section: 'evidence', start: 1199, end: 1285, text: "把地球缩成一个篮球——", highlight: null, label: "篮球直径约 24 cm" },
  { id: 14, section: 'evidence', start: 1285, end: 1371, text: "空气层不到2毫米。", highlight: "2毫米", label: "示意：以 100 km 卡门线计，6371 km 地球半径" },
  { id: 15, section: 'evidence', start: 1371, end: 1456, text: "演《星际迷航》船长的沙特纳，", highlight: null, label: "威廉·沙特纳" },
  { id: 16, section: 'evidence', start: 1456, end: 1542, text: "90岁时，真的飞上了太空。", highlight: null, label: "2021.10.13 · 蓝色起源 NS-18 · 全程约 10 分钟" },
  { id: 17, section: 'evidence', start: 1542, end: 1713, text: "「我感受过最强烈的悲伤之一。」", highlight: "悲伤", heavy: "核心反转", label: "沙特纳《Boldly Go》· 2022", tone: 'vermilion' },
  { id: 18, section: 'naming', start: 1713, end: 1799, text: "不止他一个。", highlight: null },
  { id: 19, section: 'naming', start: 1799, end: 1884, text: "这种转变，有个名字——", highlight: null },
  { id: 20, section: 'naming', start: 1884, end: 2055, text: "总观效应", highlight: "总观效应", heavy: "主题词", label: "The Overview Effect · 弗兰克·怀特 1987 年提出 · 指看到整个地球后发生的认知转变" },
  { id: 21, section: 'naming', start: 2055, end: 2141, text: "去过太空的，只有七百多人。", highlight: null, label: "746 人 · 截至 2026.10 · 卡门线口径" },
  { id: 22, section: 'viewer', start: 2141, end: 2227, text: "1990年，探测器回头了——", highlight: null, label: "旅行者 1 号 · 1990.2.14 · 距地球约 60 亿公里" },
  { id: 23, section: 'viewer', start: 2227, end: 2355, text: "地球只有0.12个像素。", highlight: "0.12", heavy: "落到观众", label: "NASA/JPL 图像 PIA00452 说明" },
  { id: 24, section: 'viewer', start: 2355, end: 2483, text: "这一帧画面，有207万个像素。", highlight: null, label: "1920 × 1080 = 2,073,600" },
  { id: 25, section: 'viewer', start: 2483, end: 2569, text: "地球，还不到其中一个。", highlight: null },
  { id: 26, section: 'viewer', start: 2569, end: 2655, text: "你认识的每一个人，", highlight: null },
  { id: 27, section: 'viewer', start: 2655, end: 2740, text: "包括正在看视频的你，", highlight: "你" },
  { id: 28, section: 'viewer', start: 2740, end: 2826, text: "都在这一粒光里。", highlight: null },
  { id: 29, section: 'mechanism', start: 2826, end: 2911, text: "心理学家认为，这是敬畏。", highlight: "敬畏", label: "Keltner & Haidt, 2003" },
  { id: 30, section: 'mechanism', start: 2911, end: 2997, text: "一，大到无法忽视。", highlight: null, label: "浩大 vastness" },
  { id: 31, section: 'mechanism', start: 2997, end: 3083, text: "二，大到旧认知装不下。", highlight: null, label: "需要顺应 need for accommodation" },
  { id: 32, section: 'mechanism', start: 3083, end: 3168, text: "装不下，就只能重画。", highlight: "重画" },
  { id: 33, section: 'mechanism', start: 3168, end: 3254, text: "重画之后，“我”变小了。", highlight: null, label: "Bai 等，2017" },
  { id: 34, section: 'mechanism', start: 3254, end: 3339, text: "“我们”，变大了。", highlight: null },
  { id: 35, section: 'mechanism', start: 3339, end: 3425, text: "回到开头的问题——", highlight: null },
  { id: 36, section: 'answer', start: 3425, end: 3511, text: "改变人的，不是地球有多美。", highlight: null },
  { id: 37, section: 'answer', start: 3511, end: 3596, text: "是第一次，一眼看到了全部。", highlight: "全部" },
  { id: 38, section: 'answer', start: 3596, end: 3767, text: "退得够远，边界就不见了。", highlight: "边界", heavy: "金句" },
  { id: 39, section: 'return', start: 3767, end: 3853, text: "下一次你看地平线，", highlight: null },
  { id: 40, section: 'return', start: 3853, end: 3939, text: "它还是直的。", highlight: "直的" },
  { id: 41, section: 'return', start: 3939, end: 4024, text: "但你知道，它是圆的一小段，", highlight: null },
  { id: 42, section: 'return', start: 4024, end: 4195, text: "上面，站着所有人。", highlight: null },
];

export const CREDITS = {
  start: 4195,
  end: 4416,
  lines: [
    "出处",
    "Frank White, The Overview Effect, 1987",
    "NASA: Earthrise, Apollo 8, 1968-12-24；Bill Anders, JSC Oral History, 1997",
    "NASA/JPL: PIA00452 Pale Blue Dot, 1990-02-14",
    "William Shatner, Boldly Go, 2022（Variety 摘录）",
    "Keltner & Haidt, Cognition and Emotion, 2003",
    "Bai et al., JPSP, 2017",
    "Yaden et al., Psychology of Consciousness, 2016",
    "人数：Al Jazeera, 2026-10（卡门线口径）",
    "示意：大气厚度按 100 km 卡门线换算",
    "画面与音效均为代码绘制/合成 · 本片由 AI 辅助制作"
  ],
};

export const screen = (id: number): Screen => {
  const s = SCREENS.find((x) => x.id === id);
  if (!s) throw new Error(`没有第 ${id} 屏`);
  return s;
};
