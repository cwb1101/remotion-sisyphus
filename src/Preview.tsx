import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {CUES, SECTIONS, TOPIC, beat} from './data/script';
import {CameraProvider} from './lib/camera';
import {BottomShade, Slam, SfxTrack, Subtitles, TopicLabel} from './components/Overlay';
import {Section0, TAG_SCREEN} from './sections/Section0';
import {Section1} from './sections/Section1';
import {CAMERA, EIGHT, SINS, SKY} from './world';
import {mixColor} from './lib/anim';
import {FONT_SANS, FONT_SERIF} from './theme';

// 画面里出现的全部文字，用来提前加载字体子集
const GLYPHS = [
  ...CUES.map((c) => c.text),
  TOPIC,
  ...SECTIONS.map((s) => s.title),
  ...SINS,
  ...EIGHT,
  '谎言冷漠争吵据阿奎那神学大全公元4世纪头致命0123456789',
  'SEPTEM PECCATA CAPITALIA capitalia caput U',
].join('');

const useFonts = () => {
  const [handle] = useState(() => delayRender('加载思源字体'));
  useEffect(() => {
    const loads = [
      `500 64px ${FONT_SANS}`,
      `700 64px ${FONT_SANS}`,
      `700 64px ${FONT_SERIF}`,
      `900 64px ${FONT_SERIF}`,
      `italic 700 40px ${FONT_SERIF}`,
    ].map((f) => document.fonts.load(f, GLYPHS));
    Promise.all(loads)
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
};

const skyAt = (frame: number) => {
  let a = SKY[0];
  let b = SKY[0];
  for (let i = 0; i < SKY.length; i++) {
    if (SKY[i][0] <= frame) a = SKY[i];
    if (SKY[i][0] >= frame) {
      b = SKY[i];
      break;
    }
    b = SKY[i];
  }
  const t = b[0] === a[0] ? 0 : (frame - a[0]) / (b[0] - a[0]);
  const s = t * t * (3 - 2 * t);
  return {top: mixColor(a[1], b[1], s), bottom: mixColor(a[2], b[2], s)};
};

export const Preview: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const sky = skyAt(frame);
  return (
    <AbsoluteFill style={{background: sky.bottom}}>
      <AbsoluteFill style={{background: `linear-gradient(to bottom, ${sky.top}, ${sky.bottom})`}} />
      <CameraProvider keys={CAMERA} frame={frame}>
        <Section0 frame={frame} slot="back" />
        <Section1 frame={frame} slot="back" />
        <Section0 frame={frame} slot="main" />
        <Section1 frame={frame} slot="main" />
        <Section0 frame={frame} slot="front" />
        <Section1 frame={frame} slot="front" />
        <Section0 frame={frame} slot="screen" />
        <Section1 frame={frame} slot="screen" />
      </CameraProvider>
      <BottomShade />
      <Slam frame={frame} exitTo={{o4: {at: beat('o4', 'tagDetach'), x: TAG_SCREEN.x, y: TAG_SCREEN.y + 60, scale: 0.4}}} />
      <Subtitles frame={frame} />
      <TopicLabel frame={frame} />
      <SfxTrack />
    </AbsoluteFill>
  );
};
