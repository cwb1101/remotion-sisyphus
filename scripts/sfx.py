"""用代码合成全部音效（不用任何音效素材）。

用法: python scripts/sfx.py
输出: public/sfx/<名字>.wav（48kHz 单声道 16bit，峰值 -1 dBFS）。音量在 Remotion 里按用途再调。

名字和用途:
  glint        金色反光扫过：高频正弦簇，0.4s 衰减
  tick         小光点出现、刻度：1.8kHz 短正弦，30ms
  thud         落回球面：80Hz 下滑短击，0.25s
  whoosh_up    镜头上升：粉噪声，带通中心 300Hz → 3kHz，1.4s
  whoosh_down  镜头急退：带通 3kHz → 250Hz，1.2s
  swell        低频渐强：110/165Hz 正弦，0.8s
  rev_swell    drop 前反向吸气：噪声 + 下行音高，2.4s 指数渐强，尾端直接切断（对齐 drop）
  boom         重卡点：45Hz 正弦（音高 70→40Hz）+ 低通噪声瞬态 + 轻微饱和，1.6s
  bell         FM 合成钟声，2s
  air          滤过的白噪声铺底，2s
  subdrop      悲伤：120Hz → 38Hz 下滑正弦 + 低通噪声，1.8s，高频全压掉
  stretch      旧认知被撑开：220Hz 慢慢降到 110Hz，带一点颤音，1.4s
  glint_rev    倒放的 glint（重画前的吸回）
"""
import os

import librosa
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
OUT = "public/sfx"
rng = np.random.default_rng(20261018)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def env_ad(n, attack, decay_tau, sec):
    t = t_axis(sec)[:n]
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(0, t - attack) / decay_tau)


def pink(n):
    w = rng.standard_normal(n)
    b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w)


def sweep_band(x, f0, f1, q=2.0):
    """STFT 域里做中心频率随时间移动的带通。"""
    S = librosa.stft(x, n_fft=2048, hop_length=256)
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    n = S.shape[1]
    fc = np.geomspace(f0, f1, n)
    bw = fc / q
    mask = np.exp(-0.5 * ((freqs[:, None] - fc[None, :]) / bw[None, :]) ** 2)
    return librosa.istft(S * mask, hop_length=256, length=len(x))


def norm(x, peak_db=-1.0):
    x = x - np.mean(x)
    return x / (np.abs(x).max() + 1e-12) * 10 ** (peak_db / 20)


def fade_edges(x, fin=0.002, fout=0.01):
    a, b = int(fin * SR), int(fout * SR)
    x[:a] *= np.linspace(0, 1, a)
    x[-b:] *= np.linspace(1, 0, b)
    return x


def glint():
    sec = 0.6
    t = t_axis(sec)
    x = sum(np.sin(2 * np.pi * f * t + p) * g for f, p, g in
            [(2637, 0, 1), (3951, 1.1, 0.6), (5274, 2.3, 0.35), (2650, 0.4, 0.5)])
    return x * env_ad(len(t), 0.005, 0.13, sec)


def tick():
    sec = 0.08
    t = t_axis(sec)
    return np.sin(2 * np.pi * 1800 * t) * env_ad(len(t), 0.001, 0.012, sec)


def thud():
    sec = 0.35
    t = t_axis(sec)
    f = 60 + 60 * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.002, 0.08, sec)
    click = signal.lfilter(*signal.butter(2, 1200 / (SR / 2)), rng.standard_normal(len(t))) * env_ad(len(t), 0.0005, 0.006, sec)
    return x + 0.3 * click


def whoosh(f0, f1, sec):
    n = int(sec * SR)
    x = sweep_band(pink(n), f0, f1, q=1.6)
    t = t_axis(sec)
    e = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.5
    return x * e


def swell():
    sec = 0.9
    t = t_axis(sec)
    x = np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 165 * t) + 0.2 * np.sin(2 * np.pi * 220 * t)
    e = (t / sec) ** 2 * np.clip((sec - t) / 0.08, 0, 1)
    return x * e


def rev_swell():
    sec = 2.4
    t = t_axis(sec)
    noise = sweep_band(pink(len(t)), 400, 6000, q=1.2)
    f = 220 - 80 * (t / sec)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    e = (np.exp(3.2 * t / sec) - 1) / (np.exp(3.2) - 1)
    x = (noise + tone) * e
    x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    return x


def boom():
    sec = 1.6
    t = t_axis(sec)
    f = 40 + 30 * np.exp(-t / 0.12)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.003, 0.45, sec)
    noise = signal.lfilter(*signal.butter(2, 900 / (SR / 2)), rng.standard_normal(len(t))) * env_ad(len(t), 0.001, 0.05, sec)
    tail = signal.lfilter(*signal.butter(2, 300 / (SR / 2)), pink(len(t))) * env_ad(len(t), 0.02, 0.5, sec) * 0.4
    x = body + 0.6 * noise / (np.abs(noise).max() + 1e-9) + tail / (np.abs(tail).max() + 1e-9) * 0.3
    return np.tanh(1.6 * x)


def bell():
    sec = 2.0
    t = t_axis(sec)
    fc, ratio = 660, 1.4
    index = 3.0 * np.exp(-t / 0.4)
    x = np.sin(2 * np.pi * fc * t + index * np.sin(2 * np.pi * fc * ratio * t))
    return x * env_ad(len(t), 0.002, 0.6, sec)


def air():
    sec = 2.0
    t = t_axis(sec)
    x = signal.lfilter(*signal.butter(2, [800 / (SR / 2), 5000 / (SR / 2)], btype="band"), rng.standard_normal(len(t)))
    return x * np.sin(np.pi * t / sec) ** 2


def subdrop():
    sec = 1.8
    t = t_axis(sec)
    f = 38 + 82 * np.exp(-t / 0.35)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.004, 0.7, sec)
    rumble = signal.lfilter(*signal.butter(2, 160 / (SR / 2)), pink(len(t))) * env_ad(len(t), 0.01, 0.6, sec)
    return np.tanh(1.4 * (body + 0.5 * rumble / (np.abs(rumble).max() + 1e-9)))


def stretch():
    sec = 1.4
    t = t_axis(sec)
    f = 220 * np.power(0.5, t / sec) * (1 + 0.01 * np.sin(2 * np.pi * 5 * t))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return x * np.sin(np.pi * t / sec) ** 1.2


SOUNDS = {
    "glint": glint, "tick": tick, "thud": thud,
    "whoosh_up": lambda: whoosh(300, 3000, 1.4), "whoosh_down": lambda: whoosh(3000, 250, 1.2),
    "swell": swell, "rev_swell": rev_swell, "boom": boom, "bell": bell, "air": air,
    "subdrop": subdrop, "stretch": stretch, "glint_rev": lambda: glint()[::-1].copy(),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SOUNDS.items():
        x = fn()
        x = norm(x)
        if name not in ("rev_swell", "glint_rev"):
            x = fade_edges(x)
        sf.write(f"{OUT}/{name}.wav", x.astype(np.float32), SR, subtype="PCM_16")
        print(f"{name:<12} {len(x) / SR:5.2f}s  {int(round(len(x) / SR * 30)):>3} 帧")


if __name__ == "__main__":
    main()
