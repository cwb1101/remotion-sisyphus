#!/usr/bin/env bash
# 下载开源字体原文件 思源黑体 思源宋体 得意黑 均为 SIL OFL 1.1 可商用
set -euo pipefail
DIR="${1:-.fonts-src}"
mkdir -p "$DIR" && cd "$DIR"
curl -fsSL -o shs.zip https://github.com/adobe-fonts/source-han-sans/releases/download/2.004R/SourceHanSansCN.zip
curl -fsSL -o serif.zip https://github.com/adobe-fonts/source-han-serif/releases/download/2.003R/14_SourceHanSerifCN.zip
curl -fsSL -o smiley.zip https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip
unzip -o -q shs.zip && unzip -o -q serif.zip && unzip -o -q smiley.zip -d smiley
echo "fonts ready in $DIR"
