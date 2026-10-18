// 整片：一个连续镜头。层级从下到上：
//   镜头层（背景、光束、尘埃、贯穿物件、各节的附着画面）→ 闪光 → 主字幕 → 水印（镜头层外，固定不动）
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-sans-sc/400.css';
import { Backdrop, Vignette } from './components/Backdrop';
import { Dust } from './components/Dust';
import { LightBeam, beamGeometry } from './components/LightBeam';
import { Mote } from './components/Mote';
import { Soundtrack } from './components/Soundtrack';
import { Subtitles } from './components/Subtitles';
import { Watermark } from './components/Watermark';
import { CREDITS, SCREENS } from './data/subtitles';
import { clamp, ease } from './film/anim';
import { DROP } from './film/cues';
import { mergeKeys, shotAt } from './film/shot';
import { C, FONT_SANS, FONT_SERIF, H, W } from './film/theme';
import { EvidenceOverlay, evidenceKeys, evidenceSfx } from './sections/Evidence';
import { HookOverlay, hookFlash, hookKeys, hookSfx } from './sections/Hook';

const KEYS = mergeKeys(hookKeys, evidenceKeys);
export const SFX = [...hookSfx, ...evidenceSfx];

const useFonts = () => {
  const [handle] = useState(() => delayRender('加载思源字体'));
  useEffect(() => {
    const serifText = SCREENS.map((s) => s.text).join('');
    const sansText = SCREENS.map((s) => s.label ?? '').join('') + CREDITS.lines.join('') + '肆号静匣Logos高度0123456789km';
    Promise.all([
      document.fonts.load(`700 74px ${FONT_SERIF}`, serifText),
      document.fonts.load(`400 28px ${FONT_SANS}`, sansText),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

const World: React.FC = () => {
  const f = useCurrentFrame();
  const st = shotAt(KEYS, f);
  // 光束 18 帧扫过画面，从 drop 那一拍开始
  const sweep = ease.out(clamp((f - DROP) / 18));
  const beam = beamGeometry(sweep, st.beam, f);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <Backdrop cool={st.cool} lightAngle={st.lightAngle} ambient={st.ambient} />
      <LightBeam beam={beam} />
      <Dust logS={Math.log(st.s)} panX={(st.cx - W / 2) * 0.25} panY={(st.cy - st.r - 700) * 0.12} tau={st.tau} ambient={st.ambient} beam={beam} />
      <Mote cx={st.cx} cy={st.cy} r={st.r} lightAngle={st.lightAngle} lightAmt={st.lightAmt} rim={st.rim} ambient={Math.min(1, st.ambient)} />
      <HookOverlay f={f} st={st} />
      <EvidenceOverlay f={f} st={st} />
      <Vignette />
    </svg>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const a = hookFlash(f);
  if (a < 0.002) return null;
  return <AbsoluteFill style={{ backgroundColor: C.gold, opacity: a, mixBlendMode: 'screen' }} />;
};

export const Film: React.FC<{ durationInFrames: number; fadeOutFrames?: number }> = ({ durationInFrames, fadeOutFrames }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <World />
      <Flash />
      <Subtitles />
      <Watermark />
      <Soundtrack cues={SFX} durationInFrames={durationInFrames} fadeOutFrames={fadeOutFrames} />
    </AbsoluteFill>
  );
};
