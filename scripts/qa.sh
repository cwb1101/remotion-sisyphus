#!/usr/bin/env bash
# 渲染后自检：抽帧拼联系表 + 音频峰值/响度/咔哒声/高频占比分析
# 用法：bash scripts/qa.sh out/preview.mp4
set -euo pipefail
VID=${1:-out/preview.mp4}
DIR=out/qa
rm -rf "$DIR" && mkdir -p "$DIR/every2s" "$DIR/first5s"

# 每 2 秒一帧（0s, 2s, 4s …）
ffmpeg -loglevel error -i "$VID" -vf "fps=1/2" -start_number 0 "$DIR/every2s/t%02d.png"
# 前 5 秒每 0.5 秒一帧（取每个 0.5s 时刻的帧）
for t in 0 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5; do
  ffmpeg -loglevel error -ss "$t" -i "$VID" -frames:v 1 "$DIR/first5s/s$(printf '%04.1f' "$t").png"
done
python3 scripts/sheet.py "$DIR/sheet_every2s.jpg" 4 "$DIR"/every2s/*.png
python3 scripts/sheet.py "$DIR/sheet_first5s.jpg" 4 "$DIR"/first5s/*.png

# 音频
ffmpeg -loglevel error -i "$VID" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$DIR/audio.wav"
python3 scripts/audio_check.py "$DIR/audio.wav"
ffmpeg -hide_banner -nostats -i "$DIR/audio.wav" -filter_complex ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary" || true
