"""噪声类音效单独放大检查：嘶声（>6kHz）、轰鸣（<100Hz）、咔哒声和首尾是否归零。

每个噪声类音效先放大到 -1 dBFS 再分析，等于"单独放大听一遍"；
同时输出放大后的 wav 和频谱图，方便人耳复查。
用法：python3 scripts/check_sfx.py out/sfx out/sfx-check
"""
import os
import subprocess
import sys
import wave

import numpy as np

NOISY = ("whoosh", "grain", "roll")


def read(path):
    with wave.open(path) as w:
        sr = w.getframerate()
        d = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    return d, sr


def write(path, x, sr):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).round().astype("<i2").tobytes())


def band_db(x, sr, lo, hi):
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    f = np.fft.rfftfreq(len(x), 1 / sr)
    total = spec.sum() + 1e-30
    return 10 * np.log10(spec[(f >= lo) & (f < hi)].sum() / total + 1e-30)


def clicks(x, sr):
    """咔哒 = 二阶差分里的孤立尖峰：比周围 10ms 内二阶差分的 RMS 高 8 倍以上，且绝对值高于 -60 dBFS。
    宽带噪声的二阶差分本身就很大，所以要跟它自己的局部水平比，不能跟信号 RMS 比。"""
    d2 = np.abs(np.diff(x, 2))
    win = int(sr * 0.01)
    k = np.ones(win) / win
    local = np.sqrt(np.convolve(d2 ** 2, k, mode="same"))
    floor = 10 ** (-60 / 20)
    spikes = (d2 > 8 * local) & (d2 > floor)
    ratio = d2 / np.maximum(local, floor)
    return float(ratio.max()), int(spikes.sum())


def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    rows = []
    for name in sorted(os.listdir(src)):
        if not name.endswith(".wav") or name.startswith("00_bed"):
            continue
        x, sr = read(os.path.join(src, name))
        noisy = any(t in name for t in NOISY)
        mx, n_click = clicks(x, sr)
        row = {
            "file": name,
            "noisy": noisy,
            "peak_dbfs": 20 * np.log10(np.abs(x).max() + 1e-12),
            "first_last": (x[0], x[-1]),
            "max_d2_over_rms": mx,
            "click_like_samples": n_click,
        }
        if noisy:
            g = 10 ** (-1 / 20) / (np.abs(x).max() + 1e-12)
            boosted = x * g
            out = os.path.join(dst, name.replace(".wav", "_boost.wav"))
            write(out, boosted, sr)
            row["boost_db"] = 20 * np.log10(g)
            row["energy_below_100Hz_db"] = band_db(boosted, sr, 0, 100)
            row["energy_above_6kHz_db"] = band_db(boosted, sr, 6000, sr / 2)
            row["energy_above_10kHz_db"] = band_db(boosted, sr, 10000, sr / 2)
            png = out.replace(".wav", ".png")
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", out, "-lavfi",
                 "showspectrumpic=s=800x300:legend=1:scale=log:fscale=lin:stop=16000", png],
                check=True,
            )
        rows.append(row)

    for r in rows:
        base = f"{r['file']:<28} peak {r['peak_dbfs']:6.1f} dBFS  edges {r['first_last'][0]:+.0e}/{r['first_last'][1]:+.0e}  spike-ratio {r['max_d2_over_rms']:.2f} clicks {r['click_like_samples']}"
        if r["noisy"]:
            base += f"  | boosted +{r['boost_db']:.0f}dB: <100Hz {r['energy_below_100Hz_db']:6.1f} dB, >6kHz {r['energy_above_6kHz_db']:6.1f} dB, >10kHz {r['energy_above_10kHz_db']:6.1f} dB"
        print(base)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
