// 字幕稿校验：渲染前跑一遍，任何一条不过都直接失败
import {CUES, FPS, SECTIONS, SFX, DURATION} from '../src/data/script';
import {PUNCT, SUB_MAX_W, charCount, estimateWidth, splitLines} from '../src/lib/text';

const READ_RATE = 5; // 每秒最多 5 字
const errors: string[] = [];

CUES.forEach((c, i) => {
  const tag = `[${c.id} ${(c.start / FPS).toFixed(2)}s]`;
  if (c.end <= c.start) errors.push(`${tag} 结束帧不大于开始帧`);
  if (i > 0 && c.start < CUES[i - 1].end) errors.push(`${tag} 与上一屏重叠`);
  if (i > 0 && c.start > CUES[i - 1].end) errors.push(`${tag} 与上一屏之间有空档`);
  if (PUNCT.test(c.text)) errors.push(`${tag} 含标点：${c.text}`);
  for (const k of c.keywords) if (!c.text.includes(k)) errors.push(`${tag} 重点词「${k}」不在文字里`);
  const need = charCount(c.text) / READ_RATE;
  const have = (c.end - c.start) / FPS;
  if (have + 1e-6 < need) errors.push(`${tag} 读不完：${charCount(c.text)} 字需要 ${need.toFixed(2)}s，只有 ${have.toFixed(2)}s`);
  if (c.display !== 'slam') {
    const lines = splitLines(c.text);
    if (lines.length > 2) errors.push(`${tag} 超过两行`);
    for (const l of lines) if (estimateWidth(l) > SUB_MAX_W) errors.push(`${tag} 单行超过 ${SUB_MAX_W}px：${l}`);
  }
  if (!SECTIONS.some((s) => s.id === c.section)) errors.push(`${tag} 小节 ${c.section} 不存在`);
});
for (const s of SECTIONS) if (PUNCT.test(s.title)) errors.push(`小标题含标点：${s.title}`);
for (const s of SFX) if (s.at < 0 || s.at >= DURATION) errors.push(`音效 ${s.sound} 在 ${s.at} 帧，超出时长`);

if (errors.length) {
  console.error(`字幕稿校验失败（${errors.length} 条）：\n` + errors.join('\n'));
  process.exit(1);
}
const total = CUES.reduce((n, c) => n + charCount(c.text), 0);
console.log(`字幕稿校验通过：${CUES.length} 屏，${total} 字，${(DURATION / FPS).toFixed(1)} 秒，${SFX.length} 个音效`);
