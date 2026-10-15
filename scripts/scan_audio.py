"""逐样本扫描：削波样本数、超过 -6 dBFS 的时间段、静音段是否真的是数字静音。

用法：python3 scripts/scan_audio.py <音频或视频文件>
"""
import subprocess
import sys

import numpy as np

SR = 48000


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2)


def main(path):
    x = decode(path)
    a = np.abs(x).max(axis=1)
    peak = a.max()
    print(f"samples: {len(a)}  duration: {len(a) / SR:.2f}s")
    print(f"max sample peak: {20 * np.log10(peak + 1e-12):.2f} dBFS")
    clipped = int((np.abs(x) >= 0.999).sum())
    print(f"clipped samples (|x| >= 0.999 FS): {clipped}")

    over = a > 10 ** (-6 / 20)
    if over.any():
        idx = np.flatnonzero(over)
        # 合并成时间段
        segs = []
        start = prev = idx[0]
        for i in idx[1:]:
            if i - prev > SR // 100:
                segs.append((start, prev))
                start = i
            prev = i
        segs.append((start, prev))
        print(f"segments above -6 dBFS: {len(segs)}")
        for s, e in segs:
            print(f"  {s / SR:7.3f}s – {e / SR:7.3f}s  peak {20 * np.log10(a[s:e + 1].max()):.2f} dBFS")
    else:
        print("segments above -6 dBFS: 0")

    # 静音检查：50ms 窗口里没有音效的地方，应当是数字静音（编码后允许极微小残留）
    win = SR // 20
    n = len(a) // win
    blocks = a[: n * win].reshape(n, win).max(axis=1)
    quiet = blocks < 10 ** (-60 / 20)
    floor = blocks[quiet]
    if floor.size:
        print(f"quiet 50ms blocks: {quiet.sum()} / {n}; loudest of them: {20 * np.log10(floor.max() + 1e-12):.1f} dBFS (digital silence = -inf)")
    exact_zero = int((blocks == 0).sum())
    print(f"blocks that are exact digital zero: {exact_zero}")


if __name__ == "__main__":
    main(sys.argv[1])
