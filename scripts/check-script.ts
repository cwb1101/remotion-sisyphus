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

// —— 字幕位置估算：与 Subtitle.tsx 同一套版式参数，检查边距、右侧、水印区
const tw = (str: string, size: number) => [...str].reduce((w, ch) => w + size * (/[\x20-\x7e]/.test(ch) ? (/[%A-Z0-9]/.test(ch) ? 0.62 : 0.5) : 1), 0) * 1.04;
const WM = {x0: 1920 - 80 - 210, y0: 72, x1: 1920 - 80, y1: 72 + 40};
for (const s of SCREENS) {
  const lines = s.text.split('\n');
  const kwExtra = (l: string) => s.keywords.filter((k) => l.includes(k)).reduce((a, k) => a + tw(k, TYPE.keyword) - tw(k, 68), 0);
  const w = Math.max(...lines.map((l) => tw(l, 68) + kwExtra(l)));
  let box = {x0: 0, y0: 0, x1: 0, y1: 0};
  const bottom = 1080 - (TYPE.bottom - 16);
  switch (s.layout) {
    case 'bottom-center':
    case 'occluded':
      box = s.layout === 'occluded' ? {x0: 140, x1: 140 + tw(lines.join(''), 68) + kwExtra(lines.join('')), y0: bottom - 100, y1: bottom} : {x0: 960 - (tw(lines.join(''), 68) + kwExtra(lines.join(''))) / 2, x1: 960 + (tw(lines.join(''), 68) + kwExtra(lines.join(''))) / 2, y0: bottom - 100, y1: bottom};
      break;
    case 'bottom-left-note':
      box = {x0: 132, x1: 188 + Math.max(w, (s.note ?? '').length * 24 * 0.75 + 60), y0: bottom - 60 - lines.length * 90, y1: bottom};
      break;
    case 'lower-left-paragraph':
    case 'top-left':
    case 'follow':
      box = s.layout === 'top-left' ? {x0: 120, x1: 148 + w, y0: TYPE.marginTop, y1: TYPE.marginTop + lines.length * 90} : {x0: 120, x1: 180 + w, y0: bottom - lines.length * 90, y1: bottom};
      break;
    case 'stagger-bottom':
      box = {x0: 172, x1: 228 + 150 + w, y0: bottom - 160, y1: bottom};
      break;
    case 'stagger-left':
      box = {x0: 120, x1: 148 + 70 + w, y0: 420, y1: 420 + 170};
      break;
    case 'center':
      box = {x0: 960 - (w * 72) / 68 / 2, x1: 960 + (w * 72) / 68 / 2, y0: 500, y1: 500 + lines.length * 100};
      break;
  }
  if (box.x0 < 80 || box.x1 > 1840 || box.y0 < 80 || box.y1 > 1000) errors.push(`${s.id}: 字幕估算框 (${box.x0.toFixed(0)},${box.y0.toFixed(0)})–(${box.x1.toFixed(0)},${box.y1.toFixed(0)}) 离边缘不足 80px`);
  if (box.x0 > 960) errors.push(`${s.id}: 字幕整体在右半边`);
  if (box.x1 > WM.x0 && box.y0 < WM.y1 + 20) errors.push(`${s.id}: 字幕进入右上角水印区`);
}

console.log(`字幕稿：${n} 屏，${(SCREENS[n - 1].end / FPS).toFixed(1)}s，下方 ${((bottom / n) * 100).toFixed(1)}%，居中 ${((center / n) * 100).toFixed(1)}%，重点词 ${TYPE.keyword}px = 主字幕 × ${(TYPE.keyword / TYPE.main).toFixed(2)}`);
warn.forEach((w) => console.log('  ! ' + w));
errors.forEach((e) => console.log('  ✗ ' + e));
if (errors.length) process.exit(1);
console.log('  ✓ 全部通过');
