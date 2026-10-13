"""渲染后质检：每 2 秒抽一帧 → 拼成总览图 + 自动检查。

用法：python3 -I scripts/qa-frames.py out/preview.mp4 out/qa

自动检查（每帧）：
  - 颜色：除黑白灰外只允许强调色 #E0A040 一个色相；统计偏色像素与强调色面积
  - 右上角水印区（x ≥ 1440, y ≤ 260）必须保持空：不能有高亮细节（字幕、亮物件）
  - 画面不能静止：和上一张抽帧几乎一样时报警
人工检查项（看总览图和单帧）：字被挡、出画、压脸、相邻版式重复、右侧 / 竖排、关键词过大、只剩点线粒子。
"""
import colorsys
import os
import subprocess
import sys

from PIL import Image, ImageChops, ImageDraw, ImageStat

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.startswith("f_") and f.endswith(".png"):
        os.remove(os.path.join(out, f))
# 按帧号精确抽帧：第 30, 90, 150… 帧（1s, 3s, 5s…），避开第 0 帧的淡入
subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-i", src, "-vf", r"select=eq(mod(n\,60)\,30)", "-fps_mode", "vfr", os.path.join(out, "f_%03d.png")],
    check=True,
)
frames = sorted(f for f in os.listdir(out) if f.startswith("f_"))

ACCENT_HUE = colorsys.rgb_to_hsv(0xE0 / 255, 0xA0 / 255, 0x40 / 255)[0] * 360
report = []
prev = None
for i, name in enumerate(frames):
    t = 1 + i * 2
    im = Image.open(os.path.join(out, name)).convert("RGB")
    small = im.resize((480, 270))
    px = list(small.get_flattened_data())
    off = acc = 0
    for r, g, b in px:
        mx, mn = max(r, g, b), min(r, g, b)
        if mx - mn < 22:
            continue
        h = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[0] * 360
        if abs(h - ACCENT_HUE) <= 18:
            acc += 1
        else:
            off += 1
    n = len(px)
    tr = im.crop((1440, 0, 1920, 260)).convert("L")
    tr_bright = sum(1 for v in tr.get_flattened_data() if v > 185) / (480 * 260)
    still = None
    if prev is not None:
        diff = ImageStat.Stat(ImageChops.difference(small, prev).convert("L")).mean[0]
        still = diff
    prev = small
    flags = []
    if off / n > 0.002:
        flags.append(f"偏色 {off / n:.2%}")
    if acc / n > 0.06:
        flags.append(f"强调色面积 {acc / n:.1%}")
    if tr_bright > 0.004:
        flags.append(f"右上角有亮细节 {tr_bright:.2%}")
    if still is not None and still < 1.0:
        flags.append("与上一帧几乎相同")
    report.append((t, name, acc / n, off / n, tr_bright, still, flags))

# 总览图：4 列，每张 480×270，标时间码
cols = 4
rows = (len(frames) + cols - 1) // cols
tw, th, pad = 480, 270, 26
sheet = Image.new("RGB", (cols * tw, rows * (th + pad)), (245, 245, 245))
d = ImageDraw.Draw(sheet)
for i, name in enumerate(frames):
    t = 1 + i * 2
    im = Image.open(os.path.join(out, name)).convert("RGB").resize((tw, th))
    x, y = (i % cols) * tw, (i // cols) * (th + pad)
    sheet.paste(im, (x, y + pad))
    d.text((x + 6, y + 6), f"{t // 60:02d}:{t % 60:02d}  (frame {t * 30})", fill=(20, 20, 20))
sheet_path = os.path.join(out, "contact-sheet.png")
sheet.save(sheet_path)
# 分页总览（每页 16 张，方便逐页检查）
per = 16
for pg in range(0, len(frames), per):
    sub = frames[pg : pg + per]
    rows_p = (len(sub) + cols - 1) // cols
    page = Image.new("RGB", (cols * tw, rows_p * (th + pad)), (245, 245, 245))
    dp = ImageDraw.Draw(page)
    for j, name in enumerate(sub):
        i = pg + j
        t = 1 + i * 2
        im = Image.open(os.path.join(out, name)).convert("RGB").resize((tw, th))
        x, y = (j % cols) * tw, (j // cols) * (th + pad)
        page.paste(im, (x, y + pad))
        dp.text((x + 6, y + 6), f"{t // 60:02d}:{t % 60:02d}  (frame {t * 30})", fill=(20, 20, 20))
    page.save(os.path.join(out, f"sheet-{pg // per + 1:02d}.png"))

print(f"抽帧 {len(frames)} 张 → {sheet_path}")
print("时间   强调色  偏色    右上角  变化量  问题")
bad = 0
for t, name, acc, off, trb, still, flags in report:
    if flags:
        bad += 1
    s = "-" if still is None else f"{still:5.1f}"
    print(f"{t:4d}s  {acc:6.2%} {off:6.3%} {trb:6.2%}  {s:>6}  {'；'.join(flags) or '✓'}")
print("自动检查：", "全部通过" if bad == 0 else f"{bad} 帧有问题")

# —— 音轨：逐秒响度，低于 -60 dB 视为无声（底噪缺失之类的问题）
import math
import struct

raw = subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-i", src, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
    check=True,
    capture_output=True,
).stdout
samples = struct.unpack("<%dh" % (len(raw) // 2), raw)
sr = 8000
levels = []
for s in range(len(samples) // sr):
    seg = samples[s * sr : (s + 1) * sr]
    rms = math.sqrt(sum(x * x for x in seg) / sr) / 32768
    levels.append(20 * math.log10(max(rms, 1e-9)))
silent = [i for i, v in enumerate(levels) if v < -60]
peak = max(abs(x) for x in samples) / 32768
print(f"音轨：{len(levels)}s，峰值 {20 * math.log10(max(peak, 1e-9)):.1f} dBFS，逐秒响度 {min(levels):.0f} ~ {max(levels):.0f} dB")
print("音轨检查：", "无静音段" if not silent else f"这些秒几乎无声：{silent}")

# —— 静止画面检测：每 0.2 秒取一帧 64×36 灰度图，连续 3 秒变化量都很小就报警
raw = subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-i", src, "-vf", "fps=5,scale=64:36:flags=area,format=gray", "-f", "rawvideo", "-"],
    check=True,
    capture_output=True,
).stdout
fw = 64 * 36
nf = len(raw) // fw
diffs = []
for i in range(1, nf):
    a = raw[(i - 1) * fw : i * fw]
    b = raw[i * fw : (i + 1) * fw]
    diffs.append(sum(abs(a[k] - b[k]) for k in range(fw)) / fw)
TH = 0.55
runs = []
start = None
for i, d in enumerate(diffs):
    if d < TH:
        start = i if start is None else start
    else:
        if start is not None and (i - start) / 5 >= 3:
            runs.append((start / 5, i / 5))
        start = None
if start is not None and (len(diffs) - start) / 5 >= 3:
    runs.append((start / 5, len(diffs) / 5))
srt = sorted(diffs)
print(f"画面变化量：中位数 {srt[len(srt) // 2]:.2f}，最低 10% {srt[len(srt) // 10]:.2f}（阈值 {TH}）")
print("静止检查：", "没有超过 3 秒的静止段" if not runs else "；".join(f"{a:.1f}s–{b:.1f}s" for a, b in runs))
