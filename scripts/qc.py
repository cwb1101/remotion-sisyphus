"""预览自检：抽帧总览、逐帧亮度、字幕对比度/出画/右上角、颜色、阅读速度。

python3 scripts/qc.py out/preview.mp4
输出：out/qc/contact-sheet.png、out/qc/report.json，并在终端打印摘要。
"""
import colorsys
import json
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
VIDEO = sys.argv[1] if len(sys.argv) > 1 else "out/preview.mp4"
OUT = ROOT / "out" / "qc"
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((ROOT / "src/data/subtitles.json").read_text("utf-8"))
CUES = json.loads((ROOT / "src/data/cues.json").read_text("utf-8"))
FPS = DATA["fps"]
P_FROM, P_TO = DATA["preview"]["from"], DATA["preview"]["to"]
ACCENT_HUE = 205  # #1E4561 / #5E97BF


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True)


# ---------- 1. 每 2 秒抽一帧 + 总览图 ----------
frames_dir = OUT / "frames"
frames_dir.mkdir(exist_ok=True)
for f in frames_dir.glob("*.png"):
    f.unlink()
run(["ffmpeg", "-y", "-v", "error", "-i", VIDEO, "-vf", "select='not(mod(n\\,60))'", "-vsync", "vfr", str(frames_dir / "t%02d.png")])
shots = sorted(frames_dir.glob("t*.png"))
font = ImageFont.truetype(str(ROOT / ".cache/fonts-src/NotoSansSC[wght].ttf"), 22)
cols = 4
tw, th = 480, 270
rows = (len(shots) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * (th + 30)), (24, 24, 24))
for i, p in enumerate(shots):
    im = Image.open(p).convert("RGB").resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 30)
    sheet.paste(im, (x, y + 30))
    sec = i * 2
    ImageDraw.Draw(sheet).text((x + 8, y + 3), f"{sec // 60}:{sec % 60:02d}  (frame {i * 60})", fill=(230, 230, 230), font=font)
sheet.save(OUT / "contact-sheet.png")

# ---------- 2. 逐帧亮度 YAVG ----------
r = run(["ffprobe", "-v", "error", "-f", "lavfi", "-i", f"movie={VIDEO},signalstats", "-show_entries", "frame_tags=lavfi.signalstats.YAVG", "-of", "csv=p=0"])
yavg = [float(v.strip(",")) for v in r.stdout.split() if v.strip(",").strip()]
y = np.array(yavg)
low = [(i, round(v, 1)) for i, v in enumerate(yavg) if v < 90]
high = [(i, round(v, 1)) for i, v in enumerate(yavg) if v > 135]

# ---------- 3. 颜色：除灰阶外只允许强调色相 ----------
color_issues = []
for i, p in enumerate(shots):
    a = np.asarray(Image.open(p).convert("RGB").resize((480, 270))).astype(float) / 255
    mx, mn = a.max(axis=2), a.min(axis=2)
    colored = (mx - mn) > 0.1  # 绝对色度：暖灰、近黑的抗锯齿不算颜色
    if colored.sum() == 0:
        continue
    pix = a[colored]
    hues = np.array([colorsys.rgb_to_hsv(*px)[0] * 360 for px in pix[:: max(1, len(pix) // 400)]])
    off = np.abs(((hues - ACCENT_HUE) + 180) % 360 - 180) > 25
    share = colored.mean()
    if off.mean() > 0.2 and share > 0.0005:
        color_issues.append({"t": i * 2, "coloredShare": round(float(share), 4)})

# ---------- 4. 字幕：对比度、出画、右上角、阅读速度 ----------
screens = [s for s in DATA["screens"] if s["from"] < P_TO]


def lum(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def hexlum(h):
    return float(lum(np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=float)))


L_TEXT = hexlum("#1E1D1B")
L_ACC = hexlum("#1A3D57")
check_frames = {}
for s in screens:
    inF = 40 if s.get("key") else 20
    check_frames[s["id"]] = min(s["from"] + inF + 6, s["to"] - 16)
stills = OUT / "stills"
fr = sorted(set(check_frames.values()))
for mode in ("full", "padOnly"):
    subprocess.run(
        ["node", "scripts/stills.mjs", *map(str, fr), f"--props={json.dumps({'subtitles': mode})}", f"--out={stills / mode}"],
        check=True, capture_output=True, cwd=ROOT,
    )
sub_report = []
for s in screens:
    f = check_frames[s["id"]]
    a = np.asarray(Image.open(stills / "full" / f"f{f:04d}.png").convert("RGB")).astype(float)
    b = np.asarray(Image.open(stills / "padOnly" / f"f{f:04d}.png").convert("RGB")).astype(float)
    mask = np.abs(a - b).sum(axis=2) > 60
    ys, xs = np.nonzero(mask)
    # 字形周围一圈背景（膨胀 6px 后去掉字形本身）
    from numpy.lib.stride_tricks import sliding_window_view as swv
    pad = np.pad(mask, 6)
    dil = swv(pad, (13, 13)).max(axis=(2, 3))
    ring = dil & ~mask
    bg = lum(b[ring])
    bg_p10 = float(np.percentile(bg, 10))
    bg_med = float(np.median(bg))
    # 深字（暗于背景）用最亮的背景对比；强调色同理
    cr_text = (bg_p10 + 0.05) / (L_TEXT + 0.05)
    cr_acc = None
    if s["emphasis"]:
        # 强调字：只取蓝色字形（B 明显高于 R）周围一圈背景
        acc = mask & ((a[..., 2] - a[..., 0]) > 18)
        acc_ring = swv(np.pad(acc, 6), (13, 13)).max(axis=(2, 3)) & ~mask
        cr_acc = (float(np.percentile(lum(b[acc_ring]), 10)) + 0.05) / (L_ACC + 0.05)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    chars = len(s["text"].replace("\n", "").replace("，", "").replace("。", "").replace("？", "").replace("、", "").replace("：", "").replace("“", "").replace("”", ""))
    secs = (s["to"] - s["from"] - (40 if s.get("key") else 20) / 2 - 15 / 2) / FPS
    sub_report.append({
        "id": s["id"], "layout": s["layout"], "frame": f, "bbox": bbox,
        "contrastText_p10": round(cr_text, 2), "contrastAccent_p10": round(cr_acc, 2) if cr_acc else None,
        "bgLumMedian": round(bg_med, 3),
        "inMargins": bbox[0] >= 80 and bbox[2] <= 1840 and bbox[1] >= 80 and bbox[3] <= 1080 - 80,
        "topRightClear": not (bbox[2] > 1600 and bbox[1] < 260),
        "rightThird": bbox[0] > 1280,
        "charsPerSec": round(chars / secs, 2),
    })

# 相邻两屏版式不重复
adjacent_same = [(a["id"], b["id"]) for a, b in zip(screens, screens[1:]) if a["layout"] == b["layout"]]

# ---------- 5. 声音事件 ----------
events = [
    {"frame": c["frame"], "time": round(c["frame"] / FPS, 2), "type": c["type"], "action": c["action"], "db": c["db"]}
    for c in CUES["cues"] if c["type"] != "ambience" and P_FROM <= c["frame"] < P_TO
]

report = {
    "yavg": {"mean": round(float(y.mean()), 1), "min": round(float(y.min()), 1), "max": round(float(y.max()), 1),
             "framesBelow90": low, "framesAbove135": high[:50], "countAbove135": len(high)},
    "colorIssues": color_issues,
    "subtitles": sub_report,
    "adjacentSameLayout": adjacent_same,
    "soundEvents": events,
}
(OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
(OUT / "yavg.csv").write_text("\n".join(f"{i},{v}" for i, v in enumerate(yavg)))
print(json.dumps({k: v for k, v in report.items() if k != "subtitles"}, ensure_ascii=False, indent=1)[:3000])
for s in sub_report:
    print(s)
