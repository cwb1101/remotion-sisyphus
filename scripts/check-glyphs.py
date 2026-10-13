"""渲染前的缺字检查：字幕稿里每一个字都必须在对应的 woff2 里有字形，否则报错退出。"""
import os
import sys
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "fonts")
checks = [
    ("serif-semibold.woff2", "charset-serif.txt"),
    ("serif-bold.woff2", "charset-serif.txt"),
    ("sans-light.woff2", "charset-sans.txt"),
    ("sans-regular.woff2", "charset-sans.txt"),
]
bad = 0
for woff, charset in checks:
    cmap = TTFont(os.path.join(OUT, woff)).getBestCmap()
    chars = set(open(os.path.join(OUT, charset), encoding="utf-8").read()) - {"\n"}
    missing = sorted(c for c in chars if ord(c) not in cmap)
    if missing:
        bad += 1
        print(f"✗ {woff}: 缺 {len(missing)} 个字形: {''.join(missing)}")
    else:
        print(f"✓ {woff}: {len(chars)} 个字符全部有字形")
sys.exit(1 if bad else 0)
