import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import { CUES } from './data/script';
import { worldTransform } from './lib/camera';
import { clamp } from './lib/anim';
import { Lighting } from './components/Ground';
import { Subtitle } from './components/Subtitle';
import { BigWord, Impact } from './components/BigWord';
import { Hud } from './components/Hud';
import { SectionDef } from './sections/story';
import { S1Hook } from './sections/S1Hook';
import { S2Scratch } from './sections/S2Scratch';
import { S3Escalate, s3LightBoost } from './sections/S3Escalate';

/** 已做好的节（之后的节按同样的接口往后加）。 */
const SECTIONS: SectionDef[] = [S1Hook, S2Scratch, S3Escalate];

/** 等字体（含要用到的所有汉字分片）加载完再开始截帧。 */
const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const text = CUES.map((c) => c.text).join('') + '锯子移动距离0123456789 cm';
    const big = CUES.map((c) => c.big?.word ?? '').join('');
    Promise.all([
      document.fonts.load('700 64px "Noto Sans SC"', text),
      document.fonts.load('900 56px "Noto Sans SC"', text),
      document.fonts.load('900 210px "Noto Sans SC"', big),
    ])
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle));
  }, [handle]);
};

/**
 * 整片是一个连续镜头：所有节共用同一个世界坐标和相机，
 * 节与节之间靠相机推、拉、移衔接；字幕 / 大字 / 标注在相机之外。
 */
export const Film: React.FC<{ end: number; audio?: string; textOnly?: boolean }> = ({ end, audio, textOnly = false }) => {
  useFonts();
  const frame = useCurrentFrame();
  const sec = SECTIONS.find((s) => frame >= s.start && frame < s.end) ?? SECTIONS[SECTIONS.length - 1];
  const cam = sec.camera(frame);
  const light = sec.light(frame);
  const World = sec.World;
  const Overlay = sec.Overlay;
  const fadeOut = clamp((end - frame) / 14);
  const fadeIn = clamp(frame / 8);

  if (textOnly) {
    // 自检用：只渲染文字层（黑底），用来检测字有没有进右侧禁字区、有没有出画、高亮颜色对不对
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        <BigWord until={end} />
        <Hud until={end} />
        <Subtitle until={end} band={false} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: light.base }}>
      <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
        <svg width={1920} height={1080} style={{ position: 'absolute' }}>
          <g transform={worldTransform(cam)}>
            <World frame={frame} cam={cam} light={light} />
          </g>
        </svg>
        <Lighting cam={cam} light={light} at={sec.lightAt(frame)} extra={s3LightBoost(frame)} />
        {Overlay && <Overlay frame={frame} cam={cam} />}
        <Impact />
        <BigWord until={end} />
        <Hud until={end} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <Subtitle until={end} />
      </AbsoluteFill>
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
