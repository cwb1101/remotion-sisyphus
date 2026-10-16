// 用代码合成全部音效，按字幕数据文件的时间轴混成一条 48kHz / 16bit 立体声 wav。
// 不使用任何音频素材。
//
// 用法：node scripts/synth-audio.mjs [--end preview|full|<帧号>] [--stems]
//   --end    合成到哪一帧（默认 preview = script.json 里的 previewEnd）
//   --stems  另外导出每个音效的单轨（out/audio-qa/），用于放大检查噪声
//
// 规则（全片硬性规范）：
//   · 点缀音效三档峰值：弱 -24 dBFS、中 -16 dBFS、强 -8 dBFS（每个音效各自归一到所属档位）
//   · 铺底垫音连续不断（各段交叉淡化，不留意外静音），电平按全片响度目标（约 -20 LUFS，BS.1770）自动校准，
//     并在“中”“强”音效和“抽空”处自动压低，保证关键句最响
//   · 噪声类音效先过 8 阶高通（130Hz）+ 8 阶低通（≤3.5kHz）再压低电平，不整段铺白噪声
//   · 每个音效首尾强制 ≥15ms 淡入淡出；总线前瞻限幅，上限 -6.5 dBFS，不削波
//   · 不加抖动噪声
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
const TARGET_LUFS = -20.5; // 约 -20 LUFS，略偏小
const BED_MAX_PEAK_DB = -9.5; // 铺底再响也不超过这个峰值，给关键句留出余量

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
    sweep(b, expGlide(95, 42, 0.18), (t) => 0.5 * decay(t, 0.012, 0.45));
    sweep(b, expGlide(190, 84, 0.18), (t) => 0.2 * decay(t, 0.012, 0.25));
    [[110, 0.5], [130.81, 0.36], [164.81, 0.32], [220, 0.24], [329.63, 0.08]].forEach(([f, a]) => {
      sweep(b, () => f, (t) => a * decay(t, 0.03, 1.1));
      sweep(b, () => f * 1.003, (t) => a * 0.5 * decay(t, 0.03, 1.1));
    });
    // 中频和弦层：让关键句在手机外放上也是全片最响的那一下（仍是柔和正弦，不刺耳）
    [[261.63, 0.55], [329.63, 0.48], [440, 0.4], [523.25, 0.26], [659.25, 0.12]].forEach(([f, a]) => sweep(b, () => f, (t) => a * decay(t, 0.02, 1.4)));
    return b;
  },
  // 重低音击＋余震（强）：更长的重击，后面跟着 6Hz 颤动的低频余震
  boom: () => {
    const b = buf(3.6);
    sweep(b, expGlide(85, 36, 0.25), (t) => 0.5 * decay(t, 0.012, 0.6));
    sweep(b, expGlide(170, 72, 0.25), (t) => 0.2 * decay(t, 0.012, 0.32));
    sweep(b, () => 55, (t) => 0.3 * decay(t, 0.15, 1.0) * (0.6 + 0.4 * Math.sin(TAU * 6 * t)) * (t > 0.15 ? 1 : t / 0.15));
    [[73.42, 0.3], [110, 0.28], [146.83, 0.22], [174.61, 0.16], [220, 0.1]].forEach(([f, a]) => sweep(b, () => f, (t) => a * decay(t, 0.05, 1.3)));
    // 中频和弦层（同上）
    [[293.66, 0.42], [349.23, 0.36], [440, 0.3], [587.33, 0.18]].forEach(([f, a]) => sweep(b, () => f, (t) => a * decay(t, 0.02, 1.3)));
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

  // 低频长钟（强）：FM 钟声，基频低、衰减长，叠一个温暖和弦，不尖
  longBell: () => {
    const dur = 4.2;
    const b = buf(dur);
    const fm = (fc, ratio, index, amp, tau) => {
      let ph = 0;
      let pm = 0;
      for (let i = 0; i < b.length; i++) {
        const t = i / SR;
        const env = decay(t, 0.018, tau);
        b[i] += amp * env * Math.sin(ph + index * env * Math.sin(pm));
        ph += (TAU * fc) / SR;
        pm += (TAU * fc * ratio) / SR;
      }
    };
    fm(196, 1.4, 1.2, 1, 1.4);
    fm(98, 2, 0.6, 0.7, 1.8);
    [[146.83, 0.35], [220, 0.3], [293.66, 0.18]].forEach(([f, a]) => sweep(b, () => f, (t) => a * decay(t, 0.12, 1.6)));
    return b;
  },
  // 上扬铺垫：音高上扬、音量渐强后自然收尾
  riser: () => {
    const dur = 1.2;
    const b = buf(dur);
    const env = (t) => Math.pow(Math.min(1, t / (dur * 0.85)), 2.6) * Math.min(1, (dur - t) / 0.2);
    sweep(b, expGlide(220, 660, dur), env);
    sweep(b, expGlide(330, 990, dur), (t) => 0.3 * env(t));
    return b;
  },
  // 柔和短钟（中）
  bell: () => {
    const b = buf(2.0);
    [[523.25, 1], [784, 0.35], [1046.5, 0.12]].forEach(([f, a], k) => sweep(b, () => f, (t) => a * decay(t, 0.012, 0.55 / (k + 1))));
    sweep(b, () => 261.63, (t) => 0.4 * decay(t, 0.02, 0.6));
    return b;
  },
  // 温和和弦（中）
  chord: () => {
    const dur = 2.6;
    const b = buf(dur);
    const env = (t) => Math.min(1, t / 0.12) * Math.exp(-t / 1.1);
    [[196, 1], [246.94, 0.8], [293.66, 0.7], [392, 0.35]].forEach(([f, a]) => {
      sweep(b, () => f, (t) => a * env(t));
      sweep(b, () => f * 1.002, (t) => a * 0.5 * env(t));
    });
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


/** 马蹄：三连一组的软低音点，越跑越快；durSec 后骤停 */
const hoof = (durSec, accel = true) => {
  const b = buf(durSec + 0.6);
  let t0 = 0;
  let k = 0;
  while (t0 < durSec - 0.05) {
    const s0 = Math.round(t0 * SR);
    const one = buf(0.4);
    sweep(one, expGlide(180, 90, 0.05), (t) => (k % 3 === 0 ? 1 : 0.7) * decay(t, 0.008, 0.06));
    sweep(one, expGlide(420, 260, 0.05), (t) => 0.25 * decay(t, 0.008, 0.03));
    edgeFade(one, 0.008, 0.12);
    for (let i = 0; i < one.length && s0 + i < b.length; i++) b[s0 + i] += one[i];
    const gap = k % 3 === 2 ? 0.2 : 0.09;
    t0 += accel ? gap * Math.max(0.55, 1 - t0 / (durSec * 1.6)) : gap;
    k++;
  }
  return b;
};

/** 软脚步：跟走路节奏（约每 0.29 秒一步）的轻木质点音 */
const footsteps = (durSec, step = 0.29) => {
  const b = buf(durSec + 0.5);
  for (let t0 = 0, k = 0; t0 < durSec - 0.05; t0 += step, k++) {
    const s0 = Math.round(t0 * SR);
    const one = buf(0.3);
    const a = k % 2 ? 0.8 : 1;
    sweep(one, expGlide(300, 190, 0.04), (t) => a * decay(t, 0.008, 0.045));
    sweep(one, () => 760, (t) => a * 0.18 * decay(t, 0.008, 0.02));
    edgeFade(one, 0.008, 0.1);
    for (let i = 0; i < one.length && s0 + i < b.length; i++) b[s0 + i] += one[i];
  }
  return b;
};

/** 呼吸垫音：两次缓慢的吸—呼起伏 */
const breathPad = (durSec) => {
  const b = buf(durSec);
  [[174.61, 1], [261.63, 0.6], [349.23, 0.25]].forEach(([f, a]) =>
    sweep(b, () => f, (t) => a * (0.5 - 0.5 * Math.cos((t / 1.5) * TAU)) * Math.min(1, (durSec - t) / 0.4)),
  );
  return b;
};

/** 垫音：几个正弦组成的和弦，左右声道略微失谐，振幅缓慢起伏 */
const PADS = {
  padNight: [[110, 1], [164.81, 0.7], [220, 0.5], [261.63, 0.32]],
  padDusk: [[87.31, 0.9], [130.81, 0.8], [220, 0.5], [329.63, 0.22]],
  padTense: [[73.42, 1], [110, 0.8], [146.83, 0.55], [174.61, 0.4], [311.13, 0.07]],
  padPlain: [[98, 0.9], [146.83, 0.8], [196, 0.5], [293.66, 0.3], [440, 0.1]],
  padCool: [[82.41, 0.9], [123.47, 0.8], [164.81, 0.5], [246.94, 0.3]],
  padCalm: [[110, 0.8], [164.81, 0.8], [220, 0.5], [277.18, 0.35], [329.63, 0.15]],
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
// 两条总线：点缀音效（EV，按三档峰值）+ 铺底垫音（BED，先统一到 0dBFS 参考峰值，最后整体校准响度）
const EV = [new Float32Array(LEN), new Float32Array(LEN)];
const BED = [new Float32Array(LEN), new Float32Array(LEN)];
const stems = [];
const ducks = []; // 铺底压低：{ at, depth(dB), hold(秒) }

const place = (bus, name, monoOrStereo, startSec, levelDb) => {
  const [a, b] = Array.isArray(monoOrStereo) ? monoOrStereo : [monoOrStereo, monoOrStereo];
  edgeFade(a, 0.015, 0.02);
  if (b !== a) edgeFade(b, 0.015, 0.02);
  const pk = Math.max(peakOf(a), peakOf(b));
  if (pk === 0) return;
  const g = dbToLin(levelDb) / pk;
  const s0 = Math.round(startSec * SR);
  for (let i = 0; i < a.length; i++) {
    const n = s0 + i;
    if (n < 0 || n >= LEN) continue;
    bus[0][n] += a[i] * g;
    bus[1][n] += b[i] * g;
  }
  if (STEMS) stems.push({ name, a, b, g, s0, bus: bus === BED ? 'bed' : 'ev' });
};

let placed = 0;
for (const bed of script.beds) {
  if (bed.start >= END_FRAME) continue;
  const dur = (bed.end - bed.start) / FPS;
  const s = bed.start / FPS;
  if (bed.type === 'crawlSand') place(EV, bed.type, crawlSand(dur, bed.start), s, LEVEL_DB[bed.level]);
  else if (PADS[bed.type]) place(BED, `${bed.type}_${bed.start}`, pad(bed.type, dur, bed.start === 0 ? 1.2 : 0.45, 0.45), s, 0);
  else throw new Error(`未知铺底类型 ${bed.type}`);
  placed++;
}

for (const c of script.cues) {
  for (const sfx of c.sfx) {
    const at = c.start + (sfx.beat ? c.beats[sfx.beat] : 0);
    if (at >= END_FRAME) continue;
    const startSec = at / FPS;
    const restSec = (sfx.dur ?? c.end - at) / FPS;
    const tag = `${String(c.id).padStart(2, '0')}_${sfx.type}`;
    let sig;
    if (sfx.type === 'heartbeat') sig = heartbeat(restSec, sfx.bpm ?? 70);
    else if (sfx.type === 'loopScale') sig = loopScale(restSec);
    else if (sfx.type === 'hoof') sig = hoof(restSec);
    else if (sfx.type === 'footsteps') sig = footsteps(restSec);
    else if (sfx.type === 'breathPad') sig = breathPad(restSec);
    else if (sfx.type === 'cutToSilence') {
      // “抽空”：铺底压低 14dB 约一秒（不是静音），中间一声软叮
      ducks.push({ at: startSec, depth: -14, hold: 0.75 });
      place(EV, `${tag}_ding`, RECIPES.ding(), startSec + 0.3, LEVEL_DB[sfx.level]);
      placed++;
      continue;
    } else if (RECIPES[sfx.type]) sig = RECIPES[sfx.type]();
    else throw new Error(`第 ${c.id} 屏的音效类型「${sfx.type}」还没有配方`);
    place(EV, tag, sig, startSec, LEVEL_DB[sfx.level]);
    if (sfx.level === 'strong') ducks.push({ at: startSec, depth: -4, hold: 1.4 });
    if (sfx.level === 'mid') ducks.push({ at: startSec, depth: -5, hold: 0.8 });
    placed++;
  }
}

// 铺底压低包络（dB）：提前 50ms 压下，保持，再用 0.6s 回来
const duckDb = new Float32Array(LEN);
for (const d of ducks) {
  const a0 = Math.round((d.at - 0.05) * SR);
  const a1 = Math.round(d.at * SR);
  const h1 = Math.round((d.at + d.hold) * SR);
  const r1 = Math.round((d.at + d.hold + 0.6) * SR);
  for (let n = Math.max(0, a0); n < Math.min(LEN, r1); n++) {
    let k = 1;
    if (n < a1) k = (n - a0) / (a1 - a0);
    else if (n > h1) k = 1 - (n - h1) / (r1 - h1);
    duckDb[n] = Math.min(duckDb[n], d.depth * (0.5 - 0.5 * Math.cos(Math.PI * k)));
  }
}
for (let n = 0; n < LEN; n++) {
  const g = dbToLin(duckDb[n]);
  BED[0][n] *= g;
  BED[1][n] *= g;
}

// ———————————————————— 响度（ITU-R BS.1770 / EBU R128 积分响度） ————————————————————
const kFilter = (x) => {
  const y = new Float32Array(x.length);
  const st = (b0, b1, b2, a1, a2, src, dst) => {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) {
      const v = b0 * src[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = src[i]; y2 = y1; y1 = v;
      dst[i] = v;
    }
  };
  st(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585, x, y);
  st(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621, y, y);
  return y;
};
const integratedLufs = (L, R) => {
  const kl = kFilter(L);
  const kr = kFilter(R);
  const blk = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const zs = [];
  for (let s = 0; s + blk <= L.length; s += hop) {
    let a = 0, b = 0;
    for (let i = s; i < s + blk; i++) { a += kl[i] * kl[i]; b += kr[i] * kr[i]; }
    zs.push((a + b) / blk);
  }
  const lk = (z) => -0.691 + 10 * Math.log10(z);
  const abs = zs.filter((z) => lk(z) > -70);
  if (!abs.length) return -Infinity;
  const rel = lk(abs.reduce((p, z) => p + z, 0) / abs.length) - 10;
  const gated = abs.filter((z) => lk(z) > rel);
  return lk(gated.reduce((p, z) => p + z, 0) / gated.length);
};

// 铺底整体增益：二分查找，让全片积分响度落到目标附近（铺底峰值不超过 BED_MAX_PEAK_DB）
const bedPeak = Math.max(peakOf(BED[0]), peakOf(BED[1]));
const mixWith = (gDb) => {
  const g = dbToLin(gDb);
  return [0, 1].map((ch) => {
    const out = new Float32Array(LEN);
    for (let n = 0; n < LEN; n++) out[n] = EV[ch][n] + BED[ch][n] * g;
    return out;
  });
};
const gMax = BED_MAX_PEAK_DB - 20 * Math.log10(bedPeak || 1);
let lo = gMax - 30;
let hi = gMax;
for (let it = 0; it < 18; it++) {
  const mid = (lo + hi) / 2;
  const [l, r] = mixWith(mid);
  if (integratedLufs(l, r) < TARGET_LUFS) lo = mid;
  else hi = mid;
}
const bedGainDb = (lo + hi) / 2;
const [L, R] = mixWith(bedGainDb);
const preLufs = integratedLufs(L, R);

// 片尾随画面一起淡出
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
const gmin = new Float32Array(LEN);
{
  const dq = [];
  let head = 0;
  for (let i = LEN - 1; i >= 0; i--) {
    while (dq.length > head && need[dq[dq.length - 1]] >= need[i]) dq.pop();
    dq.push(i);
    while (dq[head] > i + LOOK) head++;
    gmin[i] = need[dq[head]];
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
const clipped = writeWav(new URL(`../public/audio/${name}.wav`, import.meta.url), [L, R]);
const peak = Math.max(peakOf(L), peakOf(R));
console.log(`写入 public/audio/${name}.wav：${(LEN / SR).toFixed(2)}s，${placed} 个音效/铺底`);
console.log(`铺底增益 ${bedGainDb.toFixed(1)} dB（铺底峰值 ${(20 * Math.log10(bedPeak) + bedGainDb).toFixed(1)} dBFS），积分响度 ${preLufs.toFixed(1)} LUFS`);
console.log(`总线峰值 ${(20 * Math.log10(peak)).toFixed(2)} dBFS，限幅器动作 ${(limited / SR).toFixed(3)}s，削波样本 ${clipped}`);

if (STEMS) {
  const dir = new URL('../out/audio-qa/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  const gb = dbToLin(bedGainDb);
  for (const s of stems) {
    const k = s.g * (s.bus === 'bed' ? gb : 1);
    writeWav(new URL(`stem_${s.name}.wav`, dir), [Float32Array.from(s.a, (x) => x * k), Float32Array.from(s.b, (x) => x * k)]);
  }
  console.log(`单轨 ${stems.length} 条已导出到 out/audio-qa/`);
}
