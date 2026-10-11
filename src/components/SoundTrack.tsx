/**
 * 音轨：全部来自 script.json —— 每节的底噪、每屏的音效 cue、心跳节拍（与画面共用节拍轨）。
 * 音频文件由 scripts/synth-sfx.mjs 纯代码合成到 public/sfx/。
 */
import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {screens, sections, sectionRange, Screen} from '../data/script';
import {beatFrames} from '../lib/pulse';
import {clamp} from '../lib/anim';

const XFADE = 18;
/** 心跳与滴声的整体增益（让关键句的重击成为全片最响） */
const HEARTBEAT_GAIN = 0.6;
const BEEP_VOL = 0.15;
/** 重击瞬间，背景音乐自动压低（侧链式闪避） */
const IMPACTS = screens.flatMap((s) => (s.sfx ?? []).filter((c) => c.name === 'hit' || c.name === 'boom').map((c) => s.start + c.at));
const duck = (f: number) => {
	let d = 1;
	for (const t of IMPACTS) {
		const dt = f - t;
		if (dt >= -2 && dt < 40) d = Math.min(d, 1 - 0.7 * Math.exp(-Math.max(0, dt) / 16));
	}
	return d;
};

export const SoundTrack: React.FC<{end: number; sectionIds: string[]}> = ({end, sectionIds}) => {
	const beds = sections
		.filter((s) => sectionIds.includes(s.id) && s.bed)
		.map((s, i, arr) => {
			const r = sectionRange(s.id);
			const from = Math.max(0, r.start - (i === 0 ? 0 : XFADE));
			const to = i === arr.length - 1 ? end : r.end + XFADE;
			const dur = to - from;
			const vol = s.bedVol ?? 0.4;
			return (
				<Sequence key={s.id} from={from} durationInFrames={dur} layout="none">
					<Audio
						src={staticFile(`sfx/${s.bed}.wav`)}
						volume={(f) => vol * clamp(f / (i === 0 ? 8 : XFADE)) * clamp((dur - f) / XFADE) * duck(from + f)}
					/>
				</Sequence>
			);
		});

	const inRange = (s: Screen) => s.start < end && sectionIds.includes(s.section);
	const cueEls = screens.filter(inRange).flatMap((s) =>
		(s.sfx ?? []).map((c, i) => (
			<Sequence key={`${s.id}-${i}`} from={Math.max(0, s.start + c.at)} layout="none">
				<Audio src={staticFile(`sfx/${c.name}.wav`)} volume={c.vol} />
			</Sequence>
		))
	);

	const beatEls = beatFrames.flatMap((b, i) => {
		const f = Math.round(b);
		const s = screens.find((x) => f >= x.start && f < x.end);
		if (!s || !inRange(s) || !s.pulse || s.pulse.vol <= 0) return [];
		const els = [
			<Sequence key={`hb${i}`} from={f} layout="none">
				<Audio src={staticFile('sfx/heartbeat.wav')} volume={s.pulse.vol * HEARTBEAT_GAIN} />
			</Sequence>,
		];
		if (s.pulse.beep)
			els.push(
				<Sequence key={`bp${i}`} from={f} layout="none">
					<Audio src={staticFile('sfx/beep.wav')} volume={BEEP_VOL} />
				</Sequence>
			);
		return els;
	});

	return (
		<>
			{beds}
			{cueEls}
			{beatEls}
		</>
	);
};
