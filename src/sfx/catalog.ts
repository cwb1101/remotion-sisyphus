/** 合成音效清单（scripts/synth-sfx.mjs 按名字生成 public/sfx/<name>.wav） */
export const SFX = {
	impact_soft: {seconds: 1.8},
	impact_heavy: {seconds: 3.2},
	click_soft: {seconds: 0.4},
	tick_type: {seconds: 0.2},
	whoosh: {seconds: 1.1},
	whoosh_long: {seconds: 1.8},
	whoosh_down: {seconds: 1.0},
	rise_soft: {seconds: 1.5},
	down_tone: {seconds: 1.0},
	pulse_low: {seconds: 0.8},
} as const;

export type SfxName = keyof typeof SFX;

export type SfxCue = {f: number; name: SfxName; volume?: number};
