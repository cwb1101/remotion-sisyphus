"""
渲染后自检：每 2 秒抽一帧 + 画风数值检查 + 噪点闪烁检查 + 音频检查
用法：python3 scripts/review.py out/preview.mp4
输出：out/review/ 下的抽帧图片和检查结果
"""
import colorsys
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else 'out/preview.mp4'
out_dir = os.path.join(os.path.dirname(src), 'review')
os.makedirs(out_dir, exist_ok=True)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).stdout.strip())

# 1. 每 2 秒抽一帧
times = [t for t in np.arange(0, dur, 2.0)]
frames = []
for t in times:
    p = os.path.join(out_dir, f't{t:05.1f}.png')
    run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t:.3f}', '-i', src, '-frames:v', '1', p])
    frames.append((t, p))

report = {'duration': dur, 'frames': []}
for t, p in frames:
    im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mx = im.max(axis=2)
    mn = im.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # 色相（度）
    hue = np.zeros_like(mx)
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == r, ((g - b) / d) % 6, hue)
    hue = np.where(mx == g, (b - r) / d + 2, hue)
    hue = np.where(mx == b, (r - g) / d + 4, hue)
    hue = hue * 60
    bright_warm = (mx > 0.55) & (sat > 0.25)
    lemon = bright_warm & (hue > 46) & (hue < 70)
    harsh = (r > 0.98) & (g > 0.84) & (b < 0.2)  # #FFD700 一类刺眼亮金
    cold_white = (mx > 0.85) & (b > r + 0.02)
    pure_black = (im.sum(axis=2) == 0)
    report['frames'].append({
        't': round(float(t), 1),
        'pure_black_px': int(pure_black.sum()),
        'darkest_rgb': [int(v * 255) for v in im.reshape(-1, 3)[im.sum(axis=2).argmin()]],
        'bright_warm_px': int(bright_warm.sum()),
        'bright_warm_hue_median': round(float(np.median(hue[bright_warm])), 1) if bright_warm.any() else None,
        'lemon_px': int(lemon.sum()),
        'harsh_gold_px': int(harsh.sum()),
        'cold_white_px': int(cold_white.sum()),
    })

# 2. 噪点闪烁：取画面角落一块纯背景，连续 30 帧的平均亮度波动
flicker_dir = os.path.join(out_dir, 'flicker')
os.makedirs(flicker_dir, exist_ok=True)
run(['ffmpeg', '-y', '-v', 'error', '-ss', '20', '-i', src, '-frames:v', '30', os.path.join(flicker_dir, 'f%02d.png')])
means = []
for i in range(1, 31):
    fp = os.path.join(flicker_dir, f'f{i:02d}.png')
    if not os.path.exists(fp):
        break
    im = np.asarray(Image.open(fp).convert('L')).astype(np.float32)
    means.append(float(im[900:1060, 1700:1900].mean()))
report['flicker_patch_mean'] = [round(m, 2) for m in means]
report['flicker_max_step'] = round(float(np.max(np.abs(np.diff(means)))) if len(means) > 1 else 0, 3)

# 3. 音频：峰值、响度、高频占比、是否有削波
astats = run(['ffmpeg', '-v', 'info', '-i', src, '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-']).stderr
peak = re.findall(r'Peak level dB: ([-\d.inf]+)', astats)
report['audio_peak_db_per_channel_and_overall'] = peak
hp = run(['ffmpeg', '-v', 'info', '-i', src, '-af', 'highpass=f=4000,highpass=f=4000,astats=metadata=0', '-f', 'null', '-']).stderr
report['audio_above_4khz_rms_db'] = re.findall(r'RMS level dB: ([-\d.inf]+)', hp)[-1:]
full = re.findall(r'RMS level dB: ([-\d.inf]+)', astats)
report['audio_full_rms_db'] = full[-1:]
loud = run(['ffmpeg', '-v', 'info', '-i', src, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
m = re.search(r'Integrated loudness:\s+I:\s+([-\d.]+) LUFS', loud)
tp = re.search(r'True peak:\s+Peak:\s+([-\d.]+) dBFS', loud)
report['audio_integrated_lufs'] = m.group(1) if m else None
report['audio_true_peak_dbfs'] = tp.group(1) if tp else None

# 4. 逐 50ms 窗口的峰值，找最响的时刻
data = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768
win = 2400
peaks = [float(np.abs(x[i:i + win]).max()) for i in range(0, len(x) - win, win)]
order = np.argsort(peaks)[::-1][:5]
report['audio_loudest_windows'] = [{'t': round(i * win / 48000, 2), 'peak_db': round(20 * np.log10(max(peaks[i], 1e-9)), 1)} for i in order]
# 相邻采样跳变（咔哒声的迹象）
steps = np.abs(np.diff(x))
report['audio_max_sample_step'] = round(float(steps.max()), 4)

with open(os.path.join(out_dir, 'report.json'), 'w') as f:
    json.dump(report, f, ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False, indent=1))
