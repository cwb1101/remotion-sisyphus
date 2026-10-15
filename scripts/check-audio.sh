#!/usr/bin/env bash
# 成片音频验收：整体响度（ebur128）、峰值与削波（astats + 逐样本统计）、超过 -6 dBFS 的时间点。
# 用法：bash scripts/check-audio.sh out/preview.mp4
set -euo pipefail
IN="${1:-out/preview.mp4}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "== ebur128 (integrated loudness / true peak) =="
ffmpeg -hide_banner -nostats -i "$IN" -vn -af ebur128=peak=true+sample -f null - 2>&1 \
	| sed -n '/Summary:/,$p' | grep -E "I:|LRA:|Peak:" || true

echo
echo "== astats (overall) =="
ffmpeg -hide_banner -nostats -i "$IN" -vn -af astats=metadata=0:measure_perchannel=none:measure_overall=Peak_level+RMS_level+Max_level+Min_level+Noise_floor+Number_of_samples -f null - 2>&1 \
	| grep -E "Overall|Peak level|RMS level|Max level|Min level|Noise floor|Number of samples" | head -12 || true

echo
echo "== per-sample scan =="
python3 -I "$DIR/scan_audio.py" "$IN"
