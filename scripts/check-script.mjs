#!/usr/bin/env node
// 校验 src/data/script.json 是否符合全片硬性规范（字幕部分）。任何一条不过就以非 0 退出。
//   - 屏与屏首尾相接、不重叠
//   - 每屏时长 ≥ 字数 / 5 字每秒（读得完）
//   - 每屏最多两行（按 66px 字号 + 字间距估宽，宽度上限 1200px）
//   - 重点词必须出现在该屏文字里；颜色只能是两种强调色；同一个词全片同色
//   - 逐帧数高亮：字幕【】 + 正在显示的彩色大字 ≤ 2（大字规则与 BigWord.tsx 一致）
//   - 大字框必须在 bigWordZone 内（不进右侧禁字区，不压底部字幕）
//   - 音效档位只能是 weak / mid / strong；强音效只出现在 sfxTier 为 strong 的屏，全片 ≤ 6 处
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/script.json'), 'utf8'));
const { rules } = d;
const errors = [];
const warn = [];
const accents = new Set(Object.values(rules.accentColors));
const PUNCT = /[，。？！、：；“”‘’（）《》…—,.?!:;"'()\s]/g;
const fps = d.fps;

const sections = Object.fromEntries(d.sections.map((s) => [s.id, s]));
const wordColor = new Map();
let strongCount = 0;

d.screens.forEach((s, i) => {
  const prev = d.screens[i - 1];
  if (prev && prev.endFrame !== s.startFrame) errors.push(`#${s.id} 与上一屏不相接（${prev.endFrame} → ${s.startFrame}）`);
  const dur = s.endFrame - s.startFrame;
  const chars = s.text.replace(PUNCT, '').length;
  const need = Math.ceil((chars / rules.readingCharsPerSecond) * fps);
  if (dur < need) errors.push(`#${s.id}「${s.text}」${chars} 字需要 ${need} 帧，只给了 ${dur} 帧`);

  const st = rules.subtitle;
  const lineW = [...s.text].length * (st.fontSize + 2);
  const lines = Math.ceil(lineW / st.maxWidth);
  if (lines > st.maxLines) errors.push(`#${s.id} 估计 ${lines} 行，超过 ${st.maxLines} 行`);
  if (st.left !== 360 || st.left + st.maxWidth !== rules.forbiddenTextZoneX) errors.push('字幕块必须是 x 360–1560');
  if (st.bottomMargin < 80) errors.push('字幕底边离画面底部不足 80px');
  if (st.fontSize < 64) errors.push('主字幕字号小于 64px');

  if (s.highlights.length > rules.maxHighlightsPerScreen) errors.push(`#${s.id} 高亮 ${s.highlights.length} 处`);
  for (const h of s.highlights) {
    if (!s.text.includes(h.word)) errors.push(`#${s.id} 重点词「${h.word}」不在字幕里`);
    if (!accents.has(h.color)) errors.push(`#${s.id} 重点词「${h.word}」颜色 ${h.color} 不是强调色`);
    if (wordColor.has(h.word) && wordColor.get(h.word) !== h.color) errors.push(`「${h.word}」前后颜色不一致`);
    wordColor.set(h.word, h.color);
  }

  if (s.bigWord) {
    const b = s.bigWord;
    const z = rules.bigWordZone;
    if (b.x < z.minX || b.x + b.w > z.maxX || b.y < z.minY || b.y + b.h > z.maxY) errors.push(`#${s.id} 大字框越界 ${JSON.stringify(b)}`);
    if (b.x + b.w >= rules.forbiddenTextZoneX) errors.push(`#${s.id} 大字进入右侧禁字区`);
    if (!accents.has(b.color)) errors.push(`#${s.id} 大字颜色不是强调色`);
    if (!s.highlights.some((h) => h.word === b.text && h.color === b.color)) warn.push(`#${s.id} 大字「${b.text}」和字幕高亮不一致`);
    if (!s.sfx.length) errors.push(`#${s.id} 大字没有对应的落地音效（落地帧取第一个音效）`);
  }

  for (const c of s.sfx) {
    if (!['weak', 'mid', 'strong'].includes(c.tier)) errors.push(`#${s.id} 音效档位 ${c.tier} 非法`);
    if (c.tier === 'strong') {
      strongCount++;
      if (s.sfxTier !== 'strong') errors.push(`#${s.id} 有强音效但该屏档位不是 strong`);
    }
  }
  if (s.sfxTier && !s.sfx.length) errors.push(`#${s.id} 标了档位 ${s.sfxTier} 但没有音效`);
});
const wm = rules.watermark;
if (wm && (wm.x < rules.forbiddenTextZoneX || wm.y + wm.h > 160)) errors.push('水印必须在右上角禁字区内');
if (strongCount > 6) errors.push(`强音效 ${strongCount} 处，超过 6 处`);

// 逐帧数高亮（与 BigWord.tsx / Preview.tsx 同规则）
const big = d.screens.filter((s) => s.bigWord);
const colored = (b, f) => {
  const hit = b.startFrame + (b.sfx[0]?.atFrame ?? 0);
  const appear = Math.max(b.startFrame, hit - 8);
  const next = big.find((o) => o.section === b.section && o.startFrame > b.startFrame);
  const dimAt = next ? next.startFrame - 2 : Infinity;
  const outEnd = Math.min(sections[b.section].endFrame - 24, b.endFrame + 70) + 12;
  return f >= appear && f < dimAt && f <= outEnd;
};
for (const s of d.screens) {
  for (let f = s.startFrame; f < s.endFrame; f++) {
    const n = s.highlights.length + big.filter((b) => colored(b, f)).length;
    if (n > rules.maxHighlightsPerScreen) {
      errors.push(`#${s.id} 第 ${f} 帧同时有 ${n} 处高亮（字幕 + 大字）`);
      break;
    }
  }
}

const total = d.screens.reduce((a, s) => a + s.text.replace(PUNCT, '').length, 0);
console.log(`screens=${d.screens.length} chars=${total} strongSfx=${strongCount} last=${d.screens.at(-1).endFrame}f`);
warn.forEach((w) => console.log('WARN', w));
if (errors.length) {
  errors.forEach((e) => console.log('FAIL', e));
  process.exit(1);
}
console.log('script.json OK');
