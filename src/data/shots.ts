// 机位表 (世界坐标): x y 是画面中心, zoom 是放大倍数
// 世界布局: 地面 y = 0; 房间桌子在 x = 0; 聚光灯舞台在 x = 1000; 人群平原在 x = 1250..2750
// closeup: 有意的特写, 质检时允许裁掉头或脚
// moveFrames: 至少移动多少帧 (实际落定在之后的第一个底鼓上)
// enterFrom: 全片第一个机位从哪里开始推进来
// cut + portalFrom/portalTo: 穿过物件换场景. 镜头先推近上一场景里的 portalFrom (杯里的反光 手机屏),
//   一圈亮光盖住画面的那一帧换到新场景, 再从新场景的 portalTo 拉出来. 全程不黑场
export type Shot = {
	x: number; y: number; zoom: number; rot?: number; closeup?: boolean; moveFrames?: number; enterFrom?: Shot;
	cut?: boolean; portalFrom?: {x: number; y: number}; portalTo?: {x: number; y: number};
};

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

	// 第 3 节 融合: 平原上 人群暗下去, 推成两人中景
	fusionTwo: {x: 1080, y: -310, zoom: 1.6, moveFrames: 30},
	fusionBridge: {x: 1080, y: -290, zoom: 2.3, closeup: true, moveFrames: 24},
	fusionFall: {x: 1070, y: -250, zoom: 1.4, moveFrames: 16},
	fusionFaces: {x: 1070, y: -305, zoom: 2.1, closeup: true, moveFrames: 24},
	fusionOverlap: {x: 1050, y: -290, zoom: 1.7, moveFrames: 24},

	// 第 4 节 落到你身上: 卧室 (x -2000..-950). 从两杯合流处的反光穿进去, 从手机屏幕出来
	bedWide: {x: -1380, y: -320, zoom: 1.25, cut: true, portalFrom: {x: 1058, y: -262}, portalTo: {x: -1482, y: -236}},
	bedClose: {x: -1480, y: -222, zoom: 2.1, closeup: true, moveFrames: 24},
	phoneClose: {x: -1486, y: -160, zoom: 3.4, closeup: true, moveFrames: 24},
	bedSit: {x: -1290, y: -330, zoom: 1.35, moveFrames: 24},
	tallyWall: {x: -1200, y: -400, zoom: 1.9, closeup: true, moveFrames: 24},
	faceClose: {x: -1500, y: -185, zoom: 2.6, closeup: true, moveFrames: 24},
	bedMid: {x: -1410, y: -280, zoom: 1.6, moveFrames: 16},

	// 第 5 节 机制 + 第 6 节 转折: 平原尽头的冷光空地 (x 3300..4800). 从观众的手机穿到主角的手机
	mechTwo: {x: 4150, y: -300, zoom: 1.25, cut: true, portalFrom: {x: -1478, y: -205}, portalTo: {x: 3958, y: -262}},
	mechCup: {x: 3960, y: -235, zoom: 2.4, closeup: true, moveFrames: 24},
	mechTwo2: {x: 4150, y: -310, zoom: 1.4, moveFrames: 24},
	partnerTired: {x: 4380, y: -300, zoom: 2.1, closeup: true, moveFrames: 24},
	chase: {x: 4280, y: -300, zoom: 1.05, moveFrames: 24},
	dropClose2: {x: 4150, y: -190, zoom: 2.2, closeup: true, moveFrames: 20},
	shatterWide: {x: 4180, y: -250, zoom: 1.25, moveFrames: 12},
	shardsClose: {x: 4170, y: -95, zoom: 2.6, closeup: true, moveFrames: 24},
	kintsugi: {x: 4150, y: -250, zoom: 2.1, closeup: true, moveFrames: 24},
	riseUp: {x: 4170, y: -330, zoom: 1.3, moveFrames: 16},
	handsClose: {x: 4205, y: -280, zoom: 2.6, closeup: true, moveFrames: 30},
	farWide: {x: 3800, y: -560, zoom: 0.42, moveFrames: 50},
	oneSource: {x: 4200, y: -300, zoom: 1.35, moveFrames: 40},
	friend1: {x: 4100, y: -300, zoom: 1.45, moveFrames: 24},
	friend2: {x: 4200, y: -300, zoom: 1.4, moveFrames: 24},
	// 从主角杯里的反光穿回卧室, 从床边那只杯出来
	bedSelf: {x: -1240, y: -285, zoom: 1.6, cut: true, portalFrom: {x: 4202, y: -275}, portalTo: {x: -1205, y: -185}},

	// 第 7 节 金句: 卧室里起身转身, 再走回开头那间屋子
	quoteClose: {x: -1250, y: -300, zoom: 2.4, closeup: true, moveFrames: 12},
	quoteClose2: {x: -1250, y: -322, zoom: 2.8, closeup: true, moveFrames: 30},
	walkHome: {x: -200, y: -300, zoom: 1.3, moveFrames: 110},

	// 第 8 节 回到开头: cupClose 和 tableMidAgain 沿用开头的机位和构图
	tableMidAgain: {x: -10, y: -268, zoom: 1.85, moveFrames: 24},
	tableWarm: {x: -60, y: -262, zoom: 2.0, closeup: true, moveFrames: 24},
	clinkClose: {x: 0, y: -300, zoom: 2.6, closeup: true, moveFrames: 12},
	// 第 9 节 片尾: 拉到很远
	outroFar: {x: 500, y: -640, zoom: 0.42, moveFrames: 50},
};
