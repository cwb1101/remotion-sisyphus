#!/usr/bin/env bash
# 成片自查：抽帧拼联系表 + 音频峰值/高频能量检测
set -euo pipefail
VIDEO=${1:-out/preview.mp4}
OUT=out/qa
rm -rf "$OUT" && mkdir -p "$OUT/every2s" "$OUT/open05"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
for t in $(seq 0 2 "${DUR%.*}"); do
  ffmpeg -v error -ss "$t" -i "$VIDEO" -frames:v 1 "$OUT/every2s/f$(printf %04d $((t*30))).png"
done
for t in 0 0.5 1 1.5 2 2.5 3 3.5 4 4.5; do
  f=$(python3 -c "print(round($t*30))")
  ffmpeg -v error -ss "$t" -i "$VIDEO" -frames:v 1 "$OUT/open05/f$(printf %04d $f).png"
done
python3 scripts/sheet.py "$OUT/sheet_every2s_a.png" $(ls "$OUT"/every2s/*.png | head -8)
python3 scripts/sheet.py "$OUT/sheet_every2s_b.png" $(ls "$OUT"/every2s/*.png | tail -n +9)
python3 scripts/sheet.py "$OUT/sheet_open05.png" "$OUT"/open05/*.png
echo "== 音频：整体峰值 / 响度 =="
ffmpeg -v info -i "$VIDEO" -af astats=metadata=0:measure_perchannel=none -f null - 2>&1 | grep -E "Peak level dB|RMS level dB" | tail -2
ffmpeg -v info -i "$VIDEO" -af ebur128=peak=true -f null - 2>&1 | grep -A2 "True peak" | tail -2
echo "== 音频：4kHz 以上能量（越低越不刺耳） =="
ffmpeg -v info -i "$VIDEO" -af "highpass=f=4000,highpass=f=4000,astats=metadata=0:measure_perchannel=none" -f null - 2>&1 | grep -E "Peak level dB|RMS level dB" | tail -2
