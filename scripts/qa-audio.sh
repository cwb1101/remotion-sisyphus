#!/usr/bin/env bash
# 成片音频验收：整体响度、真峰值、最大峰值、削波样本数、超过 -6 dBFS 的时间点
set -euo pipefail
IN="${1:-out/preview.mp4}"
echo "== ebur128 =="
ffmpeg -nostats -i "$IN" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):"
echo "== astats =="
ffmpeg -nostats -i "$IN" -map 0:a -af astats=measure_perchannel=none -f null - 2>&1 \
	| grep -E "Peak level dB|RMS level dB|Noise floor dB" | sed 's/.*\] //'
RAW="$(mktemp)"
ffmpeg -loglevel error -y -i "$IN" -map 0:a -f s16le -acodec pcm_s16le -ar 48000 -ac 2 "$RAW"
python3 - "$RAW" <<'PY'
import array, math, sys
a = array.array('h'); a.frombytes(open(sys.argv[1], 'rb').read())
clip = sum(1 for v in a if v >= 32767 or v <= -32768)
th = int(32768 * 10 ** (-6 / 20))
over = sorted({round(i // 2 / 48000, 2) for i, v in enumerate(a) if abs(v) >= th})
print(f"clipped samples: {clip}")
print(f"max peak: {20 * math.log10(max(abs(v) for v in a) / 32768):.2f} dBFS")
print("over -6 dBFS at:", over if over else "none")
PY
rm -f "$RAW"
