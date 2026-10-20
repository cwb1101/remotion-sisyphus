"""
音频自检：峰值（< -3 dBFS）、咔哒声、高频占比、静音段、最响的时刻、各节响度。
用法：python3 scripts/audio_check.py 音频.wav [timeline.json]
"""
import json
import sys
import wave

import numpy as np

path = sys.argv[1]
with wave.open(path) as w:
    sr = w.getframerate()
    ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
if ch == 2:
    x = x.reshape(-1, 2).mean(axis=1)

db = lambda v: 20 * np.log10(max(v, 1e-9))
peak = np.max(np.abs(x))
print(f"时长 {len(x) / sr:.2f}s  峰值 {db(peak):.2f} dBFS  {'OK' if db(peak) < -3 else '超过 -3 dBFS'}")

# 咔哒声：二阶差分的尖刺，相对局部 RMS
d2 = np.abs(np.diff(x, 2))
win = int(sr * 0.01)
rms_local = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode="same"))[1:-1] + 1e-4
spikes = np.where((d2 > 0.08) & (d2 / rms_local > 8))[0]
groups = []
for i in spikes:
    if not groups or i - groups[-1] > sr * 0.05:
        groups.append(i)
print(f"疑似咔哒声 {len(groups)} 处" + ("" if not groups else "：" + ", ".join(f"{g / sr:.2f}s" for g in groups[:20])))

# 高频占比
spec = np.abs(np.fft.rfft(x)) ** 2
freqs = np.fft.rfftfreq(len(x), 1 / sr)
print(f"能量占比：2–6 kHz {spec[(freqs > 2000) & (freqs <= 6000)].sum() / spec.sum() * 100:.2f}%  >6 kHz {spec[freqs > 6000].sum() / spec.sum() * 100:.3f}%")

# 静音段：100ms 窗口 RMS < -50 dBFS 连续超过 0.3 秒
hop = int(sr * 0.1)
rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
quiet = rms < 10 ** (-50 / 20)
runs, start = [], None
for i, q in enumerate(list(quiet) + [False]):
    if q and start is None:
        start = i
    if not q and start is not None:
        if (i - start) * 0.1 >= 0.3:
            runs.append((start * 0.1, i * 0.1))
        start = None
print("静音段（≥0.3s）：" + ("无" if not runs else "  ".join(f"{a:.1f}–{b:.1f}s" for a, b in runs)))

# 最响的 8 个时刻（相隔 >1 秒）
pk = np.array([np.max(np.abs(x[i:i + hop])) for i in range(0, len(x) - hop, hop)])
order = np.argsort(-pk)
top = []
for i in order:
    if all(abs(i - j) > 10 for j in top):
        top.append(i)
    if len(top) == 8:
        break
print("最响的时刻：" + "  ".join(f"{i * 0.1:.1f}s({db(pk[i]):.1f})" for i in sorted(top)))

# 各节响度（RMS dBFS）
if len(sys.argv) > 2:
    tl = json.load(open(sys.argv[2]))
else:
    tl = None
secs = [(0, 8), (8, 25), (25, 50), (50, 65), (65, 77), (77, 108), (108, 134), (134, 150)]
print("各节 RMS：" + "  ".join(f"{a}-{b}s {db(np.sqrt(np.mean(x[int(a * sr):int(b * sr)] ** 2))):.1f}" for a, b in secs if b * sr <= len(x) + sr))
