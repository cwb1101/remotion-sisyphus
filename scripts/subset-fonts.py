"""思源宋体 / 思源黑体（Adobe 官方 CN 子集 OTF）→ 按字幕稿实际用字子集化成 woff2。

原始 OTF 放在 fonts-src/（不进 git），缺了会自动从 adobe-fonts 的 GitHub 仓库下载。
改了字幕稿之后重新跑 `npm run fonts` 即可。
"""
import os
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "fonts-src")
OUT = os.path.join(ROOT, "public", "fonts")
BASE = "https://raw.githubusercontent.com/adobe-fonts"
FONTS = [
    ("source-han-serif", "SourceHanSerifCN-SemiBold.otf", "serif-semibold.woff2", "charset-serif.txt"),
    ("source-han-serif", "SourceHanSerifCN-Bold.otf", "serif-bold.woff2", "charset-serif.txt"),
    ("source-han-sans", "SourceHanSansCN-Light.otf", "sans-light.woff2", "charset-sans.txt"),
    ("source-han-sans", "SourceHanSansCN-Regular.otf", "sans-regular.woff2", "charset-sans.txt"),
]

os.makedirs(SRC, exist_ok=True)
for repo, otf, woff, charset in FONTS:
    src = os.path.join(SRC, otf)
    if not os.path.exists(src):
        url = f"{BASE}/{repo}/release/SubsetOTF/CN/{otf}"
        print("download", url)
        urllib.request.urlretrieve(url, src)
    # 宋体子集同时包含黑体用字（重点词、英文注混排时不缺字）
    text_files = [os.path.join(OUT, "charset-serif.txt"), os.path.join(OUT, "charset-sans.txt")]
    merged = os.path.join(OUT, f".{woff}.chars")
    with open(merged, "w", encoding="utf-8") as f:
        for p in text_files:
            f.write(open(p, encoding="utf-8").read())
    subprocess.run(
        [
            sys.executable, "-m", "fontTools.subset", src,
            f"--text-file={merged}",
            "--flavor=woff2",
            "--layout-features=*",
            f"--output-file={os.path.join(OUT, woff)}",
        ],
        check=True,
    )
    os.remove(merged)
    print("wrote", woff, os.path.getsize(os.path.join(OUT, woff)), "bytes")
