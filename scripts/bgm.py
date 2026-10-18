"""按乐句拼接 BGM 并导出 30fps 卡点表

用法:
    python3 scripts/bgm.py --seconds 144.1 --drop 17.07

依赖 scripts/analyze_music.py 先跑出的 assets/music/bgm_analysis.json,
以及人工复核的 assets/music/bgm_sections.json.

拼接规则:
    前奏 P01 + 额外铺垫 x k + 铺垫 P02 (带吸气停拍) -> drop1
        k 由 --drop 决定: 让 drop1 尽量落在主线问题出现的那一秒; k = -1 表示去掉前奏
    drop1 -> 高潮二之前 (主段A 低谷 蓄力 主drop 高潮一) 原样保留
    高潮二 取 c 个乐句 (超过 4 个就循环), c 由 --seconds 决定
    尾段 + 收尾 至少完整播 2.5 秒; 需要截短时在末尾淡出
接口都放在小节第一拍上, 30ms 交叉淡化在重拍之前做完, 不切掉重拍的起音.
开头 0.05 秒淡入, 输出前检查全程没有静音.

输出:
    public/audio/bgm.wav
    src/data/beatmap.json   (帧号 30fps)
"""

import argparse
import json
import math
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SRC_AUDIO = ROOT / "assets/music/bgm.mp3"
ANALYSIS = ROOT / "assets/music/bgm_analysis.json"
SECTIONS = ROOT / "assets/music/bgm_sections.json"
OUT_WAV = ROOT / "public/audio/bgm.wav"
OUT_MAP = ROOT / "src/data/beatmap.json"

FPS = 30
XFADE = 0.030
FADE_IN = 0.05
MIN_TAIL = 2.5
TAIL_FADE = 2.0
SILENCE_DB = -60.0

# 源曲的乐句角色 (小节号, 每乐句 4 小节)
INTRO = [0, 1, 2, 3]
BUILD = [4, 5, 6, 7]          # 第 7 小节是吸气停拍, 只在 drop 前出现一次
BUILD_EXTRA = [4, 5, 6, 6]    # 额外的铺垫乐句: 用第 6 小节代替停拍, 避免假 drop
DROP1_BAR = 8
CLIMAX2 = [56, 60, 64, 68]    # 高潮二的 4 个乐句起点
TAIL_BAR = 72                 # 尾段起点, 一直播到曲子结束
HIGH_SECTIONS = {"drop1 主段A", "主drop 高潮一", "高潮二"}


def frame(t):
    return int(round(t * FPS))


def load_meta():
    analysis = json.loads(ANALYSIS.read_text())
    sections = json.loads(SECTIONS.read_text())
    bars = np.array([b["t"] for b in analysis["bars"]])
    return analysis, sections, bars


def bar_section(sections, bar):
    for s in sections["sections"]:
        if s["bars"][0] <= bar <= s["bars"][1]:
            return s["name"]
    return sections["sections"][-1]["name"]


def snap_downbeats(y, sr, bars):
    """把分析出的小节时间 (23ms 精度) 吸附到 ±25ms 内最强的起音上"""
    hop = 128
    env = librosa.onset.onset_strength(y=librosa.to_mono(y), sr=sr, hop_length=hop)
    out = []
    for t in bars:
        a = max(0, librosa.time_to_frames(t - 0.025, sr=sr, hop_length=hop))
        b = librosa.time_to_frames(t + 0.025, sr=sr, hop_length=hop) + 1
        seg = env[a:b]
        if len(seg) and seg.max() > np.percentile(env, 75):
            out.append(float(librosa.frames_to_time(a + int(np.argmax(seg)), sr=sr, hop_length=hop)))
        else:
            out.append(float(t))
    return np.array(out)


def plan(args, bars, duration, lead_trim):
    """返回小节序列 (源小节号列表) 和尾段长度"""
    bar_len = float(np.median(np.diff(bars)))
    phrase = 4 * bar_len

    # 铺垫乐句数: drop1 = 前面所有小节的时长
    best = None
    for k in range(-1, 8):
        seq = ([] if k < 0 else INTRO) + BUILD_EXTRA * max(k, 0) + BUILD
        # 带前奏时 从源曲有声处到第一拍的那一小截也在成片里
        t_drop = sum(bars[b + 1] - bars[b] for b in seq) + (bars[0] - lead_trim if k >= 0 else 0.0)
        err = abs(t_drop - args.drop)
        if best is None or err < best[0] - 1e-6:
            best = (err, k, seq, t_drop)
    _, k, pre, t_drop = best

    body = list(range(DROP1_BAR, CLIMAX2[0]))
    tail_full = duration - bars[TAIL_BAR]
    t_body_end = t_drop + sum(bars[b + 1] - bars[b] for b in body)

    # 高潮二乐句数: 让尾段尽量完整, 不够就循环
    need = args.seconds - t_body_end - tail_full
    # 差不到 0.1 个乐句 (约 0.85 秒) 就少拼一个, 成片按曲子自然收尾, 比目标略短
    c = max(1, math.ceil(need / phrase - 0.1))
    chosen = [CLIMAX2[(len(CLIMAX2) - c + i) % len(CLIMAX2)] for i in range(c)] if c <= 4 \
        else [CLIMAX2[i % len(CLIMAX2)] for i in range(c)]
    climax = [b for p in chosen for b in range(p, p + 4)]
    t_tail = t_body_end + sum(bars[b + 1] - bars[b] for b in climax)
    tail_len = args.seconds - t_tail
    if tail_len < MIN_TAIL + 0.5:
        sys.exit(f"--seconds {args.seconds} 太短: 放不下 drop {t_drop:.2f}s 之后的主体 + {MIN_TAIL}s 尾段")
    tail_len = min(tail_len, tail_full)
    return k, pre, body, climax, t_drop, tail_len, tail_full


def build_runs(seq):
    """把连续的源小节合并成一段一段, 返回 [(第一个小节, 小节数)]"""
    runs = []
    for b in seq:
        if runs and runs[-1][0] + runs[-1][1] == b:
            runs[-1][1] += 1
        else:
            runs.append([b, 1])
    return runs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True, help="成片总时长")
    ap.add_argument("--drop", type=float, required=True, help="drop1 (主线问题) 落在第几秒")
    args = ap.parse_args()

    analysis, sections, bars_nom = load_meta()
    y, sr = librosa.load(SRC_AUDIO, sr=None, mono=False)
    y = np.atleast_2d(y)
    duration = y.shape[1] / sr
    bars = snap_downbeats(y, sr, bars_nom)
    bars_ext = np.append(bars, duration)

    # 源曲开头约 0.06 秒是编码器留下的数字静音: 从第一次出声前 5ms 开始
    env_ms = np.sqrt(np.mean(librosa.to_mono(y)[: int(sr * 0.5)].reshape(-1, sr // 1000) ** 2, axis=1))
    lead_trim = max(0.0, (int(np.argmax(20 * np.log10(env_ms + 1e-12) > SILENCE_DB)) - 5) / 1000)

    k, pre, body, climax, t_drop, tail_len, tail_full = plan(args, bars_ext, duration, lead_trim)
    seq = pre + body + climax + list(range(TAIL_BAR, len(bars)))
    runs = build_runs(seq)

    # ---------- 拼接音频 ----------
    xf = int(round(XFADE * sr))
    out = np.zeros((y.shape[0], 0), dtype=np.float32)
    segments = []      # (源起点秒, 源终点秒, 成片起点秒)
    for i, (b0, n) in enumerate(runs):
        s0 = lead_trim if (i == 0 and b0 == 0) else bars_ext[b0]
        s1 = bars_ext[b0 + n]
        if i == len(runs) - 1:
            s1 = min(duration, bars_ext[TAIL_BAR] + tail_len)
        a, b = int(round(s0 * sr)), int(round(s1 * sr))
        piece = y[:, a:b].astype(np.float32)
        o0 = out.shape[1] / sr
        if out.shape[1] == 0:
            out = piece
        else:
            # 交叉淡化放在重拍之前: 上一段最后 30ms 与本段起点之前的 30ms 混合
            pre_roll = y[:, max(0, a - xf):a].astype(np.float32)
            m = pre_roll.shape[1]
            w = np.linspace(0, 1, m, dtype=np.float32)
            fade_out, fade_in = 1 - w, w   # 线性: 两边常是同一律动 等功率会鼓起 3dB
            out[:, -m:] = out[:, -m:] * fade_out + pre_roll * fade_in
            out = np.concatenate([out, piece], axis=1)
        segments.append((s0, s1, o0, b0, n))

    # 淡入淡出
    fi = int(round(FADE_IN * sr))
    out[:, :fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    truncated = tail_len < tail_full - 0.3
    if truncated:
        fo = int(round(min(TAIL_FADE, tail_len - MIN_TAIL) * sr))
    else:
        fo = int(round(0.02 * sr))
    out[:, -fo:] *= np.cos(np.linspace(0, np.pi / 2, fo, dtype=np.float32))

    total = out.shape[1] / sr

    # 静音检查: 50ms 窗 RMS, 末尾淡出区以外不得低于 -60 dBFS
    win = int(0.05 * sr)
    mono = out.mean(axis=0)
    usable = len(mono) - fo
    rms = np.array([np.sqrt(np.mean(mono[i:i + win] ** 2) + 1e-12) for i in range(0, usable - win, win)])
    db = 20 * np.log10(rms)
    if db.min() < SILENCE_DB:
        t_bad = int(np.argmin(db)) * 0.05
        sys.exit(f"检测到静音: {t_bad:.2f}s 处 {db.min():.1f} dBFS")

    peak = float(np.abs(out).max())
    if peak > 0.999:
        out *= 0.999 / peak

    OUT_WAV.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT_WAV, out.T, sr, subtype="PCM_16")

    # ---------- 卡点表 ----------
    def map_times(times):
        res = []
        for s0, s1, o0, _, _ in segments:
            for t in times:
                if s0 - 1e-3 <= t < s1 - 1e-3:
                    res.append(o0 + (t - s0))
        return sorted(res)

    beats = map_times([b["t"] for b in analysis["beats"]])
    kicks = map_times([k["t"] for k in analysis["kicks"]])
    hits_src = [a for a in analysis["accents"]]

    bar_rows = []
    for s0, s1, o0, b0, n in segments:
        for j in range(n):
            src_bar = b0 + j
            t = o0 + (bars_ext[src_bar] - s0)
            if t >= total - 0.05:
                break
            bar_rows.append({"frame": frame(t), "t": round(t, 3), "srcBar": src_bar,
                             "section": bar_section(sections, src_bar)})
    for i, r in enumerate(bar_rows):
        r["index"] = i
        r["inPhrase"] = r["srcBar"] % 4 + 1
    phrases = [r for r in bar_rows if r["inPhrase"] == 1]
    phrases = [{"index": i, "frame": r["frame"], "t": r["t"], "section": r["section"], "bar": r["index"]}
               for i, r in enumerate(phrases)]

    sec_rows = []
    for r in bar_rows:
        if sec_rows and sec_rows[-1]["name"] == r["section"]:
            continue
        sec_rows.append({"name": r["section"], "startFrame": r["frame"], "t": r["t"]})
    for i, s in enumerate(sec_rows):
        end = sec_rows[i + 1]["startFrame"] if i + 1 < len(sec_rows) else frame(total)
        s["endFrame"] = end
        s["seconds"] = round((end - s["startFrame"]) / FPS, 2)

    accents = [{"frame": p["frame"], "t": p["t"], "section": p["section"]}
               for p in phrases if p["section"] in HIGH_SECTIONS]
    hits = []
    for h in hits_src:
        for s0, s1, o0, _, _ in segments:
            if s0 - 1e-3 <= h["t"] < s1 - 1e-3:
                t = o0 + (h["t"] - s0)
                hits.append({"frame": frame(t), "t": round(t, 3), "strength": h["strength"]})

    drop_t = next(r["t"] for r in bar_rows if r["srcBar"] == DROP1_BAR)
    main_drop_t = next(r["t"] for r in bar_rows if r["srcBar"] == 40)

    beatmap = {
        "fps": FPS,
        "durationFrames": frame(total),
        "durationSec": round(total, 3),
        "bpm": analysis["bpm_librosa"],
        "framesPerBeat": round(FPS * analysis["beat_period"], 3),
        "dropFrame": frame(drop_t),
        "mainDropFrame": frame(main_drop_t),
        "beats": [frame(t) for t in beats],
        "kicks": [frame(t) for t in kicks],
        "bars": [r["frame"] for r in bar_rows],
        "phrases": [p["frame"] for p in phrases],
        "accents": [a["frame"] for a in accents],
        "hits": hits,
        "sections": [{k2: s[k2] for k2 in ("name", "startFrame", "endFrame", "seconds")} for s in sec_rows],
        "barsDetail": bar_rows,
        "joins": [{"frame": frame(o0), "t": round(o0, 3), "srcBar": b0} for _, _, o0, b0, _ in segments[1:]],
        "source": {"file": str(SRC_AUDIO.relative_to(ROOT)), "args": vars(args),
                   "extraBuildPhrases": k, "climax2Phrases": len(climax) // 4,
                   "tailSec": round(float(tail_len), 3), "tailTruncated": bool(truncated),
                   "leadTrimSec": round(lead_trim, 3)},
    }
    OUT_MAP.parent.mkdir(parents=True, exist_ok=True)
    OUT_MAP.write_text(json.dumps(beatmap, ensure_ascii=False, indent=1))

    print(f"total {total:.3f}s ({frame(total)}f)  drop1 {drop_t:.3f}s f{frame(drop_t)} (target {args.drop})  "
          f"main drop {main_drop_t:.3f}s f{frame(main_drop_t)}")
    if abs(total - args.seconds) > 0.05:
        print(f"note: 成片 {total:.2f}s 与目标 {args.seconds}s 相差 {total - args.seconds:+.2f}s (尾段按自然结尾)")
    print(f"extra build phrases {k}  climax2 phrases {len(climax) // 4}  tail {tail_len:.2f}s "
          f"(full {tail_full:.2f}, truncated {truncated})")
    print(f"joins: " + ", ".join(f"{o0:.3f}s<-src bar {b0}" for _, _, o0, b0, _ in segments[1:]))
    print(f"min window level {db.min():.1f} dBFS  peak {peak:.3f}")
    print(f"beats {len(beats)}  kicks {len(kicks)}  bars {len(bar_rows)}  phrases {len(phrases)}  accents {len(accents)}")
    for s in sec_rows:
        print(f"  {s['startFrame']:5d}-{s['endFrame']:5d}  {s['startFrame'] / FPS:7.2f}s  {s['seconds']:6.2f}s  {s['name']}")


if __name__ == "__main__":
    main()
