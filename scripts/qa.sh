#!/usr/bin/env bash
# 渲染后自检：
#   1. 每 2 秒抽一帧拼联系表（每张 12 格）；前 5 秒每 0.5 秒一帧
#   2. 每节开头后 1 秒抽一帧，核对左上角小标题
#   3. 找出画面静止超过 2 秒的段落、黑场
#   4. 音频：峰值 / 咔哒声 / 高频 / 静音段 / 最响时刻 / 各节响度
# 用法：bash scripts/qa.sh out/film.mp4
set -euo pipefail
VID=${1:-out/film.mp4}
DIR=out/qa
rm -rf "$DIR" && mkdir -p "$DIR/every2s" "$DIR/first5s" "$DIR/sections"

# 按帧号精确抽取：第 0、60、120 … 帧（30fps 下每 2 秒一帧）
ffmpeg -loglevel error -i "$VID" -vf "select=not(mod(n\\,60))" -vsync vfr -start_number 0 "$DIR/every2s/t%03d.png"
for t in 0 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5; do
  ffmpeg -loglevel error -ss "$t" -i "$VID" -frames:v 1 "$DIR/first5s/s$(printf '%04.1f' "$t").png"
done
for t in 1 9 26 51 66 78 109 135; do
  ffmpeg -loglevel error -ss "$t" -i "$VID" -frames:v 1 "$DIR/sections/at$(printf '%03d' "$t")s.png"
done

files=("$DIR"/every2s/*.png)
for ((i = 0; i < ${#files[@]}; i += 12)); do
  python3 scripts/sheet.py "$DIR/sheet_every2s_$(printf '%02d' $((i / 12))).jpg" 4 "${files[@]:i:12}" > /dev/null
done
python3 scripts/sheet.py "$DIR/sheet_first5s.jpg" 4 "$DIR"/first5s/*.png > /dev/null
python3 scripts/sheet.py "$DIR/sheet_sections.jpg" 4 "$DIR"/sections/*.png > /dev/null
echo "联系表：$(ls "$DIR"/*.jpg | wc -l) 张"

python3 scripts/motion_check.py "$VID"
ffmpeg -hide_banner -i "$VID" -vf "blackdetect=d=0.2:pix_th=0.06" -an -f null - 2>&1 | grep -o "black_start.*" || echo "黑场：无"

ffmpeg -loglevel error -y -i "$VID" -vn -ac 2 -ar 48000 -c:a pcm_s16le "$DIR/audio.wav"
python3 scripts/audio_check.py "$DIR/audio.wav"
