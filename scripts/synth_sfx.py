"""
合成全片音效（纯代码，无任何音频素材）→ public/sfx/*.wav

音色原则：
- 以低频冲击、轻点击、气流、柔和上扬音为主；
- 每个音效都有淡入淡出包络，首尾强制 6ms / 25ms 渐变，避免咔哒声；
- 噪声一律先做多级低通，少高频；
- 单个文件峰值归一到 -3 dBFS，混音时再按时间轴乘音量，最终混音峰值由 qa 脚本检查（< -3 dBFS）。
"""

import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def lowpass(x, cutoff):
    """一阶低通，cutoff 可以是常数或逐样本数组（扫频）。"""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def lp(x, cutoff, order=3):
    for _ in range(order):
        x = lowpass(x, cutoff)
    return x


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def soft_noise(dur, cutoff, order=3):
    return lp(rng.standard_normal(int(SR * dur)), cutoff, order)


def env_ad(dur, attack, decay_tau):
    t = t_axis(dur)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    a = np.sin(a * np.pi / 2) ** 2
    d = np.exp(-np.maximum(t - attack, 0) / decay_tau)
    return a * d


def env_hann(dur, peak=0.5):
    """不对称 hann：peak 是峰值所在位置（0–1）"""
    t = t_axis(dur) / dur
    up = np.sin(np.clip(t / peak, 0, 1) * np.pi / 2) ** 2
    down = np.cos(np.clip((t - peak) / (1 - peak), 0, 1) * np.pi / 2) ** 2
    return np.where(t < peak, up, down)


def sweep_sine(dur, f0, f1, curve="exp"):
    t = t_axis(dur)
    if curve == "exp":
        f = f0 * (f1 / f0) ** (t / dur)
    else:
        f = f0 + (f1 - f0) * t / dur
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase)


def finish(x, peak_db=-3.0):
    x = np.asarray(x, dtype=float)
    n_in, n_out = int(SR * 0.006), int(SR * 0.025)
    x[:n_in] *= np.sin(np.linspace(0, np.pi / 2, n_in)) ** 2
    x[-n_out:] *= np.cos(np.linspace(0, np.pi / 2, n_out)) ** 2
    x = x - np.mean(x) * env_hann(len(x) / SR)  # 去直流
    m = np.max(np.abs(x))
    if m > 0:
        x = x / m * 10 ** (peak_db / 20)
    return x


def write(name, x, peak_db=-3.0):
    x = finish(x, peak_db)
    data = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    path = os.path.join(OUT, f"{name}.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"{name:14s} {len(x) / SR:5.2f}s")


# ---------- 低频冲击 ----------
def thump(dur=0.5, f0=95, f1=42, tau=0.12, body=0.25):
    s = sweep_sine(dur, f0, f1) * env_ad(dur, 0.004, tau)
    s += 0.35 * sweep_sine(dur, f0 * 2, f1 * 2) * env_ad(dur, 0.003, tau * 0.5)
    s += body * soft_noise(dur, 260, 3) * env_ad(dur, 0.002, 0.03) * 6
    return s


def thump_heavy():
    dur = 1.1
    s = 1.0 * sweep_sine(dur, 80, 34) * env_ad(dur, 0.006, 0.32)
    s += 0.4 * sweep_sine(dur, 160, 70) * env_ad(dur, 0.004, 0.12)
    s += 0.5 * soft_noise(dur, 420, 3) * env_ad(dur, 0.003, 0.05) * 6
    # 尾部一层很淡的低音和声，让重音"落地"而不是"炸"
    s += 0.18 * np.sin(2 * np.pi * 55 * t_axis(dur)) * env_ad(dur, 0.05, 0.4)
    return s


# ---------- 轻点击 ----------
def tick(freq=1100, dur=0.12, tau=0.025, noise=0.25):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * freq * t) * env_ad(dur, 0.002, tau)
    s += 0.5 * np.sin(2 * np.pi * freq * 0.5 * t) * env_ad(dur, 0.002, tau * 1.6)
    s += noise * soft_noise(dur, 2200, 2) * env_ad(dur, 0.001, 0.008) * 4
    return s


def knock():
    dur = 0.22
    t = t_axis(dur)
    s = np.sin(2 * np.pi * 190 * t) * env_ad(dur, 0.002, 0.04)
    s += 0.6 * np.sin(2 * np.pi * 420 * t) * env_ad(dur, 0.002, 0.018)
    s += 0.8 * highpass(soft_noise(dur, 1200, 2), 250) * env_ad(dur, 0.001, 0.012) * 6
    return s


def bounce():
    dur = 0.35
    s = sweep_sine(dur, 170, 85) * env_ad(dur, 0.003, 0.07)
    s += 0.3 * sweep_sine(dur, 340, 170) * env_ad(dur, 0.003, 0.03)
    return s


def door_close():
    dur = 0.9
    s = thump(dur, 85, 40, 0.16, 0.3)
    k = np.zeros(int(SR * dur))
    kn = knock()
    k[int(SR * 0.012): int(SR * 0.012) + len(kn)] += 0.45 * kn
    return s + k


def print_ticks():
    dur = 1.7
    s = np.zeros(int(SR * dur))
    for i in range(14):
        at = int(SR * (0.03 + i * 0.115 + rng.uniform(-0.01, 0.01)))
        tk = tick(freq=rng.uniform(850, 1000), dur=0.08, tau=0.012, noise=0.4) * rng.uniform(0.55, 0.9)
        s[at: at + len(tk)] += tk[: len(s) - at]
    return s * env_hann(dur, 0.15)


# ---------- 气流 ----------
def whoosh(dur=0.5, c0=300, c1=1400, peak=0.6, body=0.0):
    n = soft_noise(dur, np.linspace(c0, c1, int(SR * dur)) if c1 != c0 else c0, 2)
    n = highpass(n, 90)
    s = n * env_hann(dur, peak) * 5
    if body:
        s += body * sweep_sine(dur, 120, 70) * env_hann(dur, peak)
    return s


def whoosh_rise():
    return whoosh(0.6, 250, 1800, 0.85, 0.15)


def whip():
    return whoosh(0.32, 900, 400, 0.35, 0.2)


def muffle_down():
    dur = 0.7
    n = soft_noise(dur, np.geomspace(1800, 160, int(SR * dur)), 2)
    return n * env_hann(dur, 0.12) * 5


def roll():
    dur = 0.9
    t = t_axis(dur)
    n = lp(rng.standard_normal(len(t)), 220, 3)
    am = 0.65 + 0.35 * np.sin(2 * np.pi * 9 * t)
    return n * am * env_hann(dur, 0.3) * 8


# ---------- 柔和上扬 / 和弦 ----------
def riser(f0=330, f1=660, dur=0.7):
    s = sweep_sine(dur, f0, f1) * env_hann(dur, 0.7)
    s += 0.5 * sweep_sine(dur, f0 / 2, f1 / 2) * env_hann(dur, 0.7)
    return lp(s, 2400, 1)


def low_note():
    dur = 1.6
    s = sweep_sine(dur, 196, 164, "lin") * env_ad(dur, 0.02, 0.45)
    s += 0.3 * sweep_sine(dur, 392, 328, "lin") * env_ad(dur, 0.02, 0.25)
    return s


def pad(freqs=(220.0, 277.18, 329.63, 415.3), dur=2.4):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for i, f in enumerate(freqs):
        det = 1 + (i - 1.5) * 0.0015
        s += np.sin(2 * np.pi * f * det * t) / (1 + i * 0.35)
    return lp(s, 1600, 1) * env_hann(dur, 0.18)


def hollow():
    dur = 1.0
    base = np.sin(2 * np.pi * 330 * t_axis(0.25)) * env_ad(0.25, 0.004, 0.05)
    base += 0.5 * np.sin(2 * np.pi * 165 * t_axis(0.25)) * env_ad(0.25, 0.004, 0.07)
    s = np.zeros(int(SR * dur))
    for k, g in enumerate([1.0, 0.45, 0.2, 0.08]):
        at = int(SR * 0.13 * k)
        s[at: at + len(base)] += g * lp(base, 1400 - k * 300, 1)
    return s


def slam():
    """关键句砸字：重低频 + 一层很短的气流前导"""
    dur = 1.2
    s = np.zeros(int(SR * dur))
    w = whoosh(0.16, 400, 900, 0.9) * 0.25
    s[: len(w)] += w
    h = thump_heavy()
    at = int(SR * 0.1)
    s[at:] += h[: len(s) - at]
    return s


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write("thump", thump())
    write("thump_heavy", thump_heavy())
    write("slam", slam())
    write("tick", tick(1100))
    write("tick_hi", tick(1320))
    write("tick_mid", tick(1000))
    write("tick_lo", tick(820))
    write("tick_soft", tick(900, 0.1, 0.018, 0.1))
    write("knock", knock())
    write("bounce", bounce())
    write("door_close", door_close())
    write("print_ticks", print_ticks())
    write("whoosh", whoosh())
    write("whoosh_soft", whoosh(0.7, 200, 700, 0.5))
    write("whoosh_rise", whoosh_rise())
    write("whip", whip())
    write("muffle_down", muffle_down())
    write("roll", roll())
    write("riser", riser())
    write("low_note", low_note())
    write("pad_warm", pad())
    write("hollow", hollow())
