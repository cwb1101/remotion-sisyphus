// 字幕定稿 + 各节变奏 + 音效 + 人物动作。全片唯一的时间来源（另一个是 rhythm.json）。
// 改字幕 改动作 改音效都只改这个文件；docs/subtitles.md 由 `npm run subtitles` 从这里生成。
//
// 约定：
// - 每屏用小节定起止（startBar 从 1 数，bars = 占几小节），开始帧 结束帧由 rhythm.json 算出
// - 字幕行里用【】标重点词，渲染时去掉括号、染金
// - cast / sfx 里的帧号都是「相对本屏开始帧」的偏移，卡拍就写成 18 的倍数（100 BPM 一拍 18 帧）
// - cast 的 at 是动作落点（手 脚 头到位的那一帧），预备动作会自动提前开始

import { bar, FRAMES_PER_BEAT } from "../lib/rhythm";
import type { StyleId } from "../styles/themes";
import type { Face, PoseName } from "./poses";
import manifest from "./sfx-manifest.json";

export type SfxId = keyof typeof manifest;
export type Tier = "light" | "mid" | "heavy";
export type SfxEvent = { frame: number; id: SfxId; tier: Tier; label: string };

/** 人物和动作：who 是角色 id，pose 是动作库里的名字（walk run 是程序化步态） */
export type CastCue = {
  who: string;
  at: number;
  pose: PoseName | "walk" | "run";
  lead?: number;
  antic?: number;
  face?: Partial<Face>;
  facing?: 1 | -1;
  headTurn?: number;
  joints?: Record<string, number>;
  /** 手落点：场景里命名的物件或身体部位，null = 松手 */
  reachL?: string | null;
  reachR?: string | null;
  /** 步态：走几步，往哪走（步点从 at 起每拍一步） */
  steps?: number;
  direction?: 1 | -1;
  /** 走路时不摆的手（手里端着东西） */
  hold?: ("L" | "R")[];
  /** 群像：N 个人里 M 个在做这个动作 */
  doing?: number;
};

export type Screen = {
  n: number;
  section: string;
  style: StyleId;
  startBar: number;
  bars: number;
  start: number;
  end: number;
  upper: string | null;
  lower: string | null;
  lowerDelayBeats: number;
  lowerAt: number;
  keyword: string | null;
  float: { text: string; delayBeats: number; at: number } | null;
  labels: string[];
  notes: string[];
  characters: string[];
  people: string;
  action: string;
  cast: CastCue[];
  sfx: SfxEvent[];
  heavy?: string;
  bigAction?: boolean;
  hook?: string;
  you?: boolean;
  cue: string;
};

export type CameraKey = {
  /** 镜头在这个小节的第一拍落定（从上一个关键帧所在的小节线开始动） */
  bar: number;
  shot: string;
  ease?: "inOut" | "snapOut" | "in" | "out";
};

export type Section = {
  id: string;
  name: string;
  style: StyleId;
  startBar: number;
  endBar: number;
  start: number;
  end: number;
  camera: CameraKey[];
};

// —— 各节：变奏和镜头 ——
const SECTION_DEFS: Omit<Section, "start" | "end">[] = [
  {
    id: "hook",
    name: "钩子",
    style: "main",
    startBar: 1,
    endBar: 3,
    camera: [
      { bar: 1, shot: "heroClose" },
      { bar: 2, shot: "heroCloser" },
      { bar: 3, shot: "rowWide", ease: "snapOut" },
      { bar: 4, shot: "rowPan" },
    ],
  },
  {
    id: "setup",
    name: "设定",
    style: "main",
    startBar: 4,
    endBar: 7,
    camera: [
      { bar: 5, shot: "emperor" },
      { bar: 6, shot: "emperorClose" },
      { bar: 7, shot: "heroFeed" },
      { bar: 8, shot: "railMacro", ease: "in" },
    ],
  },
  {
    id: "trial",
    name: "孩子在试",
    style: "woodcut",
    startBar: 8,
    endBar: 12,
    camera: [
      { bar: 9, shot: "babyClose", ease: "out" },
      { bar: 10, shot: "heroMedium" },
      { bar: 11, shot: "heroMediumDrift" },
      { bar: 12, shot: "doorWide" },
      { bar: 13, shot: "babyPush" },
    ],
  },
  { id: "reveal", name: "揭晓", style: "manuscript", startBar: 13, endBar: 17, camera: [] },
  { id: "naming", name: "命名", style: "main-return", startBar: 18, endBar: 19, camera: [] },
  { id: "evidence", name: "实证", style: "blueprint", startBar: 20, endBar: 27, camera: [] },
  { id: "mirror", name: "镜像 童年", style: "homevideo", startBar: 28, endBar: 34, camera: [] },
  { id: "climax", name: "蓄势 高潮", style: "main-night", startBar: 35, endBar: 40, camera: [] },
  { id: "mechanism", name: "机制", style: "papercut", startBar: 41, endBar: 51, camera: [] },
  { id: "return", name: "回扣 金句", style: "main-dawn", startBar: 52, endBar: 60, camera: [] },
  { id: "sources", name: "出处", style: "parchment", startBar: 61, endBar: 62, camera: [] },
];

export const sections: Section[] = SECTION_DEFS.map((s) => ({ ...s, start: bar(s.startBar), end: bar(s.endBar + 1) }));

const sectionOfBar = (b: number) => {
  const s = sections.find((x) => b >= x.startBar && b <= x.endBar);
  if (!s) throw new Error(`第 ${b} 小节不属于任何一节`);
  return s;
};

// —— 写稿用的小工具 ——
type Fx = { at: number; id: SfxId };
const fx = (at: number, id: SfxId): Fx => ({ at, id });
/** 走路的脚步声：从 at 起每拍一步 */
const stepsFx = (at: number, n: number): Fx[] => Array.from({ length: n }, (_, i) => fx(at + i * FRAMES_PER_BEAT, "footstep"));
const cue = (who: string, at: number, pose: CastCue["pose"], o: Partial<CastCue> = {}): CastCue => ({ who, at, pose, ...o });
/** 皇帝远侧的手一直端平，鹰停在手套上（走路时这只手不摆） */
const FALCON_ARM = { shR: 22, elR: 92, wrR: 8 };

type ScreenDef = {
  startBar: number;
  bars: number;
  upper: string | null;
  lower: string | null;
  lowerDelayBeats?: number;
  float?: { text: string; delayBeats: number };
  labels?: string[];
  notes?: string[];
  characters: string[];
  people: string;
  action: string;
  cast: CastCue[];
  sfx: Fx[];
  heavy?: string;
  bigAction?: boolean;
  hook?: string;
  you?: boolean;
  cue: string;
};

let counter = 0;
const screen = (d: ScreenDef): Screen => {
  const start = bar(d.startBar);
  const end = bar(d.startBar + d.bars);
  const sec = sectionOfBar(d.startBar);
  const delay = d.lowerDelayBeats ?? 0;
  const kw = [d.upper, d.lower, d.float?.text].map((t) => t?.match(/【(.+?)】/)?.[1]).find(Boolean) ?? null;
  return {
    n: ++counter,
    section: sec.id,
    style: sec.style,
    startBar: d.startBar,
    bars: d.bars,
    start,
    end,
    upper: d.upper,
    lower: d.lower,
    lowerDelayBeats: delay,
    lowerAt: start + Math.round(delay * FRAMES_PER_BEAT),
    keyword: kw,
    float: d.float ? { ...d.float, at: start + Math.round(d.float.delayBeats * FRAMES_PER_BEAT) } : null,
    labels: d.labels ?? [],
    notes: d.notes ?? [],
    characters: d.characters,
    people: d.people,
    action: d.action,
    cast: d.cast.map((c) => ({ ...c, at: start + c.at })),
    sfx: d.sfx.map((x) => ({ frame: start + x.at, id: x.id, tier: manifest[x.id].tier as Tier, label: manifest[x.id].label })),
    heavy: d.heavy,
    bigAction: d.bigAction,
    hook: d.hook,
    you: d.you,
    cue: d.cue,
  };
};

// —— 全片字幕 ——
export const screens: Screen[] = [
  screen({
    startBar: 1,
    bars: 1,
    upper: "她不许跟孩子说话",
    lower: null,
    labels: ["据说 十三世纪编年史"],
    characters: ["奶妈", "婴儿", "腓特烈二世（影子）"],
    people: "奶妈 把木碗放上摇篮边 张嘴想哄婴儿 又抬手捂住自己的嘴（中景）；婴儿 裹朱红襁褓 笑着伸手抓她的头巾；地上滑进戴王冠的影子",
    action: "第 0 帧奶妈的手把木碗按到摇篮边沿 奶面晃动；f12 婴儿伸手（肩→肘→腕依次滞后）；f14 奶妈松手；f30 张嘴；f36 第 3 拍捂嘴落点 带一点过冲；f40 王冠影子从画左滑进地面；字幕 f0 起逐字由虚变实 f6 全部可读",
    cast: [
      cue("nurse", 0, "lean", { facing: 1, reachL: "bowlRim", face: { mouth: "neutral" } }),
      cue("nurse", 14, "lean", { reachL: null, lead: 10, face: { mouth: "smile" } }),
      cue("nurse", 30, "lean", { lead: 8, face: { mouth: "open", brows: "up" } }),
      cue("nurse", 36, "coverMouth", { lead: 14, antic: 0.15 }),
      cue("baby", 0, "babyLaugh"),
      cue("baby", 12, "babyReach", { reachL: "nurseVeil", lead: 10 }),
    ],
    sfx: [fx(0, "bowl-wood-land"), fx(20, "cloth")],
    cue: "第 0 帧碗落定和音效同帧；f6 出字可读；捂嘴落点卡第 3 拍",
  }),
  screen({
    startBar: 2,
    bars: 2,
    upper: "什么都不缺的孩子",
    lower: "为什么【活不下去】",
    lowerDelayBeats: 1,
    labels: ["据说 十三世纪编年史"],
    characters: ["奶妈", "婴儿", "婴儿群像 7 人", "奶妈群像 4 人", "腓特烈二世（门口剪影）"],
    people: "奶妈 猛地转身背对摇篮 低头（中景→全景）；一排 8 张摇篮里 8 个婴儿 3 个伸着手 其余躺着或把脸转向墙 每张摇篮边一碗满奶；另外 4 个奶妈背对摇篮站着；门口站着戴王冠的人影",
    action: "上一屏最后一拍镜头微推做预备；f0 镜头猛拉远成全景 奶妈转身落定 同一拍到；f18 下行出；f30 奶妈低头；之后镜头沿摇篮缓慢横移 婴儿各自小动作（固定种子错开时间）窗光里尘埃漂移",
    cast: [
      cue("nurse", 0, "turn", { facing: -1, lead: 10, antic: 0.25 }),
      cue("nurse", 30, "lookDown", { facing: -1, lead: 16 }),
      cue("baby", 0, "babyReach", { reachL: null }),
      cue("baby", 100, "babyLimp", { lead: 20 }),
      cue("babies", 0, "babyReach", { doing: 3 }),
      cue("nurses", 0, "standBack", { facing: -1 }),
    ],
    sfx: [fx(0, "heavy-wood-bell"), fx(96, "cloth")],
    heavy: "主线问题",
    bigAction: true,
    cue: "重卡点1 主线问题 第 2 小节第一拍（第一大段内）：镜头猛拉远 奶妈转身 重卡点音效同拍；下行卡第 2 拍",
  }),
  screen({
    startBar: 4,
    bars: 2,
    upper: "皇帝想知道",
    lower: "人天生会说哪种话",
    labels: ["腓特烈二世 示意", "希伯来语", "希腊语", "拉丁语", "阿拉伯语", "还是父母的话"],
    characters: ["腓特烈二世", "鹰", "婴儿"],
    people: "腓特烈二世 符号化剪影 王冠 披风 手套上停一只鹰 从门口走到第一张摇篮边 俯身 一手拢在耳边听（中景）；婴儿 张嘴咿呀",
    action: "镜头从一排摇篮横移回门口 落定在第 5 小节；f18 起皇帝从门口走两步 步点卡拍；先往后仰做预备 f72 俯身侧耳落点 弯腰时臀部后坐；f72 摇篮边书架上的羊皮纸卷展开 五个语言名每半拍出一个；f84 鹰转头 f108 鹰扇翅；墙上挂着皇帝的符号化肖像",
    cast: [
      cue("emperor", 0, "standBack", { facing: -1, joints: FALCON_ARM }),
      cue("emperor", 18, "walk", { steps: 2, direction: -1, hold: ["R"] }),
      cue("emperor", 72, "cupEar", { facing: -1, lead: 22, antic: 0.3, joints: FALCON_ARM }),
      cue("falcon", 84, "stand", { headTurn: 1 }),
      cue("falcon", 108, "raiseHand"),
      cue("babies", 40, "babyLaugh", { doing: 1, face: { mouth: "talk" } }),
    ],
    sfx: [...stepsFx(18, 2), fx(72, "scroll"), fx(108, "wing")],
    cue: "换屏卡第 4 小节；两步卡第 2 3 拍；俯身落点和纸卷都卡第 5 小节第一拍；语言名每半拍出一个",
  }),
  screen({
    startBar: 6,
    bars: 2,
    upper: "奶妈只管喂奶洗澡",
    lower: "一个字也不许说",
    lowerDelayBeats: 2,
    characters: ["奶妈", "婴儿"],
    people: "奶妈 一手端碗 一手用小勺喂婴儿 想张嘴又抿回去 再把碗放下 用湿布给婴儿擦身（中景）；婴儿 吃奶 被擦洗时蹬腿拍手",
    action: "镜头从皇帝那头横移回第三张摇篮 第 7 小节落定；f36 勺子回碗 f54 勺子到婴儿嘴边 奶妈张嘴 f62 抿回；f80 碗放回摇篮边；f92 湿布浸进凳子上的水盆 f108 擦婴儿身子（手用 IK 落在婴儿身上）f126 再浸一次；第 7 小节起镜头加速推向摇篮木栏",
    cast: [
      cue("nurse", 0, "feed", { facing: 1, reachL: "babyMouth", reachR: "bowlHeld" }),
      cue("nurse", 36, "feed", { reachL: "bowlHeld", lead: 10 }),
      cue("nurse", 54, "feed", { reachL: "babyMouth", lead: 10, face: { mouth: "open" } }),
      cue("nurse", 62, "feed", { reachL: "babyMouth", lead: 6, face: { mouth: "tight" } }),
      cue("nurse", 80, "lean", { reachL: null, reachR: "bowlRim", lead: 12 }),
      cue("nurse", 92, "bendOver", { reachL: "basin", reachR: null, lead: 12 }),
      cue("nurse", 108, "lean", { reachL: "babyBelly", lead: 12 }),
      cue("nurse", 126, "bendOver", { reachL: "basin", lead: 12, face: { mouth: "tight" } }),
      cue("baby", 0, "babyLie", { face: { mouth: "o" } }),
      cue("baby", 54, "babyLie", { lead: 8, face: { mouth: "open" } }),
      cue("baby", 96, "babyLaugh", { lead: 12 }),
      cue("baby", 114, "babyLaugh", { lead: 8, joints: { hipL: 110, knL: 20, shL: 130 }, face: { mouth: "open", eyes: "happy" } }),
    ],
    sfx: [fx(92, "splash"), fx(108, "cloth"), fx(126, "splash")],
    cue: "浸布卡第 7 小节第 2 拍 擦身卡第 3 拍 再浸卡第 4 拍；下行卡第 3 拍",
  }),
  screen({
    startBar: 8,
    bars: 1,
    upper: "孩子会笑 会伸手",
    lower: null,
    characters: ["婴儿", "奶妈"],
    people: "婴儿 咯咯笑 双手伸向奶妈的脸（近景）；奶妈 俯在摇篮边 把头扭开",
    action: "转场在小节线上：镜头扎进摇篮木栏 木纹放大成刻刀线 拉出来已经是米黄纸黑刻线的木刻 只有襁褓保留朱红；f18 婴儿第一次伸手 f22 奶妈扭头；f54 第二次伸手幅度更大 肩先动 f58 奶妈扭得更开",
    cast: [
      cue("nurse", 0, "lean", { facing: 1, reachR: "cradleEdge", face: { mouth: "tight" } }),
      cue("nurse", 22, "lean", { lead: 10, joints: { neck: -30, torso: 8 }, headTurn: 0.55 }),
      cue("nurse", 40, "lean", { lead: 10 }),
      cue("nurse", 58, "lean", { lead: 10, joints: { neck: -36, torso: 2 }, headTurn: 0.75 }),
      cue("baby", 0, "babyLaugh"),
      cue("baby", 18, "babyReach", { reachL: "nurseFace", lead: 12 }),
      cue("baby", 36, "babyLaugh", { lead: 10 }),
      cue("baby", 54, "babyReach", { reachL: "nurseFace", reachR: "nurseFace", lead: 14, antic: 0.2 }),
    ],
    sfx: [fx(0, "chisel"), fx(36, "cloth")],
    cue: "画风切换落在第 8 小节第一拍；两次伸手卡第 2 拍和第 4 拍",
  }),
  screen({
    startBar: 9,
    bars: 2,
    upper: "会哭 会喊",
    lower: "会把碗推到地上",
    lowerDelayBeats: 1,
    characters: ["婴儿", "奶妈"],
    people: "婴儿 大哭 双腿乱蹬 一手把摇篮边的碗推落（中景）；奶妈 蹲下捡碗 放回摇篮边 用水罐重新倒满 全程不看婴儿",
    action: "f30 婴儿的手碰到碗 碗翻出摇篮 f36 落地 弹两下滚半圈停；f40 奶妈下蹲 臀部后坐；f72 手落在碗上；f108 碗放回摇篮边；f120–f136 远侧手里的水罐倾斜 奶面升回去",
    cast: [
      cue("baby", 0, "babyCry", { lead: 10 }),
      cue("baby", 30, "babyPush", { reachL: "bowlRim", lead: 10, antic: 0.15 }),
      cue("baby", 48, "babyCry", { reachL: null, lead: 12 }),
      cue("baby", 100, "babyCry", { lead: 14, joints: { shL: 150, shR: 104 } }),
      cue("nurse", 0, "lean", { reachR: "cradleEdge", face: { mouth: "tight" } }),
      cue("nurse", 58, "crouch", { reachR: null, lead: 18, antic: 0.1 }),
      cue("nurse", 72, "crouch", { reachL: "bowlFloor", lead: 12 }),
      cue("nurse", 108, "lean", { reachL: "bowlRim", lead: 18 }),
      cue("nurse", 124, "lean", { reachL: null, reachR: "jugPour", lead: 12 }),
      cue("nurse", 140, "lean", { reachR: null, lead: 10 }),
    ],
    sfx: [fx(36, "bowl-fall-roll"), fx(108, "bowl-set-soft")],
    cue: "碗落地卡第 9 小节第 3 拍；放回卡第 10 小节第 3 拍；下行卡第 2 拍",
  }),
  screen({
    startBar: 11,
    bars: 2,
    upper: "没有人回应",
    lower: "他就一点点【不出声】了",
    lowerDelayBeats: 2,
    characters: ["婴儿", "奶妈"],
    people: "婴儿 哭声停下 伸着的手一次比一次低 最后把脸转向墙（中景→近景）；奶妈 转身 走出门",
    action: "窗光从左扫到右 扫三次表示几天过去 每扫一次婴儿的手低一截；f18 奶妈转身 f36 起走四步 步点卡拍 脚钉地不滑；f108 木门合上；f126 婴儿转脸落点；碗始终是满的",
    cast: [
      cue("baby", 0, "babyCry", { lead: 8 }),
      cue("baby", 24, "babyReach", { lead: 14, joints: { shL: 100, shR: 84 }, face: { mouth: "neutral", brows: "sad", eyes: "open" } }),
      cue("baby", 72, "babyReach", { lead: 18, joints: { shL: 70, shR: 58, elL: 34 }, face: { mouth: "frown", brows: "sad", eyes: "open" } }),
      cue("baby", 116, "babyLimp", { lead: 16 }),
      cue("baby", 126, "babyLimp", { lead: 14, headTurn: 1 }),
      cue("nurse", 0, "lean"),
      cue("nurse", 18, "turn", { facing: -1, lead: 12, antic: 0.15 }),
      cue("nurse", 36, "walk", { steps: 4, direction: -1 }),
    ],
    sfx: [fx(18, "cloth"), ...stepsFx(36, 4), fx(108, "door-close")],
    cue: "脚步卡第 11 小节第 3 拍起每拍一步；关门卡第 12 小节第 3 拍；下行卡第 3 拍",
  }),
  screen({
    startBar: 13,
    bars: 1,
    upper: "皇帝没等到答案",
    lower: null,
    characters: ["腓特烈二世", "婴儿群像"],
    people: "腓特烈二世 剪影在手抄本插图画框里 在一排摇篮间踱步 停下侧耳（全景）；鹰从他臂上飞起；摇篮里的婴儿都不出声",
    action: "转场：镜头拉远 木刻原来是一本书的插图 书页翻过 翻出金箔首字母的羊皮纸页；皇帝踱两步 步点卡拍 脚钉地不滑；f36 鹰起飞",
    cast: [],
    sfx: [fx(0, "page-turn"), fx(36, "wing")],
    hook: "新悬念 皇帝没等到答案 加画风切到手抄本",
    cue: "小钩子；画风切换落在第 13 小节（第 4 大段起点）",
  }),
  screen({
    startBar: 14,
    bars: 1,
    upper: "编年史里写了原因",
    lower: null,
    labels: ["萨林贝内 编年史"],
    characters: ["执笔的手", "奶妈", "婴儿"],
    people: "一只执鹅毛笔的手 在羊皮纸上写字（特写 只见袖口）；页边插图里 奶妈抱着婴儿站着不动",
    action: "笔尖蘸墨 写出一行花体纹样（装饰线 不是可读文字）；f36 墨迹晕开一点；页边小人在呼吸",
    cast: [],
    sfx: [fx(0, "quill")],
    cue: "换屏卡第 14 小节",
  }),
  screen({
    startBar: 15,
    bars: 2,
    upper: "他们离不开拍手和笑脸",
    lower: "离不开奶妈的【逗哄】",
    lowerDelayBeats: 1,
    labels: ["据萨林贝内编年史 大意"],
    characters: ["奶妈", "婴儿"],
    people: "页边插图活过来：一个奶妈 拍手 冲婴儿笑 俯身逗他（中景）；婴儿 笑着抓她的手",
    action: "奶妈拍手三次 每次先张开双手做预备 拍在 f18 f36 f54；婴儿每次蹬腿回应；f108 起插图的金色慢慢褪成褐色线稿 表示这些都没有发生",
    cast: [],
    sfx: [fx(18, "clap"), fx(36, "clap"), fx(54, "clap")],
    cue: "拍手卡拍；下行卡第 2 拍",
  }),
  screen({
    startBar: 17,
    bars: 1,
    upper: "碗一直是满的",
    lower: null,
    characters: ["婴儿", "奶妈"],
    people: "婴儿 躺在摇篮里看着身边那只满碗 眨眼（中景）；奶妈 背影在门口",
    action: "镜头缓推到页边插图：满碗和摇篮；奶面倒映窗光微晃；婴儿呼吸起伏",
    cast: [],
    sfx: [fx(36, "paper-rub")],
    cue: "换屏卡第 17 小节",
  }),
  screen({
    startBar: 18,
    bars: 2,
    upper: "这种吃饱了的饿",
    lower: "有个名字",
    lowerDelayBeats: 2,
    float: { text: "【情感漠视】", delayBeats: 4 },
    characters: ["奶妈", "婴儿"],
    people: "奶妈 把碗放在婴儿身边 退后一步 转身走出门（全景）；门缝的光收窄到只照着碗和婴儿；婴儿 看着门",
    action: "转场：镜头扎进首字母的金箔 金色变成照在碗沿上的烛光 回到主视觉；f54 光微微一收做预备；f72 第 19 小节第一拍 四个金字砸在碗上方偏左 碗里奶面一圈涟漪 婴儿眨眼",
    cast: [],
    sfx: [fx(72, "title-hit")],
    cue: "主题词砸在第 19 小节第一拍（大动作 中档音效 不算重卡点）；下行卡第 3 拍",
    bigAction: true,
  }),
  screen({
    startBar: 20,
    bars: 2,
    upper: "1975年 一个实验",
    lower: "让妈妈突然不回应",
    labels: ["特罗尼克等 静止脸实验 示意"],
    characters: ["实验里的妈妈", "实验里的婴儿", "研究者的手"],
    people: "实验室（全景）：一位妈妈 坐在婴儿椅对面向婴儿挥手；婴儿 盖朱红小毯；一只穿白大褂的手 按下秒表",
    action: "转场：镜头推进碗底 木碗同心圆纹变成蓝图方格纸上的圆规线 白线依次描出两把椅子 摄像机 单向玻璃；f36 按秒表；妈妈挥手两次卡拍",
    cast: [],
    sfx: [fx(0, "pencil"), fx(36, "stopwatch")],
    hook: "新角色登场 加画风切到蓝图",
    cue: "小钩子；画风切换落在第 20 小节",
  }),
  screen({
    startBar: 22,
    bars: 1,
    upper: "妈妈先陪孩子玩",
    lower: null,
    characters: ["实验里的妈妈", "实验里的婴儿"],
    people: "妈妈 双手捂脸再拿开 玩躲猫猫（中景）；婴儿 咯咯笑 蹬腿",
    action: "躲猫猫两次 拿开手的落点卡 f18 f54；镜头微推",
    cast: [],
    sfx: [fx(18, "chair-rock")],
    cue: "换屏卡第 22 小节",
  }),
  screen({
    startBar: 23,
    bars: 1,
    upper: "然后脸突然不动了",
    lower: null,
    characters: ["实验里的妈妈", "实验里的婴儿"],
    people: "妈妈 转开脸再转回来 变成一张不动的平脸 双手放在膝上（近景）；婴儿 还在笑 笑容慢慢停住",
    action: "f18 妈妈转开 肩先头后；f36 转回定格；f54 婴儿笑容收住；镜头不动 只有妈妈的呼吸",
    cast: [],
    sfx: [fx(36, "freeze-click")],
    cue: "定格落点卡第 3 拍",
  }),
  screen({
    startBar: 24,
    bars: 2,
    upper: "孩子拼命想把她叫回来",
    lower: "最后把头【扭开】",
    lowerDelayBeats: 2,
    characters: ["实验里的婴儿", "实验里的妈妈"],
    people: "婴儿 冲妈妈笑 伸手 拍椅子 身子往前够 张大嘴喊（近景→中景）；妈妈 一动不动；最后婴儿把头扭向一边 瘫进椅子",
    action: "婴儿四次尝试各卡一拍 幅度递增 每次有预备和过冲；f108 扭头 f126 瘫软；妈妈只有呼吸和眨眼",
    cast: [],
    sfx: [fx(18, "chair-creak"), fx(54, "chair-creak"), fx(108, "cloth")],
    cue: "下行卡第 3 拍",
  }),
  screen({
    startBar: 26,
    bars: 2,
    upper: "妈妈重新笑起来",
    lower: "他才慢慢转回头",
    lowerDelayBeats: 2,
    characters: ["实验里的妈妈", "实验里的婴儿"],
    people: "妈妈 重新笑 俯身 伸手碰婴儿的脚（中景）；婴儿 停了一会儿 慢慢把头转回来看她 嘴角动了一下",
    action: "f0 妈妈表情解冻；f36 手用 IK 落在婴儿脚上；婴儿 f72 开始转头 f126 看向妈妈；蓝图白线微微变暖",
    cast: [],
    sfx: [fx(36, "cloth")],
    cue: "下行卡第 3 拍",
  }),
  screen({
    startBar: 28,
    bars: 1,
    upper: "后来的孩子",
    lower: "吃得很饱",
    lowerDelayBeats: 1,
    characters: ["男孩（主角）", "爸爸"],
    people: "爸爸的手 把一碗冒热气的饭放到书桌上（中景 和第 1 屏奶妈放碗同一构图）；男孩 8 岁 戴朱红围巾 坐在桌前抬头",
    action: "转场：蓝图里的监视器亮起 镜头推进屏幕 画面变成带颗粒和暗角的暖黄家庭录像；f0 碗落桌；热气升起",
    cast: [],
    sfx: [fx(0, "bowl-porcelain-land")],
    hook: "跳到现代 新角色 加画风切到家庭录像",
    cue: "小钩子；画风切换落在第 28 小节；下行卡第 2 拍",
  }),
  screen({
    startBar: 29,
    bars: 1,
    upper: "他想说今天哭了",
    lower: null,
    characters: ["男孩（主角）", "爸爸"],
    people: "男孩 转身面向爸爸 张嘴 脸上有泪痕 手里攥着一张被撕破的画（中景）；爸爸 站在门口",
    action: "男孩转身 髋先肩后 f18 落定；f36 举起画 画角晃动",
    cast: [],
    sfx: [fx(18, "chair-creak"), fx(36, "paper")],
    cue: "换屏卡第 29 小节",
  }),
  screen({
    startBar: 30,
    bars: 1,
    upper: "爸爸说 先把饭吃了",
    lower: null,
    characters: ["爸爸", "男孩（主角）"],
    people: "爸爸 已经转身 眼睛看着手机 一只手朝碗的方向点了点 走出门（中景）；男孩 举着画停在半空",
    action: "爸爸两步出门 步点卡 f18 f36；门口光一暗；男孩的手慢慢放下",
    cast: [],
    sfx: [fx(18, "footstep"), fx(36, "footstep")],
    cue: "脚步卡拍",
  }),
  screen({
    startBar: 31,
    bars: 2,
    upper: "他把话和饭",
    lower: "一起【咽了下去】",
    lowerDelayBeats: 2,
    characters: ["男孩（主角）"],
    people: "男孩 合上嘴 把画压在碗下面 低头扒饭 喉咙动了一下 围巾没摘（特写→中景）",
    action: "f0 嘴合上；f36 画塞到碗下；f72 扒饭两口卡拍；f108 吞咽；镜头缓慢推近",
    cast: [],
    sfx: [fx(72, "chopsticks"), fx(108, "swallow")],
    cue: "下行卡第 3 拍；吞咽卡第 2 小节第 3 拍",
  }),
  screen({
    startBar: 33,
    bars: 1,
    upper: "没人打他 也没人骂他",
    lower: null,
    characters: ["男孩（主角）", "爸爸", "妈妈"],
    people: "全景：暖黄的家 妈妈 在客厅看笔记本电脑 爸爸 在沙发上看手机 两人都很平和；男孩 一个人在亮着台灯的小房间里吃饭",
    action: "镜头从男孩房间平移拉出到全景 像家庭录像的摇镜；每个人都在呼吸和做小动作",
    cast: [],
    sfx: [fx(0, "room-tone")],
    cue: "换屏卡第 33 小节",
  }),
  screen({
    startBar: 34,
    bars: 1,
    upper: "他就这样 长大了",
    lower: null,
    characters: ["男孩（主角）", "成年主角"],
    people: "男孩 从书桌站起来往右走 每走一步长大一截：小学生→中学生→背双肩包的年轻人→穿大衣的成年人 朱红围巾一直在（全景侧面）",
    action: "四步各卡一拍 脚用 IK 钉地；手臂与对侧腿反向摆；围巾比身体晚 3 帧到",
    cast: [],
    sfx: [fx(0, "footstep"), fx(18, "footstep"), fx(36, "footstep"), fx(54, "footstep")],
    cue: "步点卡四拍",
  }),
  screen({
    startBar: 35,
    bars: 2,
    upper: "别人问起 他总说",
    lower: "我小时候挺好的",
    lowerDelayBeats: 2,
    characters: ["成年主角", "朋友"],
    people: "成年主角 和一个朋友坐在夜宵摊 朋友问话 他笑着摆摆手（中景）；桌上一只同样外形的金沿碗",
    action: "转场：家庭录像定格成一张照片 滑进成年人手里 再拉开到夜宵摊 只有摊灯和手机光；f36 朋友侧身问；f72 摆手 肘先腕后；朋友点头",
    cast: [],
    sfx: [fx(0, "paper"), fx(72, "chopsticks")],
    cue: "画风切换落在第 35 小节；下行卡第 3 拍；从这里开始音效变稀",
  }),
  screen({
    startBar: 37,
    bars: 1,
    upper: "他想不起一件坏事",
    lower: null,
    characters: ["成年主角"],
    people: "成年主角 深夜独自在出租屋 围巾搭在椅背 翻一本旧相册（中景）；照片里全是吃饭和生日",
    action: "翻页两次 落点 f18 f54；每页照片在台灯下一闪",
    cast: [],
    sfx: [fx(18, "page-turn"), fx(54, "page-turn")],
    cue: "换屏卡第 37 小节",
  }),
  screen({
    startBar: 38,
    bars: 1,
    upper: "他说的是真的",
    lower: null,
    characters: ["成年主角"],
    people: "成年主角 看着相册微微点头 嘴角一点笑 呼吸 眨眼（近景）",
    action: "镜头极缓推进一张照片（小男孩在书桌前吃饭）；f54 最后一拍他低头 镜头微沉 做下一屏的预备",
    cast: [],
    sfx: [],
    cue: "留白一小节 几乎无声 为高潮蓄势",
  }),
  screen({
    startBar: 39,
    bars: 2,
    upper: "伤他的那件事",
    lower: "从来【没有发生过】",
    lowerDelayBeats: 1,
    characters: ["成年主角", "男孩（照片里）"],
    people: "成年主角 猛抬头 相册从手里滑落 照片散了一地（中景→俯拍全景）；每张照片里 小男孩对面的椅子都是空的 或大人只露一个背影",
    action: "f0 抬头和松手同一拍落点 相册落地；f18 下行出 照片铺开；之后每拍一张照片里的空椅子被台灯照亮",
    cast: [],
    sfx: [fx(0, "heavy-thud"), fx(24, "paper")],
    heavy: "核心反转",
    hook: "核心反转",
    cue: "重卡点2 落在 climaxFrame；下行卡第 2 拍",
    bigAction: true,
  }),
  screen({
    startBar: 41,
    bars: 1,
    upper: "没发生的事 记不住",
    lower: null,
    characters: ["男孩（剪纸）"],
    people: "剪纸男孩 打开一个装记忆的木盒 里面是一叠空相框 他拿起一个看了看又放下（中景）",
    action: "转场：一把剪刀沿散落照片的边缘剪下去 锯齿边展开成红纸剪纸世界；f36 开盒；f54 举起空相框",
    cast: [],
    sfx: [fx(0, "scissors"), fx(36, "box-open")],
    cue: "画风切换落在第 41 小节（第 11 大段起点）",
  }),
  screen({
    startBar: 42,
    bars: 1,
    upper: "但孩子学会了一件事",
    lower: null,
    characters: ["男孩（剪纸）", "父母（剪纸）"],
    people: "剪纸男孩 坐在饭桌边张嘴要说话（全景）；对面两个剪纸大人 背对着他",
    action: "f36 男孩张嘴；大人背影一动不动；镜头侧移",
    cast: [],
    sfx: [fx(36, "paper-rub")],
    cue: "换屏卡第 42 小节",
  }),
  screen({
    startBar: 43,
    bars: 1,
    upper: "难过 说了也没用",
    lower: null,
    characters: ["男孩（剪纸）", "奶妈（剪纸小剪影）"],
    people: "剪纸男孩 抬手捂住自己的嘴 和开头奶妈一模一样的动作（近景）；角落浮现奶妈捂嘴的小剪影做呼应",
    action: "f18 手先微沉做预备；f36 捂嘴落点；奶妈小剪影同一拍做同一姿势",
    cast: [],
    sfx: [fx(36, "paper-rub")],
    cue: "捂嘴落点卡第 3 拍",
  }),
  screen({
    startBar: 44,
    bars: 2,
    upper: "他会安慰哭着的朋友",
    lower: "却说不清自己怎么了",
    lowerDelayBeats: 2,
    characters: ["成年主角（剪纸）", "朋友（剪纸）"],
    people: "剪纸成年主角 拍着一个哭泣朋友的背 递纸巾（中景）；朋友走后 他一个人坐着 张了张嘴 又低头",
    action: "手用 IK 落在朋友背上 拍两次卡拍；f72 朋友起身离开；f108 他张嘴 f126 合上",
    cast: [],
    sfx: [fx(18, "paper-rub"), fx(90, "footstep")],
    cue: "下行卡第 3 拍",
  }),
  screen({
    startBar: 46,
    bars: 2,
    upper: "你也许也很会说",
    lower: "没事 我还好",
    lowerDelayBeats: 2,
    characters: ["成年主角（剪纸）", "通勤群像 10 人", "床上的普通人"],
    people: "剪纸地铁车厢（全景）：10 个高矮 衣色 站姿各异的成年人低头看手机 主角在中间打字；后半屏切近景镜像：一个普通人躺在床上举着手机打字 屏幕光照亮脸",
    action: "车厢轻晃 10 人晃动时间各自错开（固定种子）；f72 镜头穿过主角的手机屏 变成床上的人 同样的握机姿势；打字两下卡 f90 f108",
    cast: [],
    sfx: [fx(0, "room-tone"), fx(90, "typing")],
    cue: "下行卡第 3 拍；镜像切换卡第 2 小节第一拍",
    you: true,
  }),
  screen({
    startBar: 48,
    bars: 2,
    upper: "他爸爸小时候",
    lower: "也端着同一只碗",
    lowerDelayBeats: 2,
    characters: ["爸爸（剪纸 小时候）", "奶奶（剪纸）"],
    people: "剪纸人链横向展开（全景）：成年的爸爸在链子里变回一个小男孩 双手端着同一只金沿碗；前面是背对他的奶奶",
    action: "人链一折一折翻开 每折卡一拍；f72 小爸爸抬头看奶奶的背影",
    cast: [],
    sfx: [fx(0, "paper-unfold"), fx(36, "paper-unfold")],
    hook: "代际反转 爸爸也是那个孩子",
    cue: "小钩子；下行卡第 3 拍",
  }),
  screen({
    startBar: 50,
    bars: 2,
    upper: "没人回应过他",
    lower: "他也不知道怎么回应",
    lowerDelayBeats: 1,
    characters: ["爸爸（剪纸）", "男孩（剪纸）", "历代家人（剪纸）", "奶妈（剪纸）"],
    people: "剪纸人链继续展开（远景）：一代代人都端着碗 背对下一个人 链子一直连到最远处一个戴白头巾的剪纸奶妈；镜头停回爸爸和男孩：爸爸伸手想摸男孩的头 手停在半空又收回（中景）",
    action: "f0–f72 人链展开；f90 爸爸伸手 f126 收回 不碰到",
    cast: [],
    sfx: [fx(0, "paper-unfold"), fx(90, "cloth")],
    cue: "下行卡第 2 拍",
  }),
  screen({
    startBar: 52,
    bars: 1,
    upper: "回到那间石头屋子",
    lower: null,
    characters: ["奶妈", "婴儿"],
    people: "奶妈 站在摇篮边捂着嘴 婴儿 伸手——和第 1 屏一模一样的构图 只是窗外是清晨（中景）",
    action: "转场：人链最末端的剪纸奶妈一展开 纸纹褪去变回石头育婴房；晨光从冷蓝缓慢变暖；f54 奶妈低头看碗 做下一屏的预备",
    cast: [],
    sfx: [fx(0, "paper-unfold")],
    hook: "回到开头",
    cue: "画风切换落在第 52 小节",
  }),
  screen({
    startBar: 53,
    bars: 2,
    upper: "没人回应过的话",
    lower: "后来就【不说了】",
    lowerDelayBeats: 1,
    characters: ["奶妈", "婴儿"],
    people: "奶妈 猛地抬头看向婴儿 另一只手把碗放下松开（中景→近景）；婴儿 伸着的手停住",
    action: "f0 抬头和碗落定同一拍；f18 下行出；镜头缓推到她眼睛（特写）",
    cast: [],
    sfx: [fx(0, "heavy-bowl-resonance")],
    heavy: "金句",
    cue: "重卡点3 落在 accent（第 14 大段起点）；下行卡第 2 拍",
    bigAction: true,
  }),
  screen({
    startBar: 55,
    bars: 2,
    upper: "那些孩子缺的不是奶",
    lower: "是有人【回应】",
    lowerDelayBeats: 2,
    characters: ["奶妈", "婴儿"],
    people: "奶妈 捂嘴的手慢慢放下 俯身靠近婴儿（中景）；婴儿 的手还伸着",
    action: "放手分三段 肩→肘→腕各滞后 3 帧；f72 俯身 臀部后坐；镜头从碗移向两人 碗退出画面中心",
    cast: [],
    sfx: [fx(36, "cloth")],
    cue: "回答主线问题；下行卡第 3 拍",
  }),
  screen({
    startBar: 57,
    bars: 1,
    upper: "这一次 她开口了",
    lower: null,
    labels: ["想象"],
    characters: ["奶妈", "婴儿"],
    people: "奶妈 冲婴儿说话 轻轻拍手 笑（近景）；婴儿 笑出来 抓住她的手指",
    action: "拍手两次 f18 f36；f54 婴儿抓指 两只手用 IK 真正碰到",
    cast: [],
    sfx: [fx(18, "clap"), fx(36, "clap")],
    cue: "换屏卡第 57 小节（第 15 大段起点）",
  }),
  screen({
    startBar: 58,
    bars: 2,
    upper: "你小时候没说完的话",
    lower: "现在可以说给自己听",
    lowerDelayBeats: 2,
    characters: ["成年主角"],
    people: "成年主角 夜里坐在书桌前（中景 和第 18 屏男孩同一构图） 把捂在嘴边的手放下 把碗推到一边 拿起笔在本子上写字；朱红围巾搭在椅背",
    action: "f0 手从嘴边放下；f36 推碗；f72 笔用 IK 落在纸上开始写；台灯光慢慢变暖 窗外泛白",
    cast: [],
    sfx: [fx(36, "bowl-slide"), fx(72, "pencil")],
    cue: "下行卡第 3 拍",
    you: true,
  }),
  screen({
    startBar: 60,
    bars: 1,
    upper: null,
    lower: null,
    float: { text: "情感漠视", delayBeats: 0 },
    characters: ["成年主角"],
    people: "成年主角 放下笔 深呼吸 肩膀放松（中景）；碗里冒着热气 窗外天亮",
    action: "呼吸起伏 眨眼；镜头缓慢后拉；左下小号片名淡入",
    cast: [],
    sfx: [],
    cue: "无字幕 留白",
  }),
  screen({
    startBar: 61,
    bars: 2,
    upper: null,
    lower: null,
    notes: ["萨林贝内 编年史 英译见 Coulton From St Francis to Dante 1906 孤证 作者敌视腓特烈二世 据说", "Tronick Als Adamson Wise Brazelton 1978 Journal of the American Academy of Child Psychiatry 17卷1期", "Mesman van IJzendoorn Bakermans Kranenburg 2009 Developmental Review 静止脸范式综述", "Webb 2012 Running on Empty 童年情感忽视", "Ditzer等 2023 Psychological Bulletin 童年受虐待与述情障碍元分析", "传说部分为示意和戏剧化 这一次她开口了为想象", "本片由AI辅助创作 如长期困扰可寻求专业心理帮助"],
    characters: [],
    people: "无人物 出处卡",
    action: "晨光淡成羊皮纸色 出处逐条淡入 纸纹轻微漂移",
    cast: [],
    sfx: [fx(0, "paper")],
    cue: "出处卡第 61 小节到片尾",
  }),];

// —— 全片音效（帧号 音效名 档位），按时间排序 ——
export const sfx: SfxEvent[] = screens.flatMap((s) => s.sfx).sort((a, b) => a.frame - b.frame);

/** 某个角色在全片的动作轨道（按落点排序） */
export const castOf = (who: string): CastCue[] =>
  screens.flatMap((s) => s.cast.filter((c) => c.who === who)).sort((a, b) => a.at - b.at);

export const screenAt = (frame: number): Screen | undefined => screens.find((s) => frame >= s.start && frame < s.end);
export const sectionAt = (frame: number): Section => sections.find((s) => frame >= s.start && frame < s.end) ?? sections[sections.length - 1];
