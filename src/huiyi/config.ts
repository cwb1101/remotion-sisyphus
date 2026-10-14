// 整条视频只需要改这个文件：素材、文案、音乐节奏都在这里。

export const VIDEO = {
  fps: 30,
  width: 1920,
  height: 1080,
};

export const MUSIC = {
  // 放到 public/music/ 下；文件不存在时静音渲染
  src: 'music/bgm.mp3',
  // 从音乐的第几秒开始用（跳过前奏）
  startSec: 0,
  // 音乐 BPM，用来把「拍」换算成帧。不知道 BPM 可以用剪映的「自动踩点」或在线 BPM 检测
  bpm: 128,
  // 第一拍（重拍）距离 startSec 的秒数，用来对齐
  offsetSec: 0,
  volume: 0.9,
};

// 如果音乐节奏不规整，可以直接手填每个切点的秒数（长度 = 场景数 + 1，第一个是 0）
// 填了就忽略上面的 bpm / 每个场景的 beats
export const CUTS_SEC: number[] | null = null;

// 转场的「半程」帧数：切点前 N 帧旧画面放大糊掉，切点后 N 帧新画面从糊里收回来
export const TRANSITION_HALF = 6;

// 每一拍画面轻微「顿」一下的力度（0 关闭）
export const BEAT_PUNCH = 0.025;

export const COLORS = {
  yellow: '#FFE016',
  red: '#FF3B3B',
  white: '#FFFFFF',
  stroke: '#141414',
};

export type TextSegment = {text: string; color?: string; scale?: number};

export type Quote = {
  text: string;
  // 位置：画面百分比，指的是文字中心
  x: number;
  y: number;
  // 在场景开始后的第几拍出现（0 = 和切点同时）
  beat: number;
};

type Base = {
  // 这个场景占几拍
  beats: number;
  // public/ 下的素材路径，支持 mp4/webm/mov/png/jpg；不存在时显示占位画面
  clip?: string;
  // 从素材的第几秒开始取
  clipStartSec?: number;
  // 素材播放速度（>1 加速，适合把慢动作的 MC 动画压进一拍里）
  speed?: number;
  // 英文小字
  en: string;
};

export type HookScene = Base & {kind: 'hook'; lines: TextSegment[][]};
export type ItemScene = Base & {
  kind: 'item';
  no: number;
  title: string;
  quotes: Quote[];
};
export type EndingScene = Base & {kind: 'ending'; lines: TextSegment[][]};
export type SceneConfig = HookScene | ItemScene | EndingScene;

export const SCENES: SceneConfig[] = [
  {
    kind: 'hook',
    beats: 8,
    clip: 'clips/00-hook.mp4',
    lines: [
      [{text: '当我发现我怀念'}],
      [
        {text: '的'},
        {text: '不是学校', color: COLORS.red},
        {text: '而是…', color: COLORS.yellow, scale: 1.25},
      ],
    ],
    en: 'When I realized that what I miss isn’t school, but…',
  },
  {
    kind: 'item',
    beats: 6,
    clip: 'clips/01.mp4',
    no: 1,
    title: '课间的嬉戏打闹',
    en: 'Playful horseplay during recess',
    quotes: [
      {text: '你给我站住', x: 17, y: 30, beat: 1},
      {text: '来追我呀', x: 82, y: 30, beat: 2},
    ],
  },
  {
    kind: 'item',
    beats: 6,
    clip: 'clips/02.mp4',
    no: 2,
    title: '无话不谈的朋友',
    en: 'A friend with whom I can talk about anything',
    quotes: [
      {text: '下午吃啥', x: 14, y: 50, beat: 1},
      {text: '不到啊', x: 62, y: 46, beat: 3},
    ],
  },
  {
    kind: 'item',
    beats: 6,
    clip: 'clips/03.mp4',
    no: 3,
    title: '早自习偷偷睡觉',
    en: 'Sneaking a nap during morning study time',
    quotes: [
      {text: '老师来了叫我', x: 22, y: 35, beat: 1},
      {text: '行', x: 82, y: 30, beat: 3},
    ],
  },
  {
    kind: 'item',
    beats: 6,
    clip: 'clips/04.mp4',
    no: 4,
    title: '放学一起回家',
    en: 'Walking home together after school',
    quotes: [
      {text: '等等我', x: 20, y: 40, beat: 1},
      {text: '快点啦', x: 78, y: 36, beat: 2},
    ],
  },
  {
    kind: 'item',
    beats: 6,
    clip: 'clips/05.mp4',
    no: 5,
    title: '和同学一起打球',
    en: 'Playing basketball with classmates',
    quotes: [
      {text: '我直接一个三分', x: 18, y: 38, beat: 1},
      {text: 'WC', x: 62, y: 58, beat: 3},
    ],
  },
  {
    kind: 'ending',
    beats: 8,
    clip: 'clips/06-ending.mp4',
    lines: [
      [{text: '而是'}],
      [{text: '那群陪我长大的人', color: COLORS.yellow}],
    ],
    en: 'but the people who grew up with me',
  },
];
