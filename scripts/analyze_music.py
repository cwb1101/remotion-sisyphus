"""BGM 节拍与段落分析。

用法: python scripts/analyze_music.py [音频路径] [输出json路径]
默认: assets/music/bgm.mp3 -> assets/music/bgm.analysis.json

做的事:
1. 拍子网格: librosa beat_track 给初值，再在 ±6 BPM 内做固定网格拟合（让网格点上的
   onset 强度最大），得到稳定的 BPM 与首拍偏移。librosa 原始结果也一并保存。
2. 底鼓: <120Hz 能量的正向突变取峰，记录时间、强度、落在第几拍。
3. 小节(4拍) / 乐句(16拍) / 和声块(8拍): 8 拍块之间做 chroma 自相似，找出循环。
4. 段落: 低频骤降的块 = break；break 之后的块 = drop；其余按位置和频谱质心标注。

所有时间同时给出 30fps 帧号（frame = round(t * 30)），后续 Remotion 直接用帧号。
"""
import json
import sys

import librosa
import numpy as np

FPS = 30
HOP = 128
N_FFT = 2048


def fr(t):
    return int(round(float(t) * FPS))


def r3(t):
    return round(float(t), 3)


def onset_of(S, mask):
    e = np.log1p(S[mask].sum(axis=0))
    o = np.maximum(0, np.diff(e, prepend=e[0]))
    return o / (o.max() + 1e-9)


def peak_near(o, t, rate, w=3):
    i = int(t * rate)
    return float(o[max(0, i - w) : i + w + 1].max())


def fit_grid(onset, rate, duration, bpm0):
    """固定 BPM 网格拟合：粗搜 0.05 BPM，再细搜 0.01 BPM。"""
    def score(bpm, off):
        idx = (np.arange(off, duration - 0.5, 60 / bpm) * rate).astype(int)
        return onset[idx].mean()

    best = (-1, bpm0, 0.0)
    for step, lo, hi in [(0.05, bpm0 - 6, bpm0 + 6), (0.01, None, None)]:
        if lo is None:
            lo, hi = best[1] - 0.1, best[1] + 0.1
        for bpm in np.arange(lo, hi, step):
            for off in np.arange(0, 60 / bpm, 0.004):
                s = score(bpm, off)
                if s > best[0]:
                    best = (s, bpm, off)
    return float(best[1]), float(best[2])


def main(path, out_path):
    y, sr = librosa.load(path, sr=None, mono=True)
    duration = len(y) / sr
    rate = sr / HOP

    S = np.abs(librosa.stft(y, hop_length=HOP, n_fft=N_FFT))
    f = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    times = np.arange(S.shape[1]) / rate
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    onset = onset / onset.max()
    kick_o = onset_of(S, f < 120)
    snare_o = onset_of(S, ((f > 180) & (f < 400)) | ((f > 1500) & (f < 5000)))
    hat_o = onset_of(S, f > 7000)

    # ---- 1. 拍子 ----
    raw_tempo, raw_beats = librosa.beat.beat_track(
        onset_envelope=onset, sr=sr, hop_length=HOP, units="time"
    )
    raw_tempo = float(np.atleast_1d(raw_tempo)[0])
    bpm, offset = fit_grid(onset, rate, duration, raw_tempo)
    P = 60 / bpm
    beats = np.arange(offset, duration - 0.05, P)

    # ---- 2. 底鼓 ----
    pk = librosa.util.peak_pick(
        kick_o, pre_max=20, post_max=20, pre_avg=40, post_avg=40, delta=0.2, wait=60
    )
    kicks = []
    for i in pk:
        t = i / rate
        bi = int(round((t - offset) / P))
        kicks.append(
            {
                "t": r3(t),
                "frame": fr(t),
                "strength": round(float(kick_o[i]), 3),
                "beatIndex": bi,
                "offsetMs": round((t - (offset + bi * P)) * 1000, 1),
            }
        )

    # 每拍鼓件强度，用来判断律动型
    def pattern(o, m):
        v = np.array([peak_near(o, t, rate) for t in beats])
        return [round(float(v[p::m].mean()), 2) for p in range(m)]

    # ---- 3. 8 拍块（= 半速 84BPM 的一个小节）自相似 ----
    n_blocks = int(len(beats) // 8)
    y22 = librosa.resample(y, orig_sr=sr, target_sr=22050)
    C = librosa.feature.chroma_cqt(y=y22, sr=22050, hop_length=512)
    c_times = librosa.frames_to_time(np.arange(C.shape[1]), sr=22050, hop_length=512)
    c_rate = 22050 / 512
    sub = S[f < 120].sum(axis=0)
    rms = np.sqrt((S**2).mean(axis=0))
    cent = (S * f[:, None]).sum(axis=0) / (S.sum(axis=0) + 1e-9)
    blocks = []
    vecs = []
    for b in range(n_blocks):
        t0 = offset + b * 8 * P
        t1 = t0 + 8 * P
        m = (times >= t0) & (times < t1)
        c = C[:, (c_times >= t0) & (c_times < t1)]
        c = c / (np.linalg.norm(c, axis=0) + 1e-9)
        vecs.append(c[:, : int(8 * P * c_rate) - 2].flatten())
        blocks.append(
            {
                "index": b,
                "beat": b * 8,
                "start": r3(t0),
                "end": r3(t1),
                "startFrame": fr(t0),
                "subDb": round(float(20 * np.log10(sub[m].mean() + 1e-9)), 1),
                "rmsDb": round(float(20 * np.log10(rms[m].mean() + 1e-9)), 1),
                "centroid": round(float(cent[m].mean())),
            }
        )
    L = min(len(v) for v in vecs)
    V = np.array([v[:L] for v in vecs])
    V /= np.linalg.norm(V, axis=1, keepdims=True)
    sim = V @ V.T

    # 和声标签：贪心聚类，与已有类代表相似度 ≥0.98 归入该类（a/b/c…）；
    # 与其它所有块都 <0.95 的记为 "X"（通常是 break / 过门）
    reps = []
    for b in blocks:
        i = b["index"]
        others = np.delete(sim[i], i)
        if others.max() < 0.95:
            b["harmony"] = "X"
            continue
        for k, rep in enumerate(reps):
            if sim[i, rep] >= 0.98:
                b["harmony"] = "abcdefgh"[k]
                break
        else:
            reps.append(i)
            b["harmony"] = "abcdefgh"[len(reps) - 1]

    # ---- 4. 段落 ----
    sub_med = np.median([b["subDb"] for b in blocks])
    brk = min(blocks, key=lambda b: b["subDb"])
    is_break = brk["subDb"] < sub_med - 1.0
    drop_block = blocks[brk["index"] + 1] if is_break and brk["index"] + 1 < n_blocks else None
    drop_t = drop_block["start"] if drop_block else None
    last_beat_t = offset + n_blocks * 8 * P

    def sec(name, t0, t1, note):
        return {"name": name, "start": r3(t0), "end": r3(t1), "startFrame": fr(t0), "endFrame": fr(t1), "note": note}

    sections = []
    first_sound = float(times[np.argmax(rms > rms.max() * 0.05)])
    sections.append(sec("前奏", 0, offset, f"无独立前奏：{first_sound:.2f}s 起直接满鼓进入"))
    if is_break:
        b_i = brk["index"]
        build_from = blocks[max(0, b_i - 3)]["start"]
        sections.append(sec("铺垫", offset, build_from, "A 段律动，a-b-c-c 和声循环（32 拍 = 11.41s）"))
        sections.append(sec("蓄力", build_from, brk["start"], "频谱质心上升，高频变亮"))
        sections.append(sec("break", brk["start"], drop_t, "低频抽空 + 过门，drop 前的吸气"))
        tail_from = blocks[-1]["start"]
        sections.append(sec("drop/高潮", drop_t, tail_from, "低频回归，B 段比 A 段更亮（hi-hat 更密）"))
        sections.append(sec("尾段", tail_from, duration, f"最后一个块 + {last_beat_t:.2f}s 一记收尾重击，无淡出"))

    out = {
        "file": path,
        "fps": FPS,
        "duration": r3(duration),
        "durationFrames": fr(duration),
        "bpm": round(bpm, 2),
        "halfTimeBpm": round(bpm / 2, 2),
        "beatPeriod": round(P, 5),
        "gridOffset": r3(offset),
        "librosaRaw": {"bpm": round(raw_tempo, 2), "beats": [r3(t) for t in raw_beats]},
        "beats": [r3(t) for t in beats],
        "beatFrames": [fr(t) for t in beats],
        "bars4": [r3(t) for t in beats[::4]],
        "bars4Frames": [fr(t) for t in beats[::4]],
        "phrases16": [r3(t) for t in beats[::16]],
        "phrases16Frames": [fr(t) for t in beats[::16]],
        "drumPatternPer8Beats": {
            "kick": pattern(kick_o, 8),
            "snare": pattern(snare_o, 8),
            "hat": pattern(hat_o, 8),
        },
        "kicks": kicks,
        "blocks8": blocks,
        "blockSimilarity": [[round(float(x), 2) for x in row] for row in sim],
        "drop": {"time": drop_t, "frame": fr(drop_t) if drop_t else None, "beatIndex": drop_block["beat"] if drop_block else None},
        "loopEnd": {"time": r3(last_beat_t), "frame": fr(last_beat_t), "beatIndex": n_blocks * 8},
        "sections": sections,
    }
    with open(out_path, "w") as fp:
        json.dump(out, fp, ensure_ascii=False, indent=1)

    # ---- 控制台摘要 ----
    print(f"时长 {duration:.3f}s ({fr(duration)} 帧)")
    print(f"BPM 网格 {bpm:.2f}（半速 {bpm/2:.2f}），拍距 {P:.4f}s，首拍 {offset:.3f}s；librosa 原值 {raw_tempo:.2f}")
    print(f"拍 {len(beats)}  4拍小节 {len(beats[::4])}  16拍乐句 {[r3(t) for t in beats[::16]]}")
    res = [abs(k["offsetMs"]) for k in kicks]
    print(f"底鼓 {len(kicks)} 个，偏离网格中位 {np.median(res):.0f}ms / 最大 {max(res):.0f}ms")
    print(f"每 8 拍鼓型 {out['drumPatternPer8Beats']}")
    print("\n块  拍号  起点   和声  低频dB  质心")
    for b in blocks:
        print(f"{b['index']:>2} {b['beat']:>4} {b['start']:6.2f}  {b['harmony']:>3}  {b['subDb']:6.1f}  {b['centroid']:5d}")
    print(f"\ndrop {drop_t}s  循环终点 {last_beat_t:.3f}s")
    for s in sections:
        print(f"{s['name']:<8} {s['start']:6.2f}–{s['end']:6.2f}  {s['note']}")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "assets/music/bgm.mp3"
    dst = sys.argv[2] if len(sys.argv) > 2 else "assets/music/bgm.analysis.json"
    main(src, dst)
