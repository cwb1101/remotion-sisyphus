#!/usr/bin/env bash
# 渲染完整片：校验字幕 → 合成音效 → 打包一次 → 分段渲染无声画面 → 拼接 → 封装整条音轨 → 自检
# 音轨只封装一次（不分段），各段接缝处不会有音频断点；接缝处另有检查脚本
set -euo pipefail
cd "$(dirname "$0")/.."
SEG="${SEG_FRAMES:-750}"
TOTAL=$(python3 -c "import json;print(json.load(open('src/data/subtitles.json'))['filmEnd'])")
python3 scripts/subtitle_rules.py
python3 scripts/synth_sfx.py
rm -rf build out/segments && mkdir -p out/segments
npx remotion bundle src/index.ts --out-dir build
: > out/segments/list.txt
seams=()
for ((a = 0; a < TOTAL; a += SEG)); do
  b=$((a + SEG - 1)); ((b >= TOTAL)) && b=$((TOTAL - 1))
  name=$(printf 'seg_%04d_%04d.mp4' "$a" "$b")
  echo "== 渲染第 $a–$b 帧"
  npx remotion render build Film "out/segments/$name" --frames="$a-$b" --codec=h264 --crf=18 --muted \
    --concurrency="${CONCURRENCY:-4}" --log=error
  echo "file '$name'" >> out/segments/list.txt
  ((a > 0)) && seams+=("$a")
done
ffmpeg -loglevel error -y -f concat -safe 0 -i out/segments/list.txt -c copy out/film_video.mp4
ffmpeg -loglevel error -y -i out/film_video.mp4 -i public/audio/sfx.wav \
  -map 0:v -map 1:a -c:v copy -af "pan=stereo|c0=c0|c1=c0" -c:a aac -b:a 192k -ar 48000 \
  -t "$(python3 -c "print($TOTAL/30)")" -movflags +faststart out/film.mp4
python3 scripts/seam_check.py out/film.mp4 "$(IFS=,; echo "${seams[*]}")"
python3 scripts/audio_check.py out/film.mp4
python3 scripts/motion_check.py out/film.mp4
