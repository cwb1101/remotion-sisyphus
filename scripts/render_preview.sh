#!/usr/bin/env bash
# 渲染预览：校验字幕数据 → 合成音效 → Remotion 渲染无声画面 → ffmpeg 封装原始音效 → 音频自检
# 音频不经过 Remotion：避免单声道上混被压低 3dB，以及 AAC 前置延迟导致的约 43ms 声画偏移
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/subtitle_rules.py
python3 scripts/synth_sfx.py
npx remotion render Preview out/preview_video.mp4 --codec=h264 --crf=18 --muted --concurrency="${CONCURRENCY:-4}"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/preview_video.mp4)
ffmpeg -loglevel error -y -i out/preview_video.mp4 -i public/audio/sfx.wav \
  -map 0:v -map 1:a -c:v copy -af "pan=stereo|c0=c0|c1=c0" -c:a aac -b:a 192k -ar 48000 \
  -t "$dur" -movflags +faststart out/preview.mp4
python3 scripts/audio_check.py out/preview.mp4
