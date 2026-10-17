import React from 'react';
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from 'remotion';
import './fonts';
import { BigWord } from './components/BigWord';
import { Subtitle } from './components/Subtitle';
import { Watermark } from './components/Watermark';
import { at, script, section } from './data/script';
import { prog } from './lib/anim';
import { Early } from './sections/Early';
import { Opening } from './sections/Opening';
import { Thesis } from './sections/Thesis';
import { thesisPullOut } from './sections/rigs';
import { C } from './theme';

const PREVIEW_END = script.preview.endFrame;

/** 画面里所有“砸下来的大字”，屏幕坐标，不受镜头影响。 */
const BigWords: React.FC = () => {
  const inPreview = script.screens.filter((s) => s.bigWord && s.startFrame < PREVIEW_END);
  return (
    <>
      {inPreview.map((s) => {
        const next = inPreview.find((o) => o.section === s.section && o.startFrame > s.startFrame);
        return <BigWord key={s.id} s={s} dimAt={next ? next.startFrame - 2 : null} outAt={section(s.section).endFrame - 24} />;
      })}
    </>
  );
};

export const Preview: React.FC<{ textOnly?: boolean }> = ({ textOnly = false }) => {
  const f = useCurrentFrame();
  // 交接窗口：开头 → 拆开命题（推近），拆开命题 → 早熟长什么样（拉远）
  const t1 = at(3);
  const t2 = at(7);
  const openingOpacity = 1 - prog(f, t1, t1 + 14);
  const thesisOpacity = prog(f, t1 - 6, t1 + 8) * (1 - prog(f, t2 + 2, t2 + 16));
  const earlyOpacity = prog(f, t2 - 12, t2 + 2);
  const fadeOut = prog(f, PREVIEW_END - 26, PREVIEW_END - 2);

  if (textOnly) {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <BigWords />
        <Subtitle textOnly />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {f < t1 + 16 ? <Opening opacity={openingOpacity} /> : null}
      {f >= t1 - 6 && f < t2 + 16 ? <Thesis opacity={thesisOpacity} extra={thesisPullOut(f)} /> : null}
      {f >= t2 - 12 ? <Early opacity={earlyOpacity} /> : null}
      <BigWords />
      <AbsoluteFill style={{ background: '#000', opacity: fadeOut }} />
      <Subtitle />
      <Watermark />
      <Html5Audio src={staticFile('audio/sfx-preview.wav')} />
    </AbsoluteFill>
  );
};
