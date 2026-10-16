"""找出画面静止的段落。

逐帧比较画面主体区域（去掉底部字幕带、左上角标注和右上角水印）的平均亮度差，
连续超过 MIN_SEC 秒几乎不变（每帧平均差 < THRESH）就报出来。

用法：python3 scripts/qa-motion.py out/film.mp4
"""
import json
import subprocess
import sys

import numpy as np

W, H, FPS = 480, 270, 30  # 1/4 分辨率足够判断动没动
THRESH = 0.35  # 0–255 亮度的平均绝对差
MIN_SEC = 1.5


def main():
    path = sys.argv[1]
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
    prev = None
    diffs = []
    while True:
        raw = p.stdout.read(W * H)
        if len(raw) < W * H:
            break
        img = np.frombuffer(raw, np.uint8).reshape(H, W).astype(np.int16)
        roi = img[48:205, :].copy()  # 去掉顶部标注/水印行和底部字幕带
        if prev is not None:
            diffs.append(float(np.abs(roi - prev).mean()))
        prev = roi
    d = np.array(diffs)
    still = d < THRESH
    runs = []
    i = 0
    while i < len(still):
        if still[i]:
            j = i
            while j < len(still) and still[j]:
                j += 1
            if (j - i) / FPS >= MIN_SEC:
                runs.append({'from_s': round((i + 1) / FPS, 2), 'to_s': round((j + 1) / FPS, 2), 'sec': round((j - i) / FPS, 2)})
            i = j
        else:
            i += 1
    # 各节接缝：接缝那一帧的变化量和前后 15 帧比，既不能是 0（重复帧），也不能突然跳很大（跳帧/错位）
    from pathlib import Path
    script = json.loads(Path(__file__).resolve().parent.parent.joinpath('src/data/script.json').read_text())
    seams = []
    for sec in script['sections'][1:]:
        f = sec['start']
        if f - 1 >= len(d):
            continue
        at = d[f - 1]  # d[k] = 第 k 帧到第 k+1 帧的变化
        around = np.concatenate([d[max(0, f - 16):f - 1], d[f:f + 15]])
        seams.append({'section': sec['id'], 'frame': f, 'diff_at_seam': round(float(at), 3), 'median_around': round(float(np.median(around)), 3),
                      'max_around': round(float(around.max()), 3), 'ok': bool(at > 0.02 and at <= max(3 * around.max(), 2.0))})
    print(json.dumps({'frames': len(d) + 1, 'median_diff': round(float(np.median(d)), 3), 'still_runs_over_%.1fs' % MIN_SEC: runs, 'seams': seams}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
