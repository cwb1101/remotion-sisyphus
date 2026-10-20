/**
 * 字幕稿自检：标点、重点词、阅读时长、版式（行数/行宽/右侧禁区）、时间轴顺序。
 * 用法：npx tsx scripts/check-script.ts
 */
import { CUES, FPS, SECTIONS, THEME } from '../src/data/script';
import { IN_PICTURE_TEXT } from '../src/data/timeline';
import { fontSizeFor, layoutCue, lineWidthEm, PUNCT, SUB } from '../src/subtitleLayout';

const CHARS_PER_SEC = 5;
const errors: string[] = [];
const warns: string[] = [];

const readUnits = (t: string) =>
  [...t.replace(/[\s\n]/g, '')].reduce((n, ch) => n + (/[A-Za-z]/.test(ch) ? 0.5 : 1), 0);

for (const t of [THEME, ...SECTIONS.map((s) => s.title), ...IN_PICTURE_TEXT]) {
  if (PUNCT.test(t)) errors.push(`画面文字含标点：${t}`);
}

let prevEnd = -1;
for (const c of CUES) {
  const tag = `${c.id}「${c.text.replace('\n', '/')}」`;
  if (PUNCT.test(c.text)) errors.push(`${tag} 含标点`);
  if (c.end <= c.start) errors.push(`${tag} 结束帧不大于开始帧`);
  if (c.start < prevEnd) errors.push(`${tag} 与上一屏重叠`);
  prevEnd = c.end;
  for (const k of c.keywords) if (!c.text.includes(k)) errors.push(`${tag} 重点词「${k}」不在文字里`);
  const sec = SECTIONS.find((s) => s.id === c.section)!;
  if (c.start < sec.start || c.end > sec.end) errors.push(`${tag} 超出所属小节 ${sec.id} 的范围`);

  const need = readUnits(c.text) / CHARS_PER_SEC;
  const have = (c.end - c.start) / FPS;
  if (have + 1e-6 < need) errors.push(`${tag} 读不完：需要 ${need.toFixed(2)}s，只有 ${have.toFixed(2)}s`);

  const lines = layoutCue(c);
  const size = fontSizeFor(c);
  if (lines.length > 2) errors.push(`${tag} 超过两行`);
  for (const ln of lines) {
    const px = lineWidthEm(ln) * size * 1.04; // 字距余量
    if (px > SUB.maxWidth) errors.push(`${tag} 单行 ${px.toFixed(0)}px 超过 ${SUB.maxWidth}px`);
    const right = 960 + px / 2;
    if (right > 1440) errors.push(`${tag} 进入右侧 1/4 禁区（右缘 ${right.toFixed(0)}px）`);
  }
  if (size < 64 && c.style !== 'note') errors.push(`${tag} 字号 ${size}px 小于 64px`);
  if (have - need < 0.2 && c.style !== 'note') warns.push(`${tag} 余量只有 ${(have - need).toFixed(2)}s`);
}

console.log(`检查 ${CUES.length} 屏字幕`);
warns.forEach((w) => console.log('提醒', w));
if (errors.length) {
  errors.forEach((e) => console.log('错误', e));
  process.exit(1);
}
console.log('全部通过');
