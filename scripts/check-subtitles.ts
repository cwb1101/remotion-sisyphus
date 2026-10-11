// 字幕数据自检：node --experimental-strip-types scripts/check-subtitles.ts
// 检查 id 重复、帧号连续、重点词是否在句中、每屏停留时间够不够读完。
import {CUES, FPS} from '../src/data/subtitles.ts';

const READ_SPEED = 5; // 字/秒
const FADE_FRAMES = 5; // 出场淡出占用的帧，这段时间字已经在消失，不算阅读时间

const countChars = (s: string) => (s.match(/[一-鿿0-9A-Za-z]/g) ?? []).length;
let problems = 0;
const fail = (msg: string) => {
  problems++;
  console.log(`✗ ${msg}`);
};

const ids = new Set<string>();
CUES.forEach((c, i) => {
  if (ids.has(c.id)) fail(`id 重复：${c.id}`);
  ids.add(c.id);
  if (c.end <= c.start) fail(`${c.id}：结束帧不大于开始帧`);
  const prev = CUES[i - 1];
  if (prev && prev.end !== c.start) fail(`${prev.id} → ${c.id}：帧号不连续（${prev.end} ≠ ${c.start}）`);
  for (const h of c.highlights) if (!c.text.includes(h)) fail(`${c.id}：重点词「${h}」不在句子里`);
  if (c.style === 'slam' && c.highlights.length === 0) fail(`${c.id}：slam 样式需要至少一个重点词`);
  const n = countChars(c.text);
  const readable = (c.end - c.start - FADE_FRAMES) / FPS;
  const need = n / READ_SPEED;
  if (readable + 1e-9 < need) fail(`${c.id}「${c.text}」${n} 字，需要 ${need.toFixed(2)}s，实际可读 ${readable.toFixed(2)}s`);
});

const total = CUES.reduce((s, c) => s + countChars(c.text), 0);
console.log(`${CUES.length} 屏，${total} 字，总长 ${(CUES[CUES.length - 1].end / FPS).toFixed(1)}s`);
if (problems) {
  console.log(`共 ${problems} 处问题`);
  process.exit(1);
}
console.log('✓ 字幕数据检查通过');
