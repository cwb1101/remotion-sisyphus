// 世界坐标布局 + 全片唯一的镜头轨道。
// 整片当作一个连续镜头：场景之间靠推、拉、移过渡，镜头时间全部取自字幕稿的节点。

import {beat, cue} from './data/script';
import {ease} from './lib/anim';
import type {CamKey} from './lib/camera';

export const SINS = ['傲慢', '嫉妒', '暴怒', '懒惰', '贪婪', '暴食', '色欲'];
/** 埃瓦格里乌斯《实践论》里的八种念头 */
export const EIGHT = ['暴食', '色欲', '贪婪', '悲伤', '暴怒', '倦怠', '虚荣', '傲慢'];

export const W = {
  /** 开头试管架：管口 y、中心 x */
  rack: {x: 0, y: -230, spacing: 150},
  floor0: 190,
  /** 卷轴墙（5–7.4 秒） */
  scroll: {right: -900, left: -2700},
  /** 时间刻度尺（7.4–10 秒） */
  ruler: {right: -2150, left: -4300, y: 190},
  /** 沙漠：修士与油灯 */
  monk: {x: -4330, y: 182},
  lamp: {x: -4196, y: 178},
  groundScroll: {x: -4150, y: 184},
  /** 石台：七支试管立在上面 */
  plinth: {x: -6400, top: 150, bottom: 330},
  /** 源头（CAPUT 字母聚成的圆） */
  source: {x: -6400, y: -450},
};

export const rackTubeX = (i: number) => W.rack.x + (i - 3) * W.rack.spacing;

export const CAMERA: CamKey[] = [
  // 3.4s 定格卡片开始缩小，镜头从近处拉远（与卡片同时），露出整排试管
  {f: beat('o3', 'reveal') - 2, x: rackTubeX(2), y: -60, s: 2.1},
  // 4.0s 之前匀速拉远，之后急刹（速度渐变）
  {f: beat('o3', 'ramp'), x: -20, y: -24, s: 1.18, e: ease.inOut},
  {f: beat('o3', 'ramp') + 24, x: 30, y: 0, s: 1.0, e: ease.out},
  {f: cue('o4').start, x: 36, y: 2, s: 0.995, e: ease.linear},
  {f: cue('o5').start, x: 60, y: 10, s: 1.07, e: ease.linear},
  // 5.0s 甩镜离开试管架
  {f: beat('o5', 'whip') + 12, x: -1500, y: 0, s: 1.0, e: ease.inOut},
  {f: cue('o6').start, x: -2350, y: 0, s: 1.0, e: ease.linear},
  // 时间往回卷：先快后慢，停在公元4世纪
  {f: beat('o6', 'rollEnd'), x: -3550, y: 0, s: 0.97, e: ease.out},
  {f: cue('c1').start, x: -3780, y: -10, s: 0.98, e: ease.inOut},
  {f: cue('c1').start + 30, x: -4120, y: -30, s: 1.06, e: ease.inOut},
  {f: cue('c2').start, x: -4190, y: -20, s: 1.12, e: ease.linear},
  // 推近卷轴
  {f: cue('c3').start, x: -4140, y: 40, s: 1.5, e: ease.inOut},
  // 横移穿过历史长廊
  {f: cue('c4').start, x: W.plinth.x - 80, y: 20, s: 1.25, e: ease.inOut},
  // 试管长大：镜头同时后退
  {f: beat('c4', 'grow') + 26, x: W.plinth.x - 20, y: -20, s: 0.95, e: ease.out},
  {f: cue('c5').start, x: W.plinth.x, y: 0, s: 0.98, e: ease.linear},
  {f: beat('c5', 'magnifier'), x: W.plinth.x + 20, y: 60, s: 1.05, e: ease.inOut},
  // 推向铭文里的 CAPITALIA
  {f: beat('c5', 'capJump'), x: W.plinth.x + 285, y: 275, s: 2.0, e: ease.inOut},
  // 字母飞上去，镜头跟着摇上去
  {f: cue('c6').start + 4, x: W.source.x, y: W.source.y + 30, s: 1.55, e: ease.inOut},
  {f: cue('c7').start, x: W.source.x, y: W.source.y + 10, s: 1.7, e: ease.linear},
  // 河流从源头流下，镜头沿河摇下来
  {f: cue('c7').end + 6, x: W.source.x, y: -300, s: 1.0, e: ease.inOut},
  {f: cue('c8').end, x: W.plinth.x, y: 150, s: 0.9, e: ease.inOut},
  // 拉远看整棵"罪的树"
  {f: cue('c9').end, x: W.plinth.x, y: -60, s: 0.62, e: ease.out},
];

/** 天空/环境底色关键帧 [帧, 顶部色, 底部色] */
export const SKY: [number, string, string][] = [
  [beat('o3', 'reveal'), '#0D1318', '#1A252E'],
  [cue('o5').start, '#0D1318', '#1A252E'],
  [cue('o5').start + 12, '#17120F', '#2A2219'],
  [beat('o6', 'dusk'), '#1D1622', '#3A2A2A'],
  [cue('c1').start, '#2A1F3D', '#8A4E3C'],
  [cue('c3').start, '#251D36', '#6E4440'],
  [cue('c3').start + 30, '#1E1A30', '#4A3040'],
  [cue('c4').start, '#101418', '#23272C'],
  [cue('c7').start, '#101418', '#23272C'],
  [beat('c7', 'spring'), '#0E1A2B', '#1B2E43'],
];
