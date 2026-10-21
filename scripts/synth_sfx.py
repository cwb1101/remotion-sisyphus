"""按 src/data/subtitles.json 的时间轴合成全片音效，输出 public/audio/sfx.wav（48kHz / 16bit / 单声道）。

- 三档峰值：weak / mid / strong 取自数据文件 sfxPeakDbfs，每个音效单独归一到该峰值
- 每个音效首尾 15ms 升余弦淡入淡出；噪声类先带通 100Hz–6kHz 再压电平
- 总线限幅，天花板 -7 dBFS（给 AAC 编码留余量，保证成片峰值 ≤ -6 dBFS）
- 垫底一层连续的环境和弦（只用正弦波，不含任何噪声），每节换一个和弦、交叉淡化；
  遇到“中/强”音效自动压低（ducking），让关键句最响；垫底电平自动校准，使全片整体响度约 -20 LUFS
- 不加抖动、不铺底噪；片头 0.4 秒淡入、片尾 1.5 秒淡出
- 另存噪声类音效分轨、纯音效分轨到 out/audio-check/，供单独放大检查
"""
import json
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, lfilter, sosfiltfilt

from subtitle_rules import NOISE_TYPES, ROOT, load, resolve_at

SR = 48000
CEILING_DBFS = -7.0
TARGET_LUFS = -20.5  # “约 -20 LUFS，宁可偏小”
FADE_S = 0.015
rng = np.random.default_rng(20261021)


def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def fade_edges(x, fade_in=FADE_S, fade_out=FADE_S):
    x = x.copy()
    n_in, n_out = int(fade_in * SR), int(fade_out * SR)
    if n_in:
        x[:n_in] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n_in))
    if n_out:
        x[-n_out:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_out))
    return x


def bandpass(x, lo=100, hi=6000, order=4):
    sos = butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return sosfiltfilt(sos, x)


def lowpass(x, hi, order=4):
    sos = butter(order, hi, btype="lowpass", fs=SR, output="sos")
    return sosfiltfilt(sos, x)


def highpass(x, lo, order=4):
    sos = butter(order, lo, btype="highpass", fs=SR, output="sos")
    return sosfiltfilt(sos, x)


def sine_sweep(f, t):
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def partials(f0, amps, taus, seconds):
    t = t_axis(seconds)
    return sum(a * np.exp(-t / tau) * np.sin(2 * np.pi * f0 * (k + 1) * t)
               for k, (a, tau) in enumerate(zip(amps, taus)))


# ---------- 音色 ----------

def thud(seconds=0.7, depth=1.0):
    t = t_axis(seconds)
    f = 48 + 42 * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    x *= np.exp(-t / (0.16 * depth))
    return fade_edges(highpass(x, 30, 2), 0.010, 0.020)


def heavy_hit():
    body = thud(1.4, depth=1.9)
    t = t_axis(2.8)
    bell = sum(a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t)
               for f, a, tau in [(196.0, .45, 1.5), (293.7, .25, 1.2), (392.0, .17, 1.0), (587.3, .06, .7)])
    bell = fade_edges(bell, 0.015, 0.05)
    x = np.zeros(len(t))
    x[:len(body)] += body
    x += 0.55 * bell
    return fade_edges(lowpass(x, 3500), 0.010, 0.05)


def pluck(f0=523.25, seconds=1.0):
    x = partials(f0, [1, .18, .05], [.28, .18, .1], seconds)
    return fade_edges(x, 0.012, 0.03)


def pluck_glide(f_from, f_to, seconds=1.1):
    t = t_axis(seconds)
    f = f_to + (f_from - f_to) * np.exp(-t / 0.12)
    x = (sine_sweep(f, t) + 0.15 * sine_sweep(2 * f, t)) * np.exp(-t / 0.35)
    return fade_edges(x, 0.012, 0.03)


def pluck_up():
    a, b = pluck(440.0, 1.1), pluck(659.25, 1.0)
    x = np.zeros(int(1.3 * SR))
    x[:len(a)] += a
    off = int(0.15 * SR)
    x[off:off + len(b)] += 0.8 * b
    return fade_edges(x, 0.012, 0.03)


def glide(seconds=0.8):
    """低通“风声”滑音：滤波噪声 + 正弦下滑垫底。属于噪声类，先带通再压电平。"""
    t = t_axis(seconds)
    n = bandpass(rng.standard_normal(len(t)), 100, 6000)
    dark, bright = lowpass(n, 500), lowpass(n, 2200)
    shape = np.sin(np.pi * t / seconds) ** 2
    noise = (dark * (1 - shape) + bright * shape) * shape
    noise /= np.max(np.abs(noise)) + 1e-12
    body = 0.35 * sine_sweep(260 - 90 * t / seconds, t) * shape
    x = bandpass(noise + body, 100, 6000)
    return fade_edges(x, 0.02, 0.02)


def sine_glide_down(seconds=1.4):
    t = t_axis(seconds)
    f = 520 * (0.5 ** (t / seconds))
    x = (sine_sweep(f, t) + 0.12 * sine_sweep(2 * f, t)) * np.exp(-t / 0.7)
    return fade_edges(x, 0.04, 0.04)


def riser(seconds):
    t = t_axis(seconds)
    f = 160 * 2 ** (t / seconds)
    x = (sine_sweep(f, t) + 0.4 * sine_sweep(1.5 * f, t)) * (t / seconds) ** 1.5
    return fade_edges(x, 0.02, 0.06)


def chord(notes=(220.0, 329.63, 440.0), amps=(1, .8, .25), seconds=2.2):
    t = t_axis(seconds)
    x = sum(a * np.sin(2 * np.pi * f * t) for f, a in zip(notes, amps)) * np.exp(-t / 1.1)
    return fade_edges(x, 0.02, 0.05)


def pad(seconds):
    t = t_axis(seconds)
    x = sum(a * np.sin(2 * np.pi * f * t)
            for f, a in [(110.0, .5), (164.81, .35), (220.0, .3), (277.18, .15)])
    x *= 1 + 0.08 * np.sin(2 * np.pi * 0.25 * t)
    att, rel = min(0.6, seconds / 3), min(0.8, seconds / 3)
    env = np.minimum(1, np.minimum(t / att, (seconds - t) / rel)).clip(0, 1)
    return fade_edges(x * env, 0.02, 0.02)


def tick():
    x = partials(987.77, [1, .08], [.07, .04], 0.3)
    return fade_edges(x, 0.010, 0.02)


def sand(seconds, density=1.0):
    """沙粒：一粒一粒的短噪声颗粒。噪声类，先带通再压电平。"""
    n = int(seconds * SR)
    x = np.zeros(n)
    grain_len = int(0.03 * SR)
    win = np.hanning(grain_len)
    count = int(seconds * 22 * density)
    for _ in range(count):
        pos = int(rng.uniform(0, n - grain_len))
        g = bandpass(rng.standard_normal(grain_len * 3), 900, 4500)[grain_len:2 * grain_len]
        x[pos:pos + grain_len] += g * win * rng.uniform(0.4, 1.0)
    x = bandpass(x, 100, 6000)
    return fade_edges(x, 0.02, 0.05)


def schroeder_reverb(x, wet=0.3):
    out = np.zeros(len(x))
    for d, g in [(1557, .78), (1617, .77), (1491, .79), (1422, .76)]:
        out += lfilter([1], np.r_[1, np.zeros(d - 1), -g], x)
    for d, g in [(225, .7), (556, .7)]:
        out = lfilter(np.r_[-g, np.zeros(d - 1), 1], np.r_[1, np.zeros(d - 1), -g], out)
    out = lowpass(out, 5000)
    out /= np.max(np.abs(out)) + 1e-12
    return (1 - wet) * x / (np.max(np.abs(x)) + 1e-12) + wet * out


def open_chord():
    seconds = 4.5
    x = np.zeros(int(seconds * SR))
    for i, f in enumerate([220.0, 277.18, 329.63, 440.0, 554.37]):
        t = t_axis(seconds - 0.09 * i)
        tone = (np.sin(2 * np.pi * f * t) + 0.1 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 1.6)
        off = int(0.09 * i * SR)
        x[off:off + len(tone)] += fade_edges(tone, 0.02, 0.05) * (1 - 0.1 * i)
    return fade_edges(schroeder_reverb(x), 0.02, 0.3)


def render_event(e, fps):
    kind = e["type"]
    dur_s = e.get("dur", 0) / fps
    if kind == "thud":
        return thud()
    if kind == "heavyHit":
        return heavy_hit()
    if kind == "pluck":
        return pluck()
    if kind == "pluckDown":
        return pluck_glide(659.25, 440.0)
    if kind == "pluckUp":
        return pluck_up()
    if kind == "glide":
        return glide()
    if kind == "sineGlideDown":
        return sine_glide_down()
    if kind == "riser":
        return riser(dur_s)
    if kind == "chord":
        return chord()
    if kind == "pad":
        return pad(dur_s)
    if kind == "tick":
        return tick()
    if kind == "sand":
        return sand(dur_s, e.get("density", 1.0))
    if kind == "openChord":
        return open_chord()
    raise ValueError(kind)


# 每节的环境和弦（频率, 相对幅度）
BED_CHORDS = {
    "hook": [(110.0, .22), (220.0, .55), (329.63, .32), (523.25, .12)],
    "question": [(110.0, .22), (220.0, .55), (329.63, .32), (523.25, .12)],
    "choice": [(110.0, .22), (220.0, .55), (329.63, .32), (523.25, .12)],
    "name": [(87.31, .22), (174.61, .55), (261.63, .32), (440.0, .12)],
    "examples": [(146.83, .22), (293.66, .55), (349.23, .28), (440.0, .14)],
    "threshold": [(164.81, .22), (329.63, .5), (415.30, .3), (493.88, .14)],
    "ledger": [(110.0, .22), (220.0, .55), (329.63, .32), (523.25, .12)],
    "installment": [(146.83, .22), (293.66, .55), (349.23, .28), (440.0, .14)],
    "close": [(110.0, .22), (220.0, .55), (329.63, .32), (554.37, .16)],
}
XFADE_S = 1.5


def bed(doc, total):
    """连续的环境和弦：每个和弦的振荡器全程连续运行，只用包络交叉淡化，不会产生相位跳变。"""
    fps = doc["fps"]
    t = np.arange(total) / SR
    sections = []
    for sc in doc["screens"]:
        if not sections or sections[-1][0] != sc["section"]:
            sections.append([sc["section"], sc["start"] / fps])
    out = np.zeros(total)
    for i, (name, t0) in enumerate(sections):
        t1 = sections[i + 1][1] if i + 1 < len(sections) else total / SR + XFADE_S
        rise = np.clip((t - (t0 - XFADE_S / 2)) / XFADE_S, 0, 1) if i else np.ones(total)
        fall = 1 - np.clip((t - (t1 - XFADE_S / 2)) / XFADE_S, 0, 1)
        env = (0.5 - 0.5 * np.cos(np.pi * rise)) * (0.5 - 0.5 * np.cos(np.pi * fall))
        if env.max() == 0:
            continue
        for k, (f, a) in enumerate(BED_CHORDS[name]):
            lfo = 1 + 0.06 * np.sin(2 * np.pi * (0.07 + 0.03 * k) * t + k)
            out += env * a * lfo * np.sin(2 * np.pi * f * t + 0.7 * k)
    n_in, n_out = int(0.4 * SR), int(1.5 * SR)
    out[:n_in] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n_in))
    out[-n_out:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_out))
    return out / np.max(np.abs(out))


def duck_envelope(placed, total):
    """中/强音效出现时压低垫底：强 -7dB、中 -4dB；30ms 压下，600ms 回升。"""
    rate = 1000
    n = total * rate // SR + 1
    target = np.ones(n)
    for e in placed:
        depth = {"strong": 10 ** (-7 / 20), "mid": 10 ** (-4 / 20)}.get(e["level"])
        if depth is None:
            continue
        a = max(0, int((e["start"] / SR - 0.05) * rate))
        b = int((e["start"] + min(e["length"], int(1.4 * SR))) / SR * rate)
        target[a:b] = np.minimum(target[a:b], depth)
    g = np.empty(n)
    cur = 1.0
    att, rel = np.exp(-1 / (0.03 * rate)), np.exp(-1 / (0.6 * rate))
    for i, v in enumerate(target):
        c = att if v < cur else rel
        cur = c * cur + (1 - c) * v
        g[i] = cur
    return np.interp(np.arange(total) / SR, np.arange(n) / rate, g)


def integrated_lufs(x):
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        wavfile.write(f.name, SR, np.stack([x, x], axis=1).astype(np.float32))
        err = subprocess.run(["ffmpeg", "-nostats", "-i", f.name, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    import re
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])


def limiter(x, ceiling_db, lookahead_s=0.005, release_s=0.08):
    ceiling = 10 ** (ceiling_db / 20)
    need = np.minimum(1.0, ceiling / (np.abs(x) + 1e-12))
    if need.min() >= 1.0:
        return x
    la = int(lookahead_s * SR)
    # 前视：取未来 la 个样本内的最小增益
    gmin = minimum_filter1d(need, size=la + 1, origin=-(la // 2), mode="nearest")
    # 平滑释放
    g = np.empty_like(gmin)
    coef = np.exp(-1 / (release_s * SR))
    cur = 1.0
    for i, v in enumerate(gmin):
        cur = v if v < cur else coef * cur + (1 - coef) * v
        g[i] = cur
    return x * np.minimum(g, need)


def main():
    doc = load()
    fps = doc["fps"]
    peaks = doc["sfxPeakDbfs"]
    total = int(doc["filmEnd"] / fps * SR)
    mix = np.zeros(total)
    noise_stem = np.zeros(total)
    placed = []
    for s in doc["screens"]:
        for e in s["sfx"]:
            at = resolve_at(s, e["at"])
            rep = e.get("repeat", {"every": 0, "count": 1})
            for k in range(rep["count"]):
                frame = s["start"] + at + k * rep["every"]
                x = render_event(e, fps)
                x = x / (np.max(np.abs(x)) + 1e-12) * 10 ** (peaks[e["level"]] / 20)
                i0 = int(round(frame / fps * SR))
                mix[i0:i0 + len(x)] += x[: total - i0]
                placed.append({"screen": s["id"], "type": e["type"], "level": e["level"], "start": i0, "length": len(x),
                               "target_dbfs": peaks[e["level"]], "noise": e["type"] in NOISE_TYPES})
                if e["type"] in NOISE_TYPES:
                    noise_stem[i0:i0 + len(x)] += x[: total - i0]
    # 片尾：所有音效在成片最后 1.2 秒内淡出，避免截断
    n_end = int(1.2 * SR)
    mix[-n_end:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_end))
    events_only = mix.copy()

    # 垫底：按目标响度二分校准，峰值不超过 -14 dBFS；遇到“中/强”音效时会被压到 -18/-21 dBFS 以下
    pad_raw = bed(doc, total) * duck_envelope(placed, total)
    lo, hi = -45.0, -14.0
    for _ in range(9):
        mid = (lo + hi) / 2
        lufs = integrated_lufs(limiter(events_only + pad_raw * 10 ** (mid / 20), CEILING_DBFS))
        lo, hi = (mid, hi) if lufs < TARGET_LUFS else (lo, mid)
    bed_peak = lo
    mix = limiter(events_only + pad_raw * 10 ** (bed_peak / 20), CEILING_DBFS)
    out = ROOT / "public" / "audio"
    out.mkdir(parents=True, exist_ok=True)
    to16 = lambda y: np.round(np.clip(y, -1, 1) * 32767).astype(np.int16)
    wavfile.write(out / "sfx.wav", SR, to16(mix))
    check = ROOT / "out" / "audio-check"
    check.mkdir(parents=True, exist_ok=True)
    wavfile.write(check / "noise_stem.wav", SR, to16(noise_stem))
    wavfile.write(check / "events_stem.wav", SR, to16(events_only))
    boost = noise_stem / (np.max(np.abs(noise_stem)) + 1e-12) * 10 ** (-3 / 20)
    wavfile.write(check / "noise_stem_boosted.wav", SR, to16(boost))
    (check / "events.json").write_text(json.dumps({"sr": SR, "events": placed, "bed_peak_dbfs": round(bed_peak, 2)}, ensure_ascii=False, indent=1))
    print(f"垫底和弦峰值 {bed_peak:.2f} dBFS，整体响度 {integrated_lufs(mix):.2f} LUFS")
    print(f"写出 {out / 'sfx.wav'}：{total / SR:.1f}s，峰值 {20 * np.log10(np.max(np.abs(mix)) + 1e-12):.2f} dBFS")


if __name__ == "__main__":
    main()
