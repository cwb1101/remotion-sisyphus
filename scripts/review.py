#!/usr/bin/env python3
"""成片自查：静止段落、静音段、爆音点、响度。用法：python3 scripts/review.py out/don-quixote.mp4"""
import json, math, struct, subprocess, sys

video = sys.argv[1]
FPS_SAMPLE = 10
W, H = 96, 54
STATIC_SEC = 2.0

# ---------- 画面静止检测：低分辨率灰度帧之间的平均差（颗粒在低分辨率下被平均掉） ----------
raw = subprocess.run(
    ['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps={FPS_SAMPLE},scale={W}:{H}:flags=area,format=gray', '-f', 'rawvideo', '-'],
    capture_output=True, check=True).stdout
n = len(raw) // (W * H)
frames = [raw[i * W * H:(i + 1) * W * H] for i in range(n)]
diffs = [0.0]
for i in range(1, n):
    a, b = frames[i - 1], frames[i]
    diffs.append(sum(abs(a[k] - b[k]) for k in range(0, W * H, 2)) / (W * H / 2))
diffs_sorted = sorted(diffs[1:])
p10 = diffs_sorted[len(diffs_sorted) // 10]
thr = 0.35
runs, start = [], None
for i, d in enumerate(diffs):
    if d < thr:
        start = i if start is None else start
    else:
        if start is not None and (i - start) / FPS_SAMPLE >= STATIC_SEC:
            runs.append((start / FPS_SAMPLE, i / FPS_SAMPLE))
        start = None
if start is not None and (n - start) / FPS_SAMPLE >= STATIC_SEC:
    runs.append((start / FPS_SAMPLE, n / FPS_SAMPLE))

# ---------- 音频：静音段、0.5 秒窗口峰值、整体响度 ----------
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
m = len(pcm) // 2
s = struct.unpack('<%dh' % m, pcm)
win = 4000
peaks, quiet = [], []
for i in range(0, m, win):
    seg = s[i:i + win]
    p = max(abs(x) for x in seg) / 32768 if seg else 0
    rms = math.sqrt(sum(x * x for x in seg) / max(1, len(seg))) / 32768
    db = 20 * math.log10(p) if p > 0 else -99
    rdb = 20 * math.log10(rms) if rms > 0 else -99
    peaks.append((i / 8000, db, rdb))
loud = subprocess.run(['ffmpeg', '-hide_banner', '-i', video, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
summary = loud[loud.rfind('Summary:'):]
sil = subprocess.run(['ffmpeg', '-hide_banner', '-i', video, '-af', 'silencedetect=noise=-50dB:d=0.4', '-f', 'null', '-'], capture_output=True, text=True).stderr
silences = [l.strip() for l in sil.splitlines() if 'silence_' in l]

report = {
    'video': video,
    'motion': {'sample_fps': FPS_SAMPLE, 'threshold': thr, 'p10_diff': round(p10, 3), 'static_runs_over_2s': [(round(a, 1), round(b, 1)) for a, b in runs]},
    'audio': {
        'windows_peak_over_-1dB': [(round(t, 1), round(db, 1)) for t, db, _ in peaks if db > -1.0],
        'windows_rms_under_-45dB': [(round(t, 1), round(r, 1)) for t, _, r in peaks if r < -45],
        'silencedetect_-50dB': silences,
        'ebur128_summary': summary.strip(),
    },
    'loudest_windows': [(round(t, 1), round(db, 1)) for t, db, _ in sorted(peaks, key=lambda x: -x[1])[:8]],
}
print(json.dumps(report, ensure_ascii=False, indent=2))
