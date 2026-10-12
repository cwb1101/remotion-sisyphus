// 字幕数据自检：读完时长、相邻版式、居中占比、出画、音效文件、重点词。
// 有任何一项不过就以非零退出码结束，渲染命令会在这一步停下。
import fs from 'node:fs';
import path from 'node:path';

const data = JSON.parse(fs.readFileSync('src/data/subtitles.json', 'utf8'));
const scriptTs = fs.readFileSync('src/data/script.ts', 'utf8');
const ENTER = Number(/ENTER_FRAMES = (\d+)/.exec(scriptTs)[1]);
const EXIT = Number(/EXIT_FRAMES = (\d+)/.exec(scriptTs)[1]);
const {fps, width: W, height: H} = data;
const SAFE = 80;
const CHARS_PER_SEC = 5;

const errors = [];
const warns = [];
const countChars = (t) => Array.from(t).filter((c) => /[一-鿿0-9A-Za-z]/.test(c)).length;
const phrases = (t) => {
  const out = [];
  let cur = '';
  for (const ch of Array.from(t)) {
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

const screens = data.screens;
const rows = [];
screens.forEach((s, i) => {
  const dur = s.end - s.start;
  const chars = countChars(s.text);
  const need = Math.ceil((chars / CHARS_PER_SEC) * fps);
  const readable = dur - (s.delay ?? 0) - ENTER - EXIT;
  rows.push({id: s.id, layout: s.layout, frames: `${s.start}-${s.end}`, chars, need, readable, ok: readable >= need ? '✓' : '✗'});
  if (!(Number.isInteger(s.start) && Number.isInteger(s.end) && s.end > s.start)) errors.push(`${s.id}: 帧号必须是整数且 end > start`);
  if (readable < need) errors.push(`${s.id}: 读不完——${chars} 字至少要 ${need} 帧完整停留，现在只有 ${readable} 帧`);
  if (i > 0) {
    const prev = screens[i - 1];
    if (prev.end > s.start) errors.push(`${prev.id} 和 ${s.id} 时间重叠`);
    if (prev.layout === s.layout) errors.push(`${prev.id} 和 ${s.id} 相邻两屏用了同一种版式 ${s.layout}`);
  }
  for (const h of s.highlight ?? []) if (!s.text.includes(h)) errors.push(`${s.id}: 重点词「${h}」不在字幕里`);
  if (s.layout === 'D' && !s.text.includes(s.options?.big ?? '')) errors.push(`${s.id}: D 版式的 options.big 不在字幕里`);
  if (s.layout === 'C' && !s.options?.side) errors.push(`${s.id}: C 版式需要 options.side`);
  if (s.layout === 'G' && !s.options?.note) errors.push(`${s.id}: G 版式需要英文小注 options.note`);
  // 出画估算（中文全角字宽 ≈ 字号）
  const lines = phrases(s.text);
  const longest = Math.max(...lines.map((l) => Array.from(l).length));
  const room = W - SAFE * 2;
  const est = {
    A: 112 * longest + 56 * (lines.length - 1) + 60,
    B: 64 * longest + 50,
    G: 84 * longest + 60,
    F: 104 * longest + 104 * (lines.length - 1) + (s.options?.x ?? 120) - SAFE,
    H: 216 * Math.max(...(lines.length > 1 ? lines : [s.text]).map((l) => Array.from(l).length)) / (Array.from(s.text).length * 216 > room ? 2 : 1) + 180,
    D: 172 * Array.from(s.options?.big ?? '').length + 140,
    E: 68 * longest + 34 * (lines.length - 1),
  }[s.layout];
  if (est && est > room) errors.push(`${s.id}: 估算宽度 ${Math.round(est)}px 超出安全区 ${room}px`);
  if (s.layout === 'C') {
    // 与 Subtitle.tsx 的 C 版式一致：字号 70，顶边最多 SAFE+40，后一列下错 1.2 字高
    const bottom = SAFE + 40 + Math.max(...lines.map((l, ci) => ci * 70 * 1.2 + Array.from(l).length * 70 * 1.06));
    if (bottom > H - SAFE) errors.push(`${s.id}: 竖排底边 ${Math.round(bottom)}px 超出安全区（应 ≤ ${H - SAFE}）`);
  }
  for (const c of s.sfx ?? []) {
    if (!fs.existsSync(path.join('public/sfx', `${c.sound}.wav`))) errors.push(`${s.id}: 音效 ${c.sound}.wav 不存在（先运行 npm run sfx）`);
    if (c.at < 0 || c.at >= dur + 30) warns.push(`${s.id}: 音效 ${c.sound} 的 at=${c.at} 超出本屏范围`);
  }
});
for (const sc of data.scenes) {
  if (sc.bed && !fs.existsSync(path.join('public/sfx', `${sc.bed.sound}.wav`))) errors.push(`场景 ${sc.id}: 底噪 ${sc.bed.sound}.wav 不存在`);
}
const centered = screens.filter((s) => s.layout === 'H').length;
const ratio = centered / screens.length;
if (ratio > 0.2) errors.push(`居中版式占 ${(ratio * 100).toFixed(0)}%，超过两成`);

console.table(rows);
const counts = {};
for (const s of screens) counts[s.layout] = (counts[s.layout] ?? 0) + 1;
console.log('版式次数：', counts, `居中占比 ${(ratio * 100).toFixed(1)}%`);
warns.forEach((w) => console.warn('注意：', w));
if (errors.length) {
  errors.forEach((e) => console.error('✗', e));
  process.exit(1);
}
console.log('✓ 字幕数据检查通过');
