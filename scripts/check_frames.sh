#!/usr/bin/env bash
# 每 2 秒（每 60 帧）精确抽一帧，并拼成 2×2 联系表方便逐张检查
set -euo pipefail
in="${1:-out/preview.mp4}"
dir="${2:-out/frames}"
rm -rf "$dir" && mkdir -p "$dir"
ffmpeg -loglevel error -i "$in" -vf "select='not(mod(n\,60))'" -fps_mode vfr -start_number 0 "$dir/f%03d.png"
for f in "$dir"/f*.png; do
  n=$(basename "$f" .png | sed 's/f//'); s=$((10#$n * 2))
  mv "$f" "$dir/t$(printf '%03d' "$s")s.png"
done
i=0
ls "$dir"/t*.png | split -l 4 - "$dir/group_"
for g in "$dir"/group_*; do
  mapfile -t files < "$g"
  args=(); for f in "${files[@]}"; do args+=(-i "$f"); done
  cnt=${#files[@]}
  scale=""; stack=""
  for k in $(seq 0 $((cnt - 1))); do scale+="[$k]scale=960:540[s$k];"; stack+="[s$k]"; done
  ffmpeg -loglevel error "${args[@]}" -filter_complex "${scale}${stack}xstack=inputs=$cnt:layout=0_0|w0_0|0_h0|w0_h0:fill=gray[o]" -map "[o]" "$dir/sheet_$i.png" 2>/dev/null \
    || cp "${files[0]}" "$dir/sheet_$i.png"
  rm "$g"; i=$((i + 1))
done
ls "$dir"
