#!/usr/bin/env bash
# 完整片分段渲染：每个场景单独渲一段（静音）→ 无损拼接 → 整片混音 → 响度统一 → 合成 out/film.mp4
# 用法：npm run render:film            全部重渲
#       SEG=03-seawall npm run render:film  只重渲某一段（其余用已有的分段文件）
set -euo pipefail
cd "$(dirname "$0")/.."
npm run prepare-assets
mkdir -p out/seg
npx tsx scripts/segments.ts > out/seg/segments.txt
while read -r name a b; do
  if [[ -n "${SEG:-}" && "$SEG" != "$name" && -f "out/seg/$name.mp4" ]]; then continue; fi
  echo "▶ 渲染 $name（第 $a–$b 帧）"
  npx remotion render Film "out/seg/$name.mp4" --frames="$a-$b" --muted --crf=20 --log=error
done < out/seg/segments.txt
# 无损拼接
: > out/seg/list.txt
while read -r name a b; do echo "file '$name.mp4'" >> out/seg/list.txt; done < out/seg/segments.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -c copy out/film-video.mp4
# 整片混音 + 响度统一（-16 LUFS，峰值 -1.5 dBTP）
npx tsx scripts/mix-audio.ts
ffmpeg -y -loglevel error -i out/film-audio.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 out/film-audio-norm.wav
ffmpeg -y -loglevel error -i out/film-video.mp4 -i out/film-audio-norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/film.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/film.mp4
echo "✓ out/film.mp4"
