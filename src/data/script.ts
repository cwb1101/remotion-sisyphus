/**
 * 字幕定稿 v1（全片唯一的文字与时间来源）
 *
 * - 画面、镜头、音效的时间全部从这里取：组件里只写「相对某一屏的偏移帧」
 * - 改字幕 / 改时长只改这个文件，其余部分会跟着移动
 * - text 里只用空格表示停顿，不能出现任何标点；highlights 里的词会显示为高光金
 * - 本文件不 import 任何东西，scripts/check-script.ts 也直接读取它
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** 左上角主题标注第一行：本期主题 */
export const TOPIC = '现状偏差 为什么痛苦却不改变';

export type Section = {
	id: string;
	index: number;
	/** 左上角第二行的小标题 */
	title: string;
	/** 小号英文注释 */
	titleEn: string;
	startFrame: number;
	endFrame: number;
};

export type Screen = {
	id: string;
	section: string;
	startFrame: number;
	endFrame: number;
	text: string;
	highlights: string[];
};

export const SECTIONS: Section[] = [
	{id: 's01', index: 1, title: '两道选择题', titleEn: 'TWO CHOICES', startFrame: 0, endFrame: 360},
	{id: 's02', index: 2, title: '现状偏差', titleEn: 'STATUS QUO BIAS', startFrame: 360, endFrame: 1188},
	{id: 's03', index: 3, title: '抱怨与维护', titleEn: 'COMPLAIN AND KEEP', startFrame: 1188, endFrame: 1464},
	{id: 's04', index: 4, title: '临界点', titleEn: 'THRESHOLD', startFrame: 1464, endFrame: 2040},
	{id: 's05', index: 5, title: '看不见的账单', titleEn: 'THE HIDDEN BILL', startFrame: 2040, endFrame: 2940},
	{id: 's06', index: 6, title: '忍耐的成本', titleEn: 'THE PRICE OF ENDURING', startFrame: 2940, endFrame: 3624},
	{id: 's07', index: 7, title: '重新计算', titleEn: 'RECALCULATE', startFrame: 3624, endFrame: 4500},
];

export const SCREENS: Screen[] = [
	// 01 两道选择题
	{id: 's01-01', section: 's01', startFrame: 0, endFrame: 78, text: '你以为你在选 痛苦还是改变', highlights: ['痛苦', '改变']},
	{id: 's01-02', section: 's01', startFrame: 78, endFrame: 156, text: '其实是 熟悉的痛 还是未知的路', highlights: ['熟悉的痛', '未知的路']},
	{id: 's01-03', section: 's01', startFrame: 156, endFrame: 228, text: '大多数人 会本能地选前者', highlights: []},
	{id: 's01-04', section: 's01', startFrame: 228, endFrame: 288, text: '哪怕它一直在疼', highlights: []},
	{id: 's01-05', section: 's01', startFrame: 288, endFrame: 360, text: '行为科学里 有个词专门说它', highlights: []},

	// 02 现状偏差（画面主标题「现状偏差」见 KEYWORDS）
	{id: 's02-01', section: 's02', startFrame: 360, endFrame: 480, text: '比起改变 人更愿意维持熟悉的状态', highlights: []},
	{id: 's02-02', section: 's02', startFrame: 480, endFrame: 552, text: '不是因为现在真的好', highlights: ['真的好']},
	{id: 's02-03', section: 's02', startFrame: 552, endFrame: 624, text: '而是因为它可以预测', highlights: ['可以预测']},
	{id: 's02-04', section: 's02', startFrame: 624, endFrame: 696, text: '一项轻微电击实验发现', highlights: []},
	{id: 's02-05', section: 's02', startFrame: 696, endFrame: 774, text: '一半概率被电时 压力最大', highlights: ['一半']},
	{id: 's02-06', section: 's02', startFrame: 774, endFrame: 852, text: '一定会被电 反而没那么紧张', highlights: []},
	{id: 's02-07', section: 's02', startFrame: 852, endFrame: 930, text: '不确定 比确定的痛更难熬', highlights: ['不确定']},
	{id: 's02-08', section: 's02', startFrame: 930, endFrame: 990, text: '这份工作让你痛苦', highlights: []},
	{id: 's02-09', section: 's02', startFrame: 990, endFrame: 1056, text: '可辞职以后呢 你不知道', highlights: []},
	{id: 's02-10', section: 's02', startFrame: 1056, endFrame: 1116, text: '这段关系在消耗你', highlights: []},
	{id: 's02-11', section: 's02', startFrame: 1116, endFrame: 1188, text: '可离开以后呢 你也不知道', highlights: []},

	// 03 抱怨与维护
	{id: 's03-01', section: 's03', startFrame: 1188, endFrame: 1254, text: '于是人一边抱怨现在', highlights: ['抱怨']},
	{id: 's03-02', section: 's03', startFrame: 1254, endFrame: 1314, text: '一边维护现在', highlights: ['维护']},
	{id: 's03-03', section: 's03', startFrame: 1314, endFrame: 1392, text: '熟悉的痛 只要稳定 还扛得住', highlights: []},
	{id: 's03-04', section: 's03', startFrame: 1392, endFrame: 1464, text: '就比未知 更让人安心', highlights: ['安心']},

	// 04 临界点（1920–1968 为无字幕的倒带）
	{id: 's04-01', section: 's04', startFrame: 1464, endFrame: 1530, text: '所以人生真正的转折', highlights: []},
	{id: 's04-02', section: 's04', startFrame: 1530, endFrame: 1602, text: '很少发生在刚不满的时候', highlights: []},
	{id: 's04-03', section: 's04', startFrame: 1602, endFrame: 1692, text: '而是在再也忍不下去的那一刻', highlights: ['再也忍不下去']},
	{id: 's04-04', section: 's04', startFrame: 1692, endFrame: 1770, text: '痛苦越过承受上限 改变才启动', highlights: ['承受上限']},
	{id: 's04-05', section: 's04', startFrame: 1770, endFrame: 1842, text: '那一刻 未来并没有变清晰', highlights: []},
	{id: 's04-06', section: 's04', startFrame: 1842, endFrame: 1920, text: '只是过去 再也过不下去了', highlights: ['再也过不下去了']},
	{id: 's04-07', section: 's04', startFrame: 1968, endFrame: 2040, text: '可是 非得等到这一刻吗', highlights: []},

	// 05 看不见的账单
	{id: 's05-01', section: 's05', startFrame: 2040, endFrame: 2112, text: '我们总以为 迟迟不改变', highlights: []},
	{id: 's05-02', section: 's05', startFrame: 2112, endFrame: 2184, text: '是因为懒 软弱 没有行动力', highlights: []},
	{id: 's05-03', section: 's05', startFrame: 2184, endFrame: 2262, text: '但更可能是 你没算另一笔账', highlights: []},
	{id: 's05-04', section: 's05', startFrame: 2262, endFrame: 2334, text: '不改变 也有成本', highlights: ['不改变 也有成本']},
	{id: 's05-05', section: 's05', startFrame: 2334, endFrame: 2406, text: '改变的代价 一眼就能看见', highlights: []},
	{id: 's05-06', section: 's05', startFrame: 2406, endFrame: 2478, text: '辞职 意味着失去稳定', highlights: ['稳定']},
	{id: 's05-07', section: 's05', startFrame: 2478, endFrame: 2550, text: '离开 意味着面对孤独', highlights: ['孤独']},
	{id: 's05-08', section: 's05', startFrame: 2550, endFrame: 2622, text: '留下的代价 却很难看见', highlights: []},
	{id: 's05-09', section: 's05', startFrame: 2622, endFrame: 2700, text: '几年以后 依然困在原地', highlights: ['困在原地']},
	{id: 's05-10', section: 's05', startFrame: 2700, endFrame: 2784, text: '一点点失去自尊 时间 和信任', highlights: ['自尊', '时间', '信任']},
	{id: 's05-11', section: 's05', startFrame: 2784, endFrame: 2862, text: '前者发生在今天 所以可怕', highlights: []},
	{id: 's05-12', section: 's05', startFrame: 2862, endFrame: 2940, text: '后者分散到以后 所以被忽略', highlights: []},

	// 06 忍耐的成本
	{id: 's06-01', section: 's06', startFrame: 2940, endFrame: 3012, text: '你能适应越来越窄的房间', highlights: []},
	{id: 's06-02', section: 's06', startFrame: 3012, endFrame: 3078, text: '适应越来越累的日子', highlights: []},
	{id: 's06-03', section: 's06', startFrame: 3078, endFrame: 3156, text: '适应一段不断消耗你的关系', highlights: []},
	{id: 's06-04', section: 's06', startFrame: 3156, endFrame: 3246, text: '最后把我还能忍 当成还没那么糟', highlights: ['我还能忍', '还没那么糟']},
	{id: 's06-05', section: 's06', startFrame: 3246, endFrame: 3318, text: '可忍耐 从来不是免费的', highlights: ['不是免费的']},
	{id: 's06-06', section: 's06', startFrame: 3318, endFrame: 3390, text: '今天没为改变付的成本', highlights: []},
	{id: 's06-07', section: 's06', startFrame: 3390, endFrame: 3468, text: '未来的你 会换一种方式付', highlights: ['未来的你']},
	{id: 's06-08', section: 's06', startFrame: 3468, endFrame: 3546, text: '所以 留下来也是一种选择', highlights: ['选择']},
	{id: 's06-09', section: 's06', startFrame: 3546, endFrame: 3624, text: '不改变 也在决定你会成为谁', highlights: []},

	// 07 重新计算（4392–4500 为无字幕片尾）
	{id: 's07-01', section: 's07', startFrame: 3624, endFrame: 3696, text: '改变不必等痛苦升高', highlights: ['痛苦升高']},
	{id: 's07-02', section: 's07', startFrame: 3696, endFrame: 3768, text: '也可以把门槛降下来', highlights: ['门槛降下来']},
	{id: 's07-03', section: 's07', startFrame: 3768, endFrame: 3846, text: '办法是 把留下的代价算清楚', highlights: ['算清楚']},
	{id: 's07-04', section: 's07', startFrame: 3846, endFrame: 3918, text: '改变也不必一刀两断', highlights: ['一刀两断']},
	{id: 's07-05', section: 's07', startFrame: 3918, endFrame: 3984, text: '可以只是 偏离一点点', highlights: []},
	{id: 's07-06', section: 's07', startFrame: 3984, endFrame: 4056, text: '再让它 慢慢长成新的路', highlights: []},
	{id: 's07-07', section: 's07', startFrame: 4056, endFrame: 4128, text: '成熟 不是越来越能忍', highlights: []},
	{id: 's07-08', section: 's07', startFrame: 4128, endFrame: 4242, text: '而是不再拿我还能忍 证明一种生活值得继续', highlights: ['我还能忍', '值得继续']},
	{id: 's07-09', section: 's07', startFrame: 4242, endFrame: 4338, text: '如果一切照旧 三年后的你会失去什么', highlights: ['三年后的你']},
	{id: 's07-10', section: 's07', startFrame: 4338, endFrame: 4392, text: '写在评论区', highlights: []},
];

/** 画面里砸下来的大字（不是字幕），挂在某一屏上 */
export const KEYWORDS: Record<string, string> = {
	's01-02': '熟悉的痛',
	's02-01': '现状偏差',
	's02-07': '不确定',
};

export const TOTAL_FRAMES = SECTIONS[SECTIONS.length - 1].endFrame;

/** 预览范围：开头 + 第一节 + 第二节到实验结束 */
export const PREVIEW_END_FRAME = 930;

/**
 * 画面内的其他文字（标签、HUD、注释）。集中放在这里，方便统一检查标点和预加载字体
 * 英文注释同样不用标点，用空格分隔
 */
export const LABELS = {
	pain: '痛苦',
	change: '改变',
	familiarPain: '熟悉的痛',
	unknownRoad: '未知的路',
	loop: 'LOOP',
	loopCn: '绕圈',
	statusQuoEn: 'STATUS QUO BIAS   SAMUELSON AND ZECKHAUSER   1988',
	statusQuoQuote: 'the familiar feels safer than the unknown',
	nowState: '现状',
	nowStateEn: 'CURRENT STATE',
	predictable: '可预测',
	predictableEn: 'PREDICTABLE',
	unknownEn: 'UNKNOWN',
	shockProb: '电击概率',
	shockProbEn: 'SHOCK PROBABILITY IN PERCENT',
	stress: '主观压力',
	stressEn: 'SUBJECTIVE STRESS',
	certainEn: 'CERTAIN',
	uncertainEn: 'UNCERTAIN',
	citation: 'DE BERKER ET AL   NAT COMMUN   2016   N 45',
	formulaStress: 'stress ∝ uncertainty',
	tick0: '0',
	tick50: '50',
	tick100: '100',
} as const;
