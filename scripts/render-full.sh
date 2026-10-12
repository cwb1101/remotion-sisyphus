#!/usr/bin/env bash
# 分段渲染成片：按字幕数据里的场景范围逐段渲染画面，整段渲染音频，最后无损拼接、响度统一后合成一个 mp4
# 用法：bash scripts/render-full.sh [输出路径，默认 out/don-quixote.mp4]
set -euo pipefail
OUT=${1:-out/don-quixote.mp4}
SEG=out/segments
mkdir -p "$SEG"

node scripts/gen-sfx.mjs
node scripts/gen-grain.mjs
node scripts/check-subtitles.mjs > /dev/null
npx remotion bundle src/index.ts --out-dir=out/bundle --log=error

# 每节一段：从本节开始帧到下一节开始帧（最后一节到成片结尾）
node -e '
const d = require("./src/data/subtitles.json");
const total = Math.max(...d.screens.map((s) => s.end)) + d.endTail;
const ranges = d.scenes.map((sc) => {
  const list = d.screens.filter((s) => s.scene === sc.id);
  return {id: sc.id, start: Math.min(...list.map((s) => s.start))};
});
ranges.forEach((r, i) => {
  const end = i + 1 < ranges.length ? ranges[i + 1].start : total;
  console.log(`${String(i).padStart(2, "0")}-${r.id} ${r.start} ${end - 1}`);
});
' > "$SEG/ranges.txt"
cat "$SEG/ranges.txt"

: > "$SEG/list.txt"
while read -r name a b; do
  file="$SEG/$name.mp4"
  if [[ -f "$file" && "${FORCE:-0}" != "1" ]]; then
    echo "跳过已渲染的 $name"
  else
    echo "渲染 $name（第 $a–$b 帧）"
    npx remotion render out/bundle Full "$file" --frames="$a-$b" --muted --crf=18 --pixel-format=yuv420p --log=error
  fi
  echo "file '$(basename "$file")'" >> "$SEG/list.txt"
done < "$SEG/ranges.txt"

echo "渲染整段音频"
npx remotion render out/bundle Full "$SEG/audio.wav" --codec=wav --log=error

echo "拼接画面"
ffmpeg -v error -y -f concat -safe 0 -i "$SEG/list.txt" -c copy "$SEG/video.mp4"

echo "统一响度（-16 LUFS，真峰值 -1.5 dB）"
stats=$(ffmpeg -hide_banner -i "$SEG/audio.wav" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$stats" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(`measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}`)')
ffmpeg -v error -y -i "$SEG/audio.wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11:$mi:linear=true,aresample=48000" -c:a pcm_s16le "$SEG/audio-norm.wav"

echo "合成成片"
ffmpeg -v error -y -i "$SEG/video.mp4" -i "$SEG/audio-norm.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact "$OUT"
echo "完成：$OUT"
