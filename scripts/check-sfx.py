"""单独检查每个音效 6kHz 以上和 100Hz 以下的能量占比 首尾是否归零 有没有突变的咔哒声

用法 python3 scripts/check-sfx.py out/sfx-solo
"""
import pathlib
import sys
import wave

import numpy as np

# 纯噪声类必须满足 100Hz 到 6kHz 的带宽要求 混合类的低频来自正弦本体 噪声部分同样过了滤波
NOISY = {"whoosh", "wind", "sand", "flip"}
MIXED = {"stoneDrop", "impact", "soft"}
for f in sorted(pathlib.Path(sys.argv[1]).glob("*.wav")):
    with wave.open(str(f)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)[::2].astype(float) / 32767
        sr = w.getframerate()
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    freqs = np.fft.rfftfreq(len(x), 1 / sr)
    total = spec.sum()
    hi = spec[freqs > 6000].sum() / total
    lo = spec[freqs < 100].sum() / total
    # 咔哒检测 一阶差分相对局部 RMS 的尖峰
    d = np.abs(np.diff(x))
    win = 480
    rms = np.sqrt(np.convolve(x * x, np.ones(win) / win, mode="same"))[1:] + 1e-4
    spikes = int((d > 0.5) .sum())
    ratio = float((d / rms).max())
    head, tail = abs(x[0]), abs(x[-1])
    kind = "噪声类" if f.stem in NOISY else "混合类" if f.stem in MIXED else "音调类"
    print(
        f"{f.stem:10s} {kind} 6kHz以上 {hi * 100:6.3f}%  100Hz以下 {lo * 100:6.2f}%  "
        f"首样本 {head:.4f} 尾样本 {tail:.4f}  大跳变 {spikes}  差分与RMS最大比 {ratio:.2f}"
    )
