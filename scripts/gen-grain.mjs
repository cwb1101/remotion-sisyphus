// 生成胶片颗粒贴图（灰度 PNG），不依赖任何第三方库
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.resolve('public/grain');
const TILES = 8;
const W = 1160;
const H = 740;
fs.mkdirSync(OUT, {recursive: true});

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

let seed = 20251012;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

for (let n = 0; n < TILES; n++) {
  // 两层：细颗粒 + 略粗的团块，近似胶片颗粒
  const fine = new Float32Array(W * H);
  for (let i = 0; i < fine.length; i++) fine[i] = rnd() + rnd() + rnd() - 1.5;
  const raw = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const xl = x > 0 ? fine[i - 1] : fine[i];
      const yu = y > 0 ? fine[i - W] : fine[i];
      const v = fine[i] * 0.7 + (xl + yu) * 0.25;
      raw[y * (W + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(128 + v * 70)));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 0; // grayscale
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(OUT, `grain-${n}.png`), png);
}
console.log(`grain: ${TILES} tiles -> ${OUT}`);
