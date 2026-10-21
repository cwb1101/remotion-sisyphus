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
};

/** 屋内可站立的最大身高（留出头顶与天花板的间隙） */
export const headroom = (ceiling: number) => ROOM.floor - (ROOM.top + ceiling) - 10;
