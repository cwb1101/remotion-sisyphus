import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import { CUES } from './data/script';
import { worldTransform } from './lib/camera';
import { clamp, ease } from './lib/anim';
import { Lighting } from './components/Ground';
import { Subtitle } from './components/Subtitle';
import { BigWord, Impact } from './components/BigWord';
import { Hud } from './components/Hud';
import { Watermark, WATERMARK } from './components/Watermark';
import { SectionDef } from './sections/story';
import { S1Hook } from './sections/S1Hook';
import { S2Scratch } from './sections/S2Scratch';
import { S3Escalate } from './sections/S3Escalate';
import { S4Reveal } from './sections/S4Reveal';
import { S5Name } from './sections/S5Name';
import { S6Human } from './sections/S6Human';
import { S7Release } from './sections/S7Release';
import { S8Ending } from './sections/S8Ending';

/** 全片各节，按时间顺序。 */
export const SECTIONS: SectionDef[] = [S1Hook, S2Scratch, S3Escalate, S4Reveal, S5Name, S6Human, S7Release, S8Ending];

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
      document.fonts.load('500 22px "Noto Sans SC"', WATERMARK.text),
    ])
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle));
  }, [handle]);
};

/** 一节在某一帧的完整画面（世界 + 光 + 叠加层），供交叉溶解和卡片翻面复用。 */
const Layer: React.FC<{ sec: SectionDef; frame: number }> = ({ sec, frame }) => {
  const cam = sec.camera(frame);
  const light = sec.light(frame);
  const World = sec.World;
  const Overlay = sec.Overlay;
  return (
    <AbsoluteFill style={{ backgroundColor: light.base, overflow: 'hidden' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <g transform={worldTransform(cam)}>
          <World frame={frame} cam={cam} light={light} />
        </g>
      </svg>
      <Lighting cam={cam} light={light} at={sec.lightAt(frame)} extra={sec.lightBoost?.(frame) ?? 0} />
      {Overlay && <Overlay frame={frame} cam={cam} />}
    </AbsoluteFill>
  );
};

/**
 * 整片是一个连续镜头：所有节共用同一套世界坐标和相机，
 * 节与节之间靠相机推、拉、移，交叉溶解或卡片翻面衔接，不经过黑场；
 * 字幕 / 大字 / 标注 / 水印都在相机之外。
 */
export const Film: React.FC<{ end: number; audio?: string; textOnly?: boolean }> = ({ end, audio, textOnly = false }) => {
  useFonts();
  const frame = useCurrentFrame();
  const sec = SECTIONS.find((s) => frame >= s.start && frame < s.end) ?? SECTIONS[SECTIONS.length - 1];
  const prev = SECTIONS[SECTIONS.indexOf(sec) - 1];
  const next = SECTIONS[SECTIONS.indexOf(sec) + 1];
  const fadeOut = clamp((end - frame) / 14);
  const fadeIn = clamp(frame / 8);

  if (textOnly) {
    // 自检用：只渲染文字层（黑底、不含水印），用来检测字有没有进右侧禁字区 / 水印区、有没有出画、高亮颜色对不对
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        <BigWord until={end} />
        <Hud until={end} />
        <Subtitle until={end} band={false} />
      </AbsoluteFill>
    );
  }

  const blend = sec.blendIn && prev ? ease.inOut(clamp((frame - sec.start) / sec.blendIn)) : 1;
  const card = sec.card?.(frame) ?? null;

  let picture: React.ReactNode;
  if (card) {
    const inner = card.showNext && next ? <Layer sec={next} frame={frame} /> : <Layer sec={sec} frame={frame} />;
    picture = (
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #141A22 0%, #080A0D 100%)' }}>
        <AbsoluteFill
          style={{
            transform: `translate(${card.tx}px, ${card.ty}px) scale(${card.scale * card.sx}, ${card.scale})`,
            borderRadius: card.radius,
            overflow: 'hidden',
            boxShadow: card.radius > 1 ? '0 30px 80px rgba(0,0,0,0.7), 0 0 0 3px rgba(79,209,197,0.35)' : 'none',
          }}
        >
          {inner}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  } else if (blend < 1 && prev) {
    picture = (
      <>
        <Layer sec={prev} frame={frame} />
        <AbsoluteFill style={{ opacity: blend }}>
          <Layer sec={sec} frame={frame} />
        </AbsoluteFill>
      </>
    );
  } else {
    picture = <Layer sec={sec} frame={frame} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#0E1116' }}>
      <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
        {picture}
        <Impact />
        <BigWord until={end} />
        <Hud until={end} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <Subtitle until={end} />
      </AbsoluteFill>
      <Watermark />
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
