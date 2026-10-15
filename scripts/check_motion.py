"""找出画面静止超过阈值的段落：按 10fps 抽样，相邻样本平均像素差低于阈值的连续时长。
用法：python3 -I scripts/check_motion.py <视频> [最长允许静止秒数=2.0]
"""
import subprocess
import sys

import numpy as np

W, H, RATE = 192, 108, 10


def main(path, limit=2.0):
    raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-vf", f"fps={RATE},scale={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"], check=True, capture_output=True).stdout
    f = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    still = d < 0.15
    runs, start = [], None
    for i, s in enumerate(still):
        if s and start is None:
            start = i
        if (not s or i == len(still) - 1) and start is not None:
            end = i if not s else i + 1
            if (end - start) / RATE > limit:
                runs.append((start / RATE, end / RATE))
            start = None
    print(f"samples: {len(f)}, median motion {np.median(d):.2f}, min {d.min():.3f}")
    print(f"still segments longer than {limit}s: {len(runs)}")
    for a, b in runs:
        print(f"  {a:6.1f}s – {b:6.1f}s ({b - a:.1f}s)")


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 2.0)
