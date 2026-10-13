/**
 * 字幕稿校验：时间轴、阅读速度、重点词、版式轮换、占比、音效文件。
 * 任一硬性规则不通过就退出码 1，`npm run render:preview` 会在渲染前停下。
 */
import fs from 'node:fs';
import path from 'node:path';
import {FPS, SCREENS, SfxId} from '../src/data/script';
import {TYPE} from '../src/theme';

const errors: string[] = [];
const warn: string[] = [];
const BOTTOM = new Set(['bottom-center', 'bottom-left-note', 'lower-left-paragraph', 'stagger-bottom', 'follow', 'occluded']);
// 进场 12 帧 + 出场 9 帧里字不完全可读，扣掉后再算阅读时间
const FADE = 21;
const CPS = 5;

const ids = new Set<string>();
SCREENS.forEach((s, i) => {
  if (ids.has(s.id)) errors.push(`${s.id}: 重复的 id`);
  ids.add(s.id);
  if (s.end <= s.start) errors.push(`${s.id}: 结束帧必须大于开始帧`);
  const prev = SCREENS[i - 1];
  if (prev && s.start < prev.end) errors.push(`${s.id}: 与 ${prev.id} 时间重叠`);
  if (prev && s.start > prev.end) warn.push(`${s.id}: 与上一屏之间空 ${s.start - prev.end} 帧`);
  const chars = [...s.text.replace(/[\n，。、：；？！“”——…%·\s]/g, '').replace(/\d+/g, '#')].length;
  const readable = (s.end - s.start - FADE) / FPS;
  if (chars / CPS > readable) errors.push(`${s.id}: ${chars} 字需要 ${(chars / CPS).toFixed(1)}s，可读时间只有 ${readable.toFixed(1)}s`);
  if (s.keywords.length > 2) errors.push(`${s.id}: 重点词超过 2 个`);
  for (const k of s.keywords) if (!s.text.includes(k)) errors.push(`${s.id}: 重点词「${k}」不在文字里`);
  if (prev && prev.layout === s.layout) errors.push(`${s.id}: 与上一屏版式完全相同（${s.layout}）`);
  if (s.layout.startsWith('stagger') && !s.text.includes('\n')) errors.push(`${s.id}: 大小字错位需要用 \\n 分成小字、大字两行`);
  for (const c of s.sfx ?? []) {
    if (!fs.existsSync(path.join(__dirname, '..', 'public', 'sfx', `${c.id as SfxId}.wav`))) errors.push(`${s.id}: 缺音效文件 ${c.id}.wav（先跑 npm run sfx）`);
  }
});
const n = SCREENS.length;
const bottom = SCREENS.filter((s) => BOTTOM.has(s.layout)).length;
const center = SCREENS.filter((s) => s.layout === 'center').length;
if (bottom / n < 0.6) errors.push(`下方版式只占 ${((bottom / n) * 100).toFixed(1)}%（要求 ≥ 60%）`);
if (center / n > 0.2) errors.push(`居中版式占 ${((center / n) * 100).toFixed(1)}%（要求 ≤ 20%）`);
if (TYPE.keyword / TYPE.main > 1.4) errors.push(`重点词 ${TYPE.keyword}px 超过主字幕 ${TYPE.main}px 的 1.4 倍`);
if (TYPE.main < 64) errors.push(`主字幕 ${TYPE.main}px 小于 64px`);

console.log(`字幕稿：${n} 屏，${(SCREENS[n - 1].end / FPS).toFixed(1)}s，下方 ${((bottom / n) * 100).toFixed(1)}%，居中 ${((center / n) * 100).toFixed(1)}%，重点词 ${TYPE.keyword}px = 主字幕 × ${(TYPE.keyword / TYPE.main).toFixed(2)}`);
warn.forEach((w) => console.log('  ! ' + w));
errors.forEach((e) => console.log('  ✗ ' + e));
if (errors.length) process.exit(1);
console.log('  ✓ 全部通过');
