"""BGM 拍点与段落分析

用法:
    python3 scripts/analyze_music.py assets/music/bgm.mp3

输出:
    assets/music/bgm_analysis.json   拍 底鼓 小节 乐句 段落 drop 全部时间点 (秒 + 30fps 帧号)
    assets/music/bgm_analysis.png    能量 / 低频 / 新颖度曲线 + 段落边界, 用来人工核对
"""

import json
import sys
from pathlib import Path

import librosa
import numpy as np

FPS = 30
SR = 22050
HOP = 512
BEATS_PER_BAR = 4
BARS_PER_PHRASE = 4


def frame(t):
    return int(round(t * FPS))


def norm(x):
    x = np.asarray(x, dtype=float)
    lo, hi = np.percentile(x, 2), np.percentile(x, 98)
    return np.clip((x - lo) / (hi - lo + 1e-9), 0, 1)


def main(path):
    path = Path(path)
    y, sr = librosa.load(path, sr=SR, mono=True)
    duration = len(y) / sr

    # ---------- 拍 ----------
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, hop_length=HOP, tightness=120
    )
    tempo = float(np.atleast_1d(tempo)[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP)

    # 用相邻拍间隔中位数复核 BPM
    ibi = np.diff(beat_times)
    bpm_median = 60.0 / float(np.median(ibi))

    # ---------- 低频 (底鼓) ----------
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low_rms = np.sqrt((S[(freqs >= 30) & (freqs <= 150)] ** 2).mean(axis=0))

    # 底鼓: 150Hz 以下梅尔频带的起音强度, 用 99.5 分位归一 (1.0 ≈ 普通重拍)
    K_HOP = 256
    mel = librosa.feature.melspectrogram(y=y, sr=sr, hop_length=K_HOP, n_mels=128, fmax=8000)
    mel_f = librosa.mel_frequencies(n_mels=128, fmax=8000)
    low_onset = librosa.onset.onset_strength(S=librosa.power_to_db(mel[mel_f < 150]), sr=sr, hop_length=K_HOP)
    low_onset = low_onset / np.percentile(low_onset, 99.5)
    kick_frames = librosa.util.peak_pick(low_onset, pre_max=10, post_max=10, pre_avg=20,
                                         post_avg=20, delta=0.3, wait=20)
    kick_times = librosa.frames_to_time(kick_frames, sr=sr, hop_length=K_HOP)
    kick_strength = low_onset[kick_frames]

    def window_max(curve, t, hop, w=0.07):
        a = librosa.time_to_frames(max(0, t - w), sr=sr, hop_length=hop)
        b = librosa.time_to_frames(t + w, sr=sr, hop_length=hop) + 1
        return float(curve[a:b].max()) if b > a else 0.0

    kick_score = np.array([window_max(low_onset, t, K_HOP) for t in beat_times])
    kick_beats = [i for i, t in enumerate(beat_times) if np.min(np.abs(kick_times - t)) < 0.07]
    # 重音: 明显高出普通重拍的低频冲击 (适合放大动作 / 重音效)
    ACCENT = 1.5
    accents = [(float(t), float(k)) for t, k in zip(kick_times, kick_strength) if k >= ACCENT]

    # ---------- 小节相位 ----------
    # 哪一个相位 (0..3) 的拍上低频冲击最强, 就当作小节第一拍
    phase_score = [kick_score[p::BEATS_PER_BAR].mean() for p in range(BEATS_PER_BAR)]
    bar_phase = int(np.argmax(phase_score))
    bar_beats = list(range(bar_phase, len(beat_times), BEATS_PER_BAR))
    bar_times = beat_times[bar_beats]

    # ---------- 段落特征 (逐拍) ----------
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    centroid = librosa.feature.spectral_centroid(S=S, sr=sr)[0]
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=HOP, n_mfcc=13)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=HOP)
    onset_density = onset_env

    def per_bar(feat):
        idx = librosa.time_to_frames(np.append(bar_times, duration), sr=sr, hop_length=HOP)
        idx = np.clip(idx, 0, feat.shape[-1] - 1)
        out = librosa.util.sync(np.atleast_2d(feat), idx, aggregate=np.mean, pad=False)
        return out[:, : len(bar_times)]

    bar_rms = per_bar(rms)[0]
    bar_low = per_bar(low_rms)[0]
    bar_cent = per_bar(centroid)[0]
    bar_onset = per_bar(onset_density)[0]
    bar_mfcc = per_bar(mfcc)
    bar_chroma = per_bar(chroma)

    # 新颖度: 以小节为单位的自相似矩阵 + 棋盘核
    feats = np.vstack([
        librosa.util.normalize(bar_mfcc, axis=1),
        librosa.util.normalize(bar_chroma, axis=1),
        norm(bar_rms)[None] * 2,
        norm(bar_low)[None] * 2,
    ])
    feats = (feats - feats.mean(axis=1, keepdims=True)) / (feats.std(axis=1, keepdims=True) + 1e-9)
    D = np.linalg.norm(feats[:, :, None] - feats[:, None, :], axis=0)
    Ssm = np.exp(-D / np.median(D))
    k = 4
    g = np.outer(np.r_[-np.ones(k), np.ones(k)], np.r_[-np.ones(k), np.ones(k)]) * -1
    n = len(bar_times)
    pad = np.pad(Ssm, k, mode="edge")
    novelty = np.array([(pad[i:i + 2 * k, i:i + 2 * k] * g).sum() for i in range(n)])
    novelty = norm(novelty)

    # 段落边界: 新颖度峰值 + 能量跳变, 至少间隔 4 小节
    energy = 0.5 * norm(bar_rms) + 0.3 * norm(bar_low) + 0.2 * norm(bar_onset)
    jump = np.abs(np.diff(energy, prepend=energy[0]))
    score = 0.6 * novelty + 0.4 * norm(jump)
    peaks = librosa.util.peak_pick(score, pre_max=3, post_max=3, pre_avg=4, post_avg=4, delta=0.08, wait=4)
    bounds = sorted(set([0] + [int(p) for p in peaks if score[p] > 0.35] + [n]))

    segments = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        t0 = float(bar_times[a]) if a > 0 else 0.0
        t1 = float(bar_times[b]) if b < n else duration
        segments.append({
            "start": round(t0, 3),
            "end": round(t1, 3),
            "start_frame": frame(t0),
            "end_frame": frame(t1),
            "bars": b - a,
            "energy": round(float(energy[a:b].mean()), 3),
            "low": round(float(norm(bar_low)[a:b].mean()), 3),
            "brightness": round(float(norm(bar_cent)[a:b].mean()), 3),
            "density": round(float(norm(bar_onset)[a:b].mean()), 3),
        })

    # drop: 低频 + 能量最大的正向跳变
    lift = np.diff(0.6 * norm(bar_low) + 0.4 * norm(bar_rms), prepend=0)
    smooth_after = np.array([energy[i:i + 4].mean() for i in range(n)])
    smooth_before = np.array([energy[max(0, i - 4):i].mean() if i > 0 else 0 for i in range(n)])
    drop_score = 0.5 * norm(lift) + 0.5 * norm(smooth_after - smooth_before)
    # 可能有多个 drop: 取分数接近最高分 且 相隔 8 小节以上的; 主 drop = 之前 16 小节 (一个大乐段) 最安静的那个
    drop_bars = []
    for i in np.argsort(drop_score)[::-1]:
        if i >= 2 and drop_score[i] >= 0.9 * drop_score[2:].max() and all(abs(i - j) >= 8 for j in drop_bars):
            drop_bars.append(int(i))
    drop_bars.sort()
    drop_bar = min(drop_bars, key=lambda i: energy[max(0, i - 16):i].mean())
    drop_time = float(bar_times[drop_bar])

    # 乐句: 每 4 小节; 相位取 "乐句首小节上的重音 + 能量跳变" 总分最高的那个
    bar_accent = np.array([max([k for t, k in accents if a0 - 0.1 <= t < a0 + 0.3] or [0])
                           for a0 in bar_times])
    bar_jump = np.abs(np.diff(energy, prepend=0))
    ph_score = [(bar_accent[p::BARS_PER_PHRASE].sum() + bar_jump[p::BARS_PER_PHRASE].sum())
                for p in range(BARS_PER_PHRASE)]
    phrase_phase = int(np.argmax(ph_score))
    phrase_bars = list(range(phrase_phase, n, BARS_PER_PHRASE))
    phrase_times = [float(bar_times[i]) for i in phrase_bars]

    # 停顿小节: 能量几乎为零 (重音之后的空拍, drop 前的吸气)
    stops = [{"t": round(float(bar_times[i]), 3), "f": frame(bar_times[i]), "bar": i}
             for i in range(n) if energy[i] < 0.1 and 0 < i < n - 1]

    # 候选 drop 前 3 名, 便于人工复核
    drop_rank = np.argsort(drop_score)[::-1][:5]

    result = {
        "file": str(path),
        "duration": round(duration, 3),
        "duration_frames": frame(duration),
        "fps": FPS,
        "bpm_librosa": round(tempo, 2),
        "bpm_median_ibi": round(bpm_median, 2),
        "beat_period": round(float(np.median(ibi)), 4),
        "bar_phase": bar_phase,
        "drop": {"time": round(drop_time, 3), "frame": frame(drop_time), "bar": drop_bar},
        "drops": [{"time": round(float(bar_times[i]), 3), "frame": frame(bar_times[i]), "bar": i,
                   "main": i == drop_bar} for i in drop_bars],
        "drop_candidates": [
            {"time": round(float(bar_times[i]), 3), "bar": int(i), "score": round(float(drop_score[i]), 3)}
            for i in drop_rank
        ],
        "auto_segments": segments,
        "beats": [{"t": round(float(t), 3), "f": frame(t), "kick": round(float(kick_score[i]), 3)}
                  for i, t in enumerate(beat_times)],
        "kick_beats": [{"t": round(float(beat_times[i]), 3), "f": frame(beat_times[i])} for i in kick_beats],
        "kicks": [{"t": round(float(t), 3), "f": frame(t), "strength": round(float(k), 2)}
                  for t, k in zip(kick_times, kick_strength)],
        "accents": [{"t": round(t, 3), "f": frame(t), "strength": round(k, 2)} for t, k in accents],
        "stops": stops,
        "phrase_phase": phrase_phase,
        "bars": [{"t": round(float(t), 3), "f": frame(t), "energy": round(float(energy[i]), 3),
                  "low": round(float(norm(bar_low)[i]), 3), "novelty": round(float(novelty[i]), 3)}
                 for i, t in enumerate(bar_times)],
        "phrases": [{"t": round(t, 3), "f": frame(t), "bar": int(b),
                     "energy": round(float(energy[b:b + BARS_PER_PHRASE].mean()), 3),
                     "low": round(float(norm(bar_low)[b:b + BARS_PER_PHRASE].mean()), 3),
                     "brightness": round(float(norm(bar_cent)[b:b + BARS_PER_PHRASE].mean()), 3)}
                    for t, b in zip(phrase_times, phrase_bars)],
    }

    out = path.with_name(path.stem + "_analysis.json")
    out.write_text(json.dumps(result, ensure_ascii=False, indent=1))

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(3, 1, figsize=(18, 8), sharex=True)
        tt = librosa.times_like(rms, sr=sr, hop_length=HOP)
        ax[0].plot(tt, norm(rms), lw=0.6, label="rms")
        ax[0].plot(tt, norm(low_rms), lw=0.6, label="low 30-150Hz", alpha=0.7)
        ax[0].legend(loc="upper left")
        ax[1].plot(bar_times, energy, "-o", ms=2, label="bar energy")
        ax[1].plot(bar_times, novelty, "-", lw=0.8, label="novelty")
        ax[1].legend(loc="upper left")
        ax[2].vlines(kick_times, 0, kick_strength, lw=0.6)
        for t, k in accents:
            ax[2].plot(t, k, "rv")
        ax[2].set_ylabel("kick")
        for a in ax:
            for s in segments:
                a.axvline(s["start"], color="r", lw=0.8)
            for i in drop_bars:
                a.axvline(bar_times[i], color="m", lw=2 if i == drop_bar else 1)
            for t in phrase_times:
                a.axvline(t, color="g", lw=0.4, ls="--")
        ax[2].set_xticks(np.arange(0, duration, 5))
        ax[2].set_xlabel("seconds")
        fig.tight_layout()
        fig.savefig(path.with_name(path.stem + "_analysis.png"), dpi=90)
    except ImportError:
        pass

    print(f"duration {duration:.2f}s  bpm {tempo:.2f} (ibi {bpm_median:.2f})  beats {len(beat_times)}  "
          f"bars {n}  bar_phase {bar_phase}  kicks {len(kick_times)} (on beat {len(kick_beats)})  "
          f"phrase_phase {phrase_phase}")
    print("accents", [(round(t, 2), round(k, 2)) for t, k in accents])
    print("stops", [x["t"] for x in stops])
    print("drops", [f"{bar_times[i]:.2f}s bar {i}" for i in drop_bars])
    print(f"main drop {drop_time:.2f}s (bar {drop_bar})  candidates "
          + ", ".join(f"{bar_times[i]:.2f}s/{drop_score[i]:.2f}" for i in drop_rank))
    print("first beats", np.round(beat_times[:8], 3))
    print("phrases", [round(t, 2) for t in phrase_times])
    print("phrase  start   bar  energy  low  bright")
    for i, (t, b) in enumerate(zip(phrase_times, phrase_bars)):
        e = energy[b:b + BARS_PER_PHRASE]
        print(f"P{i + 1:02d} {t:7.2f}  {b:3d}  {e.mean():.2f}  {norm(bar_low)[b:b + 4].mean():.2f}  "
              f"{norm(bar_cent)[b:b + 4].mean():.2f}  " + " ".join(f"{x:.2f}" for x in e))
    print("auto segments")
    for s in segments:
        print(f"{s['start']:7.2f}-{s['end']:7.2f}  bars {s['bars']:3d}  energy {s['energy']:.2f}  "
              f"low {s['low']:.2f}  bright {s['brightness']:.2f}  dens {s['density']:.2f}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/music/bgm.mp3")
