#!/usr/bin/env bash
# 安装锁定声线所需的离线 TTS 引擎和模型（只需执行一次，约 360MB）
set -euo pipefail
cd "$(dirname "$0")"
pip install -q sherpa-onnx soundfile numpy
ffmpeg -hide_banner -filters 2>/dev/null | grep -q rubberband || { echo "ffmpeg 缺少 rubberband 滤镜，无法复现声线" >&2; exit 1; }
if [ ! -f models/kokoro-multi-lang-v1_1/model.onnx ]; then
  mkdir -p models
  curl -fSL -o models/kokoro.tar.bz2 \
    https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2
  tar xjf models/kokoro.tar.bz2 -C models && rm models/kokoro.tar.bz2
fi
echo "声线环境就绪"
