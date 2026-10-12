import React from 'react';
import {random} from 'remotion';
import {ENTER_FRAMES, EXIT_FRAMES, SCREENS, Screen} from '../data/script';
import {clamp, easeOut, prog, track} from '../lib/anim';
import {C, FONT_SANS, FONT_SERIF, H, SAFE, W, WATERMARK_ZONE} from '../theme';

/* ------------------------------------------------------------------ */
/* 文本切分                                                            */
/* ------------------------------------------------------------------ */

interface Glyph {
  ch: string;
  hl: boolean;
  /** 在整句里的序号，用于逐字入场 */
  i: number;
}

const glyphs = (text: string, highlight: string[], offset = 0): Glyph[] => {
  const marks = new Array(text.length).fill(false);
  for (const h of highlight) {
    if (!h) continue;
    let from = 0;
    for (;;) {
      const idx = text.indexOf(h, from);
      if (idx < 0) break;
      for (let k = idx; k < idx + h.length; k++) marks[k] = true;
      from = idx + h.length;
    }
  }
  return Array.from(text).map((ch, i) => ({ch, hl: marks[i], i: i + offset}));
};

/** 按标点断行：逗号、句号、问号后换行（标点留在行尾） */
export const phrases = (text: string): string[] => {
  const out: string[] = [];
  let cur = '';
  for (const ch of Array.from(text)) {
    // 后引号跟在上一行末尾，不单独成行
    if ('”」’'.includes(ch) && !cur && out.length) {
      out[out.length - 1] += ch;
      continue;
    }
    cur += ch;
    if ('，。？！：；'.includes(ch)) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur) out.push(cur);
  return out;
};

const lineGlyphs = (screen: Screen, lines: string[]) => {
  let offset = 0;
  return lines.map((line) => {
    const g = glyphs(line, screen.highlight, offset);
    offset += line.length;
    return g;
  });
};

/** 中文全角字宽≈字号；用来估算宽度、保证不出画 */
export const textWidth = (s: string, size: number) => Array.from(s).length * size;

/* ------------------------------------------------------------------ */
/* 计时                                                                */
/* ------------------------------------------------------------------ */

export const visibleWindow = (s: Screen) => ({
  from: s.start + (s.delay ?? 0),
  to: s.end,
});

/** 0..1 入场进度、0..1 出场进度 */
const timing = (s: Screen, frame: number) => {
  const {from, to} = visibleWindow(s);
  const local = frame - from;
  const exit = prog(frame, to - EXIT_FRAMES, to);
  return {local, exit, total: to - from};
};

/** 关键句砸下时的镜头震动（像素），全片统一从字幕数据里取 */
export const slamShake = (frame: number) => {
  let dx = 0;
  let dy = 0;
  for (const s of SCREENS) {
    if (s.emphasis !== 'slam') continue;
    const hit = s.start + (s.delay ?? 0) + 5;
    const t = frame - hit;
    if (t < 0 || t > 16) continue;
    const amp = 14 * Math.exp(-t / 4.5) * (s.layout === 'H' ? 1 : 0.7);
    dx += Math.sin(t * 2.7 + 1) * amp;
    dy += Math.cos(t * 3.3) * amp;
  }
  return {dx, dy};
};

/* ------------------------------------------------------------------ */
/* 单字                                                                */
/* ------------------------------------------------------------------ */

const textShadow = '0 0 28px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.55)';
const hlShadow = `0 0 26px rgba(217,164,65,0.42), 0 2px 6px rgba(0,0,0,0.55)`;

type CharAnim = 'drop' | 'rise' | 'fade' | 'down';

const Char: React.FC<{
  g: Glyph;
  local: number;
  stagger: number;
  anim: CharAnim;
  vertical?: boolean;
}> = ({g, local, stagger, anim, vertical}) => {
  const t = clamp((local - g.i * stagger) / 6);
  const e = easeOut(t);
  let tx = 0;
  let ty = 0;
  if (anim === 'drop') ty = (1 - e) * -34;
  if (anim === 'rise') ty = (1 - e) * 26;
  if (anim === 'down') ty = (1 - e) * -40;
  const blur = (1 - e) * 8;
  return (
    <span
      style={{
        display: 'inline-block',
        opacity: e,
        transform: `translate(${tx}px, ${ty}px)`,
        filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
        color: g.hl ? C.accent : C.text,
        textShadow: g.hl ? hlShadow : textShadow,
        writingMode: vertical ? 'vertical-rl' : undefined,
      }}
    >
      {g.ch}
    </span>
  );
};

/** 竖排时标点换成竖排字形 */
const VERTICAL_PUNCT: Record<string, string> = {'，': '︐', '。': '︒', '？': '︖', '！': '︕', '：': '︓', '；': '︔'};

/** 让整句在 ENTER_FRAMES 内全部到位 */
const staggerFor = (n: number) => Math.min(1.2, Math.max(0.2, (ENTER_FRAMES - 6) / Math.max(1, n - 1)));

/* ------------------------------------------------------------------ */
/* 版式                                                                */
/* ------------------------------------------------------------------ */

const base: React.CSSProperties = {
  position: 'absolute',
  fontFamily: FONT_SERIF,
  whiteSpace: 'nowrap',
  lineHeight: 1.28,
};

const jitter = (id: string, key: string, amp: number) => (random(`${id}-${key}`) - 0.5) * 2 * amp;

const Lines: React.FC<{
  screen: Screen;
  local: number;
  size: number;
  weight: number;
  anim: CharAnim;
  align?: 'left' | 'right';
  indent?: number;
}> = ({screen, local, size, weight, anim, align = 'left', indent = 0}) => {
  const lines = lineGlyphs(screen, phrases(screen.text));
  const stagger = staggerFor(screen.text.length);
  return (
    <div style={{fontSize: size, fontWeight: weight, textAlign: align}}>
      {lines.map((g, li) => (
        <div key={li} style={{paddingLeft: align === 'left' ? li * indent : 0}}>
          {g.map((x) => (
            <Char key={x.i} g={x} local={local} stagger={stagger} anim={anim} />
          ))}
        </div>
      ))}
    </div>
  );
};

/** A：左上大字，右下留白；长句自动缩小字号以免出画；关键句整块砸下来 */
const A_SIZE = 112;
export const aSize = (text: string) => {
  const lines = phrases(text);
  const need = Math.max(...lines.map((l, i) => Array.from(l).length * A_SIZE + i * 56));
  const room = W - SAFE * 2 - 80;
  return need > room ? Math.floor((A_SIZE * room) / need) : A_SIZE;
};
const LayoutA: React.FC<{s: Screen; local: number}> = ({s, local}) => {
  const left = SAFE + 40 + jitter(s.id, 'ax', 16);
  const top = SAFE + 30 + Math.abs(jitter(s.id, 'ay', 20));
  const rule = prog(local, 4, 22);
  const size = aSize(s.text);
  const slam = s.emphasis === 'slam';
  const e = easeOut(clamp(local / 7));
  return (
    <div
      style={{
        ...base,
        left,
        top,
        transform: slam ? `scale(${1.32 - 0.32 * e}) translateY(${(1 - e) * -30}px)` : undefined,
        transformOrigin: '0 0',
        filter: slam && e < 0.97 ? `blur(${((1 - e) * 10).toFixed(2)}px)` : undefined,
      }}
    >
      <Lines screen={s} local={slam ? Math.max(local, ENTER_FRAMES) : local} size={size} weight={900} anim="drop" indent={size / 2} />
      <div style={{marginTop: 26, width: 260 * rule, height: 2, background: C.accent, opacity: 0.85}} />
    </div>
  );
};

/** B：右下角小段落 */
const LayoutB: React.FC<{s: Screen; local: number}> = ({s, local}) => {
  const right = SAFE + 30;
  const bottom = SAFE + 20 + Math.abs(jitter(s.id, 'by', 18));
  const rule = prog(local, 0, 14);
  return (
    <div style={{...base, right, bottom, textAlign: 'left'}}>
      <div style={{width: 64 * rule, height: 2, background: C.accent, marginBottom: 22}} />
      <Lines screen={s} local={local} size={64} weight={600} anim="rise" />
    </div>
  );
};

/** C：竖排贴边（字号、行距与检查脚本一致：每字 1.06 字高，后一列下错 1.2 字高） */
const C_SIZE = 70;
const LayoutC: React.FC<{s: Screen; local: number}> = ({s, local}) => {
  const side = s.options?.side ?? 'right';
  const size = C_SIZE;
  const cols = lineGlyphs(s, phrases(s.text));
  const stagger = staggerFor(s.text.length);
  // 贴右边时从水印下方开始排
  const top = (side === 'right' ? WATERMARK_ZONE.bottom + 10 : SAFE + 20) + Math.abs(jitter(s.id, 'cy', 20));
  const lineH = prog(local, 0, 20);
  const longest = Math.max(...cols.map((c) => c.length));
  const posStyle: React.CSSProperties = side === 'right' ? {right: SAFE + 30} : {left: SAFE + 30};
  return (
    <div style={{...base, ...posStyle, top, display: 'flex', flexDirection: side === 'right' ? 'row' : 'row-reverse', gap: 26}}>
      <div style={{display: 'flex', flexDirection: 'row-reverse', gap: 20, fontSize: size, fontWeight: 700, lineHeight: 1.0}}>
        {cols.map((col, ci) => (
          <div
            key={ci}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: ci * size * 1.2,
              letterSpacing: 0,
            }}
          >
            {col.map((g) => (
              <div key={g.i} style={{height: size * 1.06, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Char g={{...g, ch: VERTICAL_PUNCT[g.ch] ?? g.ch}} local={local} stagger={stagger} anim="down" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{width: 2, height: longest * size * 1.06 * lineH, background: C.accent, opacity: 0.7}} />
    </div>
  );
};

/** D：大小字错位 */
const LayoutD: React.FC<{s: Screen; local: number}> = ({s, local}) => {
  const big = s.options?.big ?? s.highlight[0] ?? '';
  const idx = s.text.indexOf(big);
  const pre = idx > 0 ? s.text.slice(0, idx) : '';
  let post = idx >= 0 ? s.text.slice(idx + big.length) : '';
  if (/^[，。？！]*$/.test(post)) post = '';
  const small = 64;
  const bigSize = 172;
  const slam = s.emphasis === 'slam';
  const preG = glyphs(pre, [], 0);
  const bigG = glyphs(big, [big], pre.length);
  const postG = glyphs(post, [], pre.length + big.length);
  const stagger = staggerFor(s.text.length);
  // 大字：从上方砸下来
  const hit = clamp(local / 7);
  const e = easeOut(hit);
  const bigScale = slam ? 1.75 - 0.75 * e + (hit >= 1 ? Math.sin(Math.min(1, (local - 7) / 6) * Math.PI) * 0.03 : 0) : 1;
  const bigBlur = slam ? (1 - e) * 14 : 0;
  const bigW = textWidth(big, bigSize);
  const postW = textWidth(post, small);
  const left = SAFE + 30 + Math.abs(jitter(s.id, 'dx', 18));
  const bottom = SAFE + 30;
  const bigIndent = pre ? 70 : 0;
  return (
    <div style={{...base, left, bottom}}>
      {pre ? (
        <div style={{fontSize: small, fontWeight: 500, marginBottom: 6}}>
          {preG.map((g) => (
            <Char key={g.i} g={g} local={local - 2} stagger={stagger} anim="rise" />
          ))}
        </div>
      ) : null}
      <div
        style={{
          fontSize: bigSize,
          fontWeight: 900,
          lineHeight: 1.08,
          paddingLeft: bigIndent,
          color: C.accent,
          textShadow: hlShadow,
          opacity: slam ? e : 1,
          transform: `scale(${bigScale}) translateY(${slam ? (1 - e) * -40 : 0}px)`,
          transformOrigin: `${bigIndent + bigW / 2}px 60%`,
          filter: bigBlur > 0.3 ? `blur(${bigBlur.toFixed(2)}px)` : undefined,
          letterSpacing: '0.02em',
        }}
      >
        {slam
          ? big
          : bigG.map((g) => <Char key={g.i} g={g} local={local} stagger={stagger} anim="drop" />)}
      </div>
      {post ? (
        <div
          style={{
            fontSize: small,
            fontWeight: 500,
            marginTop: 10,
            paddingLeft: Math.max(0, bigIndent + bigW - postW + 40),
          }}
        >
          {postG.map((g) => (
            <Char key={g.i} g={g} local={local - 6} stagger={stagger} anim="rise" />
          ))}
        </div>
      ) : null}
    </div>
  );
};

/** E：跟着人物移动；anchor 为文字块左上角的目标位置 */
const LayoutE: React.FC<{s: Screen; local: number; anchor: {x: number; y: number}}> = ({s, local, anchor}) => {
  const size = 68;
  const lines = phrases(s.text);
  const w = Math.max(...lines.map((l) => textWidth(l, size)));
  const h = lines.length * size * 1.28;
  const x = Math.min(W - SAFE - w, Math.max(SAFE, anchor.x));
  let y = Math.min(H - SAFE - h, Math.max(SAFE, anchor.y));
  if (x + w > WATERMARK_ZONE.left && y < WATERMARK_ZONE.bottom) y = WATERMARK_ZONE.bottom;
  return (
    <div style={{...base, left: x, top: y}}>
      <Lines screen={s} local={local} size={size} weight={600} anim="rise" indent={34} />
    </div>
  );
};

/** F：由场景放在前景层下面；这里只负责排字 */
export const LayoutF: React.FC<{s: Screen; frame: number}> = ({s, frame}) => {
  const {local, exit} = timing(s, frame);
  if (local < 0 || frame >= s.end) return null;
  return (
    <div style={{...base, left: s.options?.x ?? SAFE + 40, top: s.options?.y ?? SAFE + 40, opacity: 1 - exit}}>
      <Lines screen={s} local={local} size={104} weight={900} anim="drop" indent={104} />
    </div>
  );
};

/** G：杂志式网格，主句 + 英文小注 */
const LayoutG: React.FC<{s: Screen; local: number}> = ({s, local}) => {
  const corner = s.options?.corner ?? 'topLeft';
  const draw = prog(local, 0, 22);
  const noteIn = prog(local, 10, 26);
  const posStyle: React.CSSProperties =
    corner === 'topLeft'
      ? {left: SAFE + 40, top: SAFE + 64}
      : corner === 'topRight'
        ? {right: SAFE + 40, top: SAFE + 64}
        : {left: SAFE + 40, bottom: SAFE + 40};
  const ruleTop = corner === 'bottomLeft' ? H - SAFE - 8 : SAFE + 18;
  // 顶部通栏线在水印左侧收住，页码也排在水印左边
  const ruleRight = corner === 'bottomLeft' ? SAFE : W - WATERMARK_ZONE.left + 30;
  return (
    <>
      {/* 网格线：顶部通栏细线 + 页码 */}
      <div
        style={{
          position: 'absolute',
          left: SAFE,
          top: ruleTop,
          width: (W - SAFE - ruleRight) * draw,
          height: 1,
          background: 'rgba(237,228,211,0.38)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: ruleRight,
          top: ruleTop - (corner === 'bottomLeft' ? 34 : -12),
          fontFamily: FONT_SANS,
          fontWeight: 300,
          fontSize: 22,
          letterSpacing: '0.3em',
          color: C.text,
          opacity: 0.7 * noteIn,
        }}
      >
        {s.options?.index ?? ''}　DON QUIXOTE
      </div>
      <div style={{...base, ...posStyle}}>
        <Lines screen={s} local={local} size={84} weight={700} anim="drop" />
        <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 26, opacity: noteIn}}>
          <div style={{width: 96 * draw, height: 2, background: C.accent}} />
          <div
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 300,
              fontSize: 26,
              letterSpacing: '0.22em',
              color: '#CDBFA6',
              textShadow,
            }}
          >
            {s.options?.note ?? ''}
          </div>
        </div>
      </div>
    </>
  );
};

/** H：全屏巨字；关键句砸下来，其余（如"他没有起来。"）缓缓浮现 */
const LayoutH: React.FC<{s: Screen; local: number}> = ({s, local}) => {
  const size = 216;
  const room = W - SAFE * 2 - 180;
  const hl = s.highlight[0] ?? '';
  const idx = hl ? s.text.indexOf(hl) : -1;
  const byPhrase = phrases(s.text);
  let lines = [s.text];
  if (textWidth(s.text, size) > room) {
    lines = byPhrase.length > 1 && byPhrase.every((l) => textWidth(l, size) <= room) ? byPhrase : idx > 0 ? [s.text.slice(0, idx), s.text.slice(idx)] : [s.text];
  }
  const all = lineGlyphs(s, lines);
  const slam = s.emphasis === 'slam';
  const noteIn = prog(local, 14, 34);
  return (
    <div
      style={{
        ...base,
        left: 0,
        top: 0,
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1.12,
      }}
    >
      {all.map((g, li) => {
        const t = clamp((local - li * 4) / (slam ? 6 : 16));
        const e = easeOut(t);
        const settle = track(local - li * 4, [[6, 1], [70, 1.04]]);
        const scale = slam ? (1.9 - 0.9 * e) * settle : 1.06 - 0.06 * e;
        return (
          <div
            key={li}
            style={{
              fontSize: size,
              fontWeight: 900,
              opacity: e,
              transform: `scale(${scale}) translateY(${(1 - e) * (slam ? -60 : 16)}px)`,
              filter: e < 0.97 ? `blur(${((1 - e) * (slam ? 18 : 8)).toFixed(2)}px)` : undefined,
              letterSpacing: '0.04em',
              paddingLeft: li === 1 ? 180 : 0,
              paddingRight: li === 0 && all.length > 1 ? 180 : 0,
            }}
          >
            {g.map((x) => (
              <span key={x.i} style={{color: x.hl ? C.accent : C.text, textShadow: x.hl ? hlShadow : textShadow}}>
                {x.ch}
              </span>
            ))}
          </div>
        );
      })}
      {s.options?.note ? (
        <div
          style={{
            marginTop: 30,
            fontFamily: FONT_SANS,
            fontWeight: 300,
            fontSize: 26,
            letterSpacing: '0.3em',
            color: '#CDBFA6',
            opacity: noteIn,
            textShadow,
          }}
        >
          {s.options.note}
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 字幕轨                                                              */
/* ------------------------------------------------------------------ */

export type AnchorFn = (frame: number) => {x: number; y: number};

export const SubtitleScreen: React.FC<{s: Screen; frame: number; anchor?: AnchorFn}> = ({s, frame, anchor}) => {
  const {local, exit} = timing(s, frame);
  if (local < 0 || frame >= s.end) return null;
  let body: React.ReactNode = null;
  switch (s.layout) {
    case 'A':
      body = <LayoutA s={s} local={local} />;
      break;
    case 'B':
      body = <LayoutB s={s} local={local} />;
      break;
    case 'C':
      body = <LayoutC s={s} local={local} />;
      break;
    case 'D':
      body = <LayoutD s={s} local={local} />;
      break;
    case 'E':
      body = <LayoutE s={s} local={local} anchor={anchor ? anchor(frame) : {x: SAFE, y: SAFE}} />;
      break;
    case 'G':
      body = <LayoutG s={s} local={local} />;
      break;
    case 'H':
      body = <LayoutH s={s} local={local} />;
      break;
    default:
      return null;
  }
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - exit, transform: `translateY(${-exit * 14}px)`}}>
      {body}
    </div>
  );
};

/** 叠在画面上的字幕轨；F 版式由场景自己画在前景层之下 */
export const SubtitleTrack: React.FC<{frame: number; anchors: Record<string, AnchorFn>}> = ({frame, anchors}) => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    {SCREENS.filter((s) => s.layout !== 'F' && frame >= s.start && frame < s.end).map((s) => (
      <SubtitleScreen key={s.id} s={s} frame={frame} anchor={anchors[s.id]} />
    ))}
  </div>
);

/** 关键句落地时的尘土爆开（陪衬，只持续半秒） */
export const SlamFX: React.FC<{frame: number}> = ({frame}) => {
  const hits = SCREENS.filter((s) => s.emphasis === 'slam');
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {hits.map((s) => {
        const hit = s.start + (s.delay ?? 0) + 5;
        const t = frame - hit;
        if (t < 0 || t > 22) return null;
        const cx = s.layout === 'H' ? W / 2 : s.layout === 'A' ? SAFE + 560 : SAFE + 420;
        const cy = s.layout === 'H' ? H / 2 : s.layout === 'A' ? SAFE + 170 : H - SAFE - 200;
        const e = easeOut(t / 22);
        return (
          <g key={s.id} style={{mixBlendMode: 'screen'}}>
            <ellipse cx={cx} cy={cy} rx={200 + e * 900} ry={60 + e * 260} fill="none" stroke={C.accent} strokeWidth={2} opacity={(1 - e) * 0.35} />
            {Array.from({length: 46}).map((_, i) => {
              const a = random(`${s.id}-sa${i}`) * Math.PI * 2;
              const sp = 300 + random(`${s.id}-ss${i}`) * 700;
              const r = 1.5 + random(`${s.id}-sr${i}`) * 3;
              return (
                <circle
                  key={i}
                  cx={cx + Math.cos(a) * sp * e * 1.2}
                  cy={cy + Math.sin(a) * sp * e * 0.45 + e * e * 60}
                  r={r}
                  fill="#F1D296"
                  opacity={(1 - e) * 0.8}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
