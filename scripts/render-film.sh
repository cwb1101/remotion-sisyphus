#!/usr/bin/env bash
# 分段渲染完整片 → 拼接 → 配上一条完整的音轨。
# 视频分 4 段静音渲染（--muted），音频是一整条 WAV，最后一次性编码成 AAC，
# 所以接缝处不会有 AAC 编码器在每段首尾插入的静音/爆音。
set -euo pipefail
cd "$(dirname "$0")/.."
: "${REMOTION_BROWSER:=}"
CONC="${CONCURRENCY:-4}"
mkdir -p out/seg
node scripts/check-script.mjs
node scripts/gen-sfx.mjs --start 0 --end 3600 --last 56 --out public/audio/sfx-full.wav
SEGS=$(node -e "const d=require('./src/data/script.json');console.log(d.film.segments.map(s=>s.join('-')).join(' '))")
: > out/seg/list.txt
i=0
for r in $SEGS; do
  npx remotion render Film "out/seg/seg$i.mp4" --frames="$r" --muted --concurrency="$CONC"
  echo "file 'seg$i.mp4'" >> out/seg/list.txt
  i=$((i+1))
done
ffmpeg -v error -y -f concat -safe 0 -i out/seg/list.txt -c copy out/seg/video.mp4
ffmpeg -v error -y -i out/seg/video.mp4 -i public/audio/sfx-full.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart out/film.mp4
npx remotion render FilmTextOnly out/film-text.mp4 --muted --concurrency="$CONC"
echo "done: out/film.mp4"
