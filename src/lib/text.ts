// 字幕排版的共享逻辑：分词高亮、断行、宽度估算（渲染和校验脚本共用）

export const SUB_SIZE = 64;
export const SUB_MAX_W = 960;
export const SUB_LETTER = 0.04; // em
export const SPACE_EM = 0.6;

// 屏幕上禁止出现的标点（中英文都算）
export const PUNCT = /[，。、；：？！…—·“”‘’（）《》〈〉【】「」『』,.;:?!'"()\[\]<>\/\\|~`@#$%^&*_+=\-]/;

export type Run = {text: string; hot: boolean};

/** 把一行切成普通/高亮片段 */
export const runsOf = (line: string, keywords: string[]): Run[] => {
  const runs: Run[] = [];
  let i = 0;
  while (i < line.length) {
    const k = keywords.find((kw) => kw && line.startsWith(kw, i));
    if (k) {
      runs.push({text: k, hot: true});
      i += k.length;
      continue;
    }
    const last = runs[runs.length - 1];
    if (last && !last.hot) last.text += line[i];
    else runs.push({text: line[i], hot: false});
    i++;
  }
  return runs;
};

const charEm = (ch: string) => {
  if (ch === ' ') return SPACE_EM;
  if (/[0-9]/.test(ch)) return 0.58;
  if (/[A-Za-z]/.test(ch)) return 0.6;
  return 1;
};

export const estimateWidth = (line: string, size = SUB_SIZE) =>
  [...line].reduce((w, ch) => w + (charEm(ch) + SUB_LETTER) * size, 0);

/** 超过最大宽度时，在离中点最近的空格处断成两行 */
export const splitLines = (text: string, size = SUB_SIZE, maxW = SUB_MAX_W): string[] => {
  if (estimateWidth(text, size) <= maxW) return [text];
  const spaces = [...text].map((c, i) => (c === ' ' ? i : -1)).filter((i) => i >= 0);
  if (spaces.length === 0) {
    const mid = Math.ceil(text.length / 2);
    return [text.slice(0, mid), text.slice(mid)];
  }
  const mid = text.length / 2;
  const at = spaces.reduce((b, i) => (Math.abs(i - mid) < Math.abs(b - mid) ? i : b), spaces[0]);
  return [text.slice(0, at), text.slice(at + 1)];
};

/** 不计空格的字数 */
export const charCount = (text: string) => [...text].filter((c) => c !== ' ').length;
