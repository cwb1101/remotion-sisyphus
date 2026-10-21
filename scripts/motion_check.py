"""找出画面几乎静止的段落：低分辨率灰度逐帧差，连续低于阈值超过 MIN_SECONDS 秒的段落列出来。

用法：python3 scripts/motion_check.py out/film.mp4
"""
import sys

import numpy as np

from seam_check import FPS, frames

THRESHOLD = 0.12  # 192×108 灰度逐帧平均差（0–255）；镜头微漂移、浮尘大约在 0.15 以上
MIN_SECONDS = 2.0


def main(path):
    v = frames(path)
    m = np.abs(np.diff(v, axis=0)).mean(axis=(1, 2))
    print(f"逐帧运动量：中位 {np.median(m):.3f}，5% 分位 {np.percentile(m, 5):.3f}，最小 {m.min():.3f}")
    still = m < THRESHOLD
    runs, start = [], None
    for i, s in enumerate(np.r_[still, False]):
        if s and start is None:
            start = i
        elif not s and start is not None:
            if (i - start) / FPS >= MIN_SECONDS:
                runs.append((start, i))
            start = None
    if not runs:
        print(f"没有超过 {MIN_SECONDS}s 的静止段落")
    for a, b in runs:
        print(f"静止段落：{a / FPS:.2f}s–{b / FPS:.2f}s（{(b - a) / FPS:.1f}s），平均运动量 {m[a:b].mean():.3f}")
    # 每 5 秒的运动量概览，方便找“动得很少”的地方
    per5 = [m[i:i + 150].mean() for i in range(0, len(m), 150)]
    print("每 5 秒平均运动量：" + " ".join(f"{i * 5:>3d}s:{x:.2f}" for i, x in enumerate(per5)))
    sys.exit(1 if runs else 0)


if __name__ == "__main__":
    main(sys.argv[1])
