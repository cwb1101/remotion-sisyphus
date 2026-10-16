import React from 'react';
import { AbsoluteFill } from 'remotion';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import { COOL, WARM, WHITE } from './data/script';
import { LIGHTS } from './theme';
import { rgba } from './lib/anim';
import { Saw, SAW } from './components/Saw';
import { Snake } from './components/Snake';
import { Ground } from './components/Ground';
import { finalCoil } from './sections/story';
import { FONT_FAMILY } from './components/Subtitle';

/**
 * 3:4 封面（1080×1440）：和正片同一套暗夜冷钢画风。
 * 斜放的锯子 + 缠死在上面、浑身暖色裂纹的蛇；标题“野马效应”，一句钩子文案，右上角水印。
 */
export const COVER = { width: 1080, height: 1440 };

const coil = finalCoil();
const SAW_C = { x: SAW.x0 + SAW.length / 2, y: SAW.y + SAW.w / 2 };

export const Cover: React.FC = () => {
  const light = LIGHTS.tense;
  // 世界坐标 → 封面：锯子放大 1.3 倍，斜 -14°，放在画面中下部
  const world = `translate(540 900) rotate(-14) scale(1.3) translate(${-SAW_C.x} ${-SAW_C.y})`;
  return (
    <AbsoluteFill style={{ backgroundColor: light.base, fontFamily: FONT_FAMILY }}>
      <svg width={COVER.width} height={COVER.height} style={{ position: 'absolute' }}>
        <g transform={world}>
          <Ground frame={0} cam={{ x: SAW_C.x, y: SAW_C.y, z: 0.5, r: 0 }} light={light} wind={0} />
          <Snake id="cvu" segs={coil} layer="under" warmth={1} crack={0.8} shadow={false} />
          <Saw id="cvsaw" layer="body" holeColor={light.ground} glint={SAW.x0 + 520} />
          <Snake id="cvo" segs={coil} layer="over" warmth={1} crack={0.8} headGlow={0.7} />
          <Saw id="cvt" layer="teeth" toothGrow={1.45} warm={0.9} glint={SAW.x0 + 520} />
        </g>
      </svg>
      {/* 光：锯子处一团暖红光池 + 四周暗角 + 顶部压暗方便放标题 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 620px at 540px 900px, ${rgba(WARM, 0.22)} 0%, ${rgba(WARM, 0.06)} 50%, rgba(0,0,0,0) 100%)`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 58%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.8) 100%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0) 48%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0) 30%)' }} />

      {/* 标题区 */}
      <div style={{ position: 'absolute', left: 80, top: 150, right: 80 }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: WHITE, opacity: 0.7, letterSpacing: 10 }}>一则寓言 · 一种情绪</div>
        <div
          style={{
            marginTop: 14,
            fontSize: 196,
            fontWeight: 900,
            lineHeight: 1.05,
            color: WARM,
            letterSpacing: 8,
            textShadow: `0 8px 24px rgba(0,0,0,0.85), 0 0 50px ${rgba(WARM, 0.45)}`,
          }}
        >
          野马效应
        </div>
        <div style={{ marginTop: 34, fontSize: 64, fontWeight: 700, lineHeight: 1.35, color: WHITE, textShadow: '0 3px 10px rgba(0,0,0,0.9)' }}>
          锯子<span style={{ color: COOL }}>一动没动</span>，
          <br />
          蛇却没能离开
        </div>
      </div>

      {/* 底部：0 cm 标注 + 一句点题 */}
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 96, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: WHITE, opacity: 0.65, letterSpacing: 4 }}>锯子移动距离</div>
          <div style={{ fontSize: 76, fontWeight: 900, color: COOL, lineHeight: 1 }}>0 cm</div>
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, color: WHITE, opacity: 0.92, textAlign: 'right', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
          真正伤人的，
          <br />
          往往是你自己的反应
        </div>
      </div>

      {/* 右上角水印：和正片同款 */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: 40,
          padding: '6px 14px 7px',
          border: '1px solid #FFFFFF',
          color: '#FFFFFF',
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: 2,
          opacity: 0.35,
        }}
      >
        肆号静匣Logos
      </div>
    </AbsoluteFill>
  );
};
