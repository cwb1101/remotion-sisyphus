#!/usr/bin/env bash
# 用法：scripts/extract-frames.sh <视频> <输出目录> [间隔秒数，默认 2]
# 每隔 N 秒抽一帧（标注时间码），再拼成一张总览图 <输出目录>/overview.jpg
set -euo pipefail
video=$1
outdir=$2
step=${3:-2}
mkdir -p "$outdir"
rm -f "$outdir"/frame-*.jpg
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video")
n=0
t=0
while (( $(echo "$t < $dur" | bc -l) )); do
  label=$(printf "%05.1fs  f%04d" "$t" "$(echo "$t * 30 / 1" | bc)")
  ffmpeg -v error -y -ss "$t" -i "$video" -frames:v 1 \
    -vf "drawtext=text='${label}':x=24:y=24:fontsize=40:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=10" \
    "$outdir/frame-$(printf %03d $n).jpg"
  n=$((n + 1))
  t=$(echo "$t + $step" | bc -l)
done
cols=4
rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y -framerate 1 -i "$outdir/frame-%03d.jpg" \
  -vf "scale=480:270,tile=${cols}x${rows}:padding=6:margin=6:color=0x111111" \
  -frames:v 1 "$outdir/overview.jpg"
echo "$n frames -> $outdir/overview.jpg"
