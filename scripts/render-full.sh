#!/usr/bin/env bash
# 完整片分段渲染：每节一段（无声视频）→ 无损拼接 → 整条音轨一次性编码混入。
# 音频只编码一次，所以分段接缝处不会出现 AAC 帧边界带来的断音或爆音。
# 用法：bash scripts/render-full.sh [额外的 remotion 参数，如 --browser-executable=...]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/full
mkdir -p "$OUT/segments"
node scripts/check-script.mjs
node scripts/build-sfx.mjs --comp full

# 各节的帧范围（取自字幕数据）
RANGES=$(node -e '
const d = require("./src/data/script.json");
const secs = [...new Set(d.screens.map((s) => s.section))].sort((a, b) => a - b);
const start = (k) => Math.min(...d.screens.filter((s) => s.section === k).map((s) => s.startFrame));
const total = Math.max(...d.screens.map((s) => s.endFrame)) + d.full.tailFrames;
console.log(secs.map((k, i) => `${k}:${start(k)}-${(i + 1 < secs.length ? start(secs[i + 1]) : total) - 1}`).join(" "));
')
echo "segments: $RANGES"

: > "$OUT/segments/list.txt"
for r in $RANGES; do
	sec=${r%%:*}
	frames=${r#*:}
	file="$OUT/segments/section${sec}.mp4"
	npx remotion render Full "$file" --frames="$frames" --muted --log=error "$@"
	echo "file 'section${sec}.mp4'" >> "$OUT/segments/list.txt"
done

ffmpeg -loglevel error -y -f concat -safe 0 -i "$OUT/segments/list.txt" -c copy "$OUT/video_only.mp4"
ffmpeg -loglevel error -y -i "$OUT/video_only.mp4" -i public/audio/full.wav \
	-map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart \
	"$OUT/泪失禁体质_完整版.mp4"
echo "done: $OUT/泪失禁体质_完整版.mp4"
