"""按乐句拼接 BGM，输出成片音频和 30fps 卡点表。

用法：
  python3 scripts/bgm.py --seconds 150 --drop 67.96

做法：
- 原曲结构（小节，1 起算）：前奏 1–8 / 铺垫 9–24 / 低谷 25–32 / 爬升 33–40 /
  drop 41–56 / 高潮 57–72 / 尾段 73–80。一个乐句 = 4 小节 = 16 拍。
- 铺垫按乐句取 n 句（9,13,17,21 循环），n 取让 drop 最接近 --drop 的值。
- drop 之后先放 drop 段的乐句，再循环高潮段乐句，取最少的句数，
  让剩下的时间放得进尾段；尾段从第 73 小节起播，最后 --fade-out 秒淡出。
- 所有接口都在小节首拍（底鼓重拍）上，做 --xfade（默认 30ms）交叉淡化，
  淡化区间以接口为中心，保证节拍网格在成片里严格连续。
- 原曲开头约 65ms 的编码器静音被裁掉，成片从第一个有声采样起播。
- 拍点网格来自 assets/music/beats.json（scripts/analyze_music.py 生成）。

输出：public/audio/bgm.wav、src/data/beatmap.json（帧号，30fps）。
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/music/bgm.mp3"
ANALYSIS = ROOT / "assets/music/beats.json"
OUT_WAV = ROOT / "public/audio/bgm.wav"
OUT_MAP = ROOT / "src/data/beatmap.json"

# 原曲段落（小节，含首不含尾）
INTRO = (1, 9)
PRE_PHRASES = [9, 13, 17, 21]  # 铺垫
TROUGH = (25, 33)  # 蓄力-低谷
CLIMB = (33, 41)  # 蓄力-爬升
DROP_PHRASES = [41, 45, 49, 53]
CLIMAX_PHRASES = [57, 61, 65, 69]  # 高潮
TAIL_START = 73
OUTRO_START = 79


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True, help="成片总时长（秒）")
    ap.add_argument("--drop", type=float, required=True, help="希望 drop 落在第几秒")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--xfade", type=float, default=0.030)
    ap.add_argument("--fade-in", type=float, default=0.05)
    ap.add_argument("--fade-out", type=float, default=2.0)
    ap.add_argument("--min-tail", type=float, default=2.5, help="尾段淡出前至少完整播放的秒数")
    ap.add_argument("--kick-threshold", type=float, default=0.8)
    args = ap.parse_args()

    if not ANALYSIS.exists():
        subprocess.run([sys.executable, str(ROOT / "scripts/analyze_music.py"), str(SRC)], check=True)
    ana = json.loads(ANALYSIS.read_text())
    t0, period = ana["first_beat"], ana["beat_period"]
    kick_strength = np.array(ana["kick_strength"])
    n_beats_src = len(kick_strength)
    src_dur = ana["duration"]
    bar_len = 4 * period
    phrase_len = 4 * bar_len
    bar_t = lambda b: t0 + (b - 1) * bar_len  # 原曲第 b 小节首拍

    y, sr = librosa.load(str(SRC), sr=None, mono=False)
    if y.ndim == 1:
        y = y[None, :]
    # 原曲开头有约 65ms 的编码器静音，从第一个有声采样起播
    lead_trim = int(np.argmax(np.abs(y).max(0) > 1e-3)) / sr

    # ---- 1. 选铺垫句数，让 drop 对齐目标 ----
    intro_len = bar_t(INTRO[1]) - lead_trim
    fixed_pre = (TROUGH[1] - TROUGH[0] + CLIMB[1] - CLIMB[0]) * bar_len
    n_pre = min(range(1, 64), key=lambda n: abs(intro_len + n * phrase_len + fixed_pre - args.drop))
    drop_t = intro_len + n_pre * phrase_len + fixed_pre

    # ---- 2. 选 drop 之后的句数，让尾段放得下 ----
    tail_full = src_dur - bar_t(TAIL_START)
    post_cycle = lambda i: DROP_PHRASES[i] if i < len(DROP_PHRASES) else CLIMAX_PHRASES[(i - len(DROP_PHRASES)) % len(CLIMAX_PHRASES)]
    min_tail = args.min_tail + args.fade_out
    n_post = None
    for c in range(1, 200):
        remaining = args.seconds - (drop_t + c * phrase_len)
        if remaining < min_tail:
            break
        if remaining <= tail_full:
            n_post = c
            break
    if n_post is None:
        sys.exit(f"--seconds {args.seconds} 放不下：drop 在 {drop_t:.2f}s，之后至少需要 1 个乐句加 {min_tail:.1f}s 尾段")
    tail_len = args.seconds - (drop_t + n_post * phrase_len)

    # ---- 3. 拼接清单：(段落名, 原曲起始小节, 小节数) ----
    plan = [("前奏", 1, INTRO[1] - INTRO[0])]
    plan += [("铺垫", PRE_PHRASES[i % len(PRE_PHRASES)], 4) for i in range(n_pre)]
    plan += [("蓄力-低谷", TROUGH[0], TROUGH[1] - TROUGH[0]), ("蓄力-爬升", CLIMB[0], CLIMB[1] - CLIMB[0])]
    for i in range(n_post):
        b = post_cycle(i)
        plan.append(("drop" if b in DROP_PHRASES else "高潮", b, 4))
    plan.append(("尾段", TAIL_START, None))

    total = int(round(args.seconds * sr))
    out = np.zeros((y.shape[0], total), dtype=np.float64)
    half = int(round(args.xfade * sr / 2))
    ramp = np.linspace(0, np.pi / 2, 2 * half)
    fin, fout = np.sin(ramp) ** 2, np.cos(ramp) ** 2  # 增益和恒为 1，同源接缝无损

    segments, beats, kicks, bars, phrases, sections = [], [], [], [], [], []
    pos = 0.0  # 成片中的时间
    seams = []
    for idx, (name, b0, nbars) in enumerate(plan):
        s0 = lead_trim if idx == 0 else bar_t(b0)
        if nbars is None:
            seg_len = tail_len
        elif idx == 0:
            seg_len = bar_t(b0 + nbars) - lead_trim
        else:
            seg_len = nbars * bar_len
        # 源采样区间，两端各多取 half 用于交叉淡化
        o_start, o_end = int(round(pos * sr)), int(round((pos + seg_len) * sr))
        s_start = int(round(s0 * sr))
        lead = half if idx > 0 else 0
        trail = half if idx < len(plan) - 1 else 0
        a, b = s_start - lead, s_start + (o_end - o_start) + trail
        chunk = y[:, max(0, a) : b].astype(np.float64)
        if a < 0:
            chunk = np.pad(chunk, ((0, 0), (-a, 0)))
        if chunk.shape[1] < b - a:
            chunk = np.pad(chunk, ((0, 0), (0, b - a - chunk.shape[1])))
        if lead:
            chunk[:, : 2 * half] *= fin
        if trail:
            chunk[:, -2 * half :] *= fout
        w0 = o_start - lead
        w1 = min(total, w0 + chunk.shape[1])
        out[:, w0:w1] += chunk[:, : w1 - w0]
        if idx > 0:
            seams.append((round(pos, 3), name, b0))

        # 这一段里的拍
        first_beat_idx = int(np.ceil((s0 - t0) / period - 1e-6))
        k = first_beat_idx
        while True:
            st = t0 + k * period
            if st >= s0 + seg_len - 1e-6 or k >= n_beats_src:
                break
            ot = pos + (st - s0)
            beats.append(ot)
            if kick_strength[k] >= args.kick_threshold:
                kicks.append(ot)
            if k % 4 == 0:
                bars.append(ot)
                if k % 16 == 0:
                    phrases.append(ot)
            k += 1
        segments.append({"section": name, "srcBar": b0, "srcStart": round(s0, 3), "start": round(pos, 3), "seconds": round(seg_len, 3)})
        pos += seg_len

    # 合并相邻同名段落
    for s in segments:
        if sections and sections[-1]["name"] == s["section"]:
            sections[-1]["end"] = s["start"] + s["seconds"]
        else:
            sections.append({"name": s["section"], "start": s["start"], "end": s["start"] + s["seconds"]})

    # ---- 4. 淡入淡出 ----
    fi = int(args.fade_in * sr)
    out[:, :fi] *= np.linspace(0, 1, fi)
    fo = int(args.fade_out * sr)
    out[:, -fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))

    peak = np.abs(out).max()
    if peak > 0.999:
        out *= 0.999 / peak

    # ---- 5. 检查：无静音、尾段时长、接缝 ----
    mono = out.mean(0)
    win = int(0.05 * sr)
    check = mono[fi : len(mono) - int(0.25 * sr)]
    frames_rms = np.sqrt((check[: len(check) // win * win].reshape(-1, win) ** 2).mean(1))
    min_db = 20 * np.log10(frames_rms.min() + 1e-12)
    min_at = (fi + int(np.argmin(frames_rms)) * win) / sr
    assert min_db > -50, f"出现静音：{min_at:.2f}s 处 50ms RMS {min_db:.1f} dBFS"
    assert tail_len - args.fade_out >= args.min_tail - 1e-6, "尾段完整播放时间不足"
    assert np.abs(np.diff(beats) - period).max() < 1e-6, "拍点网格不连续"

    OUT_WAV.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(OUT_WAV), out.T.astype(np.float32), sr, subtype="PCM_16")

    fps = args.fps
    fr = lambda t: int(round(t * fps))
    climax_starts = [s["start"] for s in segments if s["section"] == "高潮"]
    beatmap = {
        "fps": fps,
        "durationInFrames": fr(args.seconds),
        "seconds": args.seconds,
        "bpm": ana["bpm"],
        "framesPerBeat": round(period * fps, 4),
        "dropFrame": fr(drop_t),
        "dropSeconds": round(drop_t, 3),
        "beats": [fr(t) for t in beats],
        "kicks": [fr(t) for t in kicks],
        "bars": [fr(t) for t in bars],
        "phrases": [fr(t) for t in phrases],
        "accents": [fr(t) for t in climax_starts],
        "sections": [
            {"name": s["name"], "startFrame": fr(s["start"]), "endFrame": fr(s["end"]), "start": round(s["start"], 3), "end": round(s["end"], 3)}
            for s in sections
        ],
        "segments": segments,
        "source": {"file": str(SRC.relative_to(ROOT)), "leadTrimSeconds": round(lead_trim, 4), "preRollPhrases": n_pre, "postDropPhrases": n_post},
    }
    OUT_MAP.parent.mkdir(parents=True, exist_ok=True)
    OUT_MAP.write_text(json.dumps(beatmap, ensure_ascii=False, indent=1))

    print(f"成片 {args.seconds:.2f}s / {beatmap['durationInFrames']} 帧，采样率 {sr}")
    print(f"铺垫 {n_pre} 句，drop 在 {drop_t:.3f}s（第 {beatmap['dropFrame']} 帧），目标 {args.drop}s，差 {drop_t - args.drop:+.3f}s")
    print(f"drop 后 {n_post} 句；尾段 {tail_len:.2f}s，其中完整播放 {tail_len - args.fade_out:.2f}s，淡出 {args.fade_out}s")
    print(f"拍 {len(beats)}  底鼓 {len(kicks)}  小节 {len(bars)}  乐句 {len(phrases)}  accents {beatmap['accents']}")
    print(f"最小 50ms RMS {min_db:.1f} dBFS（淡入淡出区除外）")
    print("接缝（成片秒, 进入段落, 原曲小节）：", seams)
    for s in beatmap["sections"]:
        print(f"  {s['name']:<6} {s['start']:7.2f}–{s['end']:7.2f}s  帧 {s['startFrame']}–{s['endFrame']}")
    print(f"wrote {OUT_WAV.relative_to(ROOT)}, {OUT_MAP.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
