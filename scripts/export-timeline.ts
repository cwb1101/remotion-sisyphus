/** 把音效时间轴导出成 JSON，交给 Python 混音（字幕改了时间，这里自动跟着变） */
import fs from 'fs';
import { FPS, SECTIONS } from '../src/data/script';
import { BED_CHORDS, BED_DUCK, SFX } from '../src/data/timeline';

const total = SECTIONS[SECTIONS.length - 1].end;
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/timeline.json', JSON.stringify({ fps: FPS, total, sfx: SFX, chords: BED_CHORDS, duck: BED_DUCK }, null, 1));
console.log(`导出 ${SFX.length} 个音效事件，总长 ${total} 帧`);
