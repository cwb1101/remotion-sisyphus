// 字幕定稿: 全片唯一的时间来源. 改字幕只改这个文件, 画面 音效 卡点 人物动作都从这里和 beatmap.json 取
//
// startFrame / endFrame  这一屏的帧区间 (30fps, 必须落在 beatmap 的 bars 上)
// text                    屏幕上的字 (不含标点 不含【】), keyword 是要染金的重点词
// heavy                   重卡点类型, 必须落在 drop 或 accents 上
// shot                    镜头机位名 (src/data/shots.ts), 镜头从这一屏的起点小节开始移动 落在之后的底鼓上
// cast                    人物动作关键帧: who 谁, pose 动作名 (src/data/poses.ts), beat 从这一屏开头数第几拍 (可为小数)
//                         lower 下半身另用一个动作, facing 朝向 1 右 -1 左, lead 提前几帧起动作, speed 过渡快慢
// sfx                     音效: name 对应 public/sfx/<name>.wav, beat 同上, heavy 为重音效 (BGM 会让位)
// people / action / cue   给人看的分镜说明
import type {Expression, PoseName} from './poses';

export type Who = 'hero' | 'partner' | 'viewer' | 'crowdLeft' | 'crowdRight' | 'oldFriend' | 'buddy';
export type SectionId = 'hook' | 'evidence' | 'fusion' | 'you' | 'mechanism' | 'turn' | 'quote' | 'callback' | 'outro';
export type SfxName =
	| 'thunk' | 'pour' | 'drip' | 'creak' | 'slam' | 'cupTap' | 'step' | 'whoosh' | 'rattle' | 'chime' | 'clap' | 'glint'
	| 'pop' | 'buzz' | 'crack' | 'shatter' | 'tink' | 'thud' | 'shimmer';

export type CastCue = {
	who: Who;
	pose: PoseName;
	beat: number;
	lower?: PoseName;
	expr?: Expression;
	facing?: 1 | -1;
	lead?: number;
	speed?: 'soft' | 'normal' | 'snap';
};

export type SfxCue = {name: SfxName; beat: number; gain?: number; heavy?: boolean};

export type Screen = {
	id: number;
	section: SectionId;
	startFrame: number;
	endFrame: number;
	text: string;
	keyword?: string;
	heavy?: string;
	/** 重点词飞到左上角钉住, 一直留到第几屏开始 */
	pinUntil?: number;
	shot: string;
	note?: string;
	cast: CastCue[];
	sfx: SfxCue[];
	people: string;
	action: string;
	cue: string;
};

export const SCREENS: Screen[] = [
	{
		id: 1, section: 'hook', startFrame: 0, endFrame: 64,
		text: "",
		shot: "cupClose",
		cast: [{who: "hero", pose: "holdCup", beat: 0, lower: "sit", facing: 1}, {who: "partner", pose: "phone", beat: 0, lower: "sit", facing: -1}],
		sfx: [{name: "thunk", beat: 0}],
		people: "主角 双手特写 朱红围巾的末端垂进画面 把一只满杯放到桌上",
		action: "白瓷杯落桌 朱红液面晃一下 桌面尘埃被震起 镜头从杯口高度缓慢后拉",
		cue: "hit 全曲最强低频 第1帧",
	},
	{
		id: 2, section: 'hook', startFrame: 64, endFrame: 128,
		text: "把自己那一杯",
		shot: "tableMid",
		cast: [{who: "hero", pose: "pour", beat: 0, lower: "sit"}, {who: "partner", pose: "phone", beat: 0, lower: "sit"}],
		sfx: [{name: "pour", beat: 0.5, gain: 0.55}],
		people: "主角 中景 双手捧杯身体前倾 往对方杯里倒 对方坐在对面低头看手机",
		action: "一道朱红液柱从左杯流进右杯 液面一左一右此消彼长",
		cue: "",
	},
	{
		id: 3, section: 'hook', startFrame: 128, endFrame: 192,
		text: "全倒给了对方",
		shot: "tableMid",
		cast: [{who: "hero", pose: "pour", beat: 0, lower: "sit"}],
		sfx: [],
		people: "主角 中景 杯子越举越高 对方仍在看手机 没抬头",
		action: "主角的杯见底 对方的杯满到溢出 溢出的液体沿桌面流开",
		cue: "",
	},
	{
		id: 4, section: 'hook', startFrame: 192, endFrame: 255,
		text: "一滴都没留",
		shot: "dropClose",
		cast: [{who: "hero", pose: "pour", beat: 0, lower: "sit"}],
		sfx: [{name: "drip", beat: 3}],
		people: "主角 手腕特写 倒扣杯子抖了抖",
		action: "最后一滴朱红落进对方杯里 慢放",
		cue: "第4拍 水滴落在拍上",
	},
	{
		id: 5, section: 'hook', startFrame: 255, endFrame: 319,
		text: "可还是渴",
		shot: "heroHalf",
		cast: [{who: "hero", pose: "lookDown", beat: 0, lower: "sit", expr: "sad"}],
		sfx: [],
		people: "主角 半身近景 低头看空杯 喉咙动了一下 呼吸起伏明显",
		action: "画面变暗变冷 空杯内壁只剩一圈红痕",
		cue: "铺垫乐句起点 音乐变薄",
	},
	{
		id: 6, section: 'hook', startFrame: 319, endFrame: 383,
		text: "想再要一点",
		shot: "tableWide",
		cast: [{who: "hero", pose: "reach", beat: 0.5, lower: "sit"}, {who: "partner", pose: "leanBack", beat: 1, lower: "sit"}],
		sfx: [{name: "creak", beat: 1, gain: 0.6}],
		people: "主角 全景 举着空杯伸向对方 对方往椅背上一靠",
		action: "两人之间的距离被拉开 桌面溢出的液体反光",
		cue: "",
	},
	{
		id: 7, section: 'hook', startFrame: 383, endFrame: 446,
		text: "凑去喝对方的",
		shot: "leanMid",
		cast: [{who: "hero", pose: "lean", beat: 0, lower: "sit"}, {who: "partner", pose: "leanBack", beat: 0.5, lower: "sit", expr: "tense"}],
		sfx: [],
		people: "主角 中景 探身凑向对方的杯 对方肩膀往后缩",
		action: "主角的影子盖住对方的杯口",
		cue: "",
	},
	{
		id: 8, section: 'hook', startFrame: 446, endFrame: 510,
		text: "为什么",
		shot: "leanMid",
		cast: [],
		sfx: [],
		people: "主角 停在探身的姿势 只有呼吸和围巾尾巴在动 对方侧脸",
		action: "吸气停拍 画面近乎定格 2.1 秒 尘埃慢慢飘 字逐个由虚变实",
		cue: "吸气停拍 低频抽空",
	},
	{
		id: 9, section: 'hook', startFrame: 510, endFrame: 637,
		text: "倒得越多 越渴", keyword: "渴", heavy: "主线问题", pinUntil: 43,
		shot: "hookWide",
		cast: [{who: "hero", pose: "lookUp", beat: 0, lower: "sit", expr: "surprised", lead: 4, speed: "snap"}, {who: "partner", pose: "stand", beat: 2, facing: -1}, {who: "partner", pose: "turn", beat: 3}, {who: "partner", pose: "walk", beat: 4}, {who: "hero", pose: "stand", beat: 4, expr: "sad"}, {who: "hero", pose: "walk", beat: 5}],
		sfx: [{name: "slam", beat: 0, heavy: true}, {name: "whoosh", beat: 0, gain: 0.45}, {name: "creak", beat: 2, gain: 0.5}, {name: "creak", beat: 4, gain: 0.5}],
		people: "主角 猛抬头 手里攥着空杯 对方定在原处",
		action: "字从上方砸进字幕行 渴 放大染金 弹到画面左上角并停留 尘埃被震开 镜头一下拉到全景",
		cue: "drop1 重卡点",
	},
	{
		id: 10, section: 'evidence', startFrame: 637, endFrame: 764,
		text: "把所有需要 都交给一个人",
		shot: "stage",
		cast: [{who: "partner", pose: "stand", beat: 2, facing: -1}, {who: "partner", pose: "carry", beat: 3}, {who: "hero", pose: "offer", beat: 3}, {who: "hero", pose: "offer", beat: 3, lead: 3}, {who: "hero", pose: "holdCup", beat: 3.5}, {who: "hero", pose: "offer", beat: 4, lead: 3}, {who: "hero", pose: "holdCup", beat: 4.5}, {who: "hero", pose: "offer", beat: 5, lead: 3}, {who: "hero", pose: "holdCup", beat: 5.5}, {who: "hero", pose: "offer", beat: 6, lead: 3}, {who: "hero", pose: "holdCup", beat: 6.5}, {who: "hero", pose: "offer", beat: 7, lead: 3}, {who: "hero", pose: "holdCup", beat: 7.5}],
		sfx: [{name: "glint", beat: 3, gain: 0.3}, {name: "glint", beat: 4, gain: 0.3}, {name: "glint", beat: 5, gain: 0.3}, {name: "glint", beat: 6, gain: 0.3}, {name: "glint", beat: 7, gain: 0.3}, {name: "cupTap", beat: 3.4, gain: 0.55}, {name: "cupTap", beat: 4.4, gain: 0.55}, {name: "cupTap", beat: 5.4, gain: 0.55}, {name: "cupTap", beat: 6.4, gain: 0.55}, {name: "cupTap", beat: 7.4, gain: 0.55}],
		people: "主角 全景 一只接一只把杯子递给对方 对方双手接住往怀里摞",
		action: "杯身上依次浮出附着标签 陪伴 倾听 安全感 成长 意义 杯子越摞越高",
		cue: "每拍递一只杯",
	},
	{
		id: 11, section: 'evidence', startFrame: 764, endFrame: 892,
		text: "这段关系会喘不过气",
		shot: "stackPush", note: "婚姻窒息模型 理论 示意",
		cast: [{who: "hero", pose: "offer", beat: 0, lead: 3}, {who: "hero", pose: "holdCup", beat: 0.5}, {who: "hero", pose: "offer", beat: 1, lead: 3}, {who: "hero", pose: "holdCup", beat: 1.5}, {who: "hero", pose: "offer", beat: 2, lead: 3}, {who: "hero", pose: "holdCup", beat: 2.5}, {who: "partner", pose: "stagger", beat: 2, expr: "tense"}, {who: "hero", pose: "reach", beat: 4, expr: "sad"}, {who: "hero", pose: "stand", beat: 6}],
		sfx: [{name: "glint", beat: 0, gain: 0.3}, {name: "glint", beat: 1, gain: 0.3}, {name: "glint", beat: 2, gain: 0.3}, {name: "cupTap", beat: 0.4, gain: 0.6}, {name: "cupTap", beat: 1.4, gain: 0.6}, {name: "cupTap", beat: 2.4, gain: 0.6}, {name: "rattle", beat: 3, gain: 0.6}],
		people: "对方 全景 抱着一人高的杯塔 膝盖弯下 脚步打晃 主角在旁边伸手又缩回",
		action: "杯塔左右摇 画面边缘慢慢压暗 注释 婚姻窒息模型 理论 示意",
		cue: "主段A 乐句起点",
	},
	{
		id: 12, section: 'evidence', startFrame: 892, endFrame: 1019,
		text: "不同的情绪 交给不同的人",
		shot: "crowdWide",
		cast: [{who: "crowdLeft", pose: "offer", beat: 0}, {who: "crowdRight", pose: "pass", beat: 0}, {who: "hero", pose: "walk", beat: 1}, {who: "hero", pose: "stand", beat: 5}],
		sfx: [{name: "cupTap", beat: 1, gain: 0.3}, {name: "cupTap", beat: 2, gain: 0.3}, {name: "cupTap", beat: 3, gain: 0.3}, {name: "cupTap", beat: 5, gain: 0.3}, {name: "cupTap", beat: 6, gain: 0.3}, {name: "cupTap", beat: 7, gain: 0.3}],
		people: "群像 远景 14 个小人 身高衣色姿态各不相同 左边 4 对两人组 每对里一人只把杯递给另一人 右边 6 人在彼此之间传杯 主角离开对方 走到人群边上看着",
		action: "右边 6 人的杯子在人群间流动 左边 4 只杯子只在两人之间来回 主角站在人群边缘看着",
		cue: "",
	},
	{
		id: 13, section: 'evidence', startFrame: 1019, endFrame: 1146,
		text: "这样的人 幸福感更高",
		shot: "crowdWide2", note: "Cheung 等 2015 相关研究",
		cast: [{who: "crowdRight", pose: "highFive", beat: 0, expr: "smile", lead: 4, speed: "snap"}, {who: "crowdLeft", pose: "slump", beat: 0, expr: "sad"}, {who: "hero", pose: "lookDown", beat: 2, expr: "sad"}],
		sfx: [{name: "clap", beat: 0, gain: 0.8}, {name: "chime", beat: 0, gain: 0.5}],
		people: "群像 右边 6 人抬头挺胸 有人笑着击掌 左边 4 个递杯的人肩膀下垂 主角回头看自己手里的空杯",
		action: "右边 6 人身上的金色轮廓光变亮 注释 Cheung 等 2015 相关研究",
		cue: "主段A 乐句起点",
	},
	{
		id: 14, section: 'fusion', startFrame: 1146, endFrame: 1209,
		text: "爱到最浓的时候",
		shot: "fusionTwo",
		cast: [{who: "hero", pose: "turn", beat: 0, expr: "calm"}, {who: "hero", pose: "holdCup", beat: 1}, {who: "partner", pose: "turn", beat: 0}, {who: "partner", pose: "holdCup", beat: 1, expr: "calm"}],
		sfx: [{name: "whoosh", beat: 0, gain: 0.35}, {name: "glint", beat: 1, gain: 0.3}],
		people: "主角 和 对方 中景 主角转回身面对对方 对方放下杯塔转过来 两人各捧一只杯 主角朱红 对方金色",
		action: "两只杯慢慢互相倾斜",
		cue: "乐句第3小节 偏轻 读字",
	},
	{
		id: 15, section: 'fusion', startFrame: 1209, endFrame: 1273,
		text: "两杯会倒成一杯",
		shot: "fusionBridge",
		cast: [{who: "hero", pose: "lean", beat: 0}, {who: "partner", pose: "holdCup", beat: 0}],
		sfx: [{name: "pour", beat: 0, gain: 0.45}],
		people: "主角 探身 杯子往对方那边倾 对方的杯也倾过来",
		action: "朱红和金色两股液体在半空搭成一座桥 开始合流",
		cue: "",
	},
	{
		id: 16, section: 'fusion', startFrame: 1273, endFrame: 1401,
		text: "心理学叫它融合", keyword: "融合", heavy: "主题词", pinUntil: 19,
		shot: "fusionFall", note: "鲍文家庭系统理论",
		cast: [{who: "hero", pose: "kneel", beat: 0, lead: 4, speed: "snap", expr: "surprised"}, {who: "partner", pose: "leanBack", beat: 0, lead: 4, speed: "snap", expr: "surprised"}, {who: "hero", pose: "holdCup", beat: 2, lower: "kneel", expr: "sad"}, {who: "partner", pose: "holdCup", beat: 3, expr: "neutral"}],
		sfx: [{name: "slam", beat: 0, heavy: true}, {name: "thud", beat: 0, gain: 0.6}],
		people: "主角 被合流的液体拽得往前一扑 跪倒在地 对方被溅得往后一仰",
		action: "两股液体合成一股浑浊的暗橙色 全屏颜色一下变浊 融合 二字放大落在画面左上 注释 鲍文家庭系统理论",
		cue: "主段A 乐句起点 重卡点",
	},
	{
		id: 17, section: 'fusion', startFrame: 1401, endFrame: 1464,
		text: "对方一皱眉 你就慌",
		shot: "fusionFaces",
		cast: [{who: "partner", pose: "lookDown", beat: 0, expr: "tense"}, {who: "hero", pose: "holdHead", beat: 0, lower: "kneel", expr: "tense", lead: 2}],
		sfx: [{name: "thud", beat: 0, gain: 0.45}],
		people: "对方 低头皱眉 肩膀一紧 主角 立刻抱头 杯里的浊液剧烈晃动",
		action: "对方的动作一出 主角在同一拍跟着抖",
		cue: "同一拍联动",
	},
	{
		id: 18, section: 'fusion', startFrame: 1464, endFrame: 1528,
		text: "分不清是谁的情绪",
		shot: "fusionOverlap",
		cast: [{who: "hero", pose: "stand", beat: 0, expr: "sad"}, {who: "hero", pose: "walk", beat: 1}, {who: "hero", pose: "holdCup", beat: 3}, {who: "partner", pose: "holdCup", beat: 0, expr: "tense"}],
		sfx: [],
		people: "主角 站起来 往对方身上靠过去 两个剪影慢慢重叠 只剩朱红围巾分得出谁是主角",
		action: "两人的金色轮廓线融成一条",
		cue: "",
	},
	{
		id: 19, section: 'you', startFrame: 1528, endFrame: 1591,
		text: "夜里 你发了条消息",
		shot: "bedWide",
		cast: [{who: "viewer", pose: "type", beat: 0, lower: "lieSide", expr: "calm"}],
		sfx: [{name: "pop", beat: 1, gain: 0.55}],
		people: "观众替身 卧室全景 穿连帽衫平躺在床上 举着手机按下发送",
		action: "房间全黑 只有手机光照亮半张脸 床头柜上放着一只杯",
		cue: "低谷 第1下心跳 第1次看手机",
	},
	{
		id: 20, section: 'you', startFrame: 1591, endFrame: 1655,
		text: "对方还没回",
		shot: "bedClose",
		cast: [{who: "viewer", pose: "phone", beat: 0, lower: "lieSide"}],
		sfx: [{name: "tink", beat: 0, gain: 0.4}],
		people: "观众替身 近景 把手机放回胸口 心跳那一拍又抬起来看一眼",
		action: "手机光一亮一灭 墙上出现第2道计数刻痕",
		cue: "第2下心跳 第2次",
	},
	{
		id: 21, section: 'you', startFrame: 1655, endFrame: 1782,
		text: "你又看了一眼 再一眼",
		shot: "phoneClose",
		cast: [{who: "viewer", pose: "phone", beat: 0, lower: "lieSide", expr: "sad"}],
		sfx: [{name: "tink", beat: 0, gain: 0.4}, {name: "tink", beat: 4, gain: 0.4}],
		people: "观众替身 手部特写 每下心跳拿起手机又放下",
		action: "墙上刻痕变成 3 道 4 道 床头杯里的液面跟着一点点下降",
		cue: "第3 4下心跳 第3 4次",
	},
	{
		id: 22, section: 'you', startFrame: 1782, endFrame: 1909,
		text: "脑子里已经演完一整部剧",
		shot: "bedSit",
		cast: [{who: "viewer", pose: "holdHead", beat: 0.75, lower: "sit", expr: "tense"}],
		sfx: [{name: "tink", beat: 0, gain: 0.4}, {name: "tink", beat: 4, gain: 0.4}],
		people: "观众替身 坐到床沿抱着头 墙上的影子里演着一个小人转身走远",
		action: "影子戏一拍一个动作 刻痕变成 5 道 6 道",
		cue: "第5 6下心跳 第5 6次",
	},
	{
		id: 23, section: 'you', startFrame: 1909, endFrame: 1973,
		text: "你看了七次手机",
		shot: "tallyWall",
		cast: [{who: "viewer", pose: "phone", beat: 0, lower: "sit", expr: "sad"}],
		sfx: [{name: "tink", beat: 0, gain: 0.45}],
		people: "观众替身 近景 第7次拿起手机 叹气",
		action: "镜头扫过墙面 7 道刻痕清清楚楚",
		cue: "第7下心跳 第7次",
	},
	{
		id: 24, section: 'you', startFrame: 1973, endFrame: 2037,
		text: "终于 亮了",
		shot: "faceClose",
		cast: [{who: "viewer", pose: "phone", beat: 0, lower: "lieSide", expr: "tense"}],
		sfx: [],
		people: "观众替身 脸部特写 又躺回去 屏住呼吸盯着手机 只有眨眼",
		action: "低频抽空 画面近乎定格 2.1 秒 手机光慢慢变亮",
		cue: "抽空小节 憋气",
	},
	{
		id: 25, section: 'you', startFrame: 2037, endFrame: 2100,
		text: "是一条广告",
		shot: "bedMid",
		cast: [{who: "viewer", pose: "phone", beat: 0, lower: "sitUp", expr: "surprised", lead: 3, speed: "snap"}, {who: "viewer", pose: "slump", beat: 2, lower: "lieSide", expr: "sad"}],
		sfx: [{name: "buzz", beat: 0, gain: 0.9}, {name: "thud", beat: 2, gain: 0.4}],
		people: "观众替身 一下坐起来看屏幕 随后肩膀垮下 倒回枕头",
		action: "手机震动 屏幕上只有一块亮色广告条 床头杯的液面见底",
		cue: "hit 67.9 秒 中等动作",
	},
	{
		id: 26, section: 'mechanism', startFrame: 2100, endFrame: 2228,
		text: "于是你去要一句确认",
		shot: "mechTwo",
		cast: [{who: "hero", pose: "type", beat: 0, lower: "sit", expr: "calm", facing: 1}, {who: "partner", pose: "phone", beat: 0, lower: "sit", facing: -1}, {who: "partner", pose: "type", beat: 3, lower: "sit"}],
		sfx: [{name: "pop", beat: 1, gain: 0.5}, {name: "pop", beat: 4, gain: 0.7}],
		people: "主角 中景 坐着用手机打字 对方坐在画面另一侧回了一个字",
		action: "主角手机上浮出气泡 你还爱我吗 对方回 爱 回复在 72.1 秒次重音上弹出 主角的杯液面涨了一截",
		cue: "72.1 秒 次重音",
	},
	{
		id: 27, section: 'mechanism', startFrame: 2228, endFrame: 2291,
		text: "安心 只撑了一会儿",
		shot: "mechCup", note: "过度寻求确认 示意",
		cast: [{who: "hero", pose: "lookDown", beat: 0, lower: "sit", expr: "sad"}, {who: "partner", pose: "phone", beat: 0, lower: "sit"}],
		sfx: [{name: "drip", beat: 1, gain: 0.4}, {name: "drip", beat: 2, gain: 0.4}, {name: "drip", beat: 3, gain: 0.45}],
		people: "主角 半身 刚松一口气 低头又看见杯子在漏",
		action: "液面很快跌回去 杯旁画出一条液面高度曲线 涨一下跌一下 注释 过度寻求确认 示意",
		cue: "",
	},
	{
		id: 28, section: 'mechanism', startFrame: 2291, endFrame: 2355,
		text: "下一次 问得更勤",
		shot: "mechTwo2",
		cast: [{who: "hero", pose: "type", beat: 0, lower: "sit", expr: "tense"}, {who: "partner", pose: "phone", beat: 0, lower: "sit"}],
		sfx: [{name: "pop", beat: 0, gain: 0.4}, {name: "pop", beat: 1, gain: 0.4}, {name: "pop", beat: 2, gain: 0.45}, {name: "pop", beat: 3, gain: 0.45}],
		people: "主角 手指打字越来越快 对方低头看消息",
		action: "曲线的锯齿越来越密 每一次涨起的时间越来越短",
		cue: "蓄力乐句起点",
	},
	{
		id: 29, section: 'mechanism', startFrame: 2355, endFrame: 2419,
		text: "对方也会累",
		shot: "partnerTired",
		cast: [{who: "partner", pose: "leanBack", beat: 0, lower: "sit", expr: "tense"}, {who: "hero", pose: "type", beat: 0, lower: "sit", expr: "tense"}],
		sfx: [{name: "creak", beat: 0, gain: 0.5}],
		people: "对方 中景 揉着眉心往后靠 手机屏幕朝下扣在桌上",
		action: "对方的金色轮廓光暗下去一半",
		cue: "",
	},
	{
		id: 30, section: 'mechanism', startFrame: 2419, endFrame: 2482,
		text: "你越追 对方越退",
		shot: "chase", note: "要求退缩模式 示意",
		cast: [{who: "hero", pose: "walk", beat: 0, expr: "tense"}, {who: "partner", pose: "walkBack", beat: 0, expr: "tense"}],
		sfx: [],
		people: "主角 全景 每拍往前一步 对方同一拍往后退一步",
		action: "两人之间始终隔着同样的距离 地面上留下一串脚印 注释 要求退缩模式 示意",
		cue: "脚步卡每一拍",
	},
	{
		id: 31, section: 'mechanism', startFrame: 2482, endFrame: 2546,
		text: "杯子先撑不住了",
		shot: "dropClose2",
		cast: [{who: "hero", pose: "stand", beat: 0, expr: "surprised"}, {who: "partner", pose: "stand", beat: 0}],
		sfx: [{name: "crack", beat: 0, gain: 0.75}],
		people: "主角 手部特写 手一松",
		action: "杯身裂纹蔓延 杯子从手里滑落 慢放下坠 全曲最空的一小节",
		cue: "停拍 松手",
	},
	{
		id: 32, section: 'turn', startFrame: 2546, endFrame: 2609,
		text: "碎了", heavy: "核心转折",
		shot: "shatterWide",
		cast: [{who: "hero", pose: "fall", beat: 0, lead: 4, speed: "snap", expr: "surprised"}],
		sfx: [{name: "slam", beat: 0, heavy: true}, {name: "shatter", beat: 0, gain: 0.9}, {name: "thud", beat: 0, gain: 0.5}],
		people: "主角 往后跌坐在地 双手撑地",
		action: "杯子落地炸开 碎片四散 慢放 画面整体暗一下再亮回",
		cue: "主 drop 重卡点",
	},
	{
		id: 33, section: 'turn', startFrame: 2609, endFrame: 2673,
		text: "也能一片片捡起来",
		shot: "shardsClose",
		cast: [{who: "hero", pose: "kneel", beat: 0, expr: "sad"}, {who: "hero", pose: "reach", beat: 0, lower: "kneel", lead: 3}, {who: "hero", pose: "holdCup", beat: 0.5, lower: "kneel"}, {who: "hero", pose: "reach", beat: 1, lower: "kneel", lead: 3}, {who: "hero", pose: "holdCup", beat: 1.5, lower: "kneel"}, {who: "hero", pose: "reach", beat: 2, lower: "kneel", lead: 3}, {who: "hero", pose: "holdCup", beat: 2.5, lower: "kneel"}, {who: "hero", pose: "reach", beat: 3, lower: "kneel", lead: 3}, {who: "hero", pose: "holdCup", beat: 3.5, lower: "kneel"}],
		sfx: [{name: "tink", beat: 0, gain: 0.5}, {name: "tink", beat: 1, gain: 0.5}, {name: "tink", beat: 2, gain: 0.5}, {name: "tink", beat: 3, gain: 0.5}],
		people: "主角 跪坐 手部特写 一片一片捡起碎片",
		action: "每拍捡起一片 碎片边缘闪一点金光",
		cue: "捡碎片卡每一拍",
	},
	{
		id: 34, section: 'turn', startFrame: 2673, endFrame: 2800,
		text: "拼回来的杯子 有了金色的缝",
		shot: "kintsugi",
		cast: [{who: "hero", pose: "holdCup", beat: 0, lower: "kneel", expr: "calm"}],
		sfx: [{name: "shimmer", beat: 0, gain: 0.5}, {name: "shimmer", beat: 4, gain: 0.4}],
		people: "主角 中景 双手捧着碎片拼合 低头专注",
		action: "金色的线一条条描过裂缝 金缮 杯子重新完整",
		cue: "",
	},
	{
		id: 35, section: 'turn', startFrame: 2800, endFrame: 2928,
		text: "依赖本身没有错", keyword: "依赖", heavy: "核心反转",
		shot: "riseUp",
		cast: [{who: "hero", pose: "raiseHand", beat: 0, lead: 6, speed: "snap", expr: "smile"}],
		sfx: [{name: "slam", beat: 0, heavy: true}, {name: "chime", beat: 0, gain: 0.55}],
		people: "主角 站起来 把金缮杯高高举起",
		action: "杯上的金缝迎光一亮 光往四周铺开 依赖 二字染金",
		cue: "高潮一 乐句起点 重卡点",
	},
	{
		id: 36, section: 'turn', startFrame: 2928, endFrame: 3055,
		text: "被稳稳接住的依赖",
		shot: "handsClose",
		cast: [{who: "hero", pose: "holdCup", beat: 0, expr: "calm"}, {who: "partner", pose: "walk", beat: 0, facing: -1}, {who: "partner", pose: "offer", beat: 3, expr: "calm"}],
		sfx: [{name: "cupTap", beat: 2, gain: 0.5}],
		people: "对方 走过来 双手稳稳托住主角的杯底 主角的手放松",
		action: "杯子不再晃 液面平静",
		cue: "",
	},
	{
		id: 37, section: 'turn', startFrame: 3055, endFrame: 3182,
		text: "反而让人更敢 独自出发",
		shot: "farWide", note: "Feeney 2007 依赖悖论",
		cast: [{who: "hero", pose: "turn", beat: 0}, {who: "hero", pose: "walk", beat: 1}, {who: "hero", pose: "run", beat: 5}, {who: "partner", pose: "stand", beat: 0, expr: "calm"}],
		sfx: [{name: "whoosh", beat: 5, gain: 0.3}],
		people: "主角 远景 转身独自往画面深处走 越走越快变成小跑 对方留在原地目送",
		action: "人很小 地平线很宽 朱红围巾仍然认得出 注释 Feeney 2007 依赖悖论",
		cue: "高潮一 乐句起点",
	},
	{
		id: 38, section: 'turn', startFrame: 3182, endFrame: 3310,
		text: "问题只在于 水源只有一个",
		shot: "oneSource",
		cast: [{who: "hero", pose: "run", beat: 0, facing: 1}, {who: "hero", pose: "holdCup", beat: 3, expr: "calm"}, {who: "partner", pose: "pour", beat: 3, expr: "calm"}, {who: "oldFriend", pose: "walk", beat: 4, facing: 1}],
		sfx: [{name: "pour", beat: 3, gain: 0.4}],
		people: "主角 跑回来 中景 举着杯子 只有对方手里的壶在往里倒",
		action: "一道细细的金色水流 杯子只满到一半",
		cue: "",
	},
	{
		id: 39, section: 'turn', startFrame: 3310, endFrame: 3373,
		text: "难过 找老朋友",
		shot: "friend1",
		cast: [{who: "oldFriend", pose: "hug", beat: 0, lead: 3, expr: "smile"}, {who: "hero", pose: "hug", beat: 0, lead: 3, facing: -1, expr: "sad"}, {who: "partner", pose: "walkBack", beat: 1}, {who: "partner", pose: "stand", beat: 3}, {who: "buddy", pose: "walk", beat: 0, facing: -1}, {who: "oldFriend", pose: "holdCup", beat: 2, expr: "smile"}, {who: "hero", pose: "holdCup", beat: 2, expr: "calm"}],
		sfx: [{name: "pour", beat: 1.5, gain: 0.35}],
		people: "老朋友 走进画面拥抱主角 往主角杯里倒了一点 对方往后让开",
		action: "杯里多了一股新的颜色 液面上升",
		cue: "高潮一 乐句起点",
	},
	{
		id: 40, section: 'turn', startFrame: 3373, endFrame: 3437,
		text: "高兴 找搭子",
		shot: "friend2",
		cast: [{who: "buddy", pose: "highFive", beat: 0, lead: 4, speed: "snap", expr: "smile"}, {who: "hero", pose: "highFive", beat: 0, lead: 4, speed: "snap", facing: 1, expr: "smile"}, {who: "buddy", pose: "holdCup", beat: 2, expr: "smile"}, {who: "hero", pose: "holdCup", beat: 2, expr: "smile"}],
		sfx: [{name: "clap", beat: 0, gain: 0.85}, {name: "pour", beat: 2, gain: 0.35}],
		people: "搭子 从另一边走来和主角击掌 再倒一点",
		action: "击掌在拍上 液面再升一截",
		cue: "击掌卡第1拍",
	},
	{
		id: 41, section: 'turn', startFrame: 3437, endFrame: 3564,
		text: "等回复的时候 先给自己倒一杯",
		shot: "bedSelf",
		cast: [{who: "hero", pose: "pour", beat: 0, lower: "sit", expr: "calm"}, {who: "hero", pose: "lookDown", beat: 4, lower: "sit", expr: "calm"}],
		sfx: [{name: "pour", beat: 0.5, gain: 0.45}, {name: "glint", beat: 4, gain: 0.3}],
		people: "主角 坐在床边 手机扣在床头柜上 自己提壶给自己倒到七分满",
		action: "液面到七分满 停住 远处老朋友和搭子各自忙着 也拿着杯",
		cue: "",
	},
	{
		id: 42, section: 'quote', startFrame: 3564, endFrame: 3627,
		text: "倒空自己的爱", heavy: "金句",
		shot: "quoteClose",
		cast: [{who: "hero", pose: "turn", beat: 0, lead: 4, speed: "snap", expr: "calm"}],
		sfx: [{name: "slam", beat: 0, heavy: true}, {name: "whoosh", beat: 0, gain: 0.3}],
		people: "主角 起身 转身 捧着七分满的金缮杯看向镜头",
		action: "字砸进字幕行 背后的尘埃被震成一圈光环",
		cue: "高潮二 乐句起点 重卡点",
	},
	{
		id: 43, section: 'quote', startFrame: 3627, endFrame: 3691,
		text: "不叫浓 叫渴", keyword: "渴",
		shot: "quoteClose2",
		cast: [{who: "hero", pose: "holdCup", beat: 0, expr: "calm"}],
		sfx: [],
		people: "主角 看着镜头 呼吸 眨眼 围巾随风摆",
		action: "开头那个金色的 渴 字从左上角落下来 变回字幕",
		cue: "",
	},
	{
		id: 44, section: 'quote', startFrame: 3691, endFrame: 3818,
		text: "两杯都满着 才碰得了杯",
		shot: "walkHome",
		cast: [{who: "hero", pose: "walk", beat: 0, facing: 1, expr: "smile"}, {who: "hero", pose: "holdCup", beat: 6, expr: "smile"}, {who: "partner", pose: "holdCup", beat: 0, facing: -1, expr: "smile"}],
		sfx: [],
		people: "主角 走出卧室回到开头那间屋子 对方站在桌边 两人各捧一只七分满的杯 面对面",
		action: "两只杯慢慢靠近 停在快要相碰的位置",
		cue: "",
	},
	{
		id: 45, section: 'callback', startFrame: 3818, endFrame: 3882,
		text: "",
		shot: "cupClose",
		cast: [{who: "hero", pose: "holdCup", beat: 0, lower: "sit", facing: 1, expr: "calm"}, {who: "partner", pose: "phone", beat: 0, lower: "sit", facing: -1, expr: "neutral"}],
		sfx: [{name: "thunk", beat: 1}],
		people: "主角 双手特写 和开头同一个机位 把金缮杯放到桌上 对方坐回对面",
		action: "回扣开头 杯落桌 液面只是轻轻一晃 没有溢出",
		cue: "尾段 乐句起点",
	},
	{
		id: 46, section: 'callback', startFrame: 3882, endFrame: 4009,
		text: "为什么 倒得越多 越渴",
		shot: "tableMidAgain",
		cast: [{who: "partner", pose: "lookUp", beat: 0, lower: "sit", expr: "calm"}, {who: "hero", pose: "holdCup", beat: 2, lower: "sit"}],
		sfx: [{name: "creak", beat: 0, gain: 0.35}],
		people: "主角 和 对方 中景 和开头同一个构图 这次对方放下手机 抬头看着主角",
		action: "主角提起杯 停在倾倒前的那一下 没有倒",
		cue: "",
	},
	{
		id: 47, section: 'callback', startFrame: 4009, endFrame: 4137,
		text: "因为倒空了自己 又只剩一个水源",
		shot: "tableWarm",
		cast: [{who: "hero", pose: "lookDown", beat: 0, lower: "sit", expr: "smile"}, {who: "partner", pose: "holdCup", beat: 0, lower: "sit", expr: "smile"}],
		sfx: [{name: "chime", beat: 0, gain: 0.3}],
		people: "主角 把杯收回自己面前 看着七分满的液面 轻轻笑了",
		action: "桌上同时出现老朋友和搭子留下的两只杯 光从几个方向照过来",
		cue: "",
	},
	{
		id: 48, section: 'callback', startFrame: 4137, endFrame: 4208,
		text: "这一次 碰杯",
		shot: "clinkClose",
		cast: [{who: "hero", pose: "offer", beat: 0, lower: "sit", lead: 6, expr: "smile"}, {who: "partner", pose: "offer", beat: 0, lower: "sit", lead: 6, expr: "smile"}],
		sfx: [{name: "cupTap", beat: 0, gain: 1}, {name: "chime", beat: 0, gain: 0.45}],
		people: "主角 和 对方 一起举杯 碰杯 两人都笑",
		action: "两只杯都没有溢出 金缝和朱红液面一起闪一下",
		cue: "碰杯卡第1拍",
	},
	{
		id: 49, section: 'outro', startFrame: 4208, endFrame: 4321,
		text: "",
		shot: "outroFar",
		cast: [{who: "hero", pose: "stand", beat: 0, expr: "smile"}, {who: "hero", pose: "walk", beat: 1, facing: 1}, {who: "partner", pose: "stand", beat: 0, expr: "smile"}, {who: "partner", pose: "walk", beat: 1, facing: 1}],
		sfx: [{name: "whoosh", beat: 1, gain: 0.3}],
		people: "主角 和 对方 远景 一起起身 并肩走出屋子 人很小 朱红围巾还认得出",
		action: "片名 爱的浓度 淡入 下方注释滚出出处 和 科普内容 不构成心理诊断 音乐收尾",
		cue: "收尾",
	},
];

export const CREDITS: string[] = [
	"Finkel Hui Carswell Larson 2014 Psychological Inquiry 婚姻窒息模型",
	"Cheung Gardner Anderson 2015 Social Psychological and Personality Science",
	"Kerr Bowen 1988 Family Evaluation 家庭系统理论",
	"Osborne Williams 2013 Advances in Psychiatric Treatment 过度寻求确认",
	"Coyne 1976 Joiner 等 1999 Psychological Inquiry",
	"Christensen Heavey 1990 Journal of Personality and Social Psychology",
	"Feeney 2007 Journal of Personality and Social Psychology 依赖悖论"
];

export const UNCERTAIN = [
	{
		"id": 11,
		"before": "这段关系会喘不过气",
		"why": "Finkel 2014 是理论模型 讲的是美国婚姻 不是实验结论 套到恋爱上是引申",
		"check": "核对原文摘要 模型核心是 对婚姻提出的高层需求超过投入时会 缺氧 作者给的出路之一是 少要求婚姻满足所有高层需求",
		"after": "保留原句 画面注释写 婚姻窒息模型 理论 示意 字幕不出现 研究证明"
	},
	{
		"id": 13,
		"before": "这样的人 幸福感更高",
		"why": "担心把相关结论说成因果 以及对照条件说错",
		"check": "Cheung Gardner Anderson 2015 研究 2a 2b 把情绪需求分散给多段各有专长关系的人 比亲密关系数量相近 但集中在少数关系上的人 幸福感更高 是相关研究",
		"after": "保留原句 字幕只说 更高 不说 让你更幸福 注释写 相关研究 期刊页码未核到 片尾只写年份和期刊"
	},
	{
		"id": 27,
		"before": "安心 只撑了一会儿",
		"why": "这条机制最早来自焦虑和强迫相关的临床文献 不是恋爱研究",
		"check": "Osborne Williams 2013 临床综述原话 寻求确认能很快降低焦虑 带来即时缓解 但缓解不持久 寻求确认会再回来 Coyne 和 Joiner 的人际模型补充了 对方会被反复确认弄累",
		"after": "保留原句 注释写 过度寻求确认 示意 下一句 对方也会累 有 Coyne 1976 Joiner 等 1999 支撑"
	}
];
