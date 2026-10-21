import {CEILING, ROOM} from '../theme';

// 节与节之间的交接状态：上一节结束时的样子 = 下一节开始时的样子，保证一镜到底

export const HANDOFF = {
	hookToQuestion: {
		ceiling: CEILING.slam,
		ceilingGlow: 0.6,
		warmth: 1.1,
		personX: 820,
		/** 托天花板时双手相对髋部的水平位置 */
		hands: {front: 74, back: 40},
	},
	questionToChoice: {
		ceiling: CEILING.slam,
		ceilingGlow: 0.35,
		warmth: 0.9,
		personX: 760,
		door: {open: 0, light: 0.55, fog: 0.5, spill: 0.35},
		gauge: {x: 300, value: 0.72, threshold: 0.92, height: 440},
		backdrop: {warm: 0.75, cool: 1, dark: 0.45},
	},
	/** 预览最后一帧（第 11 屏结束）的状态，完整片从这里接着往下拍 */
	choiceToName: {
		ceiling: CEILING.slam,
		ceilingGlow: 0.35,
		warmth: 1.5,
		door: {open: 1, light: 0.4, fog: 0.6, spill: 0.45},
		backdrop: {warm: 1.45, cool: 0.2, dark: 0.35, warmX: 40, warmY: 58},
	},
	nameToExamples: {personX: 760, warmth: 1.3, backdrop: {warm: 0.9, cool: 0, dark: 0.45}},
	examplesToThreshold: {
		personX: 500,
		warmth: 1.6,
		door: {open: 0.35, light: 0.12, fog: 1, spill: 0.15},
		backdrop: {warm: 1.3, cool: 0.1, dark: 0.4},
	},
	thresholdToLedger: {
		personX: 1300,
		roomDraw: 0,
		door: {open: 0.7, light: 0.35, fog: 1, spill: 0.4},
		backdrop: {warm: 0.9, cool: 0.6, dark: 0.4},
	},
	ledgerToInstallment: {personX: 455, theta: -16, warmth: 1.2, door: {open: 0.7, light: 0.35, fog: 1, spill: 0.3}, backdrop: {warm: 1, cool: 0.2, dark: 0.4}},
	installmentToClose: {personX: 615, squeeze: 140, ceiling: 330, door: {open: 0.7, light: 0.35, fog: 1, spill: 0.3}, backdrop: {warm: 0.9, cool: 0.25, dark: 0.4}},
};

/** 第 11 屏的钟（挂在天花板上方被压缩掉的空间里） */
export const CLOCK = {x: 900, y: 360, r: 46};

/** 房间中心在屏幕上的位置（百分比），给背景暖光定位 */
export const warmCenter = (sx: number, sy: number) => ({warmX: (sx / 1920) * 100, warmY: (sy / 1080) * 100});

/** 屋内可站立的最大身高（留出头顶与天花板的间隙） */
export const headroom = (ceiling: number) => ROOM.floor - (ROOM.top + ceiling) - 10;
