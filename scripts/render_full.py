"""分段渲染整片，合成一个 mp4，并把响度做到 -14 LUFS / 真峰值 ≤ -1 dBTP。

用法:
  python scripts/render_full.py            # 渲染全部分段 + 音频 + 合成
  python scripts/render_full.py 3 5        # 只重渲第 3、5 段（其余用已有文件），再合成
  python scripts/render_full.py mux        # 不重渲画面，只重做音频响度和合成

分段 = 各节的起止帧（从 src/data/subtitles.ts 的 section 字段算出来），
画面分段无声渲染后用 concat 无损拼接；音频整片单独渲染一次（避免分段接缝处的 AAC 间隙），
两遍 loudnorm（第一遍测量、第二遍按测量值线性增益 + 真峰值限制）后再和画面合在一起。

输出: out/overview.mp4，中间文件在 out/seg/
"""
import json
import os
import re
import subprocess
import sys

TARGET_I = -14.0
TARGET_TP = -1.5  # 留 0.5 dB 给 AAC 编码的峰值抖动，成片实测 ≤ -1 dBTP
SEG = "out/seg"


def run(cmd):
    print("$", " ".join(cmd))
    subprocess.run(cmd, check=True)


def segments():
    src = open("src/data/subtitles.ts", encoding="utf-8").read()
    rows = re.findall(r"id: (\d+), section: '(\w+)', start: (\d+)", src)
    total = json.load(open("src/data/beatmap.json"))["durationInFrames"]
    bounds, last = [], None
    for _, sec, start in rows:
        if sec != last:
            bounds.append((sec, int(start)))
            last = sec
    bounds[0] = (bounds[0][0], 0)
    return [(sec, a, (bounds[i + 1][1] if i + 1 < len(bounds) else total)) for i, (sec, a) in enumerate(bounds)], total


def measure(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True, check=True).stderr
    summary = out[out.rindex("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
    return i, tp


def loudnorm(src, dst):
    """增益 + 4 倍过采样限幅（近似真峰值限制），迭代到 -14 LUFS。

    不用 loudnorm 的动态模式：那会让整片响度忽大忽小。这里只在峰值处限幅，
    重卡点的 boom 仍然是全片最响的，只是被压在 TARGET_TP 以下。
    """
    i0, tp0 = measure(src)
    print(f"原始混音：{i0:.2f} LUFS，真峰值 {tp0:.2f} dBTP")
    gain = TARGET_I - i0
    ceiling = 10 ** ((TARGET_TP - 0.3) / 20)
    for _ in range(3):
        af = (f"aresample=192000,volume={gain:.3f}dB,"
              f"alimiter=limit={ceiling:.4f}:attack=1:release=80:level=disabled,aresample=48000")
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", af, "-c:a", "pcm_s16le", dst])
        i, tp = measure(dst)
        print(f"  增益 {gain:+.2f} dB → {i:.2f} LUFS，真峰值 {tp:.2f} dBTP")
        if abs(i - TARGET_I) < 0.2:
            break
        gain += TARGET_I - i


def main():
    mux_only = sys.argv[1:] == ["mux"]
    only = {0} if mux_only else {int(x) for x in sys.argv[1:]}
    os.makedirs(SEG, exist_ok=True)
    segs, total = segments()
    for i, (sec, a, b) in enumerate(segs, 1):
        out = f"{SEG}/{i:02d}-{sec}.mp4"
        if only and i not in only and os.path.exists(out):
            continue
        run(["npx", "remotion", "render", "src/index.ts", "Overview", out, f"--frames={a}-{b - 1}", "--muted", "--log=error"])
    with open(f"{SEG}/list.txt", "w") as fp:
        for i, (sec, _, _) in enumerate(segs, 1):
            fp.write(f"file '{i:02d}-{sec}.mp4'\n")
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{SEG}/list.txt", "-c", "copy", f"{SEG}/video.mp4"])

    if not mux_only:
        run(["npx", "remotion", "render", "src/index.ts", "Overview", f"{SEG}/audio-raw.wav", "--codec=wav", "--log=error"])
    loudnorm(f"{SEG}/audio-raw.wav", f"{SEG}/audio.wav")

    run(["ffmpeg", "-v", "error", "-y", "-i", f"{SEG}/video.mp4", "-i", f"{SEG}/audio.wav",
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart",
         "out/overview.mp4"])
    n = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                        "stream=nb_read_frames", "-of", "csv=p=0", "out/overview.mp4"], capture_output=True, text=True).stdout
    print(f"成片 out/overview.mp4：{n.strip().strip(',')} 帧（应为 {total}），分段 {[(s, a, b) for s, a, b in segs]}")


if __name__ == "__main__":
    main()
