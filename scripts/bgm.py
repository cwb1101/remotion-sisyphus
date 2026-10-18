"""按乐句重编 BGM，并导出 30fps 卡点表。

用法:
  python scripts/bgm.py --seconds 147.4 --drop 23

输入: assets/music/bgm.mp3 + assets/music/bgm.analysis.json（由 analyze_music.py 生成）
输出: public/audio/bgm.wav, src/data/beatmap.json

原曲结构（16 拍一乐句，P = 乐句编号，和声块 a/b/c 见 analysis）:
  lead 0–0.18s（首拍前的起音）
  P0 ab  P1 cc  P2 ab  P3 c+break   ← 铺垫/蓄力（A 段）
  P4 ab  P5 cc  P6 ab               ← 高潮（B 段，drop = P4 起点）
  P7 c（8 拍）+ 42.98s 收尾重击 → 曲末   ← 尾段

拼接规则:
  - 只在乐句边界拼接，保持 ab / cc 交替，和声不断
  - drop 前: 选铺垫乐句数，使 drop 离 --drop 最近；结尾固定是 P2 P3（蓄力 + break）
  - drop 后: 高潮乐句 P4 P5 P6 P5 P4 P5 P6 … 循环，选数量让总长最接近 --seconds
  - 尾段 P7 + 收尾重击完整播出（≥2.5s）后才开始淡出
  - 每个接口切在后一段的底鼓起音前 8ms，30ms 线性交叉淡化（两侧是同一律动、高度相关，等功率会叠出削波），鼓头不被削
  - 开头 0.05s 淡入；导出后逐 50ms 检查，不允许出现静音
"""
import argparse
import json
import os

import librosa
import numpy as np
import soundfile as sf

FPS = 30
XFADE = 0.030
PRE_KICK = 0.008
FADE_IN = 0.05
ANALYSIS = "assets/music/bgm.analysis.json"


def fr(t):
    return int(round(t * FPS))


def load_grid(src):
    if not os.path.exists(ANALYSIS):
        raise SystemExit(f"缺少 {ANALYSIS}，先运行 python scripts/analyze_music.py {src}")
    a = json.load(open(ANALYSIS))
    P = a["beatPeriod"]
    off = a["gridOffset"]
    kicks = [(k["t"], k["strength"]) for k in a["kicks"]]
    return a, P, off, kicks


def nearest_kick(kicks, t, tol=0.06):
    best = min(kicks, key=lambda k: abs(k[0] - t))
    return best[0] if abs(best[0] - t) <= tol else None


def first_sound(y, sr, floor_db=-50, win=0.005):
    """原曲开头有一小段静音，从第一个可听到的样本前 5ms 起播。"""
    n = int(win * sr)
    for i in range(0, y.shape[1] - n, n):
        if 20 * np.log10(np.sqrt((y[:, i : i + n] ** 2).mean()) + 1e-12) > floor_db:
            return max(0.0, i / sr - win)
    return 0.0


def build_plan(P, off, src_dur, seconds, drop, start, fade):
    ph = 16 * P

    def phrase(i):
        return {"name": f"P{i}", "g0": off + i * ph, "g1": off + (i + 1) * ph}

    # ---- drop 前 ----
    # 乐句数 n ≥ 2，结尾 P2 P3；往前交替补 cc(P1) / ab(P0)。以 P0 开头时带上 0–0.18s 起音。
    best = None
    for n in range(2, 13):
        seq = [2, 3]
        while len(seq) < n:
            seq.insert(0, 1 if seq[0] in (0, 2) else 0)
        lead = off - start if seq[0] == 0 else 0.0
        t_drop = lead + n * ph
        if best is None or abs(t_drop - drop) < abs(best[1] - drop):
            best = (seq, t_drop, lead)
    pre, t_drop, lead = best

    # ---- drop 后 ----
    tail_len_full = src_dur - (off + 120 * P) + 8 * P  # P7(8 拍) + 收尾重击到曲末
    # 尾段最短 = 收尾重击（P7 之后 8 拍）+ 0.9s 余响，且 ≥ 2.5s 完整播放 + 淡出
    min_tail = max(2.5 + fade, 8 * P + 0.9)
    cyc = [4, 5, 6, 5]
    best = None
    for m in range(1, 60):
        t_tail = t_drop + m * ph
        lo, hi = t_tail + min_tail, t_tail + tail_len_full
        end = min(max(seconds, lo), hi)
        if best is None or abs(end - seconds) < abs(best[2] - seconds):
            best = (m, t_tail, end)
    m, t_tail, t_end = best
    post = [cyc[i % 4] for i in range(m)]

    pieces = []
    for k, i in enumerate(pre):
        p = phrase(i)
        if k == 0 and lead > 0:
            p["g0"], p["name"] = start, "lead+P0"
        p["role"] = "pre"
        pieces.append(p)
    for i in post:
        p = phrase(i)
        p["role"] = "climax"
        pieces.append(p)
    pieces.append({"name": "P7+hit", "g0": off + 112 * P, "g1": src_dur, "role": "tail"})

    t = 0.0
    for p in pieces:
        p["film0"] = t
        t += p["g1"] - p["g0"]
    return pieces, t_drop, t_tail, t_end


def render(y, sr, pieces, kicks, t_end, fade_out):
    n_out = int(round(t_end * sr))
    out = np.zeros((y.shape[0], n_out), dtype=np.float32)
    xf = int(XFADE * sr)
    joins = []
    # 每个接口的实际切点: 后一段起点附近的底鼓起音前 8ms（没有底鼓就用网格点）
    cuts = [0.0]
    for p in pieces[1:]:
        k = nearest_kick(kicks, p["g0"])
        d = (k - p["g0"] - PRE_KICK) if k is not None else 0.0
        cuts.append(d)
    for idx, p in enumerate(pieces):
        d0 = cuts[idx]
        d1 = cuts[idx + 1] if idx + 1 < len(pieces) else None
        s0 = p["g0"] + d0 - (XFADE if idx > 0 else 0)
        s1 = (p["g1"] + d1) if d1 is not None else p["g1"]
        f0 = p["film0"] + d0 - (XFADE if idx > 0 else 0)
        a, b = int(round(s0 * sr)), int(round(s1 * sr))
        seg = y[:, max(0, a) : b].copy()
        o = int(round(f0 * sr))
        if idx > 0:
            ramp = np.linspace(0, 1, xf)
            seg[:, :xf] *= ramp
            out[:, o : o + xf] *= (1 - ramp)[: out[:, o : o + xf].shape[1]]
            joins.append(round(p["film0"] + d0, 4))
        e = min(n_out, o + seg.shape[1])
        out[:, o:e] += seg[:, : e - o]
        if e >= n_out:
            break
    fi = int(FADE_IN * sr)
    out[:, :fi] *= np.linspace(0, 1, fi)
    fo = int(fade_out * sr)
    if fo > 0:
        out[:, -fo:] *= np.linspace(1, 0, fo) ** 2
    return out, joins


def check_no_silence(out, sr, fade_out, win=0.05, floor_db=-50):
    n = int(win * sr)
    usable = out.shape[1] - int(fade_out * sr)
    bad = []
    for i in range(int(FADE_IN * sr), usable - n, n):
        rms = np.sqrt((out[:, i : i + n] ** 2).mean())
        if 20 * np.log10(rms + 1e-12) < floor_db:
            bad.append(round(i / sr, 2))
    return bad


def map_src_to_film(pieces, t_src, tol=1e-6):
    """一个原曲时刻可能被多个片段用到，返回所有片中时刻。"""
    res = []
    for p in pieces:
        if p["g0"] - tol <= t_src < p["g1"] - tol:
            res.append(p["film0"] + (t_src - p["g0"]))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True, help="目标总时长（秒）")
    ap.add_argument("--drop", type=float, required=True, help="drop 希望落在第几秒")
    ap.add_argument("--src", default="assets/music/bgm.mp3")
    ap.add_argument("--wav", default="public/audio/bgm.wav")
    ap.add_argument("--map", default="src/data/beatmap.json")
    ap.add_argument("--fade", type=float, default=0.6, help="结尾淡出时长（秒）")
    args = ap.parse_args()

    a, P, off, kicks = load_grid(args.src)
    y, sr = librosa.load(args.src, sr=None, mono=False)
    if y.ndim == 1:
        y = y[None, :]
    src_dur = y.shape[1] / sr

    start = first_sound(y, sr)
    pieces, t_drop, t_tail, t_end = build_plan(P, off, src_dur, args.seconds, args.drop, start, args.fade)
    fade_out = min(args.fade, t_end - (t_tail + 2.5))
    out, joins = render(y, sr, pieces, kicks, t_end, fade_out)
    silent = check_no_silence(out, sr, fade_out)
    if silent:
        raise SystemExit(f"检测到静音: {silent[:10]}")

    os.makedirs(os.path.dirname(args.wav), exist_ok=True)
    sf.write(args.wav, out.T, sr, subtype="PCM_16")

    # ---- 卡点表（片中时间，30fps 帧号）----
    beats, kick_frames = [], []
    for p in pieces:
        k0 = int(np.ceil((p["g0"] - off) / P - 1e-6))
        k1 = int(np.floor((p["g1"] - off) / P - 1e-6))
        for k in range(max(0, k0), k1 + 1):
            ts = off + k * P
            if p["g0"] - 1e-6 <= ts < p["g1"] - 1e-6:
                tf = p["film0"] + ts - p["g0"]
                if tf < t_end:
                    beats.append(tf)
        for kt, ks in kicks:
            if p["g0"] - 0.02 <= kt < p["g1"] - 0.02:
                tf = p["film0"] + kt - p["g0"]
                if tf < t_end:
                    kick_frames.append({"frame": fr(tf), "strength": ks})
    beats = sorted(set(round(b, 4) for b in beats))
    beat_frames = [fr(b) for b in beats]
    bars = beat_frames[::4]
    phrases = beat_frames[::16]
    accents = [f for f in phrases if fr(t_drop) <= f < fr(t_tail)]

    drop_kick = nearest_kick(kicks, off + 64 * P)
    drop_frame = fr(t_drop + ((drop_kick - (off + 64 * P)) if drop_kick else 0))
    hit_t = t_tail + 8 * P

    pre_pieces = [p for p in pieces if p["role"] == "pre"]
    build_t = pre_pieces[-2]["film0"] if len(pre_pieces) >= 2 else 0.0
    break_t = pre_pieces[-1]["film0"] + 8 * P
    sections = []
    if pre_pieces[0]["name"].startswith("lead"):
        sections.append(("前奏", 0.0, off - pre_pieces[0]["g0"], "首拍前起音，0.05s 淡入"))
    sections += [
        ("铺垫", sections[-1][2] if sections else 0.0, build_t, "A 段律动"),
        ("蓄力", build_t, break_t, "质心上升，高频变亮"),
        ("break", break_t, t_drop, "低频抽空，drop 前的吸气"),
        ("高潮", t_drop, t_tail, "B 段循环，accents = 每个乐句起点"),
        ("尾段", t_tail, t_end, f"收尾重击 {hit_t:.2f}s，之后淡出 {fade_out:.2f}s"),
    ]

    beatmap = {
        "fps": FPS,
        "durationInFrames": fr(t_end),
        "durationSeconds": round(t_end, 3),
        "bpm": a["bpm"],
        "beatFrames": round(P * FPS, 4),
        "dropFrame": drop_frame,
        "finalHitFrame": fr(hit_t),
        "fadeOutStartFrame": fr(t_end - fade_out),
        "beats": beat_frames,
        "kicks": [k["frame"] for k in kick_frames],
        "kickStrength": [k["strength"] for k in kick_frames],
        "bars": bars,
        "phrases": phrases,
        "accents": accents,
        "sections": [
            {"name": n, "startFrame": fr(s), "endFrame": fr(e), "note": note} for n, s, e, note in sections
        ],
        "edit": [
            {"piece": p["name"], "role": p["role"], "srcStart": round(p["g0"], 3), "srcEnd": round(p["g1"], 3), "startFrame": fr(p["film0"])}
            for p in pieces
        ],
        "joinFrames": [fr(j) for j in joins],
    }
    os.makedirs(os.path.dirname(args.map), exist_ok=True)
    with open(args.map, "w") as fp:
        json.dump(beatmap, fp, ensure_ascii=False, indent=1)

    print(f"总长 {t_end:.3f}s（目标 {args.seconds}s）= {fr(t_end)} 帧")
    print(f"drop {t_drop:.3f}s（目标 {args.drop}s）→ 帧 {drop_frame}")
    print(f"尾段 {t_tail:.3f}s，收尾重击 {hit_t:.3f}s，淡出 {fade_out:.2f}s")
    print("拼接: " + " ".join(p["name"] for p in pieces))
    print(f"接口 {len(joins)} 个，accents {len(accents)} 个，bars {len(bars)} 个，无静音")
    for n, s, e, note in sections:
        print(f"  {n:<6} {s:7.2f}–{e:7.2f}  帧 {fr(s):>4}–{fr(e):>4}  {note}")


if __name__ == "__main__":
    main()
