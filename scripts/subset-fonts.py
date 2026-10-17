"""把开源字体裁成 GB2312 常用字加数据文件里出现的字 输出 woff2 到 public/fonts

用法 python3 scripts/subset-fonts.py <字体源目录>
需要 pip install fonttools brotli
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".fonts-src")
OUT = ROOT / "public" / "fonts"

FONTS = {
    "SourceHanSansCN-Medium": "SubsetOTF/CN/SourceHanSansCN-Medium.otf",
    "SourceHanSansCN-Heavy": "SubsetOTF/CN/SourceHanSansCN-Heavy.otf",
    "SourceHanSerifCN-Heavy": "SubsetOTF/CN/SourceHanSerifCN-Heavy.otf",
    "SmileySans-Oblique": "smiley/SmileySans-Oblique.otf",
}


def charset() -> str:
    chars = set(chr(c) for c in range(0x20, 0x7F))
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    data = json.loads((ROOT / "src" / "data" / "script.json").read_text("utf-8"))
    chars.update(json.dumps(data, ensure_ascii=False))
    return "".join(sorted(chars))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    text_file = OUT / ".charset.txt"
    text_file.write_text(charset(), "utf-8")
    for name, rel in FONTS.items():
        src = SRC / rel
        dst = OUT / f"{name}.woff2"
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(src),
                f"--text-file={text_file}", "--flavor=woff2",
                "--layout-features=*", f"--output-file={dst}",
            ],
            check=True,
        )
        print(f"{dst.name} {dst.stat().st_size // 1024} KB")
    text_file.unlink()


if __name__ == "__main__":
    main()
