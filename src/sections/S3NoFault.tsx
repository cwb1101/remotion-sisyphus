import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease, lerp, prog, rand, track, wobble } from '../anim';
import { camT, MotionBlur, Stage, type Cam } from '../camera';
import { EmotionBall } from '../components/EmotionBall';
import { handWorld, Person, type Arm } from '../components/Person';
import { B2, B3 } from '../data/timeline';
import { WoodGrain } from './S2Service';

/**
 * 第 3 节「没有错的伤」：从木纹拉出一架天平（TA 的"都做到了"压倒了你的委屈）
 * → 暗场顶光：红球被抛起、悬停、全静音 →「是被接住」落下，穿过一双空的虚线手
 * → 离地一指处停住，小橙坐在地上，气泡瘪掉，四周都是点头微笑的小蓝立牌 → 立牌翻面成雨夜街道。
 */
export const S3NoFault: React.FC = () => {
  const f = useCurrentFrame();
  if (f < B2.toS3 + 10 || f > B3.flip + 40) return null;
  const fadeIn = prog(f, B2.toS3 + 10, B2.toS3 + 22, ease.inOut);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn }}>
      <StageShot f={f} />
    </div>
  );
};

const FLOOR = 300;
const SCALE_X = 0;
const ARM = 430;
const STRING = 250;
const BEAM_Y = -400;
const SOLO_X = -1100; // 小橙抛球的位置（舞台左侧）

const stageCam = (f: number): Cam => {
  // 从木纹特写拉开到整架天平
  const out = prog(f, B2.toS3 + 20, B3.open + 44, ease.inOut);
  let c: Cam = { x: lerp(190, 60, out), y: lerp(232, -110, out), zoom: lerp(8.5, 0.95, out) };
  c.zoom += prog(f, B3.open + 40, B3.spot, ease.inOut) * 0.12;
  c.x += prog(f, B3.open + 40, B3.spot, ease.inOut) * 60;
  // 暗场：移到舞台左侧的小橙
  const sp = prog(f, B3.spot - 8, B3.spot + 16, ease.inOut);
  c = { x: lerp(c.x, SOLO_X, sp), y: lerp(c.y, -60, sp), zoom: lerp(c.zoom, 1.2, sp) };
  // 跟着红球上升、悬停
  const up = prog(f, B3.toss, B3.apex, ease.inOut);
  c = { x: c.x, y: lerp(c.y, -560, up), zoom: lerp(c.zoom, 1.35, up) };
  c.zoom += prog(f, B3.apex, B3.fall, ease.linear) * 0.12;
  // 「是被接住」：跟着落下
  const dn = prog(f, B3.fall, B3.hover, ease.inOut);
  c = { x: c.x, y: lerp(c.y, 20, dn), zoom: lerp(c.zoom, 1.5, dn) };
  // 小橙坐在地上，四壁后退；然后环顾立牌
  const back = prog(f, B3.hover, B3.standees, ease.inOut);
  c = { x: lerp(c.x, SOLO_X + 60, back), y: lerp(c.y, -20, back), zoom: lerp(c.zoom, 1.05, back) };
  const look = prog(f, B3.standees, B3.flip + 30, ease.inOut);
  return { x: c.x + Math.sin(look * Math.PI) * 260, y: c.y, zoom: c.zoom - look * 0.15 };
};

const ScaleArm: React.FC<{ tilt: number; f: number; cards: number; ballDim: number }> = ({ tilt, f, cards, ballDim }) => {
  const a = (tilt * Math.PI) / 180;
  const ends = [-1, 1].map((sd) => ({ x: SCALE_X + Math.cos(a) * ARM * sd, y: BEAM_Y + Math.sin(a) * ARM * sd }));
  const sway = Math.sin(f * 0.08) * 2;
  return (
    <g>
      {/* 立柱 */}
      <rect x={SCALE_X - 16} y={BEAM_Y} width={32} height={FLOOR - 140 - BEAM_Y} fill="#C9A46A" />
      <circle cx={SCALE_X} cy={BEAM_Y - 40} r={22} fill="#E0BE80" />
      <path d={`M ${SCALE_X - 14} ${BEAM_Y - 30} L ${SCALE_X} ${BEAM_Y - 80} L ${SCALE_X + 14} ${BEAM_Y - 30} Z`} fill="#C9A46A" />
      {/* 横梁 */}
      <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} stroke="#E0BE80" strokeWidth={18} strokeLinecap="round" />
      <circle cx={SCALE_X} cy={BEAM_Y} r={20} fill="#B28A52" />
      {ends.map((e, i) => {
        const px = e.x + sway;
        const py = e.y + STRING;
        return (
          <g key={i}>
            <path d={`M ${e.x} ${e.y} L ${px - 100} ${py} M ${e.x} ${e.y} L ${px + 100} ${py}`} stroke="#B28A52" strokeWidth={3} />
            <path d={`M ${px - 130} ${py} Q ${px} ${py + 70} ${px + 130} ${py} Z`} fill="#D9B676" />
            {i === 0 ? (
              <EmotionBall uid="ball-scale" x={px} y={py - 22} r={34} glow={0.4} dim={ballDim} />
            ) : (
              Array.from({ length: cards }).map((_, k) => (
                <g key={k} transform={`translate(${px + (rand(k) - 0.5) * 60} ${py - 8 - k * 9}) rotate(${(rand(k + 4) - 0.5) * 16})`}>
                  <rect x={-46} y={-8} width={92} height={16} rx={4} fill="#F4F1EA" />
                  <path d="M -10 0 l 6 5 l 12 -10" stroke="#5D7396" strokeWidth={3} fill="none" />
                </g>
              ))
            )}
          </g>
        );
      })}
    </g>
  );
};

/** 纸板立牌：一个平面的小蓝，下面有支架，会点头 */
const Standee: React.FC<{ x: number; f: number; seed: number; flip: number; rise: number }> = ({ x, f, seed, flip, rise }) => {
  if (rise <= 0) return null;
  const sx = Math.cos(flip * Math.PI);
  const nod = Math.sin(f * 0.18 + seed) * 6;
  return (
    <g transform={`translate(${x} ${FLOOR}) scale(${sx} ${rise}) translate(0 ${-FLOOR})`}>
      {sx > 0 ? (
        <g>
          <path d="M -110 290 L -100 -170 L 100 -170 L 110 290 Z" fill="#C9A77E" />
          <Person x={0} y={FLOOR - 51 * 2.2 - 6} scale={2.2} who="blue" headTilt={nod} mouth={0.7} look={{ x: 0, y: 0.1 }} breath={f + seed * 10} />
        </g>
      ) : (
        <g>
          <path d="M -110 290 L -100 -170 L 100 -170 L 110 290 Z" fill="#9C7E5A" />
          <path d="M -100 -170 L 100 290 M 100 -170 L -100 290" stroke="#7E6446" strokeWidth={6} />
        </g>
      )}
      <rect x={-12} y={FLOOR - 10} width={24} height={14} fill="#7E6446" />
    </g>
  );
};

const StageShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = stageCam(f);
  const prev = stageCam(f - 1);
  const by = Math.min(24, Math.abs(cam.y - prev.y) * cam.zoom * 0.3);
  const anchor = { x: -400, y: 0 };

  const cards = B3.cards.filter((t) => f >= t + 8).length;
  const tilt = lerp(-10, 13, Math.min(1, cards / 10)) + wobble(f, B3.cards[Math.max(0, cards - 1)] + 8, 0.3, 0.15) * 1.5;
  const dark = prog(f, B3.spot - 6, B3.spot + 14, ease.inOut) * (1 - prog(f, B3.hover + 20, B3.standees, ease.inOut) * 0.45);
  const silence = f >= B3.apex && f < B3.fall;

  // 小橙：先站着抛球，落空后坐到地上
  const tossT = prog(f, B3.toss - 8, B3.toss + 2, ease.out);
  const reachUp = track(f, [
    [B3.fall - 2, 0],
    [B3.fall + 10, 1, ease.out],
    [B3.fall + 30, 0.6, ease.inOut],
  ]);
  const armR: Arm =
    f < B3.fall - 2
      ? { up: lerp(-12, 165, tossT) - prog(f, B3.toss + 6, B3.toss + 20, ease.inOut) * 150, bend: lerp(48, 0, tossT) }
      : { up: lerp(15, 70, reachUp), bend: lerp(5, -20, reachUp) };
  const sitT = prog(f, B3.hover + 2, B3.hover + 14, ease.inOut);
  const standY = FLOOR - 51 * 2.1;
  const sitY = FLOOR - 75 * 2.1 + 4;
  const ox = SOLO_X - 120;
  const oSad = prog(f, B3.fall + 20, B3.hover + 10, ease.inOut);
  const hand = handWorld({ x: ox, y: standY, scale: 2.1 }, 1, armR);

  // 红球：手里 → 抛到最高点 → 悬停 → 落下穿过虚线手 → 离地一指处停住
  const apexY = -640;
  const groundY = FLOOR - 32 - 14;
  let ball = { x: hand.x, y: hand.y - 4 };
  if (f >= B3.toss) {
    const up = prog(f, B3.toss, B3.apex - 10, ease.out);
    ball = { x: lerp(hand.x, SOLO_X, up), y: lerp(hand.y, apexY, up) + Math.sin(f * 0.15) * 4 * prog(f, B3.apex - 10, B3.apex) };
  }
  if (f >= B3.fall) {
    const dn = prog(f, B3.fall, B3.hover - 4, ease.in);
    ball = { x: SOLO_X, y: lerp(apexY, groundY, dn) };
  }
  if (f >= B3.hover - 4) ball = { x: SOLO_X, y: groundY + Math.sin(f * 0.1) * 2 };
  const handsOn = prog(f, B3.fall, B3.fall + 8, ease.out) * (1 - prog(f, B3.fall + 34, B3.fall + 46));
  const handsY = -120;
  const passFlash = Math.max(0, 1 - Math.abs(ball.y - handsY) / 60) * handsOn;

  // 空气泡瘪掉
  const bubbleIn = prog(f, B3.hover + 14, B3.hover + 22, ease.outBack);
  const deflate = prog(f, B3.deflate, B3.deflate + 24, ease.inOut);
  const wallsBack = prog(f, B3.hover, B3.standees + 10, ease.inOut);
  const flipK = (k: number) => prog(f, B3.flip + k * 4, B3.flip + k * 4 + 14, ease.inOut);
  const standees = [-1950, -1650, -560, -300];

  return (
    <Stage>
      <defs>
        <radialGradient id="spot-cone" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#FFF1D6" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#FFF1D6" stopOpacity={0} />
        </radialGradient>
        <filter id="fg-blur-s3">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <MotionBlur id="mb-s3" bx={0} by={by}>
        <rect width={1920} height={1080} fill="#2A2430" />
        {/* 背景：柱廊剪影 */}
        <g transform={camT(cam, 0.6, anchor)}>
          <rect x={-4000} y={-2000} width={8000} height={2600} fill="#3D3540" />
          {Array.from({ length: 12 }).map((_, i) => (
            <g key={i} transform={`translate(${-2600 + i * 420} 0)`}>
              <rect x={-50} y={-900} width={100} height={1200} fill="#4A4150" />
              <rect x={-74} y={-930} width={148} height={40} fill="#544A5A" />
            </g>
          ))}
          {/* 四壁后退：两侧的墙越拉越远 */}
          <rect x={-2200 - wallsBack * 900} y={-1400} width={400} height={2000} fill="#332C38" />
          <rect x={1400 + wallsBack * 900} y={-1400} width={400} height={2000} fill="#332C38" />
        </g>
        <g transform={camT(cam, 1, anchor)}>
          <rect x={-5000} y={FLOOR} width={10000} height={1600} fill="#2F2834" />
          <WoodGrain x={SCALE_X - 330} y={FLOOR - 140} w={660} h={140} />
          <ScaleArm tilt={tilt} f={f} cards={cards} ballDim={0.45} />
          {/* 正在落下的卡片 */}
          {B3.cards.map((t, k) =>
            f >= t && f < t + 8 ? (
              <g key={k} transform={`translate(${SCALE_X + ARM - 20} ${lerp(-900, BEAM_Y + STRING - 20, prog(f, t, t + 8, ease.in))})`}>
                <rect x={-46} y={-8} width={92} height={16} rx={4} fill="#F4F1EA" />
              </g>
            ) : null,
          )}
          <Person
            x={720}
            y={FLOOR - 51 * 2.1}
            scale={2.1}
            who="blue"
            armL={{ up: 40 + Math.sin(f * 0.1) * 4, bend: -40 }}
            armR={{ up: 40 + Math.sin(f * 0.1) * 4, bend: -40 }}
            mouth={0.2}
            brows={0}
            look={{ x: -0.6, y: 0 }}
            headTilt={Math.sin(f * 0.07) * 4}
            breath={f}
          />
          {standees.map((x, k) => (
            <Standee key={k} x={x} f={f} seed={k * 1.7} flip={flipK(k)} rise={prog(f, B3.standees - 10 + k * 5, B3.standees + k * 5, ease.outBack)} />
          ))}
          <rect x={-5000} y={-3000} width={10000} height={5000} fill="#120E16" opacity={dark * 0.75} />
          {/* 顶光 */}
          <polygon
            points={`${SOLO_X - 90},-1400 ${SOLO_X + 90},-1400 ${SOLO_X + 520},${FLOOR} ${SOLO_X - 520},${FLOOR}`}
            fill="url(#spot-cone)"
            opacity={dark}
          />
          <ellipse cx={SOLO_X} cy={FLOOR + 6} rx={480} ry={40} fill="#FFF1D6" opacity={0.12 * dark} />
          {/* 小橙：站 → 坐 */}
          {sitT < 1 ? (
            <Person
              x={ox}
              y={standY}
              scale={2.1}
              who="orange"
              armR={armR}
              armL={{ up: lerp(6, 40, reachUp), bend: lerp(6, -10, reachUp) }}
              look={{ x: 0.3, y: f < B3.fall ? -1 : lerp(-1, 0.6, prog(f, B3.fall, B3.fall + 40)) }}
              mouth={lerp(0.3, -0.5, oSad)}
              brows={oSad}
              mouthOpen={silence ? 0 : reachUp * 0.5}
              opacity={1 - sitT}
              breath={f}
            />
          ) : null}
          {sitT > 0 ? (
            <Person
              x={ox}
              y={sitY}
              scale={2.1}
              who="orange"
              legs="sit"
              armL={{ up: -10, bend: 50 }}
              armR={{ up: -10, bend: 50 }}
              look={{ x: 0.5, y: 0.7 }}
              mouth={-0.6}
              brows={1}
              mouthOpen={bubbleIn > 0 && deflate < 0.5 ? 0.4 : 0}
              opacity={sitT}
              breath={f}
            />
          ) : null}
          {/* 一双空的虚线手 */}
          {handsOn > 0 ? (
            <g opacity={handsOn} transform={`translate(${SOLO_X} ${handsY})`}>
              {[-1, 1].map((sd) => (
                <path
                  key={sd}
                  d={`M ${sd * 20} 30 C ${sd * 90} 40 ${sd * 120} 0 ${sd * 110} -40 M ${sd * 110} -40 l ${sd * 6} -22 M ${sd * 96} -36 l ${sd * 2} -26`}
                  stroke="#FFF6E6"
                  strokeWidth={6}
                  strokeDasharray="14 12"
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
              <circle r={70 + passFlash * 40} fill="none" stroke="#FFF6E6" strokeWidth={3} opacity={passFlash * 0.6} />
            </g>
          ) : null}
          {f >= B3.hover - 4 ? <ellipse cx={SOLO_X} cy={FLOOR + 2} rx={30} ry={6} fill="#000" opacity={0.3} /> : null}
          <EmotionBall uid="ball-s3" x={ball.x} y={ball.y} r={32} glow={0.8} dim={lerp(0.3, 0.5, oSad)} />
          {/* 空的对话气泡，慢慢瘪下去 */}
          {bubbleIn > 0 ? (
            <g transform={`translate(${ox + 70} ${sitY - 330}) scale(${bubbleIn * (1 - deflate * 0.35)} ${bubbleIn * (1 - deflate * 0.65)})`} opacity={1 - deflate * 0.6}>
              <path
                d={`M -120 0 C -120 -70 120 -70 120 0 C 120 ${60 - deflate * 30} ${-120 + deflate * 20} ${60 - deflate * 20} -120 0 Z`}
                fill="#F4F1EA"
                transform={`rotate(${deflate * -8})`}
              />
              <path d="M -30 40 L -60 86 L 10 44 Z" fill="#F4F1EA" />
            </g>
          ) : null}
        </g>
        <g transform={camT(cam, 1.4, anchor)} filter="url(#fg-blur-s3)">
          <rect x={-3000} y={FLOOR + 120} width={6000} height={60} fill="#1A151E" />
          {Array.from({ length: 18 }).map((_, i) => (
            <rect key={i} x={-3000 + i * 340} y={FLOOR + 40} width={22} height={140} fill="#1A151E" />
          ))}
        </g>
      </MotionBlur>
      {/* 全静音那一刻：画面四周轻微收暗，提示时间停住 */}
      {silence ? (
        <rect width={1920} height={1080} fill="#000" opacity={0.18 * clamp((f - B3.apex) / 6)} />
      ) : null}
    </Stage>
  );
};
