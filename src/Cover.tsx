import React from 'react';
import {AbsoluteFill} from 'remotion';
import {useFonts} from './Fonts';
import {Cam, fogged, project} from './lib/camera';
import {C, FONT_SANS, FONT_SERIF} from './theme';
import {FigureBody, pose, RimLit} from './components/Figure';
import {HorseBody} from './components/Horse';
import {HelmetDefs} from './components/Helmet';
import {Windmill} from './components/Windmill';
import {Beam, Dust} from './components/Light';
import {FilmLook} from './components/FilmLook';
import {Watermark} from './components/Watermark';
import {FAR_MILLS, FogBands, Grass, Lance, makeClumps, ridge, ridgeHeight, RIDE, Sky, SKY_DUSK} from './scenes/Opening';

/**
 * 3:4 竖版封面（1080×1440）：沿用成片的画面——黄昏逆光、巨大的风车、放平长矛的骑手，
 * 上方大标题，下方一句钩子。全部用代码绘制。
 */
export const COVER_W = 1080;
export const COVER_H = 1440;

const cam: Cam = {x: 0, y: 170, z: -400, f: 1300, cx: 540, cy: 860};
const CLUMPS = makeClumps('cover', 60, -1400, 1400, -300, 2400);

const textShadow = '0 0 30px rgba(0,0,0,0.7), 0 3px 8px rgba(0,0,0,0.6)';

export const Cover: React.FC = () => {
  useFonts();
  const giant = project(cam, 300, 0, 1800);
  const rider = project(cam, -330, 0, 900);
  const rp = pose({torso: 14, shF: 44, elF: 40}, RIDE);
  const handAngle = rp.torso - rp.shF - rp.elF;
  const fogD = 5200;
  const sunX = giant.x + 30;
  return (
    <AbsoluteFill style={{background: C.base, overflow: 'hidden'}}>
      <Sky cam={cam} frame={20} dim={0} tone={{...SKY_DUSK, sunX}} />
      <svg width={COVER_W} height={COVER_H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <HelmetDefs />
          <linearGradient id="coverBottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0B0907" stopOpacity={0} />
            <stop offset="0.45" stopColor="#0B0907" stopOpacity={0.82} />
            <stop offset="1" stopColor="#0B0907" stopOpacity={0.96} />
          </linearGradient>
          <linearGradient id="coverTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0B0907" stopOpacity={0.75} />
            <stop offset="1" stopColor="#0B0907" stopOpacity={0} />
          </linearGradient>
          <radialGradient id="coverShadow">
            <stop offset="0" stopColor="#000" stopOpacity={0.5} />
            <stop offset="1" stopColor="#000" stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* 远山与远处的风车阵 */}
        <g style={{filter: 'blur(1.2px)'}}>
          {ridge(cam, 11000, 900, 0.00021, 1.3, '#3A2D20', fogD)}
          {ridge(cam, 7600, 520, 0.00033, 4.1, '#2C2219', fogD)}
          {ridge(cam, 5200, 260, 0.00052, 2.2, '#211A13', fogD)}
          {FAR_MILLS.map(([x, z], i) => {
            const p = project(cam, x * 0.8, ridgeHeight(x, 260, 0.00052, 2.2) * 0.85, z);
            return <Windmill key={i} x={p.x} y={p.y} scale={p.s} rot={i * 23 + 8} fill={fogged('#15100B', '#7A6040', p.d, fogD)} detail={false} />;
          })}
          {[0, 1, 2, 3, 4].map((i) => (
            <Beam key={i} id={`cray${i}`} x1={sunX} y1={cam.cy - 70} w1={20} x2={sunX + (i - 2) * 520} y2={cam.cy + 700} w2={220 + i * 40} opacity={0.3} />
          ))}
        </g>
        <Grass cam={cam} clumps={CLUMPS} frame={20} filter={(d) => d > 900} fogD={4200} />
        {/* 那架巨大的风车 */}
        <Windmill x={giant.x} y={giant.y} scale={giant.s} rot={18} fill={fogged(C.ink, '#7A6040', giant.d, 6500)} rim={C.accent} rimOpacity={0.6} cloth={0.6} />
        {/* 骑手：放平长矛，头盔带金边 */}
        <ellipse cx={rider.x - 30 * rider.s} cy={rider.y + 30 * rider.s} rx={170 * rider.s} ry={30 * rider.s} fill="url(#coverShadow)" />
        <g transform={`translate(${rider.x} ${rider.y - 128 * rider.s}) scale(${rider.s})`}>
          <RimLit
            rim={{color: C.accent, opacity: 0.95, dx: 1.8 / rider.s, dy: -1.6 / rider.s}}
            fill={C.ink}
            farFill="#1A140F"
            draw={(pass, fill, far) => (
              <HorseBody
                state={{gait: 'gallop', phase: 0.15, rear: 0, head: -8, tail: 6}}
                fill={fill}
                farFill={far}
                rider={
                  <g transform="translate(-6 -10)">
                    <FigureBody
                      pose={rp}
                      fill={fill}
                      farFill={far}
                      pass={pass}
                      helmet={{morph: 0, glow: 1, visor: 1, scatter: 0}}
                      propF={(ps, fl) => <Lance angle={84} handAngle={handAngle} tip={1} pass={ps} fill={fl} />}
                    />
                  </g>
                }
              />
            )}
          />
        </g>
        <Dust seed="cover" frame={20} count={40} x={0} y={300} w={COVER_W} h={800} size={2.4} opacity={0.55} />
        <Grass cam={cam} clumps={CLUMPS} frame={20} filter={(d) => d <= 900} fogD={4200} />
        {/* 上下压暗，给文字留出干净的底 */}
        <rect x={0} y={0} width={COVER_W} height={420} fill="url(#coverTop)" />
        <rect x={0} y={960} width={COVER_W} height={480} fill="url(#coverBottom)" />
      </svg>
      <FogBands cam={cam} frame={20} strength={0.7} />

      {/* 顶部：细线 + 英文小注 */}
      <div style={{position: 'absolute', left: 80, top: 116, width: 760, height: 1, background: 'rgba(237,228,211,0.4)'}} />
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 132,
          fontFamily: FONT_SANS,
          fontWeight: 300,
          fontSize: 24,
          letterSpacing: '0.28em',
          color: '#CDBFA6',
          textShadow,
        }}
      >
        DON QUIXOTE · CERVANTES · 1605 / 1615
      </div>
      {/* 大标题 */}
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 176,
          fontFamily: FONT_SERIF,
          fontWeight: 900,
          fontSize: 224,
          lineHeight: 1,
          letterSpacing: '0.02em',
          color: C.text,
          textShadow,
          whiteSpace: 'nowrap',
        }}
      >
        堂吉诃德
      </div>

      {/* 钩子：开头抛出的那个问题 */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 1086,
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: 88,
          lineHeight: 1.3,
          color: C.text,
          textShadow,
          whiteSpace: 'nowrap',
        }}
      >
        <div>
          他终于<span style={{color: C.accent, textShadow: '0 0 30px rgba(217,164,65,0.45), 0 3px 8px rgba(0,0,0,0.6)'}}>清醒</span>了，
        </div>
        <div style={{paddingLeft: 88}}>为什么这是悲剧？</div>
      </div>
      <div style={{position: 'absolute', left: 80, top: 1340, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 72, height: 2, background: C.accent}} />
        <div style={{fontFamily: FONT_SANS, fontWeight: 400, fontSize: 30, letterSpacing: '0.12em', color: '#CDBFA6', textShadow}}>2 分钟读懂一本书最难过的一页</div>
      </div>
      <FilmLook frame={7} grain={0.8} />
      <Watermark />
    </AbsoluteFill>
  );
};
