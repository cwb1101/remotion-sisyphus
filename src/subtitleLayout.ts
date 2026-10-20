import type { Cue } from './data/script';

/** 字幕版式常量（渲染和检查脚本共用） */
export const SUB = {
  normalSize: 68,
  slamSize: 104,
  noteSize: 30,
  maxWidth: 960,
  bottom: 100,
  lineHeight: 1.32,
  gapEm: 0.55,
};

export const PUNCT = /[，。、；：？！…—·“”‘’「」『』（）《》〈〉【】,.;:?!'"()\[\]<>~\-]/;

/** 估算宽度（em）：中文 1em，拉丁字母/数字约 0.62em，空格停顿 gapEm */
const charEm = (ch: string) => (/[\u0000-ÿ]/.test(ch) ? 0.62 : 1);

export type Glyph = { ch: string; key: boolean; index: number };
export type Seg = Glyph[];
export type Line = Seg[];

const segWidth = (seg: Seg) => seg.reduce((w, g) => w + charEm(g.ch), 0);
export const lineWidthEm = (line: Line) =>
  line.reduce((w, s) => w + segWidth(s), 0) + Math.max(0, line.length - 1) * SUB.gapEm;

export const fontSizeFor = (c: Cue) =>
  c.style === 'slam' ? SUB.slamSize : c.style === 'note' ? SUB.noteSize : SUB.normalSize;

/** 把一屏字幕拆成行和段，并标出重点词 */
export const layoutCue = (c: Cue): Line[] => {
  const keyMask = new Array(c.text.length).fill(false);
  for (const k of c.keywords) {
    let i = c.text.indexOf(k);
    while (i >= 0) {
      for (let j = i; j < i + k.length; j++) keyMask[j] = true;
      i = c.text.indexOf(k, i + k.length);
    }
  }
  const size = fontSizeFor(c);
  // 字距（0.03–0.06em）会让实际行宽多出约 4%，这里一并算进去
  const maxEm = SUB.maxWidth / (size * 1.04);

  let idx = 0;
  const hardLines = c.text.split('\n').map((ln) => {
    const segs: Seg[] = [];
    for (const word of ln.split(' ')) {
      const seg: Seg = [];
      for (const ch of word) {
        seg.push({ ch, key: keyMask[idx], index: idx });
        idx++;
      }
      idx++; // 空格或换行
      if (seg.length) segs.push(seg);
    }
    return segs;
  });

  const out: Line[] = [];
  for (const segs of hardLines) {
    if (lineWidthEm(segs) <= maxEm) {
      out.push(segs);
      continue;
    }
    // 在最均衡的空格处折行；没有空格就从字中间断开
    let best: [Line, Line] | null = null;
    let bestScore = Infinity;
    for (let i = 1; i < segs.length; i++) {
      const a = segs.slice(0, i);
      const b = segs.slice(i);
      const score = Math.max(lineWidthEm(a), lineWidthEm(b));
      if (score < bestScore) {
        bestScore = score;
        best = [a, b];
      }
    }
    if (best && bestScore <= maxEm) {
      out.push(best[0], best[1]);
    } else {
      const flat = segs.flat();
      const half = Math.ceil(flat.length / 2);
      out.push([flat.slice(0, half)], [flat.slice(half)]);
    }
  }
  return out;
};
