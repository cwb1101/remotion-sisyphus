"""音频自检：峰值（< -3 dBFS）、咔哒声（相邻样本突变）、高频占比（> 6 kHz）、每秒峰值。"""
import sys
import wave

import numpy as np

path = sys.argv[1]
with wave.open(path) as w:
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768

peak = np.max(np.abs(x))
peak_db = 20 * np.log10(max(peak, 1e-9))
print(f"时长 {len(x) / sr:.2f}s  峰值 {peak_db:.2f} dBFS  {'OK' if peak_db < -3 else '超过 -3 dBFS'}")

# 咔哒声：二阶差分的尖刺，相对局部 RMS 超过阈值
d2 = np.abs(np.diff(x, 2))
win = int(sr * 0.01)
rms = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode="same"))[1:-1] + 1e-4
spikes = np.where((d2 > 0.08) & (d2 / rms > 8))[0]
groups = []
for i in spikes:
    if not groups or i - groups[-1] > sr * 0.05:
        groups.append(i)
print(f"疑似咔哒声 {len(groups)} 处" + ("" if not groups else "：" + ", ".join(f"{g / sr:.2f}s" for g in groups[:20])))

# 高频占比
spec = np.abs(np.fft.rfft(x)) ** 2
freqs = np.fft.rfftfreq(len(x), 1 / sr)
hi = spec[freqs > 6000].sum() / spec.sum()
mid = spec[(freqs > 2000) & (freqs <= 6000)].sum() / spec.sum()
print(f"能量占比：2–6 kHz {mid * 100:.2f}%  >6 kHz {hi * 100:.3f}%")

# 每秒峰值
per = []
for s in range(int(len(x) / sr) + 1):
    seg = x[s * sr:(s + 1) * sr]
    if len(seg):
        per.append(20 * np.log10(max(np.max(np.abs(seg)), 1e-9)))
print("每秒峰值 dBFS：" + " ".join(f"{p:.0f}" for p in per))
