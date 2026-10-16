#!/usr/bin/env bash
# 分段渲染完整片：每节单独渲一段（无声）→ 无损拼接 → 混入整条音轨。
# 用法：bash scripts/render-film.sh
#   需要指定浏览器时：REMOTION_BROWSER=/path/to/headless_shell bash scripts/render-film.sh
set -euo pipefail
cd "$(dirname "$0")/.."
BROWSER_FLAG=${REMOTION_BROWSER:+--browser-executable=$REMOTION_BROWSER}

node scripts/check-script.mjs
node scripts/synth-audio.mjs --end full

mkdir -p out/seg
rm -f out/seg/*.mp4 out/seg/list.txt
node -e "const s=require('./src/data/script.json');for(const x of s.sections)console.log(x.id,x.start,x.end)" |
while read -r id start end; do
  echo "== 渲染 $id：帧 $start–$((end - 1))"
  npx remotion render src/index.ts Film "out/seg/$id.mp4" --frames="$start-$((end - 1))" --muted $BROWSER_FLAG --log=error
  echo "file '$id.mp4'" >> out/seg/list.txt
done

# 各段编码参数一致，直接拷贝拼接，不重新编码
ffmpeg -y -v error -f concat -safe 0 -i out/seg/list.txt -c copy out/seg/video.mp4
# 音频是一整条连续母带，拼接后再混入，各段接缝处不会断音或爆音
ffmpeg -y -v error -i out/seg/video.mp4 -i public/audio/full.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest out/film.mp4

ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -show_entries format=duration -of compact out/film.mp4
