#!/usr/bin/env bash
# 分段渲染完整片：每节一段（静音视频）→ ffmpeg 无损拼接 → 混入代码合成的整片音轨
# 用法：bash scripts/render-film.sh            （全部重渲）
#       bash scripts/render-film.sh s3 s5      （只重渲指定小节，其余沿用已有分段）
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/seg

python3 scripts/synth_sfx.py > /dev/null
npx tsx scripts/check-script.ts | tail -1
npx tsx scripts/export-timeline.ts
python3 scripts/mix_audio.py

# 各节的帧范围来自字幕定稿 src/data/script.ts
SECS=$(npx tsx -e "import { SECTIONS } from './src/data/script'; console.log(SECTIONS.map(s => s.id + ':' + s.start + ':' + (s.end - 1)).join(' '))")
ONLY=" ${*:-} "
for item in $SECS; do
  IFS=: read -r id a b <<< "$item"
  if [[ "$ONLY" != "  " && "$ONLY" != *" $id "* && -f "out/seg/$id.mp4" ]]; then
    echo "跳过 $id（沿用已有分段）"; continue
  fi
  echo "渲染 $id：帧 $a–$b"
  npx remotion render Film "out/seg/$id.mp4" --frames="$a-$b" --muted --log=error
done

: > out/seg/list.txt
for item in $SECS; do echo "file '${item%%:*}.mp4'" >> out/seg/list.txt; done
ffmpeg -loglevel error -y -f concat -safe 0 -i out/seg/list.txt -c copy out/film_video.mp4
ffmpeg -loglevel error -y -i out/film_video.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/film.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 out/film.mp4 | xargs -I{} echo "完成 out/film.mp4  时长 {}s"
