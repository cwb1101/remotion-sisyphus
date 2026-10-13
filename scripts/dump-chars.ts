/** 收集字幕稿里用到的全部字符，写到 public/fonts/charset.txt，供字体子集化和缺字检查使用。 */
import fs from 'node:fs';
import path from 'node:path';
import {SCREENS} from '../src/data/script';
import {WATERMARK} from '../src/theme';
import {COVER_KICKER, COVER_SUB, COVER_TITLE} from '../src/Cover';

const serif = new Set<string>();
const sans = new Set<string>();
for (const s of SCREENS) {
  for (const ch of s.text.replace(/\n/g, '')) serif.add(ch);
  // stagger 版式的第一行用思源黑体
  if (s.layout.startsWith('stagger')) for (const ch of s.text.split('\n')[0]) sans.add(ch);
  for (const ch of s.note ?? '') sans.add(ch);
}
for (const ch of WATERMARK) sans.add(ch);
// 封面用字
for (const ch of COVER_TITLE.join('')) serif.add(ch);
for (const ch of COVER_SUB + COVER_KICKER) sans.add(ch);
const ascii = Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i)).join('');
const extra = '，。、：；？！“”‘’——…·→≈%（）《》【】';
const out = path.join(__dirname, '..', 'public', 'fonts');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'charset-serif.txt'), [...serif].join('') + ascii + extra);
fs.writeFileSync(path.join(out, 'charset-sans.txt'), [...sans].join('') + ascii + extra);
console.log(`charset: serif ${serif.size} chars, sans ${sans.size} chars`);
