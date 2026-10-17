import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Figure } from '../components/Figure';
import { Footprints } from '../components/Footprints';
import { impactFrame } from '../components/BigWord';
import { at, screen } from '../data/script';
import { clamp, prog } from '../lib/anim';
import { C } from '../theme';
import { StoryStage } from './StoryStage';
import { WalkerActor } from './StoryActors';
import { SG, TEEN_FINAL_X, TEEN_PRINTS, W1_END_X, WALKER_PRINTS_END, balloonAt, endingPan, teenProps, teenX } from './story';

/**
 * 收尾（屏 53–56）：天亮了一点。前方地面是一段段虚线，等着被踩实。
 * 少年走进画面，踩过的地方变成实线；最后一脚落下，整条地面亮起来——
 * 这时的构图和开头第一帧一样：地面在 y=760，少年站在 x=480，手里还是那颗气球，只是变成了随身的小灯。
 * 先走路的人从左边追上来，两个人一起往右走出画面。
 */
const DASH0 = W1_END_X + 260;
const DASHES = Array.from({ length: 26 }, (_, i) => DASH0 + i * 100);

export const Ending: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const cam = endingPan(f);
  const teen = teenProps(f);
  const b = balloonAt(f);
  const tx = teenX(f);
  const hit = impactFrame(screen(55));
  const foot = TEEN_FINAL_X + 20;
  const wave = clamp((f - hit) / 46);
  const litSpan = f >= hit ? 2200 * prog(f, hit, hit + 40) : 0;
  const exitFade = 1 - prog(f, screen(56).endFrame + 4, screen(56).endFrame + 46);
  const tailFade = prog(f, 3600 - 16, 3600 - 1);

  return (
    <StoryStage
      id="en"
      f={f}
      cam={cam}
      opacity={opacity}
      overlay={
        <>
          {f >= hit ? <rect width={1920} height={1080} fill={C.act} opacity={0.18 * Math.exp(-(f - hit) / 16)} /> : null}
          {tailFade > 0 ? <rect width={1920} height={1080} fill={C.bg} opacity={tailFade} /> : null}
        </>
      }
    >
      {/* 屏 53：前方一段段虚线；屏 54 踩过就变实 */}
      {DASHES.map((x, i) => {
        const show = prog(f, at(53) + 4 + i * 1.6, at(53) + 14 + i * 1.6);
        if (show <= 0) return null;
        const stepped = tx >= x - 30 && f >= at(54) - 10;
        return <line key={i} x1={x - 30} y1={SG} x2={x + 30} y2={SG} stroke={C.act} strokeWidth={stepped ? 6 : 3} strokeOpacity={(stepped ? 0.95 : 0.45) * show} strokeLinecap="round" />;
      })}
      {/* 屏 55：最后一脚落下，整条地面从脚下向两边亮起 */}
      {litSpan > 0 ? (
        <g>
          <line x1={foot - litSpan} y1={SG} x2={foot + litSpan} y2={SG} stroke={C.act} strokeWidth={5} strokeOpacity={0.9} />
          <rect x={foot - litSpan} y={SG} width={litSpan * 2} height={300} fill={C.act} opacity={0.07} />
        </g>
      ) : null}
      {f >= hit && wave < 1
        ? [0, 0.16, 0.32].map((d, i) => {
            const w = clamp(wave - d);
            return <ellipse key={i} cx={foot} cy={SG} rx={40 + w * 1700} ry={10 + w * 80} fill="none" stroke={C.act} strokeWidth={12 * (1 - w) + 1.5} opacity={0.75 * (1 - w)} />;
          })
        : null}
      <Footprints prints={TEEN_PRINTS} frame={f} scale={1.15} />
      <Footprints prints={WALKER_PRINTS_END} frame={f} scale={1.1} />
      <g opacity={exitFade}>
        {f >= at(56) - 1 ? <WalkerActor f={f} id="en-w" /> : null}
        <ellipse cx={teen.x} cy={SG + 6} rx={48} ry={8} fill="#000" opacity={0.3} />
        <Balloon id="en-b" {...b} />
        <Figure {...teen} />
      </g>
    </StoryStage>
  );
};
