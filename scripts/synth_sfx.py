"""按 src/data/subtitles.json 的时间轴合成全片音效，输出 public/audio/sfx.wav（48kHz / 16bit / 单声道）。

- 三档峰值：weak / mid / strong 取自数据文件 sfxPeakDbfs，每个音效单独归一到该峰值
- 每个音效首尾 15ms 升余弦淡入淡出；噪声类先带通 100Hz–6kHz 再压电平
- 总线限幅，天花板 -7 dBFS（给 AAC 编码留余量，保证成片峰值 ≤ -6 dBFS）
- 没有音效的地方是数字静音（全零），不加抖动、不铺底噪
- 另存噪声类音效分轨到 out/audio-check/，供单独放大检查
"""
import json

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, lfilter, sosfiltfilt

from subtitle_rules import NOISE_TYPES, ROOT, load, resolve_at

SR = 48000
CEILING_DBFS = -7.0
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
    total = int((doc["screens"][-1]["end"] / fps + 5) * SR)
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
    mix = limiter(mix, CEILING_DBFS)
    out = ROOT / "public" / "audio"
    out.mkdir(parents=True, exist_ok=True)
    to16 = lambda y: np.round(np.clip(y, -1, 1) * 32767).astype(np.int16)
    wavfile.write(out / "sfx.wav", SR, to16(mix))
    check = ROOT / "out" / "audio-check"
    check.mkdir(parents=True, exist_ok=True)
    wavfile.write(check / "noise_stem.wav", SR, to16(noise_stem))
    boost = noise_stem / (np.max(np.abs(noise_stem)) + 1e-12) * 10 ** (-3 / 20)
    wavfile.write(check / "noise_stem_boosted.wav", SR, to16(boost))
    (check / "events.json").write_text(json.dumps({"sr": SR, "events": placed}, ensure_ascii=False, indent=1))
    print(f"写出 {out / 'sfx.wav'}：{total / SR:.1f}s，峰值 {20 * np.log10(np.max(np.abs(mix)) + 1e-12):.2f} dBFS")


if __name__ == "__main__":
    main()
