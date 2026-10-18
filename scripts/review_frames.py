"""渲染后自查：联系表 + 重卡点前后帧。

用法: python scripts/review_frames.py out/preview.mp4 [输出目录，默认 out/review]

- contact.png：每 2 秒抽一帧拼成联系表，每格标帧号和时间码（检查遮挡、出画、水印区、读不完就切）
- heavy-<帧号>.png：每个重卡点前后各 3 帧（共 7 帧）排成一行，检查动作是否落在拍上
  重卡点从 src/data/subtitles.ts 的 heavy 字段读取，只取视频时长以内的
- 音频：每个重卡点附近找成片音轨里最强的起音，报告它离重卡点差几帧；
  并比较重卡点后 0.1–0.4s 与 0.8–1.1s 的 BGM 中高频能量（应能看到压低）
"""
import json
import os

import librosa
import numpy as np
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

FPS = 30
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def n_frames(mp4):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
         "stream=nb_read_frames", "-of", "csv=p=0", mp4], capture_output=True, text=True, check=True)
    return int(out.stdout.strip().strip(","))


def grab(mp4, frames, size):
    """一次解码，按帧号取出若干帧"""
    expr = "+".join(f"eq(n\\,{f})" for f in frames)
    tmp = "out/.grab"
    os.makedirs(tmp, exist_ok=True)
    for p in os.listdir(tmp):
        os.remove(os.path.join(tmp, p))
    subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"select='{expr}',scale={size[0]}:{size[1]}",
                    "-vsync", "0", f"{tmp}/%05d.png"], check=True)
    files = sorted(os.listdir(tmp))
    return [Image.open(os.path.join(tmp, p)).convert("RGB") for p in files]


def tag(im, text):
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype(FONT, 18) if os.path.exists(FONT) else ImageFont.load_default()
    d.rectangle([0, 0, 230, 26], fill=(0, 0, 0))
    d.text((6, 3), text, fill=(255, 220, 120), font=font)
    return im


def heavy_frames():
    src = open("src/data/subtitles.ts", encoding="utf-8").read()
    return [(int(m.group(1)), m.group(2)) for m in re.finditer(r"start: (\d+),[^}]*heavy: \"([^\"]+)\"", src)]


def main():
    mp4 = sys.argv[1] if len(sys.argv) > 1 else "out/preview.mp4"
    out = sys.argv[2] if len(sys.argv) > 2 else "out/review"
    os.makedirs(out, exist_ok=True)
    total = n_frames(mp4)

    # 联系表
    frames = list(range(0, total, 2 * FPS))
    cell = (480, 270)
    ims = grab(mp4, frames, cell)
    cols = 4
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell[0], rows * cell[1]), (40, 40, 40))
    for i, (f, im) in enumerate(zip(frames, ims)):
        sheet.paste(tag(im, f"f{f}  {f / FPS:5.2f}s"), ((i % cols) * cell[0], (i // cols) * cell[1]))
    sheet.save(f"{out}/contact.png")
    print(f"contact.png：{len(ims)} 格（共 {total} 帧）")

    # 重卡点
    report = []
    for f0, name in heavy_frames():
        if f0 + 3 >= total:
            continue
        fs = list(range(f0 - 3, f0 + 4))
        ims = grab(mp4, fs, (640, 360))
        strip = Image.new("RGB", (640 * 4, 360 * 2), (40, 40, 40))
        for i, (f, im) in enumerate(zip(fs, ims)):
            strip.paste(tag(im, f"f{f} ({f - f0:+d})"), ((i % 4) * 640, (i // 4) * 360))
        strip.save(f"{out}/heavy-{f0}.png")
        report.append({"frame": f0, "name": name})
        print(f"heavy-{f0}.png：{name}，帧 {fs[0]}–{fs[-1]}")
    # 音频：重卡点起音对齐
    wav = "out/.grab/audio.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-ac", "1", "-ar", "48000", wav], check=True)
    y, sr = librosa.load(wav, sr=48000, mono=True)
    bgm, _ = librosa.load("public/audio/bgm.wav", sr=48000, mono=True)
    hop = 160  # 1/300 秒
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    rate = sr / hop
    for r in report:
        f0 = r["frame"]
        i0, i1 = int((f0 - 6) / FPS * rate), int((f0 + 6) / FPS * rate)
        peak = i0 + int(np.argmax(onset[i0:i1]))
        r["audioOnsetFrame"] = round(peak / rate * FPS, 2)
        r["offsetFrames"] = round(peak / rate * FPS - f0, 2)
        # 压低：>2kHz（重音效几乎没有能量的频段）里成片 / 原 BGM 的增益，重卡点后 3–13 帧 vs 30–40 帧
        def gain(a, b):
            s0, s1 = int(a / FPS * sr), int(b / FPS * sr)
            def hf(x):
                X = np.abs(librosa.stft(x[s0:s1], n_fft=2048))
                return X[int(2000 / sr * 2048):].sum()
            return 20 * np.log10(hf(y) / (hf(bgm) + 1e-9) + 1e-12)
        r["duckDb"] = round(float(gain(f0 + 3, f0 + 13) - gain(f0 + 30, f0 + 40)), 1)
        print(f"音频：{r['name']} 起音在 {r['audioOnsetFrame']} 帧，偏差 {r['offsetFrames']:+.2f} 帧；BGM 压低 {r['duckDb']} dB")
    json.dump(report, open(f"{out}/heavy.json", "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
