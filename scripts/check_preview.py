#!/usr/bin/env python3
"""渲染后的检查：python3 scripts/check_preview.py [mp4] [结束帧]

先跑 npm run timeline（导出 out/timeline.json）和 npx tsx scripts/check-frames.ts（几何检查）。
输出到 out/check/：
  opening.png    开头 0 0.5 1 1.5 2 3 4 5 秒
  contact.png    每 2 秒一帧的联系表
  heavy-<帧>.png 每个重卡点前后各 3 帧
  section-*.png  每节抽一帧（辨认检查）
  report.md      汇总：前 5 秒、换屏对齐、读字时间、画面变化、响度前 10、真峰、几何检查
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "check"
FPS = 30


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def frames_gray(mp4, w=320, h=180):
    """整段视频读成灰度小图，算帧间变化用"""
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True)
    a = np.frombuffer(r.stdout, dtype=np.uint8)
    return a.reshape(-1, h, w).astype(np.float32)


def grab(mp4, frame, path, scale=None):
    vf = f"select=eq(n\\,{frame})" + (f",scale={scale}" if scale else "")
    run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-vf", vf, "-vframes", "1", str(path)])


def tile(paths, cols, out, w=640, h=360, labels=None):
    args = []
    for p in paths:
        args += ["-i", str(p)]
    n = len(paths)
    chain = ""
    for i in range(n):
        text = labels[i] if labels else ""
        draw = f",drawtext=text='{text}':x=12:y=12:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55" if text else ""
        chain += f"[{i}]scale={w}:{h}{draw}[s{i}];"
    layout = "|".join(f"{(i % cols) * w}_{(i // cols) * h}" for i in range(n))
    chain += "".join(f"[s{i}]" for i in range(n)) + f"xstack=inputs={n}:layout={layout}"
    r = run(["ffmpeg", "-y", "-v", "error", *args, "-filter_complex", chain, str(out)])
    if r.returncode:
        print(r.stderr)


def loudness(mp4):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-af", "ebur128=peak=true:framelog=info", "-f", "null", "-"])
    rows = [(float(t), float(m)) for t, m in re.findall(r"t:\s*([\d.]+)\s+TARGET:\S+ LUFS\s+M:\s*(-?[\d.]+)", r.stderr)]
    tp = re.findall(r"Peak:\s*(-?[\d.]+)\s*dBFS", r.stderr)
    return rows, float(tp[-1]) if tp else None


def main():
    mp4 = (Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out" / "preview.mp4").resolve()
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 864
    OUT.mkdir(parents=True, exist_ok=True)
    tl = json.loads((ROOT / "out" / "timeline.json").read_text())
    grid = json.loads((ROOT / "src" / "data" / "rhythm.json").read_text())
    beats = set(grid["beats"])
    downbeats = grid["downbeats"]
    man = tl["manifest"]
    screens = [s for s in tl["screens"] if s["start"] < end]
    report = ["# 预览检查报告", "", f"视频：`{mp4.relative_to(ROOT)}`，检查到第 {end} 帧（{end / FPS:g} 秒）", ""]

    # —— 前 5 秒 ——
    g = frames_gray(mp4)
    n = len(g)
    report.append(f"总帧数 {n}")
    diff = np.zeros(n)
    diff[1:] = np.abs(g[1:] - g[:-1]).mean(axis=(1, 2))
    big = np.zeros(n)
    big[6:] = np.abs(g[6:] - g[:-6]).mean(axis=(1, 2))
    opening = [0, 15, 30, 45, 60, 90, 120, 150]
    paths = []
    for f in opening:
        p = OUT / f"open-{f:04d}.png"
        grab(mp4, min(f, n - 1), p)
        paths.append(p)
    tile(paths, 4, OUT / "opening.png", labels=[f"{f / FPS:g}s" for f in opening])
    s1 = screens[0]
    first_read = 6  # Subtitle 第一屏字间隔 0.25 帧、6 帧淡入：最后一个字在 8×0.25+6 = 8 帧内完全清楚，第 6 帧已可读
    # 画面变化：6 帧间隔的平均差超过阈值的峰（相隔至少 15 帧）算一次明显变化
    thr = 3.5
    peaks = []
    for i in range(6, min(150, n)):
        if big[i] > thr and big[i] == big[max(6, i - 7) : i + 8].max() and (not peaks or i - peaks[-1] >= 15):
            peaks.append(i)
    mq = next(s for s in screens if s.get("heavy") == "主线问题")
    report += [
        "",
        "## 前 5 秒",
        "",
        f"- 第 0 帧到第 1 帧的平均像素变化 {diff[1]:.2f}（>0 说明第 0 帧就在动）；第 0 帧的音效：{', '.join(x['name'] for x in s1['sfx'] if x['at'] == 0) or '无'}",
        f"- 第一屏字幕「{s1['upper']}」从第 0 帧开始逐字由虚变实，第 {first_read} 帧（{first_read / FPS:.2f} 秒）可读",
        f"- 主线问题「{mq['upper']} {mq['lower']}」上行在第 {mq['start']} 帧（{mq['start'] / FPS:g} 秒）出现，{'是' if mq['start'] in downbeats else '不是'}小节第一拍；下行第 {mq['lowerAt']} 帧",
        f"- 前 5 秒明显画面变化 {len(peaks)} 次，峰值帧：{', '.join(f'{p}（{p / FPS:.1f}s）' for p in peaks)}（阈值：6 帧差 {thr:.1f}）",
        "- 抽帧：`out/check/opening.png`",
    ]

    # —— 静止检查：任意 3 秒窗口里画面都要有看得见的变化 ——
    still = []
    for a in range(0, min(end, n) - 90, 15):
        w = big[a + 6 : a + 90]
        if w.max() < 0.6:
            still.append(a)
    report += ["", "## 静止检查", "", f"- 3 秒窗口内 6 帧差最大值都低于 0.6 的窗口：{', '.join(f'{a / FPS:g}s' for a in still) if still else '没有'}", f"- 全片 6 帧差最小的 3 秒窗口：{min((big[a + 6 : a + 90].max(), a) for a in range(0, min(end, n) - 90, 15))[0]:.2f}"]

    # —— 联系表 ——
    times = list(range(0, end, 60))
    paths = []
    for f in times:
        p = OUT / f"c-{f:04d}.png"
        grab(mp4, min(f, n - 1), p)
        paths.append(p)
    tile(paths, 5, OUT / "contact.png", w=576, h=324, labels=[f"{f / FPS:g}s" for f in times])
    report += ["", "## 联系表", "", "每 2 秒一帧：`out/check/contact.png`"]

    # —— 换屏和读字 ——
    report += ["", "## 换屏对齐和读字时间", "", "| 屏 | 起止帧 | 离小节线 | 下行出现帧 | 是否在拍上 | 字数 | 每秒字数 | 下行剩余读字秒数 |", "|---|---|---|---|---|---|---|---|"]
    for s in screens:
        off = min(abs(s["start"] - d) for d in downbeats)
        chars = len(re.sub(r"[【】\s]", "", (s["upper"] or "") + (s["lower"] or "")))
        dur = (s["end"] - s["start"]) / FPS
        low_left = (s["end"] - s["lowerAt"]) / FPS if s["lower"] else None
        report.append(
            f"| {s['n']} | {s['start']}–{s['end']} | {off} | {s['lowerAt'] if s['lower'] else '—'} | {'是' if (not s['lower'] or s['lowerAt'] in beats) else '否'} | {chars} | {chars / dur:.2f} | {f'{low_left:.1f}' if low_left else '—'} |"
        )

    # —— 重卡点前后各 3 帧 ——
    report += ["", "## 重卡点和大动作", ""]
    for s in screens:
        if not (s.get("heavy") or s.get("bigAction")):
            continue
        f0 = s["start"]
        ps = []
        for d in range(-3, 4):
            p = OUT / f"hv-{f0 + d:04d}.png"
            grab(mp4, f0 + d, p)
            ps.append(p)
        tile(ps, 7, OUT / f"heavy-{f0}.png", w=384, h=216, labels=[f"{d:+d}" for d in range(-3, 4)])
        window = diff[f0 - 12 : f0 + 13]
        peak = int(np.argmax(window)) - 12
        report.append(f"- 屏 {s['n']} {s.get('heavy') or '大动作'}（帧 {f0}，{'小节第一拍' if f0 in downbeats else '非小节第一拍'}）：前后 12 帧内相邻两帧变化最大的是第 {f0 + peak - 1}→{f0 + peak} 帧（{peak:+d}），变化量 {window.max():.1f}，拍前一帧 {diff[f0]:.1f}；抽帧 `out/check/heavy-{f0}.png`")

    # —— 每节一帧 ——
    secs = [x for x in tl["sections"] if x["start"] < end]
    sp = []
    for x in secs:
        mid = (x["start"] + min(x["end"], end)) // 2
        p = OUT / f"section-{x['id']}.png"
        grab(mp4, mid, p)
        sp.append(p)
    report += ["", "## 辨认检查", "", "每节抽中间一帧：" + "，".join(f"`out/check/section-{x['id']}.png`（{x['name']} 帧 {(x['start'] + min(x['end'], end)) // 2}）" for x in secs)]

    # —— 响度 ——
    rows, tp = loudness(mp4)
    events = [e for e in tl["sfx"] if e["frame"] < end]

    def active(t):
        f = t * FPS
        return [e for e in events if e["frame"] <= f <= e["frame"] + max(12, man[e["id"]]["durationFrames"]) + 12]

    picked = []
    for t, m in sorted(rows, key=lambda r: -r[1]):
        if any(abs(t - p[0]) < 0.6 for p in picked):
            continue
        picked.append((t, m))
        if len(picked) == 10:
            break
    report += ["", "## 响度", "", f"- 全片真峰 {tp} dBTP（上限 -1）", f"- 瞬时响度最高 {picked[0][1]:.1f} LUFS（上限 -18）" if picked else "", "", "| 时刻 | 瞬时响度 LUFS | 当时在响的音效（档位） |", "|---|---|---|"]
    for t, m in sorted(picked):
        names = "，".join(f"{e['label']}（{tl['tiers'][e['tier']]['name']}）帧{e['frame']}" for e in active(t)) or "无（余音）"
        report.append(f"| {t:.1f}s | {m:.1f} | {names} |")
    tier_max = {}
    for e in events:
        t1 = e["frame"] / FPS + 0.4
        ms = [m for t, m in rows if e["frame"] / FPS <= t <= t1 + 0.4]
        if ms:
            tier_max.setdefault(e["tier"], []).append(max(ms))
    report += ["", "各档音效在视频里的瞬时响度（每个音效响起后 0.8 秒内的最大值）：", ""]
    for tier in ("light", "mid", "heavy"):
        if tier in tier_max:
            v = tier_max[tier]
            report.append(f"- {tl['tiers'][tier]['name']}档 {len(v)} 次：{min(v):.1f} 到 {max(v):.1f} LUFS（目标 {tl['tiers'][tier]['lufs']}）")

    # —— 几何检查 ——
    geo = json.loads((OUT / "geometry.json").read_text())
    report += ["", "## 几何检查（字幕遮挡 水印区 裁切）", ""]
    if geo["issues"]:
        for i in geo["issues"]:
            report.append(f"- {i['kind']}：{i['who']}{i['part']}，{i['count']} 帧（{i['ranges']}）")
    else:
        report.append("- 无")
    report.append("- 有意的特写裁切：" + ("；".join(f"{c['part']} {c['ranges']}" for c in geo["closeups"]) or "无"))

    (OUT / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
