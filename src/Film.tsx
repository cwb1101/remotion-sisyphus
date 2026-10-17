import React from 'react';
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from 'remotion';
import './fonts';
import { BigWords } from './components/BigWords';
import { Subtitle } from './components/Subtitle';
import { Watermark } from './components/Watermark';
import { at, script } from './data/script';
import { prog } from './lib/anim';
import { Early } from './sections/Early';
import { Ending } from './sections/Ending';
import { Exit } from './sections/Exit';
import { HalfSeen } from './sections/HalfSeen';
import { NotLazy } from './sections/NotLazy';
import { Opening } from './sections/Opening';
import { Thesis } from './sections/Thesis';
import { Walkers } from './sections/Walkers';
import { thesisPullOut } from './sections/rigs';
import { C } from './theme';

const LAST = script.film.lastScreen;

/**
 * 完整片：整片是一个连续镜头，节与节之间没有黑场。
 *   开头 →推近→ 拆开命题 →拉远→ 早熟长什么样 →（同一镜头）→ 看透只看了一半 →推进半亮的球→
 *   不是懒 →（镜头跟着先走路的人往右）→ 先走路的人 →（分屏，再收回左屏）→ 出口 →（越过少年往前看）→ 收尾
 * 相邻两节在交接帧上画的是同一个状态，所以有的地方是直接切换，有的地方用 10–16 帧交叠。
 */
export const Film: React.FC<{ textOnly?: boolean }> = ({ textOnly = false }) => {
  const f = useCurrentFrame();
  if (textOnly) {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <BigWords lastScreen={LAST} />
        <Subtitle textOnly lastScreen={LAST} />
      </AbsoluteFill>
    );
  }
  const t3 = at(3);
  const t7 = at(7);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {f < t3 + 16 ? <Opening opacity={1 - prog(f, t3, t3 + 14)} /> : null}
      {f >= t3 - 6 && f < t7 + 16 ? <Thesis opacity={prog(f, t3 - 6, t3 + 8) * (1 - prog(f, t7 + 2, t7 + 16))} extra={thesisPullOut(f)} /> : null}
      {f >= t7 - 12 && f < at(14) ? <Early opacity={prog(f, t7 - 12, t7 + 2)} /> : null}
      {f >= at(14) && f < at(19) + 14 ? <HalfSeen opacity={1} /> : null}
      {f >= at(19) - 6 && f < at(31) ? <NotLazy opacity={prog(f, at(19) - 6, at(19) + 8)} /> : null}
      {f >= at(38) - 1 && f < at(53) ? <Exit opacity={1} /> : null}
      {f >= at(31) && f < at(39) + 22 ? <Walkers opacity={1} /> : null}
      {f >= at(53) ? <Ending opacity={1} /> : null}
      <BigWords lastScreen={LAST} />
      <Subtitle lastScreen={LAST} />
      <Watermark />
      <Html5Audio src={staticFile('audio/sfx-full.wav')} />
    </AbsoluteFill>
  );
};
