"""校验字幕稿并生成表格。

用法：python3 scripts/subtitles.py
读取 src/data/subtitles.json 和 src/data/beatmap.json，按规则逐屏检查，
通过后写出 docs/subtitles.md。任何一条不通过都会以非零状态退出。

规则：
- 每屏不超过 15 字，每秒不超过 4 字，每屏至少 2 秒（字数不含空格和【】）
- 每屏最多一个【】重点词
- 换屏对齐小节首拍，误差不超过 2 帧；屏与屏首尾相接
- 上屏文字（字幕、出处）不含标点
- 重卡点 3–5 处，全部落在 dropFrame 或 accents 上
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUBS = ROOT / "src/data/subtitles.json"
BEATMAP = ROOT / "src/data/beatmap.json"
OUT = ROOT / "docs/subtitles.md"

MAX_CHARS, MAX_CPS, MIN_SECONDS, MAX_DRIFT = 15, 4.0, 2.0, 2
PUNCT = re.compile(r"[，。、；：？！…—·“”‘’（）《》〈〉「」『』〔〕,.;:?!'\"()\[\]{}<>/\\|~`@#$%^&*_+=\-]")


def timecode(frame: int, fps: int) -> str:
    s, f = divmod(frame, fps)
    return f"{s // 60:02d}:{s % 60:02d}:{f:02d}"


def main() -> None:
    subs = json.loads(SUBS.read_text())
    bm = json.loads(BEATMAP.read_text())
    fps, bars, total = bm["fps"], bm["bars"], bm["durationInFrames"]
    heavy_ok = {bm["dropFrame"], *bm["accents"]}
    errors, rows, heavy = [], [], []
    total_chars, prev_end = 0, 0

    for i, sc in enumerate(subs["screens"], 1):
        start = 0 if sc["bar"] == 1 else bars[sc["bar"] - 1]
        end_bar = sc["bar"] - 1 + sc["bars"] if sc["bars"] else None
        end = bars[end_bar] if end_bar is not None and end_bar < len(bars) else total
        seconds = (end - start) / fps
        shown = sc["text"].replace("【", "").replace("】", "")
        chars = len(shown.replace(" ", ""))
        total_chars += chars
        cps = chars / seconds
        keywords = re.findall(r"【(.+?)】", sc["text"])

        tag = f"第 {i} 屏"
        if start != prev_end:
            errors.append(f"{tag} 起点 {start} 和上一屏终点 {prev_end} 不相接")
        drift = min(abs(start - b) for b in bars) if sc["bar"] > 1 else start
        if drift > MAX_DRIFT:
            errors.append(f"{tag} 换屏偏离小节首拍 {drift} 帧")
        if chars > MAX_CHARS:
            errors.append(f"{tag} {chars} 字，超过 {MAX_CHARS}")
        if cps > MAX_CPS:
            errors.append(f"{tag} 每秒 {cps:.2f} 字，超过 {MAX_CPS}")
        if seconds < MIN_SECONDS:
            errors.append(f"{tag} 只有 {seconds:.2f} 秒")
        if len(keywords) > 1:
            errors.append(f"{tag} 有 {len(keywords)} 个重点词")
        if PUNCT.search(shown):
            errors.append(f"{tag} 字幕含标点：{shown}")
        if sc.get("heavy"):
            if start not in heavy_ok:
                errors.append(f"{tag} 重卡点 {start} 不在 drop 或 accents 上")
            kind = "drop" if start == bm["dropFrame"] else "accent"
            heavy.append((i, start, kind, sc["heavy"], shown))
        prev_end = end

        cue = sc["cue"]
        if sc.get("heavy"):
            cue = f"★重卡点 {sc['heavy']} f{start}" + (f"；{cue}" if cue else "")
        rows.append(
            f"| {i} | {timecode(start, fps)}–{timecode(end, fps)}<br>f{start}–{end} · {seconds:.2f}s | "
            f"{sc['text'] or '（无字幕）'} | {sc['visual']} | {sc['sfx']} | 小节 {sc['bar']}；{cue} |"
        )

    if prev_end != total:
        errors.append(f"最后一屏终点 {prev_end} 不等于成片 {total} 帧")
    for s in subs["sources"]:
        if PUNCT.search(s):
            errors.append(f"出处含标点：{s}")
    if not 3 <= len(heavy) <= 5:
        errors.append(f"重卡点 {len(heavy)} 处，应为 3–5 处")

    if errors:
        print("\n".join(errors))
        sys.exit(1)

    lines = [
        "# 字幕稿",
        "",
        "> 由 `python3 scripts/subtitles.py` 从 `src/data/subtitles.json` 生成，不要手改本文件。",
        f"> 成片 {total / fps:.2f} 秒 / {total} 帧，{fps}fps；时间码为 分:秒:帧。【】只标重点词，不上屏。",
        "",
        "| 屏号 | 时间码 | 字幕 | 画面动作 | 音效 | 卡点 |",
        "|---|---|---|---|---|---|",
        *rows,
        "",
        "## 片尾出处（注释层级）",
        "",
        *[f"- {s}" for s in subs["sources"]],
        "",
        "## 统计",
        "",
        f"- 总字数：{total_chars} 字（不含空格，出处另计）",
        f"- 总时长：{total / fps:.2f} 秒 / {total} 帧，共 {len(rows)} 屏",
        f"- dropFrame {bm['dropFrame']}，accents {bm['accents']}",
        "- 重卡点：",
        *[f"  - 第 {i} 屏 f{f}（{k}）{h}：{t}" for i, f, k, h, t in heavy],
        "",
    ]
    OUT.write_text("\n".join(lines))
    print(f"通过：{len(rows)} 屏，{total_chars} 字，{total / fps:.2f} 秒，重卡点 {len(heavy)} 处")
    for i, f, k, h, t in heavy:
        print(f"  第 {i} 屏 f{f} {k} {h} {t}")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
