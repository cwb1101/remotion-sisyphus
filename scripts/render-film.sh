#!/usr/bin/env bash
# 整片: 检查字幕稿 -> 按节分段渲染画面 -> 整轨渲染声音 -> 响度标准化 (-14 LUFS, 真峰 -1 dBTP)
#       -> 拼接合成 out/film.mp4 -> 渲染遮罩 -> 自动质检
# 用法: bash scripts/render-film.sh            (全部)
#       SKIP_MASKS=1 bash scripts/render-film.sh (不渲染遮罩, 只出片)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/parts out/qa
npx tsx scripts/check-subtitles.ts
TOTAL=$(npx remotion compositions 2>/dev/null | awk '$1=="Film" {print $4}')
# 每节的起点帧 (来自 subtitles.ts)
BOUNDS=$(npx tsx -e "import {SCREENS} from './src/data/subtitles'; const s=[...new Set(SCREENS.map(x=>x.section))].map(n=>SCREENS.find(x=>x.section===n)!.startFrame); console.log([...s, $TOTAL].join(' '))")
read -r -a B <<< "$BOUNDS"
rm -f out/parts/*.mp4 out/parts/list.txt
for ((i = 0; i < ${#B[@]} - 1; i++)); do
	a=${B[$i]}; b=$((${B[$((i + 1))]} - 1))
	part=$(printf "out/parts/%02d.mp4" "$i")
	echo "== 第 $((i + 1)) 段 帧 $a-$b"
	npx remotion render Film "$part" --frames="$a-$b" --muted --log=error
	echo "file '$(basename "$part")'" >> out/parts/list.txt
done
ffmpeg -loglevel error -y -f concat -safe 0 -i out/parts/list.txt -c copy out/parts/video.mp4
# 声音整轨渲染, 避免分段拼接处的空隙和爆音
npx remotion render Film out/parts/audio.wav --codec=wav --log=error
python3 scripts/loudnorm.py out/parts/audio.wav out/parts/audio-norm.wav
ffmpeg -loglevel error -y -i out/parts/video.mp4 -i out/parts/audio-norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest out/film.mp4
echo "成片: out/film.mp4"
if [ -z "${SKIP_MASKS:-}" ]; then
	npx tsx scripts/qa-meta.ts out/qa/meta.json "$TOTAL"
	rm -rf out/qa/chars out/qa/subs
	npx remotion render Film out/qa/chars --sequence --image-format=png --scale=0.5 --props='{"mode":"chars"}' --log=error
	npx remotion render Film out/qa/subs --sequence --image-format=png --scale=0.5 --props='{"mode":"subs"}' --log=error
	python3 scripts/qa.py out/film.mp4 out/qa
fi
