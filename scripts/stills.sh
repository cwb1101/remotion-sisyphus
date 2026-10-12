#!/usr/bin/env bash
# 用法：scripts/stills.sh 输出前缀 帧1 帧2 ...  —— 渲染若干静帧并拼成 3 列总览
set -euo pipefail
prefix=$1; shift
mkdir -p out/stills
npx remotion bundle src/index.ts --out-dir=out/bundle --log=error >/dev/null 2>&1 || true
inputs=(); filters=""; i=0; layout=""
for f in "$@"; do
  npx remotion still out/bundle Preview "out/stills/${prefix}${f}.jpg" --frame="$f" --log=error 2>&1 | grep -v "^$" | tail -2 || true
  inputs+=(-i "out/stills/${prefix}${f}.jpg")
  filters+="[$i]scale=640:360,drawtext=text='${f}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[v$i];"
  col=$((i % 3)); row=$((i / 3))
  layout+="$((col*640))_$((row*360))|"
  i=$((i+1))
done
labels=""; for ((k=0;k<i;k++)); do labels+="[v$k]"; done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${filters}${labels}xstack=inputs=$i:layout=${layout%|}:fill=black[o]" -map "[o]" "out/stills/${prefix}sheet.jpg"
echo "out/stills/${prefix}sheet.jpg"
