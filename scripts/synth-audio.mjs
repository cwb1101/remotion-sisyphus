// 用代码合成全部音效，按字幕数据文件的时间轴混成一条 48kHz / 16bit 立体声 wav。
// 不使用任何音频素材。
//
// 用法：node scripts/synth-audio.mjs [--end preview|full|<帧号>] [--stems]
//   --end    合成到哪一帧（默认 preview = script.json 里的 previewEnd）
//   --stems  另外导出每个音效的单轨（out/audio-qa/），用于放大检查噪声
//
// 规则（全片硬性规范）：
//   · 三档峰值：弱 -24 dBFS、中 -16 dBFS、强 -8 dBFS（每个音效各自归一到所属档位）
//   · 噪声类音效先过 4 阶 100Hz 高通 + 4 阶低通（≤6kHz）再压低电平，不整段铺白噪声
//   · 每个音效首尾强制 ≥15ms 淡入淡出；总线前瞻限幅，上限 -6.5 dBFS，不削波
//   · 没有音效的地方是数字静音（全 0），不加抖动噪声
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const script = JSON.parse(readFileSync(new URL('../src/data/script.json', import.meta.url)));
const SR = 48000;
const FPS = script.fps;
const args = process.argv.slice(2);
const endArg = args.includes('--end') ? args[args.indexOf('--end') + 1] : 'preview';
const END_FRAME = endArg === 'preview' ? script.previewEnd : endArg === 'full' ? script.cues.at(-1).end : Number(endArg);
const STEMS = args.includes('--stems');
const LEN = Math.round((END_FRAME / FPS) * SR);
const CEIL = Math.pow(10, -6.5 / 20);
const LEVEL_DB = { weak: script.sfxLevels.weak, mid: script.sfxLevels.mid, strong: script.sfxLevels.strong };

// ———————————————————— 基础工具 ————————————————————
const TAU = Math.PI * 2;
const dbToLin = (db) => Math.pow(10, db / 20);
const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const peakOf = (b) => b.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

/** 确定性伪随机（mulberry32） */
const prng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** 首尾淡入淡出（升余弦），防止咔哒声 */
const edgeFade = (b, inSec = 0.015, outSec = 0.02) => {
  const ni = Math.max(1, Math.round(inSec * SR));
  const no = Math.max(1, Math.round(outSec * SR));
  for (let i = 0; i < Math.min(ni, b.length); i++) b[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / ni);
  for (let i = 0; i < Math.min(no, b.length); i++) b[b.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / no);
  return b;
};

/** RBJ 双二阶滤波 */
const biquad = (b, type, f0, Q) => {
  const w0 = (TAU * f0) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  let b0, b1, b2;
  if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha]; // 'bp'
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    b[i] = y;
  }
  return b;
};
/** 4 阶巴特沃斯（两个二阶级联） */
const butter4 = (b, type, f0) => biquad(biquad(b, type, f0, 0.5412), type, f0, 1.3066);

/** 噪声类音效统一的预处理：8 阶高通切掉 100Hz 以下轰鸣，8 阶低通切掉 lpHz 以上嘶声（6kHz 处衰减 ≥ 36dB） */
const cleanNoise = (b, lpHz = 3500) => {
  if (lpHz > 3500) throw new Error('噪声低通转折频率必须 ≤ 3.5kHz，才能保证 6kHz 以上被切干净');
  butter4(butter4(b, 'hp', 130), 'hp', 130);
  butter4(butter4(b, 'lp', lpHz), 'lp', lpHz);
  return b;
};

/** 指数衰减包络 */
const decay = (t, attack, tau) => (t < attack ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attack) : Math.exp(-(t - attack) / tau));

/** 频率随时间变化的正弦（相位累加，保证连续不跳） */
const sweep = (b, freqAt, ampAt, phase0 = 0) => {
  let ph = phase0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] += Math.sin(ph) * ampAt(t);
    ph += (TAU * freqAt(t)) / SR;
  }
  return b;
};
const expGlide = (f0, f1, dur) => (t) => f0 * Math.pow(f1 / f0, Math.min(1, t / dur));

// ———————————————————— 音效配方 ————————————————————
/** 每个配方返回单声道 Float32Array（起点 = 触发时刻）。 */
const RECIPES = {
  // 冷光轻叮：柔和的钟片，基频 C6，泛音很少，避免刺耳
  ding: () => {
    const b = buf(1.6);
    [[1046.5, 1], [2093, 0.22], [3139.5, 0.06]].forEach(([f, a], k) => sweep(b, () => f, (t) => a * decay(t, 0.012, 0.42 / (k + 1))));
    return b;
  },
  // 低咚：音高从 120Hz 滑到 52Hz，加 2、3 次谐波让手机外放也听得见
  thump: () => {
    const b = buf(0.9);
    sweep(b, expGlide(120, 52, 0.12), (t) => decay(t, 0.01, 0.2));
    sweep(b, expGlide(240, 104, 0.12), (t) => 0.32 * decay(t, 0.01, 0.1));
    sweep(b, expGlide(360, 156, 0.12), (t) => 0.12 * decay(t, 0.01, 0.06));
    return b;
  },
  // 低频重击＋和弦（强）：重击之后接一个温暖的小调和弦慢慢散开
  impact: () => {
    const b = buf(3.2);
    sweep(b, expGlide(95, 42, 0.18), (t) => decay(t, 0.012, 0.45));
    sweep(b, expGlide(190, 84, 0.18), (t) => 0.3 * decay(t, 0.012, 0.25));
    [[110, 0.5], [130.81, 0.36], [164.81, 0.32], [220, 0.24], [329.63, 0.08]].forEach(([f, a]) => {
      sweep(b, () => f, (t) => a * decay(t, 0.03, 1.1));
      sweep(b, () => f * 1.003, (t) => a * 0.5 * decay(t, 0.03, 1.1));
    });
    return b;
  },
  // 重低音击＋余震（强）：更长的重击，后面跟着 6Hz 颤动的低频余震
  boom: () => {
    const b = buf(3.6);
    sweep(b, expGlide(85, 36, 0.25), (t) => decay(t, 0.012, 0.6));
    sweep(b, expGlide(170, 72, 0.25), (t) => 0.34 * decay(t, 0.012, 0.32));
    sweep(b, () => 55, (t) => 0.45 * decay(t, 0.15, 1.0) * (0.6 + 0.4 * Math.sin(TAU * 6 * t)) * (t > 0.15 ? 1 : t / 0.15));
    [[73.42, 0.3], [110, 0.28], [146.83, 0.22], [174.61, 0.16], [220, 0.1]].forEach(([f, a]) => sweep(b, () => f, (t) => a * decay(t, 0.05, 1.3)));
    return b;
  },
  // 倒放上扬滑音：音量渐强、音高上扬，像倒带
  reverseRise: () => {
    const dur = 1.9;
    const b = buf(dur);
    const env = (t) => Math.pow(Math.min(1, t / (dur - 0.08)), 2.2);
    sweep(b, expGlide(170, 700, dur), env);
    sweep(b, expGlide(255, 1050, dur), (t) => 0.35 * env(t));
    sweep(b, expGlide(340, 1400, dur), (t) => 0.12 * env(t));
    return edgeFade(b, 0.02, 0.06);
  },
  // 软嗒：很短的木质点音，攻击 8ms，不会有咔哒
  softTap: () => {
    const b = buf(0.45);
    sweep(b, () => 660, (t) => decay(t, 0.008, 0.06));
    sweep(b, () => 1320, (t) => 0.25 * decay(t, 0.008, 0.035));
    sweep(b, () => 220, (t) => 0.4 * decay(t, 0.008, 0.08));
    return b;
  },
  // 柔和短嗡：放大镜推近时的轻嗡，带轻微颤音
  hum: () => {
    const dur = 1.3;
    const b = buf(dur);
    const env = (t) => Math.min(1, t / 0.12) * Math.min(1, (dur - t) / 0.4);
    [[220, 1], [330, 0.5], [440, 0.18]].forEach(([f, a]) => sweep(b, (t) => f + 2.5 * Math.sin(TAU * 5 * t), (t) => a * env(t)));
    return b;
  },
  // 短下滑音
  downSlide: () => {
    const b = buf(0.7);
    sweep(b, expGlide(520, 170, 0.4), (t) => decay(t, 0.01, 0.22));
    sweep(b, expGlide(780, 255, 0.4), (t) => 0.25 * decay(t, 0.01, 0.15));
    return b;
  },
  // 低频拉长滑音（缠上去）
  longSlide: () => {
    const dur = 2.4;
    const b = buf(dur);
    const env = (t) => Math.min(1, t / 0.25) * Math.min(1, (dur - t) / 0.6);
    sweep(b, expGlide(150, 72, 1.8), env);
    sweep(b, expGlide(225, 108, 1.8), (t) => 0.4 * env(t));
    sweep(b, expGlide(300, 144, 1.8), (t) => 0.18 * env(t));
    return b;
  },
};

/** 心跳：按 bpm 一直跳到这一屏结束；每拍“咚-咚”两下 */
const heartbeat = (durSec, bpm) => {
  const b = buf(durSec + 0.8);
  const period = 60 / bpm;
  for (let t0 = 0; t0 < durSec - 0.05; t0 += period) {
    [[0, 1], [0.27, 0.7]].forEach(([off, a]) => {
      const s0 = Math.round((t0 + off) * SR);
      const one = buf(0.6);
      sweep(one, expGlide(78, 48, 0.08), (t) => a * decay(t, 0.012, 0.09));
      sweep(one, expGlide(156, 96, 0.08), (t) => a * 0.35 * decay(t, 0.012, 0.06));
      edgeFade(one, 0.012, 0.15);
      for (let i = 0; i < one.length && s0 + i < b.length; i++) b[s0 + i] += one[i];
    });
  }
  return b;
};

/** 循环上行音阶：五声音阶，越来越快 */
const loopScale = (durSec) => {
  const notes = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
  const b = buf(durSec + 1.0);
  let t0 = 0;
  let k = 0;
  while (t0 < durSec - 0.1) {
    const f = notes[k % notes.length];
    const s0 = Math.round(t0 * SR);
    const one = buf(0.9);
    const a = 0.6 + 0.4 * (t0 / durSec);
    sweep(one, () => f, (t) => a * decay(t, 0.01, 0.16));
    sweep(one, () => f * 2, (t) => a * 0.18 * decay(t, 0.01, 0.08));
    edgeFade(one, 0.01, 0.2);
    for (let i = 0; i < one.length && s0 + i < b.length; i++) b[s0 + i] += one[i];
    t0 += Math.max(0.1, 0.34 - 0.025 * k);
    k++;
  }
  return b;
};

/** 垫音：几个正弦组成的和弦，左右声道略微失谐，振幅缓慢起伏 */
const PADS = {
  padNight: [[110, 1], [164.81, 0.7], [220, 0.5], [261.63, 0.32]],
  padDusk: [[87.31, 0.9], [130.81, 0.8], [220, 0.5], [329.63, 0.22]],
  padTense: [[73.42, 1], [110, 0.8], [146.83, 0.55], [174.61, 0.4], [311.13, 0.07]],
};
const pad = (type, durSec, fadeIn, fadeOut) => {
  const L = buf(durSec);
  const R = buf(durSec);
  PADS[type].forEach(([f, a], k) => {
    const lfo = (t) => 0.75 + 0.25 * Math.sin(TAU * (0.07 + 0.03 * k) * t + k);
    sweep(L, () => f * 0.9985, (t) => a * lfo(t), k);
    sweep(R, () => f * 1.0015, (t) => a * lfo(t), k + 1);
  });
  [L, R].forEach((b) => {
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      b[i] *= Math.min(1, t / fadeIn) * Math.min(1, (durSec - t) / fadeOut);
    }
  });
  return [L, R];
};

/** 爬行沙粒：滤波后的噪声，按蛇的扭动节奏起伏，蛇减速时一起变轻 */
const crawlSand = (durSec, startFrame) => {
  const rand = prng(7);
  const raw = buf(durSec);
  for (let i = 0; i < raw.length; i++) raw[i] = rand() * 2 - 1;
  cleanNoise(raw, 3200);
  // 与 src/lib/snake.ts 的 makeHeadS 同一套时间：划伤前匀速，之后三次缓出到停下
  const cue5 = script.cues.find((c) => c.id === 5);
  const cue8 = script.cues.find((c) => c.id === 8);
  const fScr = cue5.start + cue5.beats.scratch;
  const fStop = cue8.start + cue8.beats.turn;
  const speedAt = (f) => (f <= fScr ? 1 : Math.pow(1 - Math.min(1, (f - fScr) / (fStop - fScr)), 2));
  let ph = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SR;
    const f = startFrame + t * FPS;
    const sp = speedAt(f);
    ph += (TAU * 1.27 * sp) / SR; // 每半个波长一次“沙沙”
    const am = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(ph), 2);
    raw[i] *= am * (0.15 + 0.85 * sp) * Math.min(1, t / 0.6) * Math.min(1, (durSec - t) / 0.5);
  }
  return raw;
};

// ———————————————————— 按时间轴混音 ————————————————————
const L = new Float32Array(LEN);
const R = new Float32Array(LEN);
const stems = [];

const place = (name, monoOrStereo, startSec, levelDb, pan = 0) => {
  const [a, b] = Array.isArray(monoOrStereo) ? monoOrStereo : [monoOrStereo, monoOrStereo];
  edgeFade(a, 0.015, 0.02);
  if (b !== a) edgeFade(b, 0.015, 0.02);
  const pk = Math.max(peakOf(a), peakOf(b));
  if (pk === 0) return;
  const g = dbToLin(levelDb) / pk;
  const gl = g * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = g * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const s0 = Math.round(startSec * SR);
  for (let i = 0; i < a.length; i++) {
    const n = s0 + i;
    if (n < 0 || n >= LEN) continue;
    L[n] += a[i] * gl;
    R[n] += b[i] * gr;
  }
  if (STEMS) stems.push({ name, a, b, g, s0 });
};

let placed = 0;
for (const bed of script.beds) {
  if (bed.start >= END_FRAME) continue;
  const dur = (bed.end - bed.start) / FPS;
  const s = bed.start / FPS;
  const level = LEVEL_DB[bed.level];
  if (bed.type === 'crawlSand') place(bed.type, crawlSand(dur, bed.start), s, level);
  else if (PADS[bed.type]) place(bed.type, pad(bed.type, dur, bed.start === 0 ? 1.2 : 0.45, 0.45), s, level);
  else throw new Error(`未知铺底类型 ${bed.type}`);
  placed++;
}

for (const c of script.cues) {
  for (const sfx of c.sfx) {
    const at = c.start + (sfx.beat ? c.beats[sfx.beat] : 0);
    if (at >= END_FRAME) continue;
    const startSec = at / FPS;
    const restSec = (c.end - at) / FPS;
    let sig;
    if (sfx.type === 'heartbeat') sig = heartbeat(restSec, sfx.bpm ?? 70);
    else if (sfx.type === 'loopScale') sig = loopScale(restSec);
    else if (RECIPES[sfx.type]) sig = RECIPES[sfx.type]();
    else throw new Error(`第 ${c.id} 屏的音效类型「${sfx.type}」还没有配方`);
    place(`${String(c.id).padStart(2, '0')}_${sfx.type}`, sig, startSec, LEVEL_DB[sfx.level]);
    placed++;
  }
}

// 预览结尾随画面一起淡出到数字静音
const tailN = Math.round(0.45 * SR);
for (let i = 0; i < tailN; i++) {
  const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / tailN);
  L[LEN - 1 - i] *= g;
  R[LEN - 1 - i] *= g;
}

// ———————————————————— 总线前瞻限幅（不削波） ————————————————————
const LOOK = Math.round(0.005 * SR);
const REL = 1 - Math.exp(-1 / (0.08 * SR));
const need = new Float32Array(LEN);
for (let i = 0; i < LEN; i++) {
  const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  need[i] = p > CEIL ? CEIL / p : 1;
}
// 前瞻窗口内取最小增益（单调队列）
const gmin = new Float32Array(LEN);
{
  const dq = [];
  for (let i = LEN - 1; i >= 0; i--) {
    while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop();
    dq.push(i);
    while (dq[0] > i + LOOK) dq.shift();
    gmin[i] = need[dq[0]];
  }
}
let g = 1;
let limited = 0;
for (let i = 0; i < LEN; i++) {
  const target = gmin[i];
  g = target < g ? target : g + (1 - g) * REL;
  if (g < 0.999) limited++;
  L[i] *= g;
  R[i] *= g;
}

// ———————————————————— 写 wav ————————————————————
const writeWav = (path, chans) => {
  const n = chans[0].length;
  const out = Buffer.alloc(44 + n * chans.length * 2);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + n * chans.length * 2, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(chans.length, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * chans.length * 2, 28);
  out.writeUInt16LE(chans.length * 2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(n * chans.length * 2, 40);
  let clipped = 0;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < chans.length; c++) {
      let v = Math.round(chans[c][i] * 32767);
      if (v > 32767 || v < -32768) clipped++;
      v = Math.max(-32768, Math.min(32767, v));
      out.writeInt16LE(v, 44 + (i * chans.length + c) * 2);
    }
  writeFileSync(path, out);
  return clipped;
};

mkdirSync(new URL('../public/audio/', import.meta.url), { recursive: true });
const name = endArg === 'preview' ? 'preview' : endArg === 'full' ? 'full' : `upto_${END_FRAME}`;
const outPath = new URL(`../public/audio/${name}.wav`, import.meta.url);
const clipped = writeWav(outPath, [L, R]);
const peak = Math.max(peakOf(L), peakOf(R));
console.log(`写入 public/audio/${name}.wav：${(LEN / SR).toFixed(2)}s，${placed} 个音效/铺底`);
console.log(`总线峰值 ${(20 * Math.log10(peak)).toFixed(2)} dBFS，限幅器动作 ${(limited / SR).toFixed(3)}s，削波样本 ${clipped}`);

if (STEMS) {
  const dir = new URL('../out/audio-qa/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const s of stems) {
    const a = Float32Array.from(s.a, (x) => x * s.g);
    const b = Float32Array.from(s.b, (x) => x * s.g);
    writeWav(new URL(`stem_${s.name}.wav`, dir), [a, b]);
  }
  console.log(`单轨 ${stems.length} 条已导出到 out/audio-qa/`);
}
