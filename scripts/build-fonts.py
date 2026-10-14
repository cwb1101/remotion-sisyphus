"""Build subset web fonts for the film and verify glyph coverage.

思源宋体 / 思源黑体 are taken from Google's open-source builds (Noto Serif SC /
Noto Sans SC — the same Source Han glyphs under the Noto name, SIL OFL).
The variable fonts are instanced at fixed weights, then subset to exactly the
characters the film uses, so rendering never falls back to a system font.

Usage: python3 scripts/build-fonts.py
"""
import json
import pathlib
import string
import sys
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "fonts-src"
OUT = ROOT / "public" / "fonts"
SOURCES = {
    "serif": ("NotoSerifSC[wght].ttf",
              "https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"),
    "sans": ("NotoSansSC[wght].ttf",
             "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"),
    # Source Sans 3 is the Latin design inside 思源黑体; it also covers Č etc.
    "latin": ("SourceSans3[wght].ttf",
              "https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf"),
}
# (source, weight, output name, charset)
BUILDS = [
    ("serif", 600, "SourceHanSerifSC-SemiBold.woff2", "cjk"),
    ("sans", 300, "SourceHanSansSC-Light.woff2", "cjk"),
    ("latin", 300, "SourceSans3-Light.woff2", "latin"),
]


def used_chars(charset: str) -> str:
    data = json.loads((ROOT / "src" / "data" / "subtitles.json").read_text("utf-8"))
    chars = set(string.ascii_letters + string.digits + string.punctuation + " —–·")
    if charset == "latin":
        for s in data["screens"]:
            chars |= set(s.get("en", ""))
        for sec in data["sections"]:
            chars |= set(sec["en"])
        return "".join(sorted(chars))
    chars |= set("、，。：；？！“”‘’（）《》…")
    for s in data["screens"]:
        chars |= set(s["text"].replace("\n", ""))
    for sec in data["sections"]:
        chars |= set(sec["name"]) | set(sec["id"])
    return "".join(sorted(chars))


def source(key: str) -> pathlib.Path:
    name, url = SOURCES[key]
    path = CACHE / name
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        print(f"downloading {name} …")
        urllib.request.urlretrieve(url, path)
    return path


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    failed = False
    for key, weight, out_name, charset in BUILDS:
        text = used_chars(charset)
        font = TTFont(source(key))
        static = instancer.instantiateVariableFont(font, {"wght": weight})
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["kern", "liga", "locl", "palt"]
        opts.name_IDs = ["*"]
        sub = subset.Subsetter(options=opts)
        sub.populate(text=text)
        sub.subset(static)
        out = OUT / out_name
        static.flavor = "woff2"
        static.save(out)
        cmap = TTFont(out).getBestCmap()
        missing = [c for c in text if c.strip() and ord(c) not in cmap]
        status = "OK" if not missing else f"MISSING {''.join(missing)}"
        print(f"{out_name}: {out.stat().st_size // 1024} KB, {len(text)} chars, {status}")
        failed |= bool(missing)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
