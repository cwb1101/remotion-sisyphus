"""字幕数据的读取、分行与规范校验（Python 侧；分行规则与 src/data/script.ts 保持一致）。"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "subtitles.json"

MAX_LINE_CHARS = 18  # 64px × 18 = 1152px ≤ 1200px 字幕块宽
MAX_LINES = 2
CHARS_PER_SEC = 5
BREAK_PUNCT = "，、：；"
TRIM_TAIL = "。，；："
SFX_TYPES = {
    "thud", "heavyHit", "pluck", "pluckDown", "pluckUp", "glide", "sineGlideDown",
    "riser", "chord", "pad", "tick", "sand", "openChord",
}
NOISE_TYPES = {"glide", "sand"}


def load():
    return json.loads(DATA.read_text(encoding="utf-8"))


def reading_chars(text):
    return len(re.findall(r"[一-鿿0-9A-Za-z]", text))


def split_lines(text):
    t = text.rstrip(TRIM_TAIL)
    if len(t) <= MAX_LINE_CHARS:
        return [t]
    best = None
    for i, ch in enumerate(t):
        if ch in BREAK_PUNCT:
            left, right = t[:i], t[i + 1:]
            if len(left) <= MAX_LINE_CHARS and len(right) <= MAX_LINE_CHARS:
                score = abs(len(left) - len(right))
                if best is None or score < best[0]:
                    best = (score, left, right)
    if best:
        return [best[1], best[2]]
    mid = (len(t) + 1) // 2
    return [t[:mid], t[mid:]]


def resolve_at(screen, at):
    return screen["cues"][at] if isinstance(at, str) else at


def validate(doc):
    errors = []
    fps = doc["fps"]
    word_color = {}
    colors_used = set()
    prev_end = 0
    for s in doc["screens"]:
        sid = s["id"]
        if s["start"] != prev_end:
            errors.append(f"#{sid}: start {s['start']} 与上一屏 end {prev_end} 不连续")
        prev_end = s["end"]
        dur = (s["end"] - s["start"]) / fps
        need = reading_chars(s["text"]) / CHARS_PER_SEC
        if dur + 1e-6 < need:
            errors.append(f"#{sid}: 时长 {dur:.1f}s 少于阅读所需 {need:.1f}s")
        lines = split_lines(s["text"])
        if len(lines) > MAX_LINES or any(len(l) > MAX_LINE_CHARS for l in lines):
            errors.append(f"#{sid}: 分行超限 {lines}")
        if len(s["highlights"]) > 2:
            errors.append(f"#{sid}: 高亮超过 2 处")
        for h in s["highlights"]:
            if h["word"] not in s["text"]:
                errors.append(f"#{sid}: 高亮词「{h['word']}」不在字幕里")
            if h["color"] not in ("amber", "cyan"):
                errors.append(f"#{sid}: 未知强调色 {h['color']}")
            colors_used.add(h["color"])
            if word_color.setdefault(h["word"], h["color"]) != h["color"]:
                errors.append(f"#{sid}: 「{h['word']}」颜色与前文不一致")
        for e in s["sfx"]:
            if e["type"] not in SFX_TYPES:
                errors.append(f"#{sid}: 未知音效 {e['type']}")
            if e["level"] not in doc["sfxPeakDbfs"]:
                errors.append(f"#{sid}: 未知档位 {e['level']}")
            if isinstance(e["at"], str) and e["at"] not in s["cues"]:
                errors.append(f"#{sid}: cue「{e['at']}」未定义")
    if len(colors_used) > 2:
        errors.append(f"全片强调色超过两种: {colors_used}")
    return errors


if __name__ == "__main__":
    doc = load()
    errs = validate(doc)
    strong = [s["id"] for s in doc["screens"] for e in s["sfx"] if e["level"] == "strong"]
    total = sum(reading_chars(s["text"]) for s in doc["screens"])
    print(f"屏数 {len(doc['screens'])}，总帧 {doc['screens'][-1]['end']}，字数 {total}，强音效屏 {strong}")
    if errs:
        print("\n".join(errs))
        raise SystemExit(1)
    print("字幕数据校验通过")
