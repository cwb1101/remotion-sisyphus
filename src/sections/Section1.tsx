import React from 'react';
import {beat, cue} from '../data/script';
import {Layer, camAt, useCam} from '../lib/camera';
import {Person, POSES, handWorld, mixPose, type Expression} from '../components/Person';
import {Tube, TUBE_H} from '../components/DesireGauge';
import {Hand, Monk, OilLamp, PaperTag} from '../components/Props';
import {C, FONT_SANS, FONT_SERIF} from '../theme';
import {bell, clamp01, ease, hash, lerp, mixColor, prog} from '../lib/anim';
import {CAMERA, EIGHT, SINS, W} from '../world';
import {Flashlight, heroS0, type Slot} from './Section0';

// 一 致命是源头（10–28 秒）
// 沙漠里修士写下八种念头 → 念头被按进卷轴长出八支小试管 → 卷轴穿过历史长廊被一改再改
// → 试管长大、八并成七、立上石台 → 放大镜看 CAPITALIA → 字母飞起拼成 CAPUT 聚成"头"
// → 法槌被划掉 → 头变成源头泉眼 → 河流分七股灌进七支试管 → 一支溢出，生出别的错 → 拉远

const F = {
  start: cue('c1').start,
  smoke: beat('c1', 'smokeRise'),
  press: beat('c2', 'pressIn'),
  born: beat('c2', 'tubesBorn'),
  travel: beat('c3', 'travel'),
  hands: [beat('c3', 'hand1'), beat('c3', 'hand2'), beat('c3', 'hand3')],
  grow: beat('c4', 'grow'),
  eight: beat('c4', 'eight'),
  merge: beat('c4', 'merge'),
  seven: beat('c4', 'seven'),
  plinth: beat('c5', 'plinth'),
  magnifier: beat('c5', 'magnifier'),
  capJump: beat('c5', 'capJump'),
  head: beat('c6', 'slam'),
  gavel: beat('c7', 'gavel'),
  strike: beat('c7', 'strike'),
  spring: beat('c7', 'spring'),
  pipes: beat('c8', 'pipes'),
  overflow: beat('c8', 'overflow'),
  cups: beat('c8', 'cups'),
  pullBack: beat('c9', 'pullBack'),
  tagLand: beat('c9', 'tagLand'),
  end: cue('c9').end,
};

const SMALL = 0.26;
const smokeColors = [C.mustard, C.rose, '#C9A15A', '#8FA3B8', C.accent, '#9C8FB8', '#C98A6A', '#B5B07A'];

// ── 念头烟团 ──────────────────────────────────────

const puffTarget = (i: number) => ({x: -4440 + i * 72, y: -210 - 40 * Math.sin((Math.PI * i) / 7)});
const slotX = (i: number) => W.groundScroll.x + i * 32;

const Puffs: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.smoke || frame > F.born + 30) return null;
  const flame = {x: W.lamp.x + 28, y: W.lamp.y - 78};
  return (
    <g>
      {EIGHT.map((name, i) => {
        const t0 = F.smoke + i * 5;
        const rise = ease.out(prog(frame, t0, 26));
        if (rise <= 0) return null;
        const tg = puffTarget(i);
        const press = ease.in(prog(frame, F.press + i * 4, 20));
        let x = lerp(flame.x, tg.x, rise) + Math.sin(rise * Math.PI) * 40 * (i % 2 ? 1 : -1);
        let y = lerp(flame.y, tg.y, rise) + Math.sin(frame * 0.06 + i) * 6;
        const end = {x: slotX(i), y: W.groundScroll.y - 10};
        x = lerp(x, end.x, press);
        y = lerp(y, end.y, press);
        const r = lerp(10, 34, rise) * (1 - press * 0.9);
        const op = press >= 1 ? 0 : 0.85;
        const label = clamp01(prog(frame, t0 + 16, 8) - press * 3);
        return (
          <g key={i} opacity={op}>
            <circle cx={x - r * 0.5} cy={y + r * 0.2} r={r * 0.75} fill={smokeColors[i]} opacity={0.55} />
            <circle cx={x + r * 0.45} cy={y + r * 0.1} r={r * 0.7} fill={smokeColors[i]} opacity={0.55} />
            <circle cx={x} cy={y - r * 0.3} r={r} fill={smokeColors[i]} opacity={0.6} />
            {label > 0 ? (
              <text x={x} y={y + 64} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={500} fontSize={26} fill={C.paper} opacity={label * 0.9} letterSpacing={2}>
                {name}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

// ── 卷轴上的试管：诞生 → 被托着穿过长廊 → 长大 → 八并成七 → 立上石台 ──

type TubeState = {x: number; bottom: number; scale: number; level: number; opacity: number; label?: string; labelOpacity: number};

const carriedAnchor = (frame: number, cam: {x: number; y: number; s: number}) => {
  const ground = {x: W.groundScroll.x + 112, y: W.groundScroll.y};
  const held = {x: cam.x + 60 / cam.s, y: cam.y + 120 / cam.s + Math.sin(frame * 0.2) * 3};
  return {
    x: lerp(ground.x, held.x, ease.inOut(prog(frame, F.travel, 14))),
    y: lerp(ground.y, held.y, ease.inOut(prog(frame, F.travel, 14))),
  };
};

const tubeStates = (frame: number, cam: {x: number; y: number; s: number}, anchor504: {x: number; y: number}): TubeState[] => {
  const grow = ease.inOut(prog(frame, F.grow, 26));
  const a = frame < F.grow ? carriedAnchor(frame, cam) : anchor504;
  const ax = lerp(a.x, W.plinth.x, grow);
  const ay = lerp(a.y, W.plinth.top, grow);
  const scale = lerp(SMALL, 1, grow);
  const spacing8 = lerp(32, 132, grow);
  const merge = ease.inOut(prog(frame, F.merge, F.seven - F.merge));
  const respace = ease.inOut(prog(frame, F.seven, 12));
  const list: TubeState[] = [];
  for (let i = 0; i < 8; i++) {
    const born = ease.outBack(prog(frame, F.born + i * 3, 8));
    let x = ax + (i - 3.5) * spacing8;
    // 第 4、5 支（下标 3、4）挤到一起熔成一支
    const mid = ax;
    if (i === 3 || i === 4) x = lerp(x, mid, merge);
    // 合并后的七支重新等距排开
    const j = i <= 3 ? i : i - 1;
    const x7 = W.plinth.x + (j - 3) * 150;
    if (i !== 4) x = lerp(x, x7, respace);
    const lv = lerp(0.3 + hash(i + 3) * 0.15, 0.4, respace);
    list.push({
      x,
      bottom: ay,
      scale: scale * (frame < F.travel ? born : 1),
      level: lv,
      opacity: i === 4 ? 1 - prog(frame, F.seven - 4, 4) : 1,
      label: i === 4 ? undefined : SINS[j],
      labelOpacity: ease.out(prog(frame, F.seven + 4 + j * 2, 6)),
    });
  }
  return list;
};

/** 第 8 节（c8）河水灌入后的液面 */
const lateLevel = (frame: number, j: number) => {
  const fill = ease.inOut(prog(frame, F.pipes + 2 + j * 2, 20));
  let lv = lerp(0.4, 0.5, fill);
  if (j === 0) lv = lerp(lv, 1, ease.inOut(prog(frame, F.overflow, 12)));
  return lv;
};

const ScrollTubes: React.FC<{frame: number}> = ({frame}) => {
  const {cam} = useCam();
  if (frame < F.born || frame > F.end) return null;
  // 长大开始那一刻卷轴被托着的位置（用来接上动作）
  const anchor504 = carriedAnchor(F.grow, CAM_AT_GROW);
  const states = tubeStates(frame, cam, anchor504);
  const labelFit = clamp01((1.35 - cam.s) / 0.25);
  const labelScreenY = (bottom: number, sc: number) => 540 + cam.s * (bottom - TUBE_H * sc + (TUBE_H + 56) * sc - cam.y);
  const paper = 1 - prog(frame, F.grow, 14);
  const a = frame < F.grow ? carriedAnchor(frame, cam) : anchor504;
  return (
    <g>
      {paper > 0 ? (
        <g opacity={paper}>
          <rect x={a.x - 150} y={a.y - 2} width={300} height={20} rx={4} fill="#CDBE9E" />
          <rect x={a.x - 162} y={a.y - 8} width={18} height={32} rx={8} fill="#7A604A" />
          <rect x={a.x + 144} y={a.y - 8} width={18} height={32} rx={8} fill="#7A604A" />
          {F.hands.map((h, k) => {
            const p = ease.out(prog(frame, h + 8, 6));
            if (p <= 0) return null;
            const sx = a.x - 100 + k * 80;
            return <line key={k} x1={sx} y1={a.y + 14} x2={sx + 46 * p} y2={a.y - 70 * p} stroke={C.accent} strokeWidth={5} strokeLinecap="round" />;
          })}
        </g>
      ) : null}
      {states.map((s, i) =>
        s.opacity <= 0 || s.scale <= 0.01 ? null : (
          <Tube
            key={i}
            x={s.x}
            y={s.bottom - TUBE_H * s.scale}
            scale={s.scale}
            level={frame >= F.pipes && i !== 4 ? lateLevel(frame, i <= 3 ? i : i - 1) : s.level}
            frame={frame + i * 7}
            opacity={s.opacity}
            label={s.label}
            labelOpacity={s.labelOpacity * labelFit * clamp01((860 - labelScreenY(s.bottom, s.scale)) / 40)}
            overflow={i === 0 ? ease.inOut(prog(frame, F.overflow + 8, 16)) : 0}
            glow={frame >= F.spring ? 0.5 * prog(frame, F.pipes, 20) : 0}
          />
        ),
      )}
    </g>
  );
};

// 长大开始那一刻的镜头（直接从镜头轨道上取，保证每帧独立可算）
const CAM_AT_GROW = camAt(CAMERA, F.grow);

// ── 托着卷轴的三只手 ─────────────────────────────

const Hands: React.FC<{frame: number}> = ({frame}) => {
  const {cam} = useCam();
  if (frame < F.travel || frame > F.grow + 10) return null;
  const a = carriedAnchor(frame, cam);
  const sleeves = [C.mustard, '#3E7A88', C.plum];
  return (
    <g>
      {F.hands.map((h, k) => {
        const up = ease.out(prog(frame, h - 6, 8));
        const next = k < 2 ? F.hands[k + 1] : F.grow;
        const down = ease.in(prog(frame, next + 2, 10));
        const y = a.y + 30 + (1 - up) * 500 + down * 520;
        if (up <= 0) return null;
        return <Hand key={k} x={a.x - 80 + k * 80} y={y} sleeve={sleeves[k]} rotate={(k - 1) * 8} />;
      })}
    </g>
  );
};

// ── 石台、铭文、CAPUT ─────────────────────────────

const INSCR = 'SEPTEM PECCATA CAPITALIA';
const letterX = (i: number) => W.plinth.x - 437 + 38 * i;
const INSCR_Y = 292;
const JUMP = [15, 16, 17, 18, 19]; // C A P I T
const caputX = (k: number) => W.source.x + (k - 2) * 78;

const Plinth: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.grow) return null;
  const rise = ease.out(prog(frame, F.grow + 6, 22));
  const {x, top, bottom} = W.plinth;
  const dim = 1 - 0.55 * prog(frame, F.spring, 30);
  return (
    <g opacity={rise} transform={`translate(0 ${(1 - rise) * 60})`}>
      <rect x={x - 560} y={top} width={1120} height={bottom - top} rx={6} fill={mixColor('#3B3F45', '#2A3442', prog(frame, F.spring, 30))} />
      <rect x={x - 560} y={top} width={1120} height={10} fill="#5A6068" opacity={dim} />
      <rect x={x - 520} y={top + 104} width={1040} height={2} fill={C.paper} opacity={0.15} />
    </g>
  );
};

const Inscription: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.plinth) return null;
  const jump = (k: number) => ease.inOut(prog(frame, F.capJump + k * 1.5, 14));
  const gather = ease.in(prog(frame, F.head - 4, 8));
  return (
    <g>
      {[...INSCR].map((ch, i) => {
        if (ch === ' ') return null;
        const appear = ease.out(prog(frame, F.plinth + i * 0.7, 8));
        const k = JUMP.indexOf(i);
        if (k < 0) {
          const fade = 1 - 0.7 * prog(frame, F.capJump, 10);
          return (
            <text key={i} x={letterX(i)} y={INSCR_Y} textAnchor="middle" fontFamily={FONT_SERIF} fontWeight={700} fontSize={44} fill={C.paper} opacity={appear * 0.85 * fade}>
              {ch}
            </text>
          );
        }
        const j = jump(k);
        const tx = caputX(k);
        const ty = W.source.y + 34;
        // 抛物线飞上去
        let x = lerp(letterX(i), tx, j);
        let y = lerp(INSCR_Y, ty, j) - Math.sin(j * Math.PI) * 80;
        const size = lerp(44, 96, j);
        // 最后聚成一个圆（"头"）
        x = lerp(x, W.source.x, gather);
        y = lerp(y, W.source.y + 30, gather);
        const op = appear * (1 - gather);
        const isI = ch === 'I';
        const toU = ease.inOut(prog(frame, F.capJump + 8, 6));
        return (
          <g key={i} opacity={op}>
            <text x={x} y={y} textAnchor="middle" fontFamily={FONT_SERIF} fontWeight={700} fontSize={size} fill={j > 0.2 ? C.mustard : C.paper} opacity={isI ? 1 - toU : 1}>
              {ch}
            </text>
            {isI ? (
              <text x={x} y={y} textAnchor="middle" fontFamily={FONT_SERIF} fontWeight={700} fontSize={size} fill={C.mustard} opacity={toU}>
                U
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

/** 放大镜：从主角手里伸到 CAPITALIA 上，镜片里是放大的字 */
const Magnifier: React.FC<{frame: number; hand: {x: number; y: number}}> = ({frame, hand}) => {
  const p = ease.inOut(prog(frame, F.magnifier + 8, 14));
  const away = ease.in(prog(frame, F.capJump - 2, 8));
  if (p <= 0 || away >= 1) return null;
  const lens = {x: lerp(hand.x + 60, letterX(19) + 10, p), y: lerp(hand.y - 40, INSCR_Y - 14, p) - away * 60};
  const r = 70;
  return (
    <g opacity={1 - away}>
      <defs>
        <clipPath id="lensclip">
          <circle cx={lens.x} cy={lens.y} r={r - 4} />
        </clipPath>
      </defs>
      <line x1={hand.x} y1={hand.y} x2={lens.x - r * 0.7} y2={lens.y + r * 0.7} stroke="#7A604A" strokeWidth={14} strokeLinecap="round" />
      <circle cx={lens.x} cy={lens.y} r={r} fill="#0E1418" opacity={0.6} />
      <g clipPath="url(#lensclip)">
        <g transform={`translate(${lens.x} ${lens.y}) scale(1.7) translate(${-lens.x} ${-lens.y})`}>
          {[...INSCR].map((ch, i) =>
            i >= 15 ? (
              <text key={i} x={letterX(i)} y={INSCR_Y} textAnchor="middle" fontFamily={FONT_SERIF} fontWeight={700} fontSize={44} fill={JUMP.includes(i) ? C.mustard : C.paper}>
                {ch}
              </text>
            ) : null,
          )}
        </g>
      </g>
      <circle cx={lens.x} cy={lens.y} r={r} fill="none" stroke={C.mustard} strokeWidth={9} />
      <path d={`M${lens.x - 38} ${lens.y - 28} Q${lens.x - 30} ${lens.y - 46} ${lens.x - 10} ${lens.y - 52}`} stroke="#FFF" strokeWidth={5} opacity={0.4} fill="none" strokeLinecap="round" />
    </g>
  );
};

const BigNumeral: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.eight || frame > F.plinth + 20) return null;
  const e = ease.outBack(prog(frame, F.eight, 8));
  const s7 = ease.outBack(prog(frame, F.seven, 8));
  const swap = prog(frame, F.seven, 3);
  const fade = 1 - prog(frame, F.plinth, 18);
  const g = (txt: string, sc: number, op: number) => (
    <text
      x={W.plinth.x}
      y={130}
      textAnchor="middle"
      fontFamily={FONT_SERIF}
      fontWeight={900}
      fontSize={720}
      fill={C.paper}
      opacity={op * 0.16 * fade}
      transform={`translate(${W.plinth.x} -120) scale(${sc}) translate(${-W.plinth.x} 120)`}
    >
      {txt}
    </text>
  );
  return (
    <g>
      {g('8', 1.4 - 0.4 * e, (1 - swap) * clamp01(e * 2))}
      {swap > 0 ? g('7', 1.4 - 0.4 * s7, swap) : null}
    </g>
  );
};

// ── 头 → 源头、法槌、河流、溢出 ───────────────────

const Source: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.head - 4) return null;
  const form = ease.outBack(prog(frame, F.head - 4, 10));
  const water = ease.inOut(prog(frame, F.spring, 14));
  const r = 72 * form + 12 * prog(frame, F.head, cue('c6').end - F.head);
  const {x, y} = W.source;
  return (
    <g>
      <defs>
        <radialGradient id="srcglow">
          <stop offset="0" stopColor={mixColor('#FFE7B0', '#9EE0F0', water)} stopOpacity={0.6} />
          <stop offset="1" stopColor={mixColor('#FFE7B0', '#9EE0F0', water)} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r * 3.2} fill="url(#srcglow)" opacity={0.8} />
      {water > 0
        ? [0, 1, 2].map((k) => {
            const t = ((frame - F.spring) / 36 + k / 3) % 1;
            return <circle key={k} cx={x} cy={y} r={r + t * 140} fill="none" stroke="#9EE0F0" strokeWidth={4} opacity={(1 - t) * 0.5 * water} />;
          })
        : null}
      <circle cx={x} cy={y} r={r} fill={mixColor('#F3EDE2', '#5FB3C9', water)} />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.28} fill="#FFF" opacity={0.25} />
    </g>
  );
};

const Annotation: React.FC<{frame: number}> = ({frame}) => {
  const a = ease.out(prog(frame, F.head + 10, 10)) * (1 - prog(frame, F.strike - 2, 8));
  const b = ease.out(prog(frame, F.strike + 8, 10)) * (1 - prog(frame, cue('c7').end - 8, 8));
  const {x, y} = W.source;
  return (
    <g>
      {a > 0 ? (
        <g opacity={a}>
          <text x={x - 70} y={y + 170} textAnchor="end" fontFamily={FONT_SERIF} fontStyle="italic" fontWeight={700} fontSize={40} fill={C.paper} opacity={0.85}>
            capitalia
          </text>
          <line x1={x - 50} y1={y + 157} x2={x + 36} y2={y + 157} stroke={C.paper} strokeWidth={3} opacity={0.7} />
          <path d={`M${x + 24} ${y + 147} L${x + 40} ${y + 157} L${x + 24} ${y + 167}`} stroke={C.paper} strokeWidth={3} fill="none" opacity={0.7} />
          <text x={x + 60} y={y + 170} fontFamily={FONT_SERIF} fontStyle="italic" fontWeight={700} fontSize={40} fill={C.paper} opacity={0.85}>
            caput
          </text>
          <text x={x + 190} y={y + 170} fontFamily={FONT_SERIF} fontWeight={900} fontSize={40} fill={C.accent}>
            头
          </text>
        </g>
      ) : null}
      {b > 0 ? (
        <text x={x - 300} y={y + 150} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={500} fontSize={26} fill={C.paper} opacity={b * 0.75} letterSpacing={3}>
          据 阿奎那 神学大全
        </text>
      ) : null}
    </g>
  );
};

const Gavel: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.gavel || frame > F.spring + 16) return null;
  const inP = ease.out(prog(frame, F.gavel, 10));
  const strike = ease.inOut(prog(frame, F.strike, 6));
  const drop = ease.in(prog(frame, F.spring - 6, 18));
  const x = lerp(W.source.x - 700, W.source.x - 300, inP);
  const y = W.source.y - 10 + drop * 500;
  const rot = lerp(-40, -12, inP) + Math.sin(frame * 0.2) * 2 + drop * 40;
  return (
    <g opacity={1 - drop}>
      <g transform={`translate(${x} ${y}) rotate(${rot})`}>
        <rect x={-14} y={-10} width={28} height={190} rx={12} fill="#6B4E36" />
        <rect x={-80} y={-60} width={160} height={70} rx={16} fill="#7E5C40" />
        <rect x={-92} y={-64} width={20} height={78} rx={8} fill="#5E442F" />
        <rect x={72} y={-64} width={20} height={78} rx={8} fill="#5E442F" />
      </g>
      {/* 一道朱红墨线把它划掉 */}
      {strike > 0 ? (
        <line x1={x - 130} y1={y + 120} x2={x - 130 + 260 * strike} y2={y + 120 - 220 * strike} stroke={C.accent} strokeWidth={12} strokeLinecap="round" />
      ) : null}
    </g>
  );
};

const riverPath = (j: number) => {
  const sx = W.source.x;
  const sy = W.source.y + 70;
  const tx = W.plinth.x + (j - 3) * 150;
  const ty = -244;
  return `M${sx} ${sy} C${sx} ${sy + 90} ${tx} ${ty - 120} ${tx} ${ty}`;
};

const River: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.spring) return null;
  return (
    <g>
      {SINS.map((_, j) => {
        const p = ease.inOut(prog(frame, F.spring + 6 + Math.abs(j - 3) * 3, 30));
        if (p <= 0) return null;
        const d = riverPath(j);
        const flow = -(frame * 6) % 60;
        return (
          <g key={j}>
            <path d={d} stroke="#2F6F86" strokeWidth={16} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
            {p > 0.98 ? <path d={d} stroke="#9EE0F0" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.75} strokeDasharray="14 46" strokeDashoffset={flow} /> : null}
          </g>
        );
      })}
    </g>
  );
};

const CUP_LABELS = ['谎言', '冷漠', '争吵'];
const cupX = (k: number) => W.plinth.x - 300 + k * 300;
const CUP_Y = 350;

const Overflow: React.FC<{frame: number}> = ({frame}) => {
  const {cam} = useCam();
  if (frame < F.overflow) return null;
  const cupLabel = clamp01((860 - (540 + cam.s * (CUP_Y + 100 - cam.y))) / 40);
  const tube0 = W.plinth.x - 450;
  const pipe = `M${tube0 + 52} ${W.plinth.top} L${tube0 + 52} ${CUP_Y - 24} L${cupX(2)} ${CUP_Y - 24}`;
  const pp = ease.inOut(prog(frame, F.overflow + 16, 22));
  return (
    <g>
      <path d={pipe} stroke="#2A2F35" strokeWidth={20} fill="none" strokeLinejoin="round" />
      <path d={pipe} stroke={C.accent} strokeWidth={10} fill="none" strokeLinejoin="round" pathLength={1} strokeDasharray={`${pp} 1`} />
      {CUP_LABELS.map((name, k) => {
        const pop = ease.outBack(prog(frame, F.cups + k * 6, 8));
        if (pop <= 0) return null;
        const fill = ease.inOut(prog(frame, F.cups + k * 6 + 4, 14));
        const x = cupX(k);
        return (
          <g key={k} transform={`translate(${x} ${CUP_Y}) scale(${pop})`}>
            <line x1={0} y1={-24} x2={0} y2={-8} stroke={C.accent} strokeWidth={8} />
            <path d="M-34 -6 L34 -6 L26 52 Q24 60 16 60 L-16 60 Q-24 60 -26 52 Z" fill="#FFF" opacity={0.08} />
            <path d={`M${-34 + 8 * (1 - fill)} ${60 - 60 * fill} L${34 - 8 * (1 - fill)} ${60 - 60 * fill} L26 52 Q24 60 16 60 L-16 60 Q-24 60 -26 52 Z`} fill={C.accent} opacity={0.85} />
            <path d="M-34 -6 L34 -6 L26 52 Q24 60 16 60 L-16 60 Q-24 60 -26 52 Z" fill="none" stroke={C.paper} strokeWidth={3} opacity={0.8} />
            <text x={0} y={100} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={700} fontSize={30} fill={C.accent} letterSpacing={2} opacity={cupLabel}>
              {name}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const FallingTag: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F.tagLand) return null;
  const p = ease.outBack(prog(frame, F.tagLand, 14));
  const y = lerp(-1700, W.source.y - 280, p);
  const swing = Math.sin((frame - F.tagLand) * 0.3) * 14 * (1 - prog(frame, F.tagLand, 36));
  return <PaperTag x={W.source.x + 150} y={y} text="致命" swing={swing} scale={1.3} string={900} />;
};

// ── 主角 ──────────────────────────────────────────

const Hero: React.FC<{frame: number}> = ({frame}) => {
  const {cam} = useCam();
  // 沙漠：从上一节接着走，停在沙丘边用手电照着修士
  if (frame < F.start) return null;
  if (frame < F.travel + 30) {
    const from = heroS0(F.start, camAt(CAMERA, F.start));
    const t = ease.out(prog(frame, F.start, 30));
    const x = lerp(from.x, -3780, t);
    const walking = t < 0.95;
    const pose = walking
      ? {...POSES.walk(frame, 0.3), armFront: POSES.hold(frame).armFront, lean: 6}
      : mixPose(POSES.hold(frame), POSES.hold(frame, 0.2), bell(prog(frame, F.smoke, 40)));
    const expr: Expression = frame > F.smoke + 10 && frame < F.press ? 'surprised' : 'focused';
    return <Person x={x} y={W.monk.y} scale={1.1} facing={-1} pose={pose} expr={expr} frame={frame} holding={<Flashlight on={1} />} />;
  }
  // 石台前：举放大镜看铭文
  if (frame >= F.plinth && frame < F.capJump + 30) {
    const walkIn = ease.out(prog(frame, F.plinth + 6, 26));
    const x = lerp(W.plinth.x - 640, W.plinth.x + 30, walkIn);
    const y = 560;
    const raise = ease.inOut(prog(frame, F.magnifier + 6, 12));
    let pose = walkIn < 0.97 ? POSES.walk(frame, 0.32) : POSES.stand(frame);
    pose = mixPose(pose, POSES.hold(frame, 0.9), raise);
    if (frame >= F.capJump) pose = mixPose(pose, POSES.lookUp(frame), ease.inOut(prog(frame, F.capJump, 8)));
    const expr: Expression = frame >= F.capJump ? 'surprised' : raise > 0.5 ? 'focused' : 'neutral';
    const p = {x, y, scale: 1.45, facing: 1 as const};
    const hand = handWorld(pose, p);
    return (
      <g>
        <Person {...p} pose={pose} expr={expr} frame={frame} />
        <Magnifier frame={frame} hand={hand} />
      </g>
    );
  }
  // 源头之后：站在石台左边仰头看
  if (frame >= F.pipes - 20) {
    const pose = mixPose(POSES.lookUp(frame), POSES.peek(frame), bell(prog(frame, F.overflow, 30)));
    const expr: Expression = frame >= F.overflow ? 'surprised' : 'focused';
    return <Person x={W.plinth.x - 650} y={470} scale={1.3} facing={1} pose={pose} expr={expr} frame={frame} />;
  }
  return null;
};

// ── 远近层 ────────────────────────────────────────

const Desert: React.FC<{frame: number; depth: number; color: string; base: number; amp: number; seed: number; fadeIn: number; fadeOut: number}> = ({
  frame,
  depth,
  color,
  base,
  amp,
  seed,
  fadeIn,
  fadeOut,
}) => {
  const op = prog(frame, fadeIn, 40) * (1 - prog(frame, fadeOut, 30));
  if (op <= 0) return null;
  const cx = -4200 * depth;
  const pts: string[] = [];
  for (let k = 0; k <= 40; k++) {
    const x = cx - 2600 + k * 130;
    const y = base - amp * (0.5 + 0.5 * Math.sin(k * 0.55 + seed)) - amp * 0.4 * Math.sin(k * 1.3 + seed * 2);
    pts.push(`${x} ${y}`);
  }
  return <path d={`M${cx - 2600} 2000 L${pts.join(' L')} L${cx + 2600} 2000 Z`} fill={color} opacity={op} />;
};

const Sky: React.FC<{frame: number}> = ({frame}) => {
  const dusk = prog(frame, beat('o6', 'dusk'), 40) * (1 - prog(frame, F.travel + 20, 30));
  const night = prog(frame, F.spring, 30);
  return (
    <g>
      {dusk > 0 ? (
        <g opacity={dusk}>
          <circle cx={-4300 * 0.12 + 600} cy={-330} r={58} fill={C.mustard} opacity={0.9} />
          <circle cx={-4300 * 0.12 + 600} cy={-330} r={110} fill={C.mustard} opacity={0.12} />
        </g>
      ) : null}
      {[dusk, night].map((op, k) =>
        op > 0 ? (
          <g key={k} opacity={op}>
            {Array.from({length: 40}, (_, i) => {
              const cx = (k === 0 ? -4300 : -6400) * 0.12 + (hash(i + k * 100) - 0.5) * 2600;
              const cy = -600 + hash(i + 40 + k * 100) * 560;
              return <circle key={i} cx={cx} cy={cy} r={1.5 + hash(i + 7) * 2} fill="#FFF" opacity={0.35 + 0.35 * Math.sin(frame * 0.03 + i)} />;
            })}
          </g>
        ) : null,
      )}
    </g>
  );
};

const Corridor: React.FC<{frame: number}> = ({frame}) => {
  const op = prog(frame, F.travel - 10, 20) * (1 - prog(frame, F.grow + 10, 24));
  if (op <= 0) return null;
  const d = 0.6;
  const arch = (x: number) => (
    <g key={x}>
      <rect x={x - 70} y={-240} width={40} height={420} fill="#2E2A3E" />
      <rect x={x + 30} y={-240} width={40} height={420} fill="#2E2A3E" />
      <path d={`M${x - 70} -230 A70 70 0 0 1 ${x + 70} -230 L${x + 70} -270 L${x - 70} -270 Z`} fill="#2E2A3E" />
    </g>
  );
  return (
    <g opacity={op}>
      {[-3000, -3160, -3320, -3480].map((x) => arch(x * (d / 0.6)))}
      <g>
        <rect x={-3900} y={-150} width={500} height={340} fill="#29253A" />
        {Array.from({length: 10}, (_, i) => (
          <rect key={i} x={-3900 + i * 50} y={-180} width={30} height={34} fill="#29253A" />
        ))}
        <rect x={-3960} y={-330} width={110} height={520} fill="#29253A" />
        <rect x={-3470} y={-300} width={100} height={490} fill="#29253A" />
      </g>
    </g>
  );
};

const Hall: React.FC<{frame: number}> = ({frame}) => {
  const op = prog(frame, F.grow, 24);
  if (op <= 0) return null;
  const d = 0.5;
  const cx = W.plinth.x * d;
  return (
    <g opacity={op * (1 - 0.6 * prog(frame, F.spring, 30))}>
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <g key={k}>
          <rect x={cx + k * 330 - 40} y={-700} width={80} height={1100} fill="#1A1F25" />
          <rect x={cx + k * 330 - 56} y={-700} width={112} height={40} fill="#1F252C" />
        </g>
      ))}
    </g>
  );
};

const SandDrift: React.FC<{frame: number}> = ({frame}) => {
  const op = prog(frame, F.start - 20, 30) * (1 - prog(frame, F.travel + 10, 20));
  if (op <= 0) return null;
  const d = 1.4;
  return (
    <g opacity={op}>
      {Array.from({length: 30}, (_, i) => {
        const x = -4100 * d + ((hash(i) * 3000 - frame * (3 + hash(i + 5) * 4)) % 3000) + 1500;
        const y = 120 + hash(i + 9) * 260;
        return <circle key={i} cx={x} cy={y} r={2 + hash(i + 2) * 3} fill="#E8C9A0" opacity={0.35} />;
      })}
    </g>
  );
};

const Columns: React.FC<{frame: number}> = ({frame}) => {
  const op = prog(frame, F.travel, 8) * (1 - prog(frame, F.grow, 10));
  if (op <= 0) return null;
  const d = 1.6;
  return (
    <g opacity={op}>
      {[-7300, -8200, -9100, -9900].map((x) => (
        <g key={x}>
          <rect x={x} y={-900} width={150} height={1900} fill="#0B0A10" />
          <rect x={x - 24} y={-120} width={198} height={40} fill="#0B0A10" />
        </g>
      ))}
    </g>
  );
};

const Ground: React.FC<{frame: number}> = ({frame}) => {
  const op = prog(frame, F.start - 12, 30) * (1 - prog(frame, F.travel + 6, 20));
  return (
    <g>
      {op > 0 ? (
        <g opacity={op}>
          <rect x={-5600} y={W.floor0 - 4} width={3600} height={1200} fill="#3A2930" />
          <rect x={-5600} y={W.floor0 - 4} width={3600} height={5} fill="#E8C9A0" opacity={0.18} />
        </g>
      ) : null}
      {frame >= F.grow ? <rect x={W.plinth.x - 2000} y={W.plinth.bottom} width={4000} height={1400} fill="#111418" opacity={prog(frame, F.grow, 20)} /> : null}
    </g>
  );
};

// ── 组装 ──────────────────────────────────────────

export const Section1: React.FC<{frame: number; slot: Slot}> = ({frame, slot}) => {
  if (frame < cue('o6').start) return null;
  if (slot === 'back') {
    return (
      <>
        <Layer depth={0.12}>
          <Sky frame={frame} />
        </Layer>
        <Layer depth={0.3}>
          <Desert frame={frame} depth={0.3} color="#3A2C3F" base={110} amp={70} seed={1} fadeIn={beat('o6', 'dusk')} fadeOut={F.travel + 20} />
        </Layer>
        <Layer depth={0.5}>
          <Desert frame={frame} depth={0.5} color="#4C3546" base={150} amp={60} seed={2.4} fadeIn={beat('o6', 'dusk') + 10} fadeOut={F.travel + 16} />
          <Hall frame={frame} />
        </Layer>
        <Layer depth={0.6}>
          <Corridor frame={frame} />
        </Layer>
        <Layer depth={0.75}>
          <Desert frame={frame} depth={0.75} color="#5E4048" base={180} amp={46} seed={3.7} fadeIn={beat('o6', 'dusk') + 20} fadeOut={F.travel + 12} />
        </Layer>
      </>
    );
  }
  if (slot === 'main') {
    if (frame < F.start - 30) return null;
    return (
      <>
        <Layer>
          <Ground frame={frame} />
          {frame < F.travel + 40 ? (
            <g>
              <Monk x={W.monk.x} y={W.monk.y} frame={frame} write={frame < F.press ? 1 : 0.3} turn={bell(prog(frame, F.smoke + 20, 50))} />
              <OilLamp x={W.lamp.x} y={W.lamp.y} frame={frame} />
            </g>
          ) : null}
          <Puffs frame={frame} />
          <Plinth frame={frame} />
          <BigNumeral frame={frame} />
          <River frame={frame} />
          <Overflow frame={frame} />
          <Gavel frame={frame} />
          <Source frame={frame} />
          <Annotation frame={frame} />
          <Hero frame={frame} />
        </Layer>
        {/* 被托着的卷轴与手跟着镜头走，不加运动模糊 */}
        <Layer blur={false}>
          <ScrollTubes frame={frame} />
          <Inscription frame={frame} />
          <Hands frame={frame} />
          <FallingTag frame={frame} />
        </Layer>
      </>
    );
  }
  if (slot === 'front') {
    return (
      <>
        <Layer depth={1.4}>
          <SandDrift frame={frame} />
        </Layer>
        <Layer depth={1.6}>
          <Columns frame={frame} />
        </Layer>
      </>
    );
  }
  return null;
};
