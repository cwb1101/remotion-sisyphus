"""成片音频自检：整体响度、最大峰值、削波样本、超 -6 dBFS 的时间点、各档峰值、静音段（silencedetect）、声画同步、噪声类音效。

用法：python3 scripts/audio_check.py out/preview.mp4
依赖 synth_sfx.py 写出的 out/audio-check/events.json、events_stem.wav 与 noise_stem.wav。
各档峰值在“纯音效分轨”上量（成片里叠着环境垫底，单个音效的峰值没法单独量）。
"""
import json
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt

from subtitle_rules import ROOT

LIMIT_DBFS = -6.0
CHECK = ROOT / "out" / "audio-check"


def db(x):
    return 20 * np.log10(max(float(x), 1e-12))


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a", "-f", "f32le", "-ac", "2", "-ar", "48000", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def ffmpeg_loudness(path):
    err = subprocess.run(
        ["ffmpeg", "-nostats", "-i", str(path), "-map", "0:a", "-af", "ebur128=peak=true+sample", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    summary = err[err.rfind("Summary:"):]
    grab = lambda key: float(re.search(rf"{key}:\s+(-?[\d.]+|-inf)", summary).group(1))
    return {"integrated_lufs": grab("I"), "true_peak_dbtp": grab("Peak") if "True peak" in summary else None, "lra_lu": grab("LRA")}


def ffmpeg_astats(path):
    err = subprocess.run(
        ["ffmpeg", "-nostats", "-i", str(path), "-map", "0:a", "-af", "astats=measure_perchannel=none", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    out = {}
    for key in ["Peak level dB", "RMS level dB", "Number of samples"]:
        m = re.search(rf"Overall.*?{key}: (-?[\d.]+|-inf)", err, re.S)
        out[key] = float(m.group(1)) if m else None
    return out


def main(path):
    sr = 48000
    audio = decode(path)
    mono = audio[:, 0]
    n = len(audio)
    ev = json.loads((CHECK / "events.json").read_text())["events"]
    ev = [e for e in ev if e["start"] < n]

    loud = ffmpeg_loudness(path)
    stats = ffmpeg_astats(path)
    peak = np.abs(audio).max()
    clipped = int((np.abs(audio) >= 1.0).sum())

    # 峰值超过 -6 dBFS 的时间点（20ms 窗）
    win = int(0.02 * sr)
    over = []
    lim = 10 ** (LIMIT_DBFS / 20)
    for i in range(0, n, win):
        p = np.abs(audio[i:i + win]).max()
        if p > lim:
            over.append((round(i / sr, 2), round(db(p), 2)))

    # 各档峰值：只统计完整落在成片内、且不与其他音效重叠的音效（重叠时峰值会叠加，不代表单个音效的档位）
    def overlaps(e):
        return any(o is not e and o["start"] < e["start"] + e["length"] and e["start"] < o["start"] + o["length"] for o in ev)

    _, stem = wavfile.read(CHECK / "events_stem.wav")
    stem = stem.astype(np.float64) / 32768
    tiers = {}
    isolated = [e for e in ev if e["start"] + e["length"] <= min(n, len(stem)) and not overlaps(e)]
    for e in isolated:
        seg = np.abs(stem[e["start"]:e["start"] + e["length"]])
        tiers.setdefault(e["level"], []).append(db(seg.max()))
    tier_report = {k: {"target": next(e["target_dbfs"] for e in ev if e["level"] == k), "min": round(min(v), 2), "max": round(max(v), 2), "count": len(v)} for k, v in tiers.items()}
    overlapped = len(ev) - len(isolated)

    # 整条混音的咔哒检查：8kHz 以上的 5ms 包络最大值
    hp_mix = butter(4, 8000, btype="highpass", fs=sr, output="sos")
    hf_mix = sosfiltfilt(hp_mix, mono)
    k5 = int(0.005 * sr)
    hf_mix_peak = max(np.sqrt((hf_mix[i:i + k5] ** 2).mean()) for i in range(0, n - k5, k5))

    # 静音段：ffmpeg silencedetect（-60 dB，持续 0.3 秒以上）
    err = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-map", "0:a", "-af", "silencedetect=noise=-60dB:d=0.3", "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    silences = [(round(max(0.0, a), 2), round(b, 2)) for a, b in zip(starts, ends + [n / sr] * (len(starts) - len(ends)))]
    # 垫底与音效之间的“底噪”：最安静的 50ms 窗里有没有嘶声（8kHz 以上能量）

    # 声画同步：成片与源 wav 的互相关（第一个强音效附近）
    src_sr, src = wavfile.read(ROOT / "public" / "audio" / "sfx.wav")
    src = src.astype(np.float64) / 32768
    strong = next((e for e in ev if e["level"] == "strong"), ev[0])
    a0, a1 = strong["start"], strong["start"] + int(0.5 * sr)
    ref = src[a0:a1]
    best = max(range(-4096, 4097, 8), key=lambda lag: float(np.dot(mono[a0 + lag:a1 + lag], ref)) if a0 + lag >= 0 else -1e9)
    fine = max(range(best - 8, best + 9), key=lambda lag: float(np.dot(mono[a0 + lag:a1 + lag], ref)))

    # 噪声类音效：分轨单独检查频谱与咔哒
    nsr, noise = wavfile.read(CHECK / "noise_stem.wav")
    noise = noise.astype(np.float64) / 32768
    noise_report = []
    hp = butter(4, 8000, btype="highpass", fs=nsr, output="sos")
    for e in [x for x in ev if x["noise"]]:
        seg = noise[e["start"]:e["start"] + e["length"]]
        spec = np.abs(np.fft.rfft(seg)) ** 2
        freqs = np.fft.rfftfreq(len(seg), 1 / nsr)
        total = spec.sum() + 1e-20
        hf = sosfiltfilt(hp, seg)
        k = int(0.005 * nsr)
        hf_env = np.array([np.sqrt((hf[i:i + k] ** 2).mean()) for i in range(0, len(hf) - k, k)])
        noise_report.append({
            "screen": e["screen"], "type": e["type"],
            "below_100Hz_pct": round(100 * spec[freqs < 100].sum() / total, 3),
            "above_6kHz_pct": round(100 * spec[freqs > 6000].sum() / total, 3),
            "hf_8k_peak_rel_db": round(db(hf_env.max()) - db(np.abs(seg).max()), 1),
            "edge_start": round(abs(seg[0]) / (np.abs(seg).max() + 1e-12), 4),
            "edge_end": round(abs(seg[-1]) / (np.abs(seg).max() + 1e-12), 4),
        })

    # 不重叠音效的首尾样本（源 wav）应为 0：淡入淡出生效
    edges = max((max(abs(stem[e["start"]]), abs(stem[e["start"] + e["length"] - 1])) for e in isolated), default=0.0)

    report = {
        "file": str(path),
        "integrated_lufs": loud["integrated_lufs"],
        "true_peak_dbtp": loud["true_peak_dbtp"],
        "lra_lu": loud["lra_lu"],
        "astats_peak_dbfs": stats["Peak level dB"],
        "sample_peak_dbfs": round(db(peak), 2),
        "clipped_samples": clipped,
        "over_-6dBFS": over,
        "tiers": tier_report,
        "silences": silences,
        "av_offset_ms": round(fine / sr * 1000, 2),
        "event_edge_max": round(float(edges), 6),
        "overlapped_events": overlapped,
        "mix_hf_8k_peak_dbfs": round(db(hf_mix_peak), 1),
        "noise_events": noise_report,
    }
    (CHECK / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(f"整体响度 {report['integrated_lufs']} LUFS｜True Peak {report['true_peak_dbtp']} dBTP｜样本峰值 {report['sample_peak_dbfs']} dBFS（astats {report['astats_peak_dbfs']}）｜削波样本 {clipped}")
    print(f"超过 -6 dBFS 的时间点：{over if over else '无'}")
    for k in ["weak", "mid", "strong"]:
        if k in tier_report:
            t = tier_report[k]
            print(f"  {k:6s} 目标 {t['target']} dBFS → 实测 {t['min']} ~ {t['max']}（{t['count']} 个）")
    print(f"  （各档峰值在纯音效分轨上量；另有 {overlapped} 个音效与其他音效重叠或被片尾截断，不计入分档统计）")
    print(f"整条混音 8kHz 以上 5ms 包络最大 {report['mix_hf_8k_peak_dbfs']} dBFS（咔哒检查）")
    print(f"静音段（silencedetect -60dB / 0.3s）：{silences if silences else '无'}")
    print(f"声画偏移 {report['av_offset_ms']} ms｜不重叠音效的首尾样本最大值 {report['event_edge_max']}")
    for r in noise_report:
        print(f"  噪声类 #{r['screen']} {r['type']}: <100Hz {r['below_100Hz_pct']}%  >6kHz {r['above_6kHz_pct']}%  8kHz 以上包络峰 {r['hf_8k_peak_rel_db']} dB  首尾 {r['edge_start']}/{r['edge_end']}")
    if clipped or over:
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out" / "preview.mp4")
