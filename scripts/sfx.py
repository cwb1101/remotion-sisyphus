"""用代码合成全部音效 输出到 public/sfx/*.wav (48kHz 单声道 16bit)

用法:
    python3 scripts/sfx.py

每个音效都是噪声 正弦 包络 滤波的组合 不用任何素材. 固定随机种子 每次生成结果一样.
"""

from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
OUT = Path(__file__).resolve().parent.parent / "public/sfx"
rng = np.random.default_rng(20261018)


def t(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, attack, decay, curve=4.0):
    """attack 秒线性上升 之后指数衰减 decay 秒到约 -60dB"""
    x = np.arange(n) / SR
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    d = np.exp(-curve * np.maximum(0, x - attack) / max(decay, 1e-4))
    return a * d


def band(x, lo=None, hi=None, order=4):
    if lo and hi:
        sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    elif lo:
        sos = butter(order, lo, btype="high", fs=SR, output="sos")
    else:
        sos = butter(order, hi, btype="low", fs=SR, output="sos")
    return sosfilt(sos, x)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def reverb(x, sec=0.8, mix=0.25, lo=200, hi=5000):
    """简单的噪声冲激响应混响"""
    ir = band(noise(sec), lo, hi) * env(int(sec * SR), 0.002, sec, 5)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = np.convolve(x, ir)[: len(x) + len(ir)]
    dry = np.pad(x, (0, len(wet) - len(x)))
    return dry * (1 - mix) + wet * mix


def norm(x, peak_db=-1.0):
    peak = np.max(np.abs(x)) + 1e-9
    return x / peak * 10 ** (peak_db / 20)


def fade(x, fin=0.002, fout=0.01):
    a, b = int(fin * SR), int(fout * SR)
    x = x.copy()
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def thunk():
    """瓷杯落在木桌上: 低频闷击 + 木头共鸣 + 一点瓷器高频"""
    d = 0.6
    x = t(d)
    body = np.sin(2 * np.pi * (95 + 60 * np.exp(-x * 40)) * x) * env(len(x), 0.001, 0.18)
    wood = band(noise(d), 180, 900) * env(len(x), 0.0005, 0.08) * 0.6
    ring = sum(np.sin(2 * np.pi * f * x) * env(len(x), 0.0005, dd) * g
               for f, dd, g in [(2350, 0.25, 0.08), (3710, 0.18, 0.05)])
    return reverb(body + wood + ring, 0.5, 0.18)


def pour():
    """细水流 4.2 秒: 带通噪声 + 缓慢起伏 + 气泡"""
    d = 4.3
    x = t(d)
    n = band(noise(d), 700, 4200)
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * x) * np.sin(2 * np.pi * 0.7 * x)
    bubbles = np.zeros_like(x)
    for s in rng.uniform(0.1, d - 0.2, 40):
        f = rng.uniform(500, 1400)
        seg = t(0.03)
        i = int(s * SR)
        b = np.sin(2 * np.pi * f * (1 + 4 * seg) * seg) * env(len(seg), 0.001, 0.02)
        bubbles[i:i + len(seg)] += b * rng.uniform(0.1, 0.3)
    shape = np.clip(x / 0.25, 0, 1) * np.clip((d - x) / 0.6, 0, 1)
    return (n * mod * 0.5 + bubbles) * shape


def drip():
    """水滴 嗒: 快速上滑的正弦"""
    d = 0.35
    x = t(d)
    f = 900 + 1800 * (1 - np.exp(-x * 60))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.001, 0.07)
    return reverb(s, 0.4, 0.3)


def creak():
    """椅子轻响: 粗糙的摩擦 锯齿脉冲串"""
    d = 0.45
    x = t(d)
    rate = 55 + 25 * np.sin(2 * np.pi * 2 * x)
    phase = np.cumsum(rate) / SR
    pulses = (np.mod(phase, 1) < 0.08).astype(float)
    s = band(pulses * (0.6 + 0.4 * noise(d)), 300, 2200) * np.sin(np.pi * x / d) ** 1.5
    return s


def slam():
    """重卡点: 低频冲击 + 噪声爆 + 长尾混响"""
    d = 1.6
    x = t(d)
    sub = np.sin(2 * np.pi * (48 + 90 * np.exp(-x * 18)) * x) * env(len(x), 0.002, 0.6, 3)
    knock = band(noise(d), 60, 400) * env(len(x), 0.001, 0.12) * 0.8
    air = band(noise(d), 2000, 9000) * env(len(x), 0.001, 0.05) * 0.25
    return reverb(sub * 1.2 + knock + air, 1.4, 0.3, 80, 3000)


def cup_tap():
    """两只瓷杯轻碰: 几个不谐和泛音"""
    d = 0.5
    x = t(d)
    base = rng.uniform(1800, 2200)
    s = sum(np.sin(2 * np.pi * base * r * x) * env(len(x), 0.0005, dd) * g
            for r, dd, g in [(1, 0.22, 0.5), (2.71, 0.12, 0.3), (4.13, 0.07, 0.2)])
    s += band(noise(d), 3000, 9000) * env(len(x), 0.0003, 0.01) * 0.3
    return reverb(s, 0.3, 0.15)


def step():
    """软底鞋踩木地板: 低频闷声 + 一点擦地"""
    d = 0.25
    x = t(d)
    thud = band(noise(d), 60, 260) * env(len(x), 0.002, 0.05)
    scuff = band(noise(d), 1200, 4000) * env(len(x), 0.004, 0.03) * 0.25
    return thud + scuff


def whoosh():
    """镜头大幅移动的风声: 带通噪声扫频"""
    d = 1.1
    x = t(d)
    n = noise(d)
    out = np.zeros_like(n)
    blocks = 40
    L = len(n) // blocks
    for i in range(blocks):
        c = 300 + 2600 * np.sin(np.pi * i / blocks) ** 2
        seg = band(n[max(0, i * L - 512): (i + 1) * L], c * 0.6, c * 1.6, 2)[-L:]
        out[i * L:(i + 1) * L] = seg
    return out * np.sin(np.pi * x / d) ** 2


def rattle():
    """杯塔摇晃: 一串错开的小碰撞"""
    d = 0.9
    s = np.zeros(int(d * SR))
    for k in range(9):
        c = cup_tap()[: int(0.3 * SR)] * rng.uniform(0.2, 0.5)
        i = int(rng.uniform(0, d - 0.3) * SR)
        s[i:i + len(c)] += c
    return s


def chime():
    """清亮的一声叮"""
    d = 1.5
    x = t(d)
    s = sum(np.sin(2 * np.pi * f * x) * env(len(x), 0.001, dd) * g
            for f, dd, g in [(1568, 1.2, 0.5), (3136, 0.6, 0.2), (4704, 0.3, 0.1)])
    return reverb(s, 1.0, 0.3)


def clap():
    """击掌 啪"""
    d = 0.3
    x = t(d)
    s = band(noise(d), 700, 5000) * env(len(x), 0.0005, 0.04)
    return reverb(s, 0.3, 0.2)


def glint():
    """杯子凭空出现时的细小金光声"""
    d = 0.6
    x = t(d)
    f = 2600 + 900 * x / d
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.01, 0.3) * 0.4
    return reverb(s, 0.6, 0.35)


SOUNDS = {
    "thunk": thunk, "pour": pour, "drip": drip, "creak": creak, "slam": slam,
    "cupTap": cup_tap, "step": step, "whoosh": whoosh, "rattle": rattle,
    "chime": chime, "clap": clap, "glint": glint,
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in SOUNDS.items():
        x = fade(norm(fn()))
        sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR, subtype="PCM_16")
        print(f"{name:8s} {len(x) / SR:.2f}s")


if __name__ == "__main__":
    main()
