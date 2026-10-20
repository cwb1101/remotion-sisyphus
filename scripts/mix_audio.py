"""
按时间轴把合成音效混成整片音轨 → out/mix.wav（48 kHz 立体声）

- 音效来自 public/sfx/*.wav（scripts/synth_sfx.py 生成），时间与音量来自 out/timeline.json
- 氛围垫音：每节一个柔和和弦，只用正弦叠加 + 低通，节与节之间 1.5 秒交叉淡化；有意静音处压下去
- 统一音量：整体缩放到最响处（关键句的 slam）峰值约 -4 dBFS，再过一道 -3.2 dBFS 的软限幅
"""

import json
import os
import sys
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
SR = 48000


def read_wav(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(axis=1)
        return x


def onepole(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def bed(total_s, chords, fps):
    n = int(total_s * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    starts = [c["from"] / fps for c in chords] + [total_s]
    for i, c in enumerate(chords):
        a, b = starts[i], starts[i + 1]
        env = np.clip((t - (a - 0.75)) / 1.5, 0, 1) * np.clip(((b + 0.75) - t) / 1.5, 0, 1)
        env = np.sin(env * np.pi / 2) ** 2
        idx = np.where(env > 0)[0]
        if len(idx) == 0:
            continue
        tt = t[idx]
        sig_l = np.zeros(len(idx))
        sig_r = np.zeros(len(idx))
        for k, hz in enumerate(c["hz"]):
            g = 1 / (1 + k * 0.6)
            lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.07 + k * 0.013) * tt + k)
            sig_l += g * lfo * np.sin(2 * np.pi * hz * 0.999 * tt + k)
            sig_r += g * lfo * np.sin(2 * np.pi * hz * 1.001 * tt + k * 1.7)
        out[idx, 0] += sig_l * env[idx]
        out[idx, 1] += sig_r * env[idx]
    return out


def main():
    tl = json.load(open(os.path.join(ROOT, "out", "timeline.json")))
    fps, total = tl["fps"], tl["total"]
    total_s = total / fps
    n = int(total_s * SR)
    mix = np.zeros((n, 2))

    # 氛围垫音
    b = bed(total_s, tl["chords"], fps)
    b[:, 0] = onepole(onepole(b[:, 0], 900), 900)
    b[:, 1] = onepole(onepole(b[:, 1], 900), 900)
    b /= np.max(np.abs(b)) + 1e-9
    duck = np.ones(n)
    for d in tl["duck"]:
        a, z = int(d["from"] / fps * SR), int(d["to"] / fps * SR)
        ramp = int(0.15 * SR)
        g = np.ones(n)
        g[a:z] = d["level"]
        # 进出各 0.15 秒平滑
        for j in range(ramp):
            if a - ramp + j >= 0:
                g[a - ramp + j] = min(g[a - ramp + j], 1 - (1 - d["level"]) * j / ramp)
            if z + j < n:
                g[z + j] = min(g[z + j], d["level"] + (1 - d["level"]) * j / ramp)
        duck = np.minimum(duck, g)
    BED_LEVEL = 0.13
    mix += b * BED_LEVEL * duck[:, None]

    # 音效
    cache = {}
    for e in tl["sfx"]:
        name = e["sound"]
        if name not in cache:
            cache[name] = read_wav(os.path.join(ROOT, "public", "sfx", f"{name}.wav"))
        x = cache[name] * e["volume"]
        at = int(e["at"] / fps * SR)
        if at >= n:
            continue
        seg = x[: n - at]
        mix[at: at + len(seg), 0] += seg
        mix[at: at + len(seg), 1] += seg

    # 统一音量：关键句最响处 → -4 dBFS
    peak = np.max(np.abs(mix))
    mix *= 10 ** (-4 / 20) / peak
    # 软限幅（理论上不会触发，作为保险）
    th = 10 ** (-3.2 / 20)
    over = np.abs(mix) > th * 0.9
    knee = th * 0.9
    mix[over] = np.sign(mix[over]) * (knee + (th - knee) * np.tanh((np.abs(mix[over]) - knee) / (th - knee)))
    # 首尾渐变
    fi = int(0.005 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    tail = int(0.3 * SR)
    mix[-tail:] = 0
    mix[-tail - int(0.2 * SR): -tail] *= np.linspace(1, 0, int(0.2 * SR))[:, None]

    out = os.path.join(ROOT, "out", "mix.wav")
    data = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"写出 {out}  {total_s:.1f}s  峰值 {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS")


if __name__ == "__main__":
    sys.exit(main())
