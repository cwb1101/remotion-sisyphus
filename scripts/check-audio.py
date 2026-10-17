#!/usr/bin/env python3
"""音频检查。

- ffmpeg ebur128：整体响度（Integrated LUFS）、真峰值
- ffmpeg astats：峰值、RMS
- 自己解码数：削波样本数、峰值超过 -6 dBFS 的时间段
- 静音段（两个音效之间）是否是干净的数字静音 / 只有编码残留
- 每个音效分轨（out/sfx-stems）：放大 +24 dB 后看 6 kHz 以上（嘶声）和 100 Hz 以下（轰鸣）的能量占比，
  以及首尾样本和首尾 20 ms 内的最大跳变（咔哒）

用法：python3 -I scripts/check-audio.py out/preview.mp4 public/audio/sfx-preview.wav
"""
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
LIMIT_DB = -6.0


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stderr


def ebur128(path):
    out = run(["ffmpeg", "-nostats", "-i", str(path), "-filter_complex", "ebur128=peak=true", "-f", "null", "-"])
    summary = out[out.rfind("Summary:") :]
    i = float(re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary).group(1))
    tp = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", summary, re.S)
    lra = float(re.search(r"LRA:\s+(-?[\d.]+) LU", summary).group(1))
    return i, float(tp.group(1)) if tp else None, lra


def astats(path):
    out = run(["ffmpeg", "-nostats", "-i", str(path), "-af", "astats=measure_perchannel=none", "-f", "null", "-"])
    overall = out[out.rfind("Overall") :]
    grab = lambda k: re.search(rf"{k}:\s+(-?[\d.]+|-inf)", overall)
    return {k: (grab(k).group(1) if grab(k) else None) for k in ["Peak level dB", "RMS level dB", "Max level", "Min level"]}


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True
    ).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def read_wav(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32767
        return x.reshape(-1, w.getnchannels()), w.getframerate(), w.getsampwidth()


def over_limit_ranges(x, thr_db=LIMIT_DB):
    thr = 10 ** (thr_db / 20)
    hot = np.nonzero(np.abs(x).max(axis=1) > thr)[0]
    ranges = []
    for i in hot:
        if ranges and i - ranges[-1][1] < SR // 20:
            ranges[-1][1] = i
        else:
            ranges.append([i, i])
    return [(a / SR, b / SR) for a, b in ranges]


def edge_click_db(x, edge):
    """首尾 edge 个样本里 5 kHz 以上分量的 RMS，相对整段音效 RMS（dB）。咔哒/断点会在这里冒出宽带高频。"""
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    spec[freqs < 5000] = 0
    hf = np.fft.irfft(spec, len(x))
    ref = np.sqrt(np.mean(x**2)) + 1e-30
    e = max(np.sqrt(np.mean(hf[:edge] ** 2)), np.sqrt(np.mean(hf[-edge:] ** 2)))
    return 20 * np.log10(e / ref + 1e-30)


def band_energy_db(x, lo=None, hi=None):
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    total = spec.sum() + 1e-30
    sel = np.ones_like(freqs, bool)
    if lo is not None:
        sel &= freqs >= lo
    if hi is not None:
        sel &= freqs < hi
    return 10 * np.log10(spec[sel].sum() / total + 1e-30)


if __name__ == "__main__":
    mp4, wav = Path(sys.argv[1]), Path(sys.argv[2])
    report = {}

    for label, path in [("mp4", mp4), ("wav", wav)]:
        i, tp, lra = ebur128(path)
        st = astats(path)
        x = decode(path)
        clipped = int((np.abs(x) >= 0.99997).sum())
        peak = float(20 * np.log10(np.abs(x).max() + 1e-12))
        report[label] = {
            "integratedLUFS": i,
            "truePeakDbtp": tp,
            "LRA": lra,
            "samplePeakDbfs": round(peak, 2),
            "astatsPeakDb": st["Peak level dB"],
            "astatsRmsDb": st["RMS level dB"],
            "clippedSamples": clipped,
            "overMinus6": [f"{a:.2f}–{b:.2f}s" for a, b in over_limit_ranges(x)],
        }

    # 静音段：cues.json 里音效占用以外的时间
    cues = json.loads((ROOT / "out/sfx-stems/cues.json").read_text())["cues"]
    w, sr, sw = read_wav(wav)
    busy = np.zeros(len(w), bool)
    for c in cues:
        busy[int(c["startSec"] * sr) : int(c["endSec"] * sr) + 1] = True
    gap = ~busy
    report["silence"] = {
        "gapSeconds": round(gap.sum() / sr, 2),
        "wavNonZeroSamplesInGaps": int((w[gap] != 0).any(axis=1).sum()),
    }
    m = decode(mp4)[: len(w)]
    g = gap[: len(m)]
    # AAC 解码后静音段的最大电平（编码器在音效边缘会有前后回声，留 50 ms 余量）
    guard = np.convolve(busy[: len(m)].astype(float), np.ones(SR // 20), "same") > 0
    clean = g & ~guard
    report["silence"]["mp4MaxInGapsDbfs"] = round(float(20 * np.log10(np.abs(m[clean]).max() + 1e-12)), 1) if clean.any() else None

    # 分轨：嘶声 / 轰鸣 / 咔哒
    stems = []
    for f in sorted((ROOT / "out/sfx-stems").glob("*.wav")):
        s, _, _ = read_wav(f)
        s = s[:, 0] * 10 ** (24 / 20)  # 放大 +24 dB 来“听”
        # 咔哒 = 不连续 → 宽带高频。看首尾 30 ms 里 5 kHz 以上分量相对整段电平
        edge = int(0.03 * SR)
        stems.append(
            {
                "stem": f.name,
                "above6k_dB": round(band_energy_db(s, lo=6000), 1),
                "above10k_dB": round(band_energy_db(s, lo=10000), 1),
                "below100_dB": round(band_energy_db(s, hi=100), 1),
                "firstLastSample": [round(float(abs(s[0])), 5), round(float(abs(s[-1])), 5)],
                "edgeHF_dB": round(edge_click_db(s, edge), 1),
            }
        )
    report["stems"] = stems

    # silencedetect：列出所有静音段（-50 dBFS 以下持续 0.3 s 以上），并标出是否落在两个音效之间（= 预期的留白）
    out = run(["ffmpeg", "-nostats", "-i", str(mp4), "-af", "silencedetect=noise=-50dB:d=0.3", "-f", "null", "-"])
    starts = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", out)]
    ends = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", out)]
    sil = []
    for k, a in enumerate(starts):
        b = ends[k] if k < len(ends) else len(m) / SR
        prev = max([c for c in cues if c["startSec"] <= a + 0.05], key=lambda c: c["endSec"], default=None)
        nxt = min([c for c in cues if c["startSec"] >= b - 0.05], key=lambda c: c["startSec"], default=None)
        sil.append({"from": round(max(a, 0), 2), "to": round(b, 2), "len": round(b - max(a, 0), 2),
                    "after": f"#{prev['screen']} {prev['type']}" if prev else "片头",
                    "before": f"#{nxt['screen']} {nxt['type']}" if nxt else "片尾"})
    report["silences"] = sil

    # 分段接缝：在每个接缝前后 40 ms 内找样本跳变（咔哒 / 断音），和接缝两侧 0.5 s 的电平对比
    film = json.loads((ROOT / "src/data/script.json").read_text()).get("film")
    seams = []
    if film and len(m) > SR * 60:
        for a, b in film["segments"][1:]:
            t = a / 30
            n = int(t * SR)
            win = m[n - SR // 25 : n + SR // 25, 0]
            jump = float(np.abs(np.diff(win)).max()) if len(win) > 1 else 0.0
            lvl = lambda seg: round(float(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)), 1)
            seams.append({"t": t, "maxJump": round(jump, 5), "rmsBefore_dB": lvl(m[n - SR // 2 : n, 0]), "rmsAfter_dB": lvl(m[n : n + SR // 2, 0])})
    report["seams"] = seams
    print(json.dumps(report, ensure_ascii=False, indent=2))

    bad = []
    for label in ("mp4", "wav"):
        r = report[label]
        if r["clippedSamples"]:
            bad.append(f"{label} 削波 {r['clippedSamples']} 个样本")
        if r["overMinus6"]:
            bad.append(f"{label} 峰值超 -6 dBFS：{r['overMinus6']}")
        if r["integratedLUFS"] > -19:
            bad.append(f"{label} 整体响度 {r['integratedLUFS']} LUFS 偏大")
    for sm in report["seams"]:
        if sm["maxJump"] > 0.05:
            bad.append(f"接缝 {sm['t']}s 处样本跳变 {sm['maxJump']}")
    if report["silence"]["wavNonZeroSamplesInGaps"]:
        bad.append("WAV 静音段不是数字静音")
    for s in stems:
        noisy = any(k in s["stem"] for k in ("sand", "whoosh"))
        if noisy and s["above6k_dB"] > -40:
            bad.append(f"{s['stem']} 6 kHz 以上能量 {s['above6k_dB']} dB，可能有嘶声")
        if noisy and s["below100_dB"] > -20:
            bad.append(f"{s['stem']} 100 Hz 以下能量 {s['below100_dB']} dB，可能有轰鸣")
        if max(s["firstLastSample"]) > 1e-3 or s["edgeHF_dB"] > -50:
            bad.append(f"{s['stem']} 首尾可能有咔哒：{s['firstLastSample']} / {s['edgeHF_dB']} dB")
    if bad:
        print("FAIL")
        for b in bad:
            print("  ", b)
        sys.exit(1)
    print("音频检查 OK")
