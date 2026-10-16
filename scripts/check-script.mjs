// 校验字幕定稿 src/data/script.json 是否符合全片硬性规范。
// 用法：node scripts/check-script.mjs
import { readFileSync } from 'node:fs';

const script = JSON.parse(readFileSync(new URL('../src/data/script.json', import.meta.url)));
const { fps, colors, cues } = script;
const allowedColors = new Set([colors.warm, colors.cool]);

// 与 src/components/Subtitle.tsx / BigWord.tsx 保持一致
const SUB_FONT = 64;
const SUB_MAX_WIDTH = 1200;
const BIG_FONT = 210;
const BIG_MAX_WIDTH = 860;
const READ_SPEED = 5; // 字/秒
const FADE = 5; // 帧：淡入 5 帧 + 淡出 5 帧，各算一半

const errors = [];
const warns = [];
const readable = (s) => [...s].filter((c) => /[\p{Script=Han}A-Za-z0-9]/u.test(c)).length;
// 估算渲染宽度：汉字和全角标点 1em，半角字符 0.55em
const textWidth = (s, size) => [...s].reduce((w, c) => w + (/[\x20-\x7e]/.test(c) ? 0.55 : 1) * size, 0);

let prevEnd = 0;
let strong = 0;
for (const c of cues) {
  const tag = `#${String(c.id).padStart(2, '0')}`;
  if (c.start !== prevEnd) errors.push(`${tag} 开始帧 ${c.start} 与上一屏结束帧 ${prevEnd} 不连续`);
  prevEnd = c.end;
  // 字幕淡入淡出各 5 帧，半透明的那一半不算可读时间
  const dur = (c.end - c.start - FADE) / fps;
  const need = readable(c.text) / READ_SPEED;
  if (dur + 1e-6 < need) errors.push(`${tag} 读不完：${readable(c.text)} 字需要 ${need.toFixed(2)}s，扣掉淡入淡出只有 ${dur.toFixed(2)}s`);

  const lines = Math.ceil(textWidth(c.text, SUB_FONT) / SUB_MAX_WIDTH);
  if (lines > 2) errors.push(`${tag} 超过两行（估算 ${lines} 行）`);

  let hl = c.highlights.length + (c.counter === 'flash' ? 1 : 0);
  if (c.counter === 'flash' && c.highlights.some((h) => h.word.includes('cm'))) hl -= 1; // 同一个“0 cm”
  if (hl > 2) errors.push(`${tag} 高亮 ${hl} 处，超过 2 处`);
  for (const h of c.highlights) {
    if (!c.text.includes(h.word)) errors.push(`${tag} 高亮词「${h.word}」不在字幕里`);
    if (!allowedColors.has(h.color)) errors.push(`${tag} 高亮色 ${h.color} 不在两种强调色里`);
  }
  if (c.big) {
    if (!c.highlights.some((h) => h.word === c.big.word && h.color === c.big.color)) errors.push(`${tag} 大字「${c.big.word}」必须复用本屏同色高亮词`);
    if (textWidth(c.big.word, BIG_FONT) > BIG_MAX_WIDTH) errors.push(`${tag} 大字过宽，会进入右侧禁字区`);
  }
  for (const s of c.sfx) {
    if (!['weak', 'mid', 'strong'].includes(s.level)) errors.push(`${tag} 音效档位 ${s.level} 非法`);
    if (s.level === 'strong') strong++;
    if (s.beat && c.beats[s.beat] === undefined) errors.push(`${tag} 音效引用了不存在的 beat「${s.beat}」`);
  }
}
if (strong > 6) warns.push(`“强”档音效 ${strong} 处，超过约 5 处的预算`);

const totalChars = cues.reduce((n, c) => n + readable(c.text), 0);
console.log(`共 ${cues.length} 屏，${totalChars} 字，${(prevEnd / fps).toFixed(1)} 秒，强音效 ${strong} 处`);
warns.forEach((w) => console.log('⚠ ' + w));
if (errors.length) {
  errors.forEach((e) => console.log('✗ ' + e));
  process.exit(1);
}
console.log('✓ 字幕稿校验通过');
