"""音频自检：响度、峰值、削波、超 -6 dBFS 的时间点、静音段（silencedetect）、各节接缝、
关键句是否最响、噪声单轨的嘶声/轰鸣、咔哒检测、静音是否干净。

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


SCRIPT = json.loads(Path(__file__).resolve().parent.parent.joinpath('src/data/script.json').read_text())


def silences(path, noise_db=-50, dur=0.3):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', f'silencedetect=noise={noise_db}dB:d={dur}', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', out)]
    ends = [float(x) for x in re.findall(r'silence_end: (-?[\d.]+)', out)]
    return [{'from_s': round(a, 2), 'to_s': round(b, 2) if i < len(ends) else None} for i, (a, b) in enumerate(zip(starts, ends + [None] * len(starts)))]


def momentary(path):
    """ebur128 每 100ms 一个瞬时响度 M（400ms 窗）。"""
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-v', 'verbose', '-i', str(path), '-af', 'ebur128=framelog=verbose', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    rows = re.findall(r't:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.inf]+)', out)
    return [(float(t), float(m)) for t, m in rows if m not in ('-inf', 'inf')]


def seam_report(x, fps):
    """各节接缝前后：50ms 窗口的峰值/响度不能突跳，也不能掉成静音；接缝附近不能有咔哒。"""
    rep = []
    for sec in SCRIPT['sections'][1:]:
        t = sec['start'] / fps
        n = int(t * SR)
        win = int(0.05 * SR)
        seg = x[max(0, n - 10 * win):n + 10 * win].mean(axis=1)
        rms = [float(np.sqrt(np.mean(seg[i:i + win] ** 2)) + 1e-12) for i in range(0, len(seg) - win, win)]
        rms_db = [20 * np.log10(r) for r in rms]
        jump = max(abs(a - b) for a, b in zip(rms_db, rms_db[1:]))
        c = clicks(seg, sec['id'])
        rep.append({'section': sec['id'], 't_s': round(t, 3), 'min_rms_dBFS': round(min(rms_db), 1), 'max_peak_dBFS': round(db(np.abs(seg).max()), 1),
                    'max_50ms_step_dB': round(jump, 1), 'click_candidates': c['click_candidates']})
    return rep


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
    report['silences_below_-50dB_over_0.3s'] = silences(target)
    report['seams'] = seam_report(x, SCRIPT['fps'])

    # 关键句（强档）是否最响：每个强档音效 2 秒内的最大瞬时响度，与全片其余时间的最大值比较
    mom = momentary(target)
    strong_ts = [(c['id'], (c['start'] + (c['beats'].get(s['beat'], 0) if s.get('beat') else 0)) / SCRIPT['fps'])
                 for c in SCRIPT['cues'] for s in c['sfx'] if s['level'] == 'strong']
    in_strong = lambda t: any(0 <= t - ts <= 2.0 for _, ts in strong_ts)
    report['strong_cues_max_momentary_LUFS'] = {str(cid): round(max((m for t, m in mom if 0 <= t - ts <= 2.0), default=float('nan')), 1) for cid, ts in strong_ts}
    report['elsewhere_max_momentary_LUFS'] = round(max((m for t, m in mom if not in_strong(t)), default=float('nan')), 1)

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
