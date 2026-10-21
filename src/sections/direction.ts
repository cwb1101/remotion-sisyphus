import type {CameraKey, CameraKick} from '../camera/Camera';
import type {DustImpulse} from '../components/Background';
import type {SfxCue} from '../sfx/catalog';

export type LightKey = {f: number; alpha: number; cx: number; cy: number; vignette: number};

export type LightFlash = {f: number; amount: number; decay: number};

/** 每一节的“调度”：镜头、光线、尘埃冲击、音效，全部以字幕屏为时间锚点 */
export type Direction = {
	camera: CameraKey[];
	kicks: CameraKick[];
	light: LightKey[];
	flashes: LightFlash[];
	impulses: DustImpulse[];
	cues: SfxCue[];
};
