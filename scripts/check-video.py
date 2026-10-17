#!/usr/bin/env python3
"""画面检查。

1) 文字层（PreviewTextOnly，黑底只渲染字幕 + 大字）逐帧检查：
   - x ≥ 1560 的禁字区里不能有任何文字像素
   - 底部字幕：只能落在 x 360–1560，最低不低于 y 1000（离底边 ≥ 80px）
   - 大字（画面上部区域的文字）：最低不低于 y 760，不能压到字幕区
2) 成片按每 2 秒（每 60 帧）精确抽帧，拼成带时间标签的 2×2 小样，供人工逐张看。

用法：python3 -I scripts/check-video.py out/preview.mp4 out/preview-text.mp4
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

W, H = 1920, 1080
ROOT = Path(__file__).resolve().parent.parent
script = json.loads((ROOT / "src/data/script.json").read_text())
rules = script["rules"]
FORBID_X = rules["forbiddenTextZoneX"]
SUB = rules["subtitle"]
SUB_TOP = 820  # 字幕区上沿（渐变带内），大字不得进入
SUB_BOTTOM = H - 80


def frames(path, gray=True):
    fmt = "gray" if gray else "rgb24"
    ch = 1 if gray else 3
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", fmt, "-"],
        stdout=subprocess.PIPE,
    )
    n = 0
    size = W * H * ch
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield n, np.frombuffer(buf, np.uint8).reshape(H, W, ch) if not gray else np.frombuffer(buf, np.uint8).reshape(H, W)
        n += 1
    p.wait()


def check_text_layer(path):
    problems = []
    n_frames = 0
    max_right = 0
    sub_box = [W, H, 0, 0]
    big_bottom = 0
    for n, img in frames(path):
        n_frames = n + 1
        mask = img > 60
        if not mask.any():
            continue
        ys, xs = np.nonzero(mask)
        max_right = max(max_right, int(xs.max()))
        if (xs >= FORBID_X).any():
            problems.append(f"frame {n}: 禁字区 x≥{FORBID_X} 出现文字像素（最右 x={xs.max()}）")
        sub = ys >= SUB_TOP
        if sub.any():
            sx, sy = xs[sub], ys[sub]
            sub_box = [min(sub_box[0], sx.min()), min(sub_box[1], sy.min()), max(sub_box[2], sx.max()), max(sub_box[3], sy.max())]
            if sx.min() < SUB["left"] or sx.max() >= SUB["left"] + SUB["maxWidth"]:
                problems.append(f"frame {n}: 字幕超出 x {SUB['left']}–{SUB['left'] + SUB['maxWidth']}（{sx.min()}–{sx.max()}）")
            if sy.max() > SUB_BOTTOM:
                problems.append(f"frame {n}: 字幕底边 y={sy.max()} 离画面底部不足 80px")
        top = ys < SUB_TOP
        if top.any():
            big_bottom = max(big_bottom, int(ys[top].max()))
            if ys[top].max() > 760:
                problems.append(f"frame {n}: 大字最低到 y={ys[top].max()}，压近字幕区")
    return n_frames, problems, max_right, [int(v) for v in sub_box], big_bottom


def contact_sheets(path, outdir):
    outdir.mkdir(parents=True, exist_ok=True)
    for f in outdir.glob("*.png"):
        f.unlink()
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-i", str(path),
            "-vf", "select='not(mod(n\\,60))'", "-vsync", "0", "-start_number", "0",
            str(outdir / "f%02d.png"),
        ],
        check=True,
    )
    shots = sorted(outdir.glob("f*.png"))
    labelled = [
        f"drawtext=text='frame {i * 60}  t={i * 2}s':x=12:y=12:fontsize=30:fontcolor=yellow:box=1:boxcolor=black@0.6"
        for i in range(len(shots))
    ]
    sheets = []
    for k in range(0, len(shots), 4):
        group = shots[k : k + 4]
        inputs = []
        for s in group:
            inputs += ["-i", str(s)]
        filt = ";".join(f"[{j}:v]scale=960:540,{labelled[k + j]}[v{j}]" for j in range(len(group)))
        while len(group) < 4:
            inputs += ["-f", "lavfi", "-i", "color=black:s=960x540"]
            group.append(None)
        n_real = len([g for g in group if g])
        filt += ";" + "".join(f"[v{j}]" if j < n_real else f"[{j}:v]" for j in range(4)) + "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[out]"
        out = outdir / f"sheet{k // 4 + 1}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", filt, "-map", "[out]", "-frames:v", "1", str(out)], check=True)
        sheets.append(out)
    return shots, sheets


def motion_profile(path):
    """逐帧画面变化量（只看字幕带以上的区域，160×90 灰度），用来找静止段和分段接缝。"""
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vf", "crop=1920:820:0:0,scale=160:68", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        stdout=subprocess.PIPE,
    )
    prev = None
    diffs = []
    while True:
        buf = p.stdout.read(160 * 68)
        if len(buf) < 160 * 68:
            break
        cur = np.frombuffer(buf, np.uint8).astype(np.float32)
        if prev is not None:
            diffs.append(float(np.abs(cur - prev).mean()))
        prev = cur
    p.wait()
    return np.array(diffs)


def static_runs(diffs, thr=0.12, min_len=60):
    runs = []
    start = None
    for i, d in enumerate(list(diffs) + [999]):
        if d < thr and start is None:
            start = i
        elif d >= thr and start is not None:
            if i - start >= min_len:
                runs.append((start + 1, i))
            start = None
    return runs


if __name__ == "__main__":
    video, text_video = Path(sys.argv[1]), Path(sys.argv[2])
    n, problems, max_right, sub_box, big_bottom = check_text_layer(text_video)
    print(f"文字层 {n} 帧：最右文字像素 x={max_right}（禁字区从 {FORBID_X} 开始）")
    print(f"字幕像素包围盒 x {sub_box[0]}–{sub_box[2]}, y {sub_box[1]}–{sub_box[3]}（底边离画面底部 {H - 1 - sub_box[3]}px）")
    print(f"大字最低像素 y={big_bottom}")
    shots, sheets = contact_sheets(video, ROOT / "out/frames")
    print(f"抽帧 {len(shots)} 张 → {', '.join(str(s.relative_to(ROOT)) for s in sheets)}")
    diffs = motion_profile(video)
    runs = static_runs(diffs)
    print(f"逐帧画面变化：中位数 {np.median(diffs):.3f}，最小 {diffs.min():.3f}")
    print("静止超过 2 秒的段落：" + ("无" if not runs else "、".join(f"帧 {a}–{b}（{(b - a) / 30:.1f}s）" for a, b in runs)))
    for a, b in runs:
        problems.append(f"帧 {a}–{b} 画面几乎静止 {(b - a) / 30:.1f}s")
    film = script.get("film")
    if film and len(diffs) > 3000:
        for a, _ in film["segments"][1:]:
            d = diffs[a - 1]
            around = np.median(np.r_[diffs[a - 11 : a - 1], diffs[a : a + 10]])
            print(f"接缝 帧 {a - 1}→{a}：变化 {d:.3f}（前后中位数 {around:.3f}）")
            if d > max(1.0, 4 * around):
                problems.append(f"接缝 {a} 处画面跳变")
    if problems:
        print(f"FAIL {len(problems)} 处：")
        for p in problems[:40]:
            print("  ", p)
        sys.exit(1)
    print("文字区域检查 OK")
