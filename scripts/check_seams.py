"""分段拼接后的接缝检查。

画面：总帧数是否正确；每个接缝处前后两帧的差异，和接缝附近正常相邻帧差异的对比（跳帧/重复帧会异常）。
音频：每个接缝前后 0.5s 内的峰值、二阶差分尖峰（咔哒/爆音）以及有没有掉成静音（断音）。
用法：python3 -I scripts/check_seams.py <成片.mp4> <边界帧0> <边界帧1> ... <结束帧>
"""
import subprocess
import sys

import numpy as np

FPS = 30
SR = 48000
W, H = 320, 180


def frames(path, start, n):
    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{start / FPS:.4f}", "-i", path, "-frames:v", str(n),
         "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32)


def audio(path):
    raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2)


def main(path, bounds):
    bounds = [int(b) for b in bounds]
    n = int(subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets",
                            "-of", "csv=p=0", path], check=True, capture_output=True, text=True).stdout.strip().strip(","))
    print(f"video frames: {n} (expected {bounds[-1]})  {'OK' if n == bounds[-1] else 'MISMATCH'}")
    a = audio(path)
    print(f"audio: {len(a) / SR:.3f}s (video {bounds[-1] / FPS:.3f}s)")
    for b in bounds[1:-1]:
        f = frames(path, b - 6, 12)
        d = [np.abs(f[i + 1] - f[i]).mean() for i in range(len(f) - 1)]
        seam = d[5]
        others = np.median([x for i, x in enumerate(d) if i != 5])
        s0, s1 = int((b / FPS - 0.5) * SR), int((b / FPS + 0.5) * SR)
        seg = a[s0:s1]
        pk = 20 * np.log10(np.abs(seg).max() + 1e-12)
        d2 = np.abs(np.diff(seg, 2, axis=0)).max(axis=1)
        local = np.sqrt(np.convolve(d2 ** 2, np.ones(480) / 480, mode="same"))
        spikes = int(((d2 > 8 * local) & (d2 > 1e-3)).sum())
        win = SR // 50
        rms = np.sqrt((seg[: len(seg) // win * win].reshape(-1, win, 2) ** 2).mean(axis=(1, 2)))
        dropout = int((rms < 10 ** (-60 / 20)).sum())
        print(f"seam @ frame {b} ({b / FPS:.2f}s): frame diff {seam:.2f} vs neighbours {others:.2f} | audio peak {pk:.1f} dBFS, click spikes {spikes}, 20ms blocks below -60 dBFS {dropout}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
