#!/usr/bin/env python3
"""用代码合成全片音效到 public/audio/sfx/，按档位统一电平。

用法：python3 scripts/sfx.py

- 三档：轻 -30 LUFS，中 -24 LUFS，重卡点 -21 LUFS（只比中档高 3dB）。
  电平用 ffmpeg ebur128 量瞬时响度（momentary 400ms）的最大值，把它对齐到目标。
- 每个音效起音不短于 5ms；4kHz 以上柔化；45Hz 以下切掉；真峰不超过 -1dBTP。
- 同时写出 src/data/sfx-manifest.json（时长 档位 实测响度），给 Remotion 和检查脚本用。
"""

import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "sfx"
MANIFEST = ROOT / "src" / "data" / "sfx-manifest.json"
SR = 48000
FPS = 30
TARGET = {"light": -30.0, "mid": -24.0, "heavy": -21.0}
MIN_ATTACK = 0.005

rng = np.random.default_rng(20261020)


# —— 基础构件 ——
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env(dur, attack=0.006, decay=0.2, hold=0.0, curve="exp"):
    """起音用升余弦（不短于 5ms），之后保持 hold，再指数衰减"""
    attack = max(attack, MIN_ATTACK)
    t = t_axis(dur)
    e = np.ones_like(t)
    a = t < attack
    e[a] = 0.5 - 0.5 * np.cos(np.pi * t[a] / attack)
    d = t >= attack + hold
    if curve == "exp":
        e[d] = np.exp(-(t[d] - attack - hold) / max(decay, 1e-3))
    else:
        e[d] = np.clip(1 - (t[d] - attack - hold) / decay, 0, 1)
    return e


def spectral(x, lo=45.0, hi=None, soft=4000.0):
    """频域整形：45Hz 以下切掉，hi 以上切掉，soft 以上平滑滚降（柔化高频）"""
    n = len(x)
    X = np.fft.rfft(x, n=n * 2)
    f = np.fft.rfftfreq(n * 2, 1 / SR)
    g = 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 8)
    g *= 1 / np.sqrt(1 + (f / soft) ** 6)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 8)
    return np.fft.irfft(X * g)[:n]


def band_noise(dur, lo, hi):
    n = rng.standard_normal(int(dur * SR))
    return spectral(n, lo=lo, hi=hi, soft=min(hi * 1.2, 4000))


def modal(dur, f0, ratios, amps, decays, detune=0.0):
    """模态合成：一组衰减的正弦，木头 陶瓷 铃的音色"""
    t = t_axis(dur)
    out = np.zeros_like(t)
    for r, a, d in zip(ratios, amps, decays):
        f = f0 * r * (1 + detune * rng.uniform(-1, 1))
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    return out


def place(dst, src, at):
    i = int(at * SR)
    end = min(len(dst), i + len(src))
    dst[i:end] += src[: end - i]
    return dst


def silence(dur):
    return np.zeros(int(dur * SR))


# —— 音色 ——
def wood_knock(f0=420, dur=0.45, decay=0.09, click=0.25, attack=0.005):
    x = modal(dur, f0, [1, 2.31, 3.86, 5.4], [1, 0.45, 0.22, 0.1], [decay, decay * 0.7, decay * 0.45, decay * 0.3])
    c = band_noise(dur, 900, 3200) * env(dur, attack, 0.012) * click
    return (x + c) * env(dur, attack, decay * 3)


def cloth(dur=0.45, lo=350, hi=2800, level=1.0):
    n = band_noise(dur, lo, hi)
    am = 0.6 + 0.4 * np.abs(spectral(rng.standard_normal(len(n)), lo=4, hi=28, soft=40))
    am /= am.max()
    return n * am * env(dur, 0.04, dur * 0.35, hold=dur * 0.2) * level


def paper(dur=0.5, crackle=0.6):
    base = band_noise(dur, 700, 3800) * env(dur, 0.02, dur * 0.4, hold=dur * 0.15)
    clicks = silence(dur)
    for _ in range(int(dur * 40 * crackle)):
        at = rng.uniform(0, dur * 0.85)
        g = band_noise(0.012, 1200, 3800) * env(0.012, 0.005, 0.004)
        place(clicks, g * rng.uniform(0.3, 1), at)
    return base * 0.6 + clicks


def thud(f0=95, dur=0.3, decay=0.08):
    t = t_axis(dur)
    f = f0 * (1 + 0.5 * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(dur, 0.006, decay)


def footstep():
    d = 0.22
    return thud(105, d, 0.05) * 0.9 + band_noise(d, 300, 1600) * env(d, 0.006, 0.035) * 0.5


def splash(n=3, dur=0.5):
    x = silence(dur)
    for i in range(n):
        g = band_noise(0.14, 450, 3400) * env(0.14, 0.008, 0.045)
        place(x, g * (1 - i * 0.2), i * 0.07 + rng.uniform(0, 0.02))
    return x


def bell(f0=520, dur=2.2, decay=0.9):
    return modal(dur, f0, [1, 2.0, 2.76, 4.07], [1, 0.4, 0.3, 0.12], [decay, decay * 0.6, decay * 0.5, decay * 0.3]) * env(dur, 0.012, decay * 2.5)


def creak(dur=0.35, f0=320):
    t = t_axis(dur)
    f = f0 * (1 + 0.12 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    return spectral(saw, lo=150, soft=2200) * env(dur, 0.03, dur * 0.4, hold=dur * 0.3) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 23 * t)))


def recipes():
    R = {}
    # 木碗落桌：木头敲击 + 一次小回弹
    x = wood_knock(380, 0.6, 0.085)
    R["bowl-wood-land"] = ("mid", "木碗落桌", place(x, wood_knock(410, 0.3, 0.05) * 0.3, 0.075))
    R["cloth"] = ("light", "衣料摩擦", cloth())
    # 重卡点1：低木块 + 柔化铜钟余音
    x = wood_knock(150, 2.4, 0.16, click=0.15) * 1.0
    R["heavy-wood-bell"] = ("heavy", "重卡点1 低木块加柔化钟余音", x + bell(520, 2.4, 0.8) * 0.32)
    R["scroll"] = ("light", "纸卷展开", paper(0.7, 0.8))
    w = silence(0.6)
    for i in range(2):
        place(w, band_noise(0.18, 150, 1200) * env(0.18, 0.03, 0.06), i * 0.17)
    R["wing"] = ("light", "鹰翅轻扇", w)
    x = wood_knock(150, 0.8, 0.1) + place(silence(0.8), splash(2, 0.5) * 0.7, 0.03)
    R["tub-set"] = ("mid", "放进木盆", x)
    R["splash"] = ("light", "拍水", splash(3))
    t = t_axis(0.4)
    R["chisel"] = ("light", "刻刀刮纸", band_noise(0.4, 1400, 3600) * env(0.4, 0.02, 0.12, hold=0.1) * (0.7 + 0.3 * np.sin(2 * np.pi * 31 * t)))
    # 木碗落地：三次弹跳 + 滚动
    x = silence(1.3)
    for at, f, g in [(0, 400, 1), (0.13, 430, 0.5), (0.24, 450, 0.3), (0.31, 470, 0.18)]:
        place(x, wood_knock(f, 0.3, 0.05) * g, at)
    tt = t_axis(0.8)
    roll = band_noise(0.8, 250, 1300) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt) ** 2) * env(0.8, 0.02, 0.25) * 0.25
    R["bowl-fall-roll"] = ("mid", "木碗落地滚动", place(x, roll, 0.34))
    R["bowl-set-soft"] = ("light", "木碗轻放", wood_knock(400, 0.4, 0.06, attack=0.009))
    R["bowl-slide"] = ("light", "碗推动", band_noise(0.35, 200, 1400) * env(0.35, 0.02, 0.1, hold=0.12))
    R["door-close"] = ("light", "木门轻合", thud(85, 0.5, 0.12) + place(silence(0.5), wood_knock(900, 0.2, 0.02) * 0.25, 0.05))
    R["page-turn"] = ("light", "翻页", paper(0.35, 0.3))
    q = silence(0.7)
    for i in range(6):
        place(q, band_noise(0.06, 1800, 3800) * env(0.06, 0.006, 0.02), i * 0.1 + rng.uniform(0, 0.03))
    R["quill"] = ("light", "鹅毛笔写字", q)
    R["clap"] = ("light", "拍手", band_noise(0.15, 700, 2600) * env(0.15, 0.005, 0.03) + thud(210, 0.15, 0.03) * 0.3)
    R["paper-rub"] = ("light", "纸面轻摩擦", band_noise(0.35, 600, 3000) * env(0.35, 0.04, 0.1, hold=0.1))
    x = wood_knock(300, 1.4, 0.09) + modal(1.4, 880, [1, 2.51], [0.3, 0.12], [0.5, 0.3]) * env(1.4, 0.01, 0.6)
    R["title-hit"] = ("mid", "出字 木块加碗沿轻响", x)
    R["pencil"] = ("light", "铅笔描线", band_noise(0.45, 2000, 3900) * env(0.45, 0.02, 0.15, hold=0.15))
    R["stopwatch"] = ("light", "秒表按下", wood_knock(1500, 0.12, 0.012, click=0.1) + place(silence(0.12), wood_knock(1700, 0.08, 0.01) * 0.5, 0.04))
    R["chair-rock"] = ("light", "婴儿椅轻晃", creak(0.4, 260) * 0.8)
    R["freeze-click"] = ("mid", "定格 柔和木质咔", wood_knock(700, 0.4, 0.04) + thud(180, 0.4, 0.06) * 0.5)
    R["chair-creak"] = ("light", "椅子吱", creak(0.3, 380))
    x = modal(0.9, 950, [1, 2.71, 5.15], [1, 0.4, 0.15], [0.22, 0.12, 0.06]) * env(0.9, 0.005, 0.3)
    R["bowl-porcelain-land"] = ("mid", "瓷碗落桌", x + thud(140, 0.9, 0.05) * 0.6)
    R["paper"] = ("light", "纸张", paper(0.4, 0.5))
    R["footstep"] = ("light", "脚步", footstep())
    R["chopsticks"] = ("light", "筷子碰碗", wood_knock(2200, 0.2, 0.015, click=0.05) + place(silence(0.2), wood_knock(2400, 0.1, 0.012) * 0.6, 0.06))
    t = t_axis(0.2)
    R["swallow"] = ("light", "吞咽", np.sin(2 * np.pi * np.cumsum(220 - 80 * t / 0.2) / SR) * env(0.2, 0.01, 0.05))
    R["room-tone"] = ("light", "环境底噪", band_noise(2.4, 60, 600) * env(2.4, 0.4, 0.6, hold=1.2))
    x = thud(72, 1.5, 0.35) + thud(140, 1.5, 0.12) * 0.5 + band_noise(1.5, 60, 400) * env(1.5, 0.008, 0.1) * 0.3
    R["heavy-thud"] = ("heavy", "重卡点2 闷低音", x)
    x = wood_knock(260, 2.0, 0.12) + modal(2.0, 260, [1, 2.42, 4.1], [0.5, 0.25, 0.1], [1.0, 0.6, 0.3]) * env(2.0, 0.008, 1.0)
    R["heavy-bowl-resonance"] = ("heavy", "重卡点3 木碗放下的木质共鸣", x)
    sn = silence(0.4)
    for at in (0, 0.16):
        place(sn, modal(0.15, 1500, [1, 1.8], [0.6, 0.3], [0.03, 0.02]) * env(0.15, 0.005, 0.03) + band_noise(0.15, 1500, 3800) * env(0.15, 0.005, 0.02) * 0.5, at)
    R["scissors"] = ("light", "剪刀", sn)
    R["box-open"] = ("light", "木盒打开", creak(0.3, 300) * 0.6 + place(silence(0.3), wood_knock(500, 0.2, 0.03) * 0.6, 0.18))
    ty = silence(0.4)
    for at in (0, 0.18):
        place(ty, wood_knock(1900, 0.1, 0.01, click=0.2) * 0.7, at)
    R["typing"] = ("light", "打字", ty)
    R["paper-unfold"] = ("light", "纸张展开", paper(0.5, 0.9))
    return R


# —— 电平 ——
def write_wav(path, x):
    pcm = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((pcm * 32767).astype("<i2").tobytes())


def measure(path):
    """返回（瞬时响度最大值 LUFS，真峰 dBTP）"""
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "apad=pad_dur=0.5,ebur128=peak=true:framelog=info", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    ms = [float(m) for m in re.findall(r"M:\s*(-?[\d.]+)", r.stderr) if float(m) > -120]
    tp = re.findall(r"Peak:\s*(-?[\d.]+|-inf)\s*dBFS", r.stderr)
    return max(ms), float(tp[-1]) if tp and tp[-1] != "-inf" else -99.0


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for sid, (tier, label, x) in recipes().items():
        x = np.asarray(x, dtype=np.float64)
        # 尾部 30ms 淡出，防止截断爆音
        fade = min(len(x), int(0.03 * SR))
        x[-fade:] *= np.linspace(1, 0, fade)
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.5
        path = OUT / f"{sid}.wav"
        for _ in range(3):
            write_wav(path, x)
            m, tp = measure(path)
            gain = TARGET[tier] - m
            if abs(gain) < 0.2:
                break
            x = x * 10 ** (gain / 20)
        m, tp = measure(path)
        if tp > -1.0:
            raise SystemExit(f"{sid} 真峰 {tp} dBTP 超过 -1")
        manifest[sid] = {
            "file": f"audio/sfx/{sid}.wav",
            "tier": tier,
            "label": label,
            "durationFrames": int(np.ceil(len(x) / SR * FPS)),
            "momentaryMax": round(m, 1),
            "truePeak": round(tp, 1),
        }
        print(f"{sid:<22} {tier:<6} M max {m:6.1f} LUFS  峰 {tp:6.1f} dBTP  {label}")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写入 {len(manifest)} 个音效和 {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
