import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {type CameraKey, CameraProvider, monotone} from './camera/Camera';
import {BaseLayer, Dust, Grain, type LightState, Vignette} from './components/Background';
import {Subtitles} from './components/Subtitles';
import {TopicLabel} from './components/TopicLabel';
import {useFontsReady} from './fonts';
import type {Direction, LightKey} from './sections/direction';
import {S01TwoChoices, s01Direction} from './sections/S01TwoChoices';
import {S02StatusQuo, s02Direction} from './sections/S02StatusQuo';
import {SfxTrack} from './sfx/SfxTrack';
import {backdrop, palette} from './theme';

const DIRECTIONS: Direction[] = [s01Direction, s02Direction];

const CAMERA_KEYS: CameraKey[] = DIRECTIONS.flatMap((d) => d.camera).sort((a, b) => a.f - b.f);
const KICKS = DIRECTIONS.flatMap((d) => d.kicks);
const LIGHT_KEYS: LightKey[] = DIRECTIONS.flatMap((d) => d.light).sort((a, b) => a.f - b.f);
const FLASHES = DIRECTIONS.flatMap((d) => d.flashes);
const IMPULSES = DIRECTIONS.flatMap((d) => d.impulses);
const CUES = DIRECTIONS.flatMap((d) => d.cues).sort((a, b) => a.f - b.f);

/** 光线：复用镜头的平滑插值，再叠加冲击时的缓慢提亮 */
const evalLight = (frame: number): LightState => {
	const ts = LIGHT_KEYS.map((k) => k.f);
	const asCam = (pick: (k: LightKey) => number) => monotone(ts, LIGHT_KEYS.map(pick), frame);
	let alpha = asCam((k) => k.alpha);
	for (const fl of FLASHES) {
		const dt = frame - fl.f;
		if (dt >= 0) alpha += fl.amount * Math.min(1, dt / 4) * Math.exp(-dt / fl.decay);
	}
	return {
		alpha: Math.max(0, Math.min(backdrop.radialMax + 0.01, alpha)),
		cx: asCam((k) => k.cx),
		cy: asCam((k) => k.cy),
		vignette: asCam((k) => k.vignette),
	};
};

/**
 * 整片：一个连续镜头
 * 背景（暗底 + 径向光 + 远尘埃）→ 各节主体 → 近尘埃 → 暗角 → 噪点 → 左上角标注 → 字幕
 */
export const Film: React.FC<{fadeOutFrom?: number; fadeOutTo?: number}> = ({fadeOutFrom, fadeOutTo}) => {
	useFontsReady();
	const frame = useCurrentFrame();
	const light = useMemo(() => evalLight(frame), [frame]);
	const fade = fadeOutFrom !== undefined && fadeOutTo !== undefined ? Math.max(0, Math.min(1, (frame - fadeOutFrom) / (fadeOutTo - fadeOutFrom))) : 0;
	return (
		<AbsoluteFill style={{backgroundColor: palette.bg, overflow: 'hidden'}}>
			<CameraProvider keys={CAMERA_KEYS} kicks={KICKS}>
				<BaseLayer light={light} />
				<Dust layer="far" impulses={IMPULSES} />
				<S01TwoChoices />
				<S02StatusQuo />
				<Dust layer="near" impulses={IMPULSES} />
				<Vignette strength={light.vignette} />
				<Grain />
			</CameraProvider>
			<TopicLabel />
			<Subtitles />
			<SfxTrack cues={CUES} />
			{fade > 0 ? <AbsoluteFill style={{backgroundColor: palette.bg, opacity: fade}} /> : null}
		</AbsoluteFill>
	);
};
