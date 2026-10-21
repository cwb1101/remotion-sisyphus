"""分段渲染接缝检查：每个接缝前后的画面跳变、音频爆音或断音。

用法：python3 scripts/seam_check.py out/film.mp4 750,1500,...
- 画面：接缝处相邻两帧的差异 ÷ 前后相邻帧差异的均值（>3 视为跳帧/闪帧）
- 音频：成片与源 wav 对齐后，接缝 ±20ms 内的最大样本跳变、接缝前后 20ms 的电平差、与源 wav 的最大误差
"""
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

from subtitle_rules import ROOT

FPS = 30
W, H = 192, 108


def frames(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a", "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def db(x):
    return 20 * np.log10(max(float(x), 1e-12))


def main(path, seams):
    v = frames(path)
    a = audio(path)
    _, src = wavfile.read(ROOT / "public" / "audio" / "sfx.wav")
    src = src.astype(np.float64) / 32768
    print(f"总帧数 {len(v)}，时长 {len(v) / FPS:.2f}s")
    diffs = np.abs(np.diff(v, axis=0)).mean(axis=(1, 2))
    bad = 0
    for s in seams:
        d_seam = diffs[s - 1]
        around = np.mean([diffs[s - 2], diffs[s]])
        ratio = d_seam / max(around, 1e-3)
        i = int(s / FPS * 48000)
        w = 960  # 20ms
        seg = a[i - 24000:i + 24000]
        jump_seam = np.abs(np.diff(a[i - w:i + w])).max()
        jump_typ = np.median(np.abs(np.diff(seg))) + 1e-9
        rms_b, rms_a = np.sqrt((a[i - w:i] ** 2).mean()), np.sqrt((a[i:i + w] ** 2).mean())
        err = np.abs(a[i - w:i + w] - src[i - w:i + w]).max()
        flag = ratio > 3 or abs(db(rms_a) - db(rms_b)) > 6 or err > 0.05
        bad += flag
        print(
            f"接缝 {s} 帧（{s / FPS:.2f}s）：画面差 {d_seam:.3f}，前后 {around:.3f}，比值 {ratio:.2f}｜"
            f"音频 ±20ms 最大跳变 {jump_seam:.5f}（附近中位 {jump_typ:.5f}），前后电平 {db(rms_b):.1f}/{db(rms_a):.1f} dBFS，与源 wav 最大误差 {err:.4f}"
            + ("  ← 需检查" if flag else "")
        )
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main(sys.argv[1], [int(x) for x in sys.argv[2].split(",") if x])
