"""成片自检 抽帧拼图 静止检测 文字区域检查

用法 python3 scripts/audit-video.py out/preview.mp4 out/text-audit.mp4
第二个参数是 PreviewTextAudit 渲染出的只含文字的视频
"""
import json
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
video, text_video = sys.argv[1], sys.argv[2]
out_dir = ROOT / "out" / "audit"
out_dir.mkdir(parents=True, exist_ok=True)
data = json.loads((ROOT / "src" / "data" / "script.json").read_text("utf-8"))
FPS = 30
W, H = 1920, 1080


def frames(path, w, h, gray=True):
    fmt = "gray" if gray else "rgb24"
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
        capture_output=True, check=True,
    ).stdout
    ch = 1 if gray else 3
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w) if gray else np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w, ch)


# 1 每 2 秒抽一帧拼成总览图
subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-vf", "fps=1/2,scale=640:-1,tile=3x5:padding=6:color=white", "-frames:v", "1", str(out_dir / "every2s.png")],
    check=True,
)
subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-vf", "fps=1/2", str(out_dir / "f2s_%02d.png")],
    check=True,
)

# 2 静止检测 用 1/10 分辨率灰度帧的平均差
small = frames(video, 192, 108).astype(np.int16)
diff = np.abs(np.diff(small, axis=0)).mean(axis=(1, 2))
still = diff < 0.15
run = best = 0
best_end = 0
for i, s in enumerate(still):
    run = run + 1 if s else 0
    if run > best:
        best, best_end = run, i + 1
runs, start = [], None
for i, s in enumerate(list(still) + [False]):
    if s and start is None:
        start = i
    elif not s and start is not None:
        if i - start >= 20:
            runs.append((start, i))
        start = None
print("接近静止超过 20 帧的区间 " + (" ".join(f"{a}-{b}" for a, b in runs) or "无"))
big = np.nonzero(diff > 2.0)[0]
gaps = np.diff(np.concatenate([[0], big, [len(diff)]]))
print(f"总帧数 {len(small)}")
print(f"最长近乎静止 {best} 帧 结束于第 {best_end} 帧  阈值 平均差小于 0点15")
print(f"明显变化 平均差大于 2 的帧 {len(big)} 个 两次明显变化之间最长 {gaps.max()} 帧 {gaps.max() / FPS:.2f} 秒")

# 3 文字区域检查 只含文字的视频里 禁区内不能有亮像素
txt = frames(text_video, W, H)
wm = (1630, 46, 1870, 106)  # 水印框 允许有字
problems = []
for i, fr in enumerate(txt):
    band = fr[:, 1560:].copy()
    band[wm[1]:wm[3], wm[0] - 1560:wm[2] - 1560] = 0
    if band.max() > 90:
        ys, xs = np.nonzero(band > 90)
        problems.append(f"帧 {i} 右侧禁字区有字 x {xs.min() + 1560} y {ys.min()}")
    gap = fr[984:1004, :]
    if gap.max() > 90:
        problems.append(f"帧 {i} 字幕底边以下 y 984 到 1004 有字")
    sub_side = np.concatenate([fr[810:980, :350].ravel(), fr[810:980, 1570:].ravel()])
    if sub_side.max() > 90:
        problems.append(f"帧 {i} 字幕区左右两侧有字")
kinds = {}
for p in problems:
    k = p.split(" ", 2)[2].split(" x ")[0]
    kinds[k] = kinds.get(k, 0) + 1
print(f"文字区域问题 {len(problems)} 处 {kinds}")
for p in problems[:40]:
    print("  " + p)

# 4 字幕实际像素范围 每屏取中间一帧 只看 y 800 到 984 的字幕带
print("每屏字幕实际宽度")
for s in data["screens"]:
    if s["start"] >= len(txt):
        continue
    mid = min(len(txt) - 1, (s["start"] + s["end"]) // 2)
    zone = txt[mid][800:984, 300:1620]
    ys, xs = np.nonzero(zone > 90)
    if len(xs):
        print(f"  屏{s['id']:2d} x {xs.min() + 300}-{xs.max() + 300} y {ys.min() + 800}-{ys.max() + 800}")
