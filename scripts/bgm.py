#!/usr/bin/env python3
"""把 44.6 秒的 BGM 按小节拼接到成片长度，并导出卡点表。

用法:
  python3 scripts/bgm.py --seconds 150 --drop 30
  --seconds  成片总时长（秒）
  --drop     希望"高潮/drop"落在第几秒（主线问题或主题词砸下的位置），会对齐到最近的乐句
输出:
  public/audio/bgm.wav     拼接后的 BGM（48k 立体声，已做首尾淡入淡出）
  src/data/beatmap.json    30fps 帧号：beats / kicks / bars / phrases / accents / sections

节拍参数来自对 assets/music/bgm_source.mp3 的实测（librosa beat_track + 线性回归，残差 < 27ms）:
  168.24 BPM，拍长 0.3566s，第 0 拍在 0.182s；奇数拍为底鼓重拍；
  每 16 拍（5.706s）一个乐句，乐句起点为第 12 拍；
  0–4.46s 前奏 / 4.46–20.16s A 段（铺垫）/ 20.16–21.58s 断奏蓄力 / 21.58–38.70s B 段（高潮）/ 38.70s– 尾段
"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/music/bgm_source.mp3"
SR, FPS = 48000, 30
BEAT, BEAT0 = 0.3566, 0.182


def b(k):
    return BEAT0 + BEAT * k


# 源曲片段，均从乐句起点切开，保证拼接处落在重拍上
INTRO = (0.0, b(12))
A1, A2 = (b(12), b(28)), (b(28), b(44))
A_END = (b(44), b(60))           # 最后一个铺垫乐句，含 20.16s 起的断奏蓄力
B1, B2, B3 = (b(60), b(76)), (b(76), b(92)), (b(92), b(108))
OUTRO = (b(108), None)
PHRASE = BEAT * 16
XF = int(0.03 * SR)               # 30ms 等功率交叉淡化


def load():
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(SRC), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def plan(seconds, drop):
    # 铺垫乐句数：让 drop 尽量靠近目标秒数（至少保留 1 个铺垫乐句 + 蓄力乐句）
    n_a = max(0, round((drop - INTRO[1] - PHRASE) / PHRASE)) if drop else 2
    parts = [("intro", INTRO)] + [("build", (A1, A2)[i % 2]) for i in range(n_a)] + [("build", A_END)]
    drop_t = INTRO[1] + PHRASE * (n_a + 1)
    # 尾段至少完整播放 2.5s 再淡出：尾段起点落在成片结束前 2.5s～8.2s 之间
    n_b = max(1, int((seconds - drop_t - 2.5) // PHRASE))
    parts += [("drop", (B1, B2, B3)[i % 3]) for i in range(n_b)] + [("outro", OUTRO)]
    return parts, drop_t


def render(audio, parts, seconds):
    out = np.zeros((0, 2), np.float32)
    fade_in = np.sin(np.linspace(0, np.pi / 2, XF))[:, None].astype(np.float32)
    fade_out = fade_in[::-1]
    for _, (s, e) in parts:
        seg = audio[int(s * SR): None if e is None else int(e * SR) + XF].copy()
        if len(out) >= XF:
            out[-XF:] = out[-XF:] * fade_out + seg[:XF] * fade_in
            seg = seg[XF:]
        out = np.concatenate([out, seg])
    total = int(seconds * SR)
    out = out[:total] if len(out) >= total else np.concatenate([out, np.zeros((total - len(out), 2), np.float32)])
    fo = min(int(2.5 * SR), len(out))   # 成片最后 2.5s 淡出，避免源曲硬切
    out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    fi = int(0.05 * SR)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]
    return out


def beatmap(parts, seconds):
    f = lambda t: int(round(t * FPS))
    beats, sections, t = [], [], 0.0
    for name, (s, e) in parts:
        e = 44.64 if e is None else e
        k0 = int(np.ceil((s - BEAT0) / BEAT - 1e-6))
        for k in range(max(k0, 0), int((e - BEAT0) / BEAT) + 1):
            bt = t + b(k) - s
            if bt < min(t + e - s, seconds):
                beats.append((bt, k))
        if sections and sections[-1]["name"] == name:
            sections[-1]["end"] = f(min(t + e - s, seconds))
        else:
            sections.append({"name": name, "start": f(t), "end": f(min(t + e - s, seconds))})
        t += e - s
    phrases = [f(bt) for bt, k in beats if k >= 12 and (k - 12) % 16 == 0]
    drop_f = next(s["start"] for s in sections if s["name"] == "drop")
    return {
        "fps": FPS, "bpm": round(60 / BEAT, 2), "durationInFrames": f(seconds),
        "note": "beats=每拍; kicks=底鼓重拍(适合小脉冲); bars=每4拍(适合换屏); phrases=每16拍(适合换节/大动作); accents=高潮段乐句起点的镲片重击(全片最重的卡点)",
        "dropFrame": drop_f,
        "sections": sections,
        "beats": [f(bt) for bt, _ in beats],
        "kicks": [f(bt) for bt, k in beats if k % 2 == 1],
        "bars": [f(bt) for bt, k in beats if k >= 12 and (k - 12) % 4 == 0],
        "phrases": phrases,
        "accents": [p for p in phrases if p >= drop_f],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True)
    ap.add_argument("--drop", type=float, default=None)
    a = ap.parse_args()
    if a.seconds < 30:
        sys.exit("--seconds 至少 30")
    parts, drop_t = plan(a.seconds, a.drop)
    wav = render(load(), parts, a.seconds)
    (ROOT / "public/audio").mkdir(parents=True, exist_ok=True)
    (ROOT / "src/data").mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(wav, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    str(ROOT / "public/audio/bgm.wav")], input=pcm, check=True)
    bm = beatmap(parts, a.seconds)
    (ROOT / "src/data/beatmap.json").write_text(json.dumps(bm, ensure_ascii=False, indent=1))
    print(f"bgm.wav {a.seconds:.1f}s  drop 落在 {drop_t:.2f}s (第 {bm['dropFrame']} 帧)  "
          f"乐句 {len(bm['phrases'])} 个  重卡点 {len(bm['accents'])} 个")


if __name__ == "__main__":
    main()
