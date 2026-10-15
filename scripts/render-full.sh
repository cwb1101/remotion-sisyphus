#!/usr/bin/env bash
# 完整片分段渲染：画面按节分 5 段渲染（静音），拼接后一次性封装整条音轨。
# 音轨只编码一次，所以段与段之间不会出现音频接缝（爆音/断音）；拼接后再做接缝检查。
# 用法：bash scripts/render-full.sh            （可选：REMOTION_BROWSER=/path/to/chrome-headless-shell）
set -euo pipefail
cd "$(dirname "$0")/.."
BROWSER_FLAG=()
if [ -n "${REMOTION_BROWSER:-}" ]; then BROWSER_FLAG=(--browser-executable="$REMOTION_BROWSER"); fi

node scripts/check-script.mjs
node scripts/build-audio.mjs --full

mkdir -p out/seg
# 段边界：每节开头（读自 script.json）
mapfile -t BOUNDS < <(node -e '
const d = require("./src/data/script.json");
const at = (id) => d.screens.find((s) => s.id === id).startFrame;
const end = d.screens[d.screens.length - 1].endFrame + d.full.endHoldFrames;
console.log([0, at(16), at(24), at(35), at(41), end].join("\n"));
')
: > out/seg/list.txt
for i in $(seq 0 $((${#BOUNDS[@]} - 2))); do
	A=${BOUNDS[$i]}
	B=$((${BOUNDS[$((i + 1))]} - 1))
	OUT="out/seg/seg$i.mp4"
	echo "== segment $i: frames $A-$B"
	npx remotion render src/index.ts Full "$OUT" --frames="$A-$B" --props='{"withAudio":false}' \
		--codec=h264 --crf=18 --pixel-format=yuv420p --muted --concurrency=4 --log=error "${BROWSER_FLAG[@]}"
	echo "file 'seg$i.mp4'" >> out/seg/list.txt
done

ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i out/seg/list.txt -c copy out/full-video.mp4
ffmpeg -hide_banner -loglevel error -y -i out/full-video.mp4 -i public/audio/full-mix.wav \
	-map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart out/heise-shengmingli.mp4
python3 -I scripts/check_seams.py out/heise-shengmingli.mp4 "${BOUNDS[@]}"
echo "done: out/heise-shengmingli.mp4"
