"""测量音频 整体响度 最大峰值 削波样本数 并列出峰值超过 -6 dBFS 的时间点

用法 python3 scripts/measure-audio.py <wav 或 mp4>
"""
import re
import subprocess
import sys
import tempfile
import wave

import numpy as np

src = sys.argv[1]
fps = 30

ebu = subprocess.run(
    ["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", "ebur128=peak=true+sample", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
summary = ebu[ebu.rfind("Summary:"):]
integrated = re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1)
true_peak = re.search(r"True peak:\s+Peak:\s+(-?[\d.inf]+) dBFS", summary).group(1)
sample_peak = re.search(r"Sample peak:\s+Peak:\s+(-?[\d.inf]+) dBFS", summary).group(1)

stats = subprocess.run(
    ["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", "astats=measure_overall=Peak_level+Number_of_samples+Peak_count+Noise_floor:measure_perchannel=none", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
astats_peak = re.findall(r"Peak level dB:\s*(-?[\d.inf]+)", stats)

with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", tmp.name], check=True)
    with wave.open(tmp.name) as w:
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2)
x = np.abs(pcm.astype(np.int32)).max(axis=1)
clipped = int((x >= 32767).sum())
limit = 32767 * 10 ** (-6 / 20)
over = np.nonzero(x > limit)[0]
silent = x == 0
sr = 48000

print(f"文件 {src}")
print(f"整体响度 {integrated} LUFS")
print(f"真峰值 {true_peak} dBTP")
print(f"采样峰值 {sample_peak} dBFS  astats 峰值 {astats_peak[-1] if astats_peak else 'na'} dB")
print(f"削波样本数 {clipped}")
print(f"超过 -6 dBFS 的样本数 {len(over)}")
if len(over):
    secs = sorted(set(int(i / sr * fps) for i in over))
    print("  超限帧 " + " ".join(map(str, secs[:50])))
print(f"数字静音样本占比 {silent.mean() * 100:.1f}%")
# 非静音但极小的样本 用来发现底噪
quiet = (x > 0) & (x < 4)
print(f"幅度 1 到 3 的残留样本 {int(quiet.sum())}")
