#!/usr/bin/env python3
"""下载片中用到的字的思源字体子集到 public/fonts/。

用法：python3 scripts/fonts.py
扫描 src/ 里所有 .ts/.tsx 的字符，向 Google Fonts 请求只含这些字的 woff2（text= 子集），
所以改了字幕要重新跑一次。思源宋体 = Noto Serif SC，思源黑体 = Noto Sans SC。
"""

import re
import string
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

FONTS = [
    ("Noto Serif SC", 900, "NotoSerifSC-900.woff2"),
    ("Noto Serif SC", 600, "NotoSerifSC-600.woff2"),
    ("Noto Sans SC", 500, "NotoSansSC-500.woff2"),
]


def collect() -> str:
    chars = set(string.ascii_letters + string.digits + " ")
    for p in (ROOT / "src").rglob("*.ts*"):
        for ch in p.read_text(encoding="utf-8"):
            if "㐀" <= ch <= "鿿" or "豈" <= ch <= "﫿":
                chars.add(ch)
    return "".join(sorted(chars))


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    text = collect()
    OUT.mkdir(parents=True, exist_ok=True)
    for family, weight, name in FONTS:
        q = urllib.parse.urlencode({"family": f"{family}:wght@{weight}", "text": text, "display": "block"})
        css = fetch(f"https://fonts.googleapis.com/css2?{q}").decode()
        urls = re.findall(r"url\((https://[^)]+)\)", css)
        if len(urls) != 1:
            sys.exit(f"{family} {weight}: 期望 1 个字体文件，得到 {len(urls)} 个")
        data = fetch(urls[0])
        (OUT / name).write_bytes(data)
        print(f"{name}  {len(data) // 1024} KB  {len(text)} 字符")


if __name__ == "__main__":
    main()
