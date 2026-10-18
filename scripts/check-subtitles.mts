// 字幕规则校验：npm run check
// 规则见 docs/brief.md 和第 2 步要求：≤15 字、≤4 字/秒、≥2 秒、高亮 ≤1 且在原文里、
// 换屏对齐小节（≤2 帧）、屏与屏首尾相接不重叠、重卡点 3–5 个且落在 drop / accents 上。
import { readFileSync } from 'node:fs';
import { SCREENS } from '../src/data/subtitles.ts';

const beatmap = JSON.parse(readFileSync(new URL('../src/data/beatmap.json', import.meta.url), 'utf8'));
const FPS = 30;
const PUNCT = /[，。、！？：；“”‘’「」《》【】—…·\s,.!?:;"'()（）-]/g;
const count = (s: string) => s.replace(PUNCT, '').length;

const errors: string[] = [];
const near = (f: number, list: number[], tol: number) => list.some((x) => Math.abs(x - f) <= tol);

SCREENS.forEach((s, i) => {
  const n = count(s.text);
  const sec = (s.end - s.start) / FPS;
  if (n > 15) errors.push(`#${s.id} ${n} 字，超过 15`);
  if (n / sec > 4) errors.push(`#${s.id} ${(n / sec).toFixed(2)} 字/秒，超过 4`);
  if (sec < 2) errors.push(`#${s.id} 只有 ${sec.toFixed(2)} 秒`);
  if (s.highlight && !s.text.includes(s.highlight)) errors.push(`#${s.id} 高亮「${s.highlight}」不在原文里`);
  if (!near(s.start, beatmap.bars, 2)) errors.push(`#${s.id} 开始帧 ${s.start} 没对齐小节`);
  const next = SCREENS[i + 1];
  if (next && next.start < s.end) errors.push(`#${s.id} 和 #${next.id} 重叠`);
  if (s.heavy && !(s.start === beatmap.dropFrame || beatmap.accents.includes(s.start)))
    errors.push(`#${s.id} 重卡点「${s.heavy}」不在 drop / accent 上`);
});

const heavy = SCREENS.filter((s) => s.heavy).length;
if (heavy < 3 || heavy > 5) errors.push(`重卡点 ${heavy} 个，应为 3–5 个`);

if (errors.length) {
  console.error('字幕校验未通过：\n' + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`字幕校验通过：${SCREENS.length} 屏，重卡点 ${heavy} 个`);
