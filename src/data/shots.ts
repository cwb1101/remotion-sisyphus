// 机位表 (世界坐标): x y 是画面中心, zoom 是放大倍数
// 世界布局: 地面 y = 0; 房间桌子在 x = 0; 聚光灯舞台在 x = 1000; 人群平原在 x = 1250..2750
// closeup: 有意的特写, 质检时允许裁掉头或脚
// moveFrames: 至少移动多少帧 (实际落定在之后的第一个底鼓上)
// enterFrom: 全片第一个机位从哪里开始推进来
export type Shot = {x: number; y: number; zoom: number; rot?: number; closeup?: boolean; moveFrames?: number; enterFrom?: Shot};

export const SHOTS: Record<string, Shot> = {
	cupClose: {x: -78, y: -228, zoom: 4.3, closeup: true, moveFrames: 40, enterFrom: {x: -72, y: -222, zoom: 5.4}},
	tableMid: {x: -10, y: -268, zoom: 1.85, moveFrames: 24},
	dropClose: {x: 58, y: -248, zoom: 3.4, closeup: true, moveFrames: 18},
	heroHalf: {x: -160, y: -280, zoom: 2.4, closeup: true, moveFrames: 24},
	tableWide: {x: 0, y: -250, zoom: 1.2, moveFrames: 24},
	leanMid: {x: -40, y: -300, zoom: 2.0, closeup: true, moveFrames: 24},
	hookWide: {x: 330, y: -300, zoom: 0.74, rot: 0, moveFrames: 30},
	stage: {x: 880, y: -330, zoom: 1.18, moveFrames: 30},
	stackPush: {x: 950, y: -380, zoom: 1.32, moveFrames: 24},
	crowdWide: {x: 1830, y: -300, zoom: 0.7, moveFrames: 40},
	crowdWide2: {x: 1800, y: -310, zoom: 0.76, moveFrames: 30},
};
