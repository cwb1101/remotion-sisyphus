"""成片版式抽检：每 2 秒 + 每屏字幕中点各抽一帧。

- 字幕白字（R,G,B 都 > 240）的包围盒：x 必须在 360–1560，底边 ≤ 1000（离底 ≥ 80px）
- 右侧禁字带 x ≥ 1560：整帧不能出现白字像素（人物是 #E8E1D2，蓝色分量 210，不会被误判）
- 有高亮的屏：字幕区里能找到对应强调色（金 #FFC24A / 蓝 #8FA8FF）
- 抽出的帧另存为 PNG，供人工复看

用法：python3 -I scripts/check_frames.py out/preview.mp4 src/data/script.json out/frames
"""
import json
import os
import subprocess
import sys

import numpy as np

W, H = 1920, 1080
GOLD = np.array([255, 194, 74])
BLUE = np.array([143, 168, 255])


def grab(video, t):
    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(H, W, 3)


def near(img, col, tol=40):
    return (np.abs(img.astype(int) - col).max(axis=2) < tol)


def main(video, script, outdir):
    doc = json.load(open(script))
    fps = doc["fps"]
    full = os.environ.get("FULL") == "1"
    screens = doc["screens"] if full else [s for s in doc["screens"] if s["id"] <= doc["preview"]["lastScreen"]]
    end = (screens[-1]["endFrame"] + (doc["full"]["endHoldFrames"] if full else doc["preview"]["tailFrames"])) / fps
    os.makedirs(outdir, exist_ok=True)
    samples = [(t, None) for t in np.arange(0, end, 2.0)]
    samples += [((s["startFrame"] + s["endFrame"]) / 2 / fps, s) for s in screens]
    problems = 0
    for t, s in sorted(samples, key=lambda x: x[0]):
        img = grab(video, t)
        white = (img > 240).all(axis=2)
        band = white[:, 1560:].sum()
        sub = white[760:, :]
        ys, xs = np.nonzero(sub)
        cur = s or next((x for x in screens if x["startFrame"] / fps <= t < x["endFrame"] / fps), None)
        note = f"t={t:6.2f}s"
        if cur:
            note += f" #{cur['id']:<2}"
        if xs.size:
            x0, x1, y1 = xs.min(), xs.max(), ys.max() + 760
            note += f" subtitle bbox x {x0}-{x1} bottom {y1}"
            if x0 < 360 or x1 >= 1560 or y1 > 1000:
                note += "  ✗ OUT OF SUBTITLE BOX"
                problems += 1
        else:
            note += " (no white text in subtitle zone)"
        if band:
            note += f"  ✗ {band} white px in no-text band x>=1560"
            problems += 1
        if s is not None:
            region = img[760:1000, 360:1560]
            for h in s["highlights"]:
                col = GOLD if h["color"] == "gold" else BLUE
                if near(region, col).sum() < 50:
                    note += f"  ✗ highlight {h['word']} ({h['color']}) not found"
                    problems += 1
                else:
                    note += f"  ✓{h['color']}"
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", os.path.join(outdir, f"t{t:06.2f}.png")],
            check=True,
        )
        print(note)
    print(f"{problems} problem(s)")


if __name__ == "__main__":
    main(*sys.argv[1:4])
