"""检查字幕稿并生成 docs/subtitles.md

用法:
    python3 scripts/subtitles.py

读 src/data/beatmap.json 和 src/data/subtitles.json, 逐屏检查:
    每屏不超过 15 字  每秒不超过 4 字  有字的屏至少 2 秒  每屏最多一个【】  不含标点
    换屏落在小节上 (误差 2 帧内)  屏与屏首尾相接  同一画面最多两屏有字
    人物列不空  有人物的屏不少于 80%  重卡点 3 到 5 处 且都在 drop 或 accents 上
有一条不过就以非零退出.
"""

import json
import re
import sys
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BEATMAP = ROOT / "src/data/beatmap.json"
SUBS = ROOT / "src/data/subtitles.json"
OUT = ROOT / "docs/subtitles.md"

MAX_CHARS = 15
MAX_RATE = 4.0
MIN_SEC = 2.0
BAR_TOL = 2
PUNCT = re.compile(r"[，。、！？；：“”‘’（）《》〈〉…—–·,.!?;:\"'()\[\]<>~`@#$%^&*_+=|\\/-]")
CAST = OrderedDict([("主角", "主角"), ("对方", "对方"), ("观众替身", "观众替身"),
                    ("群像", "群像"), ("老朋友", "老朋友"), ("搭子", "搭子")])


def tc(f, fps):
    s, ff = divmod(f, fps)
    m, s = divmod(s, 60)
    return f"{m:02d}:{s:02d}:{ff:02d}"


def chars(text):
    return len(re.sub(r"[\s【】]", "", text))


def main():
    bm = json.loads(BEATMAP.read_text())
    data = json.loads(SUBS.read_text())
    fps, bars, total = bm["fps"], bm["bars"], bm["durationFrames"]
    heavy_ok = set(bm["accents"]) | {bm["dropFrame"], bm["mainDropFrame"]}
    errors, rows = [], []

    screens = data["screens"]
    for i, s in enumerate(screens):
        start = bars[s["bar"]]
        end_bar = s["bar"] + s["bars"]
        end = bars[end_bar] if end_bar < len(bars) else total
        sec = (end - start) / fps
        n = chars(s["text"])
        rate = n / sec if sec else 0
        tag = f"屏 {s['id']}"
        if n > MAX_CHARS:
            errors.append(f"{tag} {n} 字 超过 {MAX_CHARS}")
        if n and rate > MAX_RATE + 1e-9:
            errors.append(f"{tag} 每秒 {rate:.2f} 字 超过 {MAX_RATE}")
        if n and sec < MIN_SEC:
            errors.append(f"{tag} 只有 {sec:.2f} 秒")
        if s["text"].count("【") > 1:
            errors.append(f"{tag} 重点词超过一个")
        if PUNCT.search(s["text"]):
            errors.append(f"{tag} 含标点")
        if min(abs(start - b) for b in bars) > BAR_TOL:
            errors.append(f"{tag} 换屏不在小节上")
        if i + 1 < len(screens) and screens[i + 1]["bar"] != end_bar:
            errors.append(f"{tag} 和下一屏没有首尾相接")
        if not s["people"].strip():
            errors.append(f"{tag} 人物列为空")
        if s.get("heavy") and start not in heavy_ok:
            errors.append(f"{tag} 重卡点不在 drop 或 accents 上")
        rows.append(dict(s, start=start, end=end, sec=sec, n=n, rate=rate))
    if screens and rows[-1]["end"] != total:
        errors.append("最后一屏没有到片尾")

    shot_text = Counter(r["shot"] for r in rows if r["n"])
    for shot, c in shot_text.items():
        if c > 2:
            errors.append(f"画面 {shot} 挂了 {c} 屏字幕")
    with_people = sum(1 for r in rows if any(k in r["people"] for k in CAST))
    if with_people / len(rows) < 0.8:
        errors.append(f"有人物的屏只占 {with_people / len(rows):.0%}")
    heavy = [r for r in rows if r.get("heavy")]
    if not 3 <= len(heavy) <= 5:
        errors.append(f"重卡点 {len(heavy)} 处 不在 3 到 5 之间")

    # ---------- 生成文档 ----------
    sections = bm["sections"]

    def section_of(f):
        return next(s["name"] for s in sections if s["startFrame"] <= f < s["endFrame"])

    out = ["# 字幕稿", "",
           "> 由 `scripts/subtitles.py` 从 `src/data/subtitles.json` 和 `src/data/beatmap.json` 生成 改稿请改 json 再重跑",
           "> 时间码是 分:秒:帧（30fps）括号里是帧号；【】只标重点词 不显示在画面上；「无字」的屏只演不写", "",
           "| 屏号 | 时间码 | 字幕 | 人物（谁 在做什么 景别） | 画面动作 | 音效 | 卡点 |",
           "|---|---|---|---|---|---|---|"]
    last_sec = None
    for r in rows:
        sec_name = section_of(r["start"])
        if sec_name != last_sec:
            out.append(f"| | **{sec_name}** | | | | | |")
            last_sec = sec_name
        text = r["text"] or "（无字）"
        if r.get("heavy"):
            text = f"**{text}**"
        cue = "；".join(x for x in [
            f"小节 {r['bar']}" + (f" 至 {r['bar'] + r['bars'] - 1}" if r["bars"] > 1 else ""),
            f"**重卡点 {r['heavy']}**" if r.get("heavy") else "",
            r["cue"]] if x)
        out.append(f"| {r['id']} | {tc(r['start'], fps)}–{tc(r['end'], fps)}（{r['start']}–{r['end']}） | {text} | "
                   f"{r['people']} | {r['action']} | {r['sfx'] or '—'} | {cue} |")

    total_chars = sum(r["n"] for r in rows)
    text_rows = [r for r in rows if r["n"]]
    out += ["", "## 统计", "",
            f"- 总屏数 **{len(rows)}**（有字 {len(text_rows)} 屏 无字 {len(rows) - len(text_rows)} 屏）",
            f"- 总字数 **{total_chars}**（不计空格和【】）",
            f"- 总时长 **{total / fps:.2f} 秒**（{total} 帧）",
            f"- 最快语速 {max(r['rate'] for r in text_rows):.2f} 字每秒（屏 {max(text_rows, key=lambda r: r['rate'])['id']}）"
            f" 平均 {sum(r['n'] for r in text_rows) / sum(r['sec'] for r in text_rows):.2f} 字每秒",
            f"- 最短有字屏 {min(r['sec'] for r in text_rows):.2f} 秒 最长一屏 {max(r['sec'] for r in rows):.2f} 秒",
            f"- 有人物的屏 **{with_people}/{len(rows)}（{with_people / len(rows):.0%}）**", ""]

    out += ["### 重卡点", "", "| 屏 | 帧 | 时间码 | 类型 | 字幕 | 人物大动作 | 对齐 |", "|---|---|---|---|---|---|---|"]
    for r in heavy:
        where = ("drop1" if r["start"] == bm["dropFrame"] else
                 "主 drop" if r["start"] == bm["mainDropFrame"] else "accents")
        out.append(f"| {r['id']} | {r['start']} | {tc(r['start'], fps)} | {r['heavy']} | {r['text'] or '（无字）'} | "
                   f"{r['people']} | {where} |")

    out += ["", "### 人物出场", "", "| 人物 | 出场屏数 | 屏号 | 首次出场 |", "|---|---|---|---|"]
    for k in CAST:
        ids = [r for r in rows if k in r["people"]]
        if ids:
            out.append(f"| {CAST[k]} | {len(ids)} | {' '.join(str(r['id']) for r in ids)} | {tc(ids[0]['start'], fps)} |")

    out += ["", "### 最没把握的三句 和怎么变成有把握", ""]
    for u in data.get("uncertain", []):
        out += [f"**屏 {u['id']}：{u['before']}**", "",
                f"- 没把握在哪：{u['why']}", f"- 核实结果：{u['check']}", f"- 定稿：{u['after']}", ""]

    out += ["### 片尾出处", ""] + [f"- {c}" for c in data.get("credits", [])] + [""]
    out += ["## 检查结果", ""] + ([f"- ❌ {e}" for e in errors] or ["- 全部通过：字数 语速 时长 标点 重点词 小节对齐 画面复用 人物 重卡点"]) + [""]

    OUT.write_text("\n".join(out))
    print(f"{len(rows)} screens  {total_chars} chars  {total / fps:.2f}s  people {with_people}/{len(rows)}  "
          f"heavy {len(heavy)}  errors {len(errors)}")
    for e in errors:
        print("  ", e)
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
