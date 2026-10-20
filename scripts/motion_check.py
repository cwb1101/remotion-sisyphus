"""找出画面静止超过 2 秒的段落：以 10fps 抽取 160×90 灰度帧，相邻帧平均差 < 阈值视为静止。"""
import subprocess
import sys

import numpy as np

vid = sys.argv[1]
W, H, FPS = 160, 90, 10
raw = subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-i", vid, "-vf", f"fps={FPS},scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
    capture_output=True,
    check=True,
).stdout
frames = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(float)
diff = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))
still = diff < 0.35
runs, start = [], None
for i, s in enumerate(list(still) + [False]):
    if s and start is None:
        start = i
    if not s and start is not None:
        if (i - start) / FPS >= 2.0:
            runs.append((start / FPS, i / FPS))
        start = None
print(f"运动量：中位数 {np.median(diff):.2f}，最低 {diff.min():.3f}")
print("静止超过 2 秒的段落：" + ("无" if not runs else "  ".join(f"{a:.1f}–{b:.1f}s" for a, b in runs)))
