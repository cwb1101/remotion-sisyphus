"""BGM 分析：BPM、拍、底鼓重拍、小节、乐句、段落、剪辑方案。

用法：python3 scripts/analyze_music.py [assets/music/bgm.mp3]
输出：assets/music/beats.json（后续 Remotion 代码直接读取）和终端摘要。

做法：
1. librosa.beat 先粗测拍点，再对拍序号做线性拟合得到恒定节拍网格
   （这首曲子全程恒速，网格比逐拍检测更稳，逐拍检测有 ±1 帧的量化抖动）。
2. 用细 hop 的 onset 曲线把网格整体对齐到真实起音（求相位偏移）。
3. 底鼓：HPSS 取打击成分，30–130Hz 频带起音强度，逐拍取值。
4. 小节首拍：4 种相位里底鼓强度均值最大的那个。乐句 = 16 拍。
5. 段落：每小节 RMS / 频谱质心 / 低频，结合 MFCC+chroma 小节相似度人工归纳成段。
"""
import json
import sys
from pathlib import Path

import librosa
import numpy as np

SR = 22050
HOP = 512
FPS = 30


def main(path: str) -> None:
    y, sr = librosa.load(path, sr=SR, mono=True)
    duration = len(y) / sr

    # --- 1. 粗测拍点 + 线性拟合网格 ---
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    tempo_raw, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=HOP)
    raw = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP)
    idx = np.arange(len(raw))
    core = (raw > 17) & (raw < 165)  # 前奏/尾段逐拍检测漂移较大，用中段拟合
    period, t0 = np.polyfit(idx[core], raw[core], 1)

    # --- 2. 用细 hop onset 校正相位 ---
    fine_hop = 128
    o = librosa.onset.onset_strength(y=y, sr=sr, hop_length=fine_hop)
    ot = librosa.frames_to_time(np.arange(len(o)), sr=sr, hop_length=fine_hop)
    n_all = np.arange(int((duration - t0) / period) + 1)
    offs = np.arange(-0.1, 0.1, 0.002)
    scores = []
    for off in offs:
        g = t0 + off + n_all * period
        k = np.searchsorted(ot, g)
        scores.append(o[k[k < len(o)]].mean())
    t0 += offs[int(np.argmax(scores))]
    while t0 - period > 0:
        t0 -= period
    beats = t0 + np.arange(int((duration - t0) / period) + 1) * period
    bpm = 60.0 / period

    # --- 3. 底鼓强度（逐拍）---
    _, yp = librosa.effects.hpss(y)
    Sp = np.abs(librosa.stft(yp, n_fft=2048, hop_length=HOP))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    band = lambda lo, hi: librosa.onset.onset_strength(
        S=librosa.amplitude_to_db(Sp[(freqs > lo) & (freqs < hi)] + 1e-6), sr=sr, hop_length=HOP
    )
    kick_env, snare_env = band(30, 130), band(1500, 5000)
    bf = librosa.time_to_frames(beats, sr=sr, hop_length=HOP)

    def per_beat(env):
        v = np.array([env[max(0, f - 3) : f + 4].max() if f < len(env) else 0 for f in bf])
        return v / np.percentile(v, 95)

    kick, snare = per_beat(kick_env), per_beat(snare_env)

    # --- 4. 小节 / 乐句 ---
    phase = int(np.argmax([kick[p::4].mean() for p in range(4)]))
    downbeats = beats[phase::4]
    phrase_starts = beats[phase::16]

    # --- 5. 逐小节特征 ---
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
    rms = librosa.amplitude_to_db(librosa.feature.rms(S=S)[0], ref=1.0)
    rms -= rms.max()
    cent = librosa.feature.spectral_centroid(S=S, sr=sr)[0]
    low = librosa.amplitude_to_db(S[freqs < 150].sum(0) + 1e-9)
    low -= low.max()
    ft = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=HOP)
    mean_in = lambda a, t_a, t_b: float(a[(ft >= t_a) & (ft < t_b)].mean())

    edges = list(downbeats) + [duration]
    bars = []
    for i in range(len(edges) - 1):
        a, b = edges[i], edges[i + 1]
        bk = kick[phase + 4 * i : phase + 4 * i + 4]
        bars.append(
            {
                "bar": i + 1,
                "t": round(a, 3),
                "rms_db": round(mean_in(rms, a, b), 1),
                "centroid": round(mean_in(cent, a, b)),
                "low_db": round(mean_in(low, a, b), 1),
                "kick": [round(float(x), 2) for x in bk],
            }
        )

    # 段落（按上面的小节特征归纳；bar 为 1 起算，含首不含尾）
    sections = [
        ("前奏", 1, 9, "鼓点稀疏的开场，后 4 小节滤波收暗、能量下沉", "钩子：先演一个具体小东西；第 5–8 小节适合留白让观众填空"),
        ("铺垫", 9, 25, "全编制进入，频谱变亮，每 4 小节第 3 小节轻微回落", "实证：放数字和过程；每 2 小节换一屏"),
        ("蓄力-低谷", 25, 33, "能量骤降约 6dB，只剩每小节首拍，第 32 小节有上行填充", "落到观众自己身上：慢、静、留白，单句长停留"),
        ("蓄力-爬升", 33, 41, "底鼓回来，密度逐小节增加，第 40 小节明显收空（drop 前的吸气）", "把问题逼到墙角；第 40 小节画面收缩/黑一下"),
        ("drop", 41, 57, "全编制回归，能量与亮度最高的一段起点", "主题词砸下来；随后讲机制"),
        ("高潮", 57, 73, "全曲最响，频谱偏暗厚，军鼓/拍手更密", "机制收束 → 金句"),
        ("尾段-再现", 73, 79, "铺垫段素材再现", "结尾回到开头画面，意思变了"),
        ("尾段-收尾", 79, 81, "衰减尾音", "出处列表、水印外不放新信息"),
    ]
    bar_t = lambda b: float(downbeats[b - 1]) if b - 1 < len(downbeats) else duration
    sec_out = [
        {"name": n, "bars": [s, e - 1], "start": round(bar_t(s), 3), "end": round(bar_t(e), 3), "music": m, "use": u}
        for n, s, e, m, u in sections
    ]

    # --- 6. 剪辑方案：删掉第 17–24 小节（与 9–16 小节几乎相同，相似度 0.998）---
    cut_from, cut_to = bar_t(17), bar_t(25)
    cut_len = cut_to - cut_from
    seg_a = y[int((cut_from - 3) * sr) : int(cut_from * sr)]
    seg_b = y[int((cut_to - 3) * sr) : int(cut_to * sr)]
    seam_corr = float(np.dot(seg_a, seg_b) / np.linalg.norm(seg_a) / np.linalg.norm(seg_b))
    to_edit = lambda t: t if t < cut_from else (t - cut_len if t >= cut_to else None)
    edit = {
        "remove_bars": [17, 24],
        "remove_from": round(cut_from, 3),
        "remove_to": round(cut_to, 3),
        "removed_seconds": round(cut_len, 3),
        "seam_waveform_corr": round(seam_corr, 3),
        "edited_duration": round(duration - cut_len, 3),
        "sections": [
            {**s, "start": round(to_edit(s["start"]), 3), "end": round(to_edit(s["end"]) if to_edit(s["end"]) is not None else to_edit(cut_to), 3)}
            for s in sec_out
        ],
        "beats": [round(float(to_edit(b)), 3) for b in beats if to_edit(b) is not None],
        "downbeats": [round(float(to_edit(b)), 3) for b in downbeats if to_edit(b) is not None],
    }
    # 截掉的那 8 小节对应“铺垫”后半，修正铺垫段的结尾
    edit["sections"][1]["bars"] = [9, 16]
    edit["sections"][1]["end"] = round(cut_from, 3)
    edit["edited_frames"] = int(round(edit["edited_duration"] * FPS))

    out = {
        "file": path,
        "duration": round(duration, 3),
        "fps": FPS,
        "bpm": round(bpm, 3),
        "beat_period": round(period, 5),
        "first_beat": round(t0, 4),
        "librosa_raw_tempo": round(float(np.atleast_1d(tempo_raw)[0]), 2),
        "beat_count": len(beats),
        "bar_phase": phase,
        "beats": [round(float(b), 3) for b in beats],
        "kick_strength": [round(float(k), 2) for k in kick],
        "snare_strength": [round(float(s), 2) for s in snare],
        "kicks": [round(float(b), 3) for b, k in zip(beats, kick) if k >= 0.85],
        "downbeats": [round(float(d), 3) for d in downbeats],
        "phrases": [round(float(p), 3) for p in phrase_starts],
        "bars": bars,
        "sections": sec_out,
        "edit": edit,
    }
    out_path = Path(path).with_name("beats.json")
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1))

    print(f"时长 {duration:.3f}s  BPM {bpm:.3f}（librosa 原始估计 {out['librosa_raw_tempo']}）")
    print(f"拍长 {period:.5f}s  首拍 {t0:.4f}s  共 {len(beats)} 拍 / {len(downbeats)} 小节 / {len(phrase_starts)} 乐句")
    print(f"重拍（底鼓强度≥0.85）{len(out['kicks'])} 个")
    print("\n小节   时间    RMS  质心   底鼓(每拍)")
    for b in bars:
        print(f"{b['bar']:>3} {b['t']:>8.2f} {b['rms_db']:>6.1f} {b['centroid']:>5}  {b['kick']}")
    print("\n段落")
    for s in sec_out:
        print(f"  {s['name']:<6} 第{s['bars'][0]:>2}–{s['bars'][1]:>2}小节  {s['start']:7.2f}–{s['end']:7.2f}s")
    print(f"\n剪辑：删第17–24小节 {cut_from:.3f}–{cut_to:.3f}s（{cut_len:.3f}s），接缝波形相关 {seam_corr:.3f}，剪后 {edit['edited_duration']:.3f}s")
    for s in edit["sections"]:
        print(f"  {s['name']:<6} {s['start']:7.2f}–{s['end']:7.2f}s")
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/music/bgm.mp3")
