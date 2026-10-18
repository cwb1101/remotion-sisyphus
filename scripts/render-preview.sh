#!/usr/bin/env bash
# 一键: 检查字幕稿 -> 渲染预览 mp4 -> 渲染两套遮罩 -> 自动质检
# 用法: bash scripts/render-preview.sh [合成名 默认 Preview]
set -euo pipefail
cd "$(dirname "$0")/.."
COMP="${1:-Preview}"
FRAMES=$(npx remotion compositions 2>/dev/null | awk -v c="$COMP" '$1==c {print $4}')
mkdir -p out/qa
npx tsx scripts/check-subtitles.ts
npx tsx scripts/qa-meta.ts out/qa/meta.json "$FRAMES"
rm -rf out/qa/chars out/qa/subs
npx remotion render "$COMP" out/qa/chars --sequence --image-format=png --scale=0.5 --props='{"mode":"chars"}' --log=error
npx remotion render "$COMP" out/qa/subs --sequence --image-format=png --scale=0.5 --props='{"mode":"subs"}' --log=error
npx remotion render "$COMP" out/preview.mp4 --log=error
python3 scripts/qa.py out/preview.mp4 out/qa
echo "预览: out/preview.mp4   质检: out/qa/report.md out/qa/contact.png out/qa/heavy-*.png"
