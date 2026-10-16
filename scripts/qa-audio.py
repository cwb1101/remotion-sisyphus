"""音频自检：响度、峰值、削波、超 -6 dBFS 的时间点、噪声单轨的嘶声/轰鸣、咔哒检测、静音是否干净。

用法：python3 scripts/qa-audio.py out/preview.mp4 [out/audio-qa]
  第一个参数：要检查的成片（mp4 或 wav）
  第二个参数（可选）：synth-audio.mjs --stems 导出的单轨目录
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 48000


def decode(path):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', '2', '-ar', str(SR), '-'],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype='<i2').reshape(-1, 2).astype(np.float64) / 32768.0


def ebur128(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true+sample', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    tail = out[out.rfind('Summary:'):]
    grab = lambda key: float(re.search(key + r':\s+(-?[\d.inf]+)', tail).group(1))
    return {'integrated_LUFS': grab('I'), 'LRA_LU': grab('LRA'), 'sample_peak_dBFS': grab(r'Sample peak:\s+Peak'), 'true_peak_dBTP': grab(r'True peak:\s+Peak')}


def astats(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'astats=measure_perchannel=none', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    grab = lambda key: re.search(key + r':\s+(-?[\d.inf]+)', out).group(1)
    return {'peak_dBFS': float(grab('Peak level dB')), 'rms_dBFS': float(grab('RMS level dB')), 'noise_floor_dBFS': grab('Noise floor dB')}


def db(x):
    return -np.inf if x <= 0 else 20 * np.log10(x)


def band_energy_db(x, lo, hi):
    """lo–hi Hz 频段能量相对全频段（dB）"""
    spec = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    tot = spec.sum()
    part = spec[(f >= lo) & (f < hi)].sum()
    return 10 * np.log10(part / tot) if part > 0 and tot > 0 else -np.inf


def clicks(x, label):
    """咔哒检测：二阶差分出现孤立尖峰（相对 5ms 局部水平 ≥ 12 倍、绝对值高于 -70dBFS）。"""
    d2 = np.abs(np.diff(x, 2))
    win = int(0.005 * SR)
    local = np.convolve(d2, np.ones(win) / win, mode='same') + 1e-12
    hits = np.where((d2 > 12 * local) & (d2 > 10 ** (-70 / 20)))[0]
    # 起止样本跳变：第一个/最后一个样本应接近 0
    edge = max(abs(x[0]), abs(x[-1]))
    return {'label': label, 'click_candidates': int(len(hits)), 'first_times_s': [round(h / SR, 4) for h in hits[:5]], 'edge_sample_dBFS': round(db(edge), 1)}


def main():
    target = Path(sys.argv[1])
    stem_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    report = {'file': str(target)}
    report['ebur128'] = ebur128(target)
    report['astats'] = astats(target)

    x = decode(target)
    mono_peak = np.abs(x).max(axis=1)
    report['clipped_samples'] = int((np.abs(x) >= 32767 / 32768).sum())
    over = mono_peak > 10 ** (-6 / 20)
    spans = []
    if over.any():
        idx = np.where(over)[0]
        start = idx[0]
        for a, b in zip(idx, np.append(idx[1:], -1)):
            if b != a + 1:
                spans.append([round(start / SR, 3), round(a / SR, 3)])
                start = b
    report['over_-6dBFS_spans_s'] = spans

    # 静音是否干净：持续 ≥50ms 的“近乎没声音”（< -80dBFS）段里，必须全是数字 0（没有底噪/抖动）
    quiet = mono_peak < 10 ** (-80 / 20)
    runs, nonzero, i, n = 0, 0, 0, len(quiet)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if j - i >= int(0.05 * SR):
                runs += 1
                nonzero += int((mono_peak[i:j] > 0).sum())
            i = j
        else:
            i += 1
    report['silent_runs_over_50ms'] = runs
    report['nonzero_samples_inside_silence'] = nonzero

    report['mix_clicks'] = clicks(x.mean(axis=1), 'mix')

    if stem_dir and stem_dir.exists():
        stems = []
        for p in sorted(stem_dir.glob('stem_*.wav')):
            s = decode(p).mean(axis=1)
            nz = s[np.abs(s) > 0]
            if not len(nz):
                continue
            item = clicks(s, p.stem)
            item['peak_dBFS'] = round(db(np.abs(s).max()), 2)
            item['energy_above_6k_dB'] = round(band_energy_db(s, 6000, SR / 2), 1)
            item['energy_below_100_dB'] = round(band_energy_db(s, 0, 100), 1)
            stems.append(item)
            if 'crawlSand' in p.stem:
                # 放大 30dB 单独导出，方便人工监听（嘶声/咔哒最容易在放大后暴露）
                loud = np.clip(s * 10 ** (30 / 20), -1, 1)
                loud_i16 = (loud * 32767).astype('<i2')
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(stem_dir / 'sand_x30dB.wav')],
                               input=loud_i16.tobytes(), check=True)
                item['amplified_copy'] = str(stem_dir / 'sand_x30dB.wav')
                item['amplified_peak_dBFS'] = round(db(np.abs(loud).max()), 1)
        report['stems'] = stems
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
