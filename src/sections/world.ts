// 育婴房的世界坐标布局和镜头机位。整片是一个连续镜头，镜头在这个世界里推拉摇移。
import { Vec } from "../lib/ik";

export const WALL_BASE = 940; // 墙和地面的交界
export const CRADLE_FOOT = 1050; // 摇篮脚落地
export const RIM_Y = 950; // 摇篮近侧边沿顶
export const STAND_Y = 1085; // 大人站的地面线（比摇篮略靠前）
export const NURSE_H = 95; // 成人头高 → 身高约 380
export const BABY_H = 50; // 婴儿头高

export const CRADLES = Array.from({ length: 8 }, (_, i) => 380 + i * 440);
export const HERO_CRADLE = 2;
export const HERO_X = CRADLES[HERO_CRADLE];

/** 婴儿躺在摇篮里时骨盆的位置 */
export const babyRoot = (cx: number): Vec => ({ x: cx + 34, y: RIM_Y - 22 });
/** 每张摇篮边沿上那只碗（左端） */
export const bowlOnRim = (cx: number): Vec => ({ x: cx - 108, y: RIM_Y });

export const NURSE_X = 1040;
export const STOOL = { x: 1128, top: 1032 };
export const BASIN = { x: 1128, rim: 994, w: 118 };
export const DOOR = { x: 640, w: 150, h: 300 };
export const WINDOW = { x: 250, y: 330, w: 190, h: 250 };
/** 皇帝从门口进来（王冠影子就是他投进来的），走两步到第一张摇篮边 */
export const EMPEROR_X = 660;
export const EMPEROR_FROM = 40;
export const LECTERN_X = 120;
export const PORTRAIT = { x: -120, y: 470 };
export const BOWL_FLOOR: Vec = { x: 1188, y: 1092 };
export const NURSE_CROWD = [
  { x: 2810, facing: -1 as const, color: "nurse2", h: 0.97 },
  { x: 1960, facing: 1 as const, color: "nurse3", h: 1.03 },
  { x: 2370, facing: -1 as const, color: "nurse4", h: 0.95 },
  { x: 3245, facing: 1 as const, color: "nurse2", h: 1.0 },
];

export type Shot = { x: number; y: number; zoom: number };

/** 机位：镜头中心的世界坐标和缩放（1 = 世界 1px 对应屏幕 1px） */
export const SHOTS: Record<string, Shot> = {
  heroClose: { x: 1188, y: 836, zoom: 2.0 },
  heroCloser: { x: 1196, y: 842, zoom: 2.13 },
  rowWide: { x: 1930, y: 730, zoom: 0.5 },
  rowPan: { x: 2160, y: 760, zoom: 0.56 },
  emperor: { x: 470, y: 862, zoom: 1.45 },
  emperorClose: { x: 450, y: 852, zoom: 1.62 },
  heroFeed: { x: 1196, y: 902, zoom: 1.9 },
  railMacro: { x: 1292, y: 1002, zoom: 12 },
  babyClose: { x: 1200, y: 846, zoom: 2.4 },
  heroMedium: { x: 1206, y: 962, zoom: 1.62 },
  heroMediumDrift: { x: 1196, y: 958, zoom: 1.7 },
  doorWide: { x: 1000, y: 880, zoom: 1.36 },
  babyPush: { x: 1262, y: 884, zoom: 2.35 },
};
