#!/usr/bin/env python3
"""校验字幕稿 src/data/subtitles.ts 并生成 docs/subtitles.md。

用法：
    npm run subtitles        （先导出 out/timeline.json，再跑本脚本）

时间全部从 src/data/rhythm.json 取（先跑 scripts/rhythm.py）。
任何一条规则不通过都会列出来并以非零状态退出，表格照样生成方便对照。
"""

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RHYTHM = ROOT / "src" / "data" / "rhythm.json"
SCRIPT = ROOT / "out" / "timeline.json"
NOTES = ROOT / "docs" / "subtitles-notes.md"
OUT = ROOT / "docs" / "subtitles.md"

MAX_SINGLE = 14
MAX_LINE = 12
MAX_TOTAL = 22
MAX_CPS = 4.0
MIN_SCREEN_S = 2.0
MAX_SCREEN_S = 5.0
MIN_LOWER_S = 1.0
BAR_TOLERANCE = 2
BANNED = ["应该", "必须", "一定要", "千万别"]
# 画面文字不允许出现的标点（【】只在稿子里标重点词，渲染时去掉）
PUNCT = re.compile(r"[，。、；：？！…—·「」『』《》〈〉（）“”‘’,.;:?!\"'()\[\]{}<>/\\\-–~`@#$%^&*_+=|]")


def plain(text):
    return re.sub(r"[【】\s]", "", text or "")


def keywords(text):
    return re.findall(r"【(.+?)】", text or "")


def tc(frame, fps):
    s, f = divmod(frame, fps)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"


def main():
    rhythm = json.loads(RHYTHM.read_text(encoding="utf-8"))
    script = json.loads(SCRIPT.read_text(encoding="utf-8"))
    fps = rhythm["fps"]
    fpb = rhythm["framesPerBeat"]
    bars = rhythm["bars"]
    beats = set(rhythm["beats"])
    downbeats = rhythm["downbeats"]
    climax = rhythm["climaxFrame"]
    accents = set(rhythm["accents"])
    first_phrase = rhythm["phrases"][0]
    styles = script["styles"]
    tiers = script["tiers"]

    errors = []
    screens = []
    for n, s in enumerate(script["screens"], 1):
        s = dict(s)
        s["characters"] = s.get("characters") or []
        start = bars[s["startBar"] - 1]["start"]
        end = bars[s["startBar"] - 1 + s["bars"] - 1]["end"]
        lower_at = start + round(s.get("lowerDelayBeats", 0) * fpb)
        float_at = start + round(s.get("floatDelayBeats", 0) * fpb)
        screens.append(dict(s, n=n, start=start, end=end, lowerAt=lower_at, floatAt=float_at))

    # 连续覆盖全片
    cursor = 0
    for s in screens:
        if s["start"] != cursor:
            errors.append(f"屏{s['n']} 起点 {s['start']} 与上一屏终点 {cursor} 不连续")
        cursor = s["end"]
    if cursor != rhythm["durationInFrames"]:
        errors.append(f"最后一屏终点 {cursor} ≠ 全片 {rhythm['durationInFrames']} 帧")

    you_hits, we_hits = [], []
    total_chars = 0
    for s in screens:
        n = s["n"]
        up, lo, fl = s.get("upper"), s.get("lower"), s.get("float")
        dur = (s["end"] - s["start"]) / fps
        if not MIN_SCREEN_S <= dur <= MAX_SCREEN_S:
            errors.append(f"屏{n} 时长 {dur:g}s 不在 {MIN_SCREEN_S}–{MAX_SCREEN_S}s")
        if min(abs(s["start"] - d) for d in downbeats) > BAR_TOLERANCE:
            errors.append(f"屏{n} 换屏没对齐小节线")

        on_screen = [t for t in [up, lo, fl] if t] + s.get("labels", []) + s.get("notes", [])
        for t in on_screen:
            if PUNCT.search(plain(t)):
                errors.append(f"屏{n} 画面文字含标点：{t}")
        subtitle = [t for t in [up, lo] if t]
        if fl and keywords(fl):
            subtitle.append(fl)
        for t in [up, lo]:
            for w in BANNED:
                if t and w in t:
                    errors.append(f"屏{n} 出现说教词「{w}」")
            if t and "你" in t:
                you_hits.append(n)
            if t and "我们" in t:
                we_hits.append(n)

        kws = sum(len(keywords(t)) for t in [up, lo, fl] if t)
        if kws > 1:
            errors.append(f"屏{n} 重点词超过一个")

        if up and lo:
            if len(plain(up)) > MAX_LINE or len(plain(lo)) > MAX_LINE:
                errors.append(f"屏{n} 两行屏单行超过 {MAX_LINE} 字")
            if len(plain(up)) + len(plain(lo)) > MAX_TOTAL:
                errors.append(f"屏{n} 两行合计超过 {MAX_TOTAL} 字")
        elif up and len(plain(up)) > MAX_SINGLE:
            errors.append(f"屏{n} 单行超过 {MAX_SINGLE} 字")

        chars = sum(len(plain(t)) for t in subtitle)
        total_chars += chars
        s["chars"] = chars
        s["cps"] = chars / dur if subtitle else 0
        if s["cps"] > MAX_CPS:
            errors.append(f"屏{n} {chars} 字 {dur:g}s 每秒 {s['cps']:.2f} 字 超过 {MAX_CPS}")
        for text, at in [(lo, s["lowerAt"]), (fl if fl and keywords(fl) else None, s["floatAt"])]:
            if not text or at == s["start"]:
                continue
            if at not in beats:
                errors.append(f"屏{n} 晚出的那一行 f{at} 没对齐拍点")
            left = (s["end"] - at) / fps
            if left < MIN_LOWER_S or len(plain(text)) / left > MAX_CPS:
                errors.append(f"屏{n} 晚出的那一行只剩 {left:g}s 读不完")

        for x in s["sfx"]:
            if x["tier"] not in tiers:
                errors.append(f"屏{n} 音效档位 {x['tier']} 未定义")
        if s.get("heavy") and not any(x["tier"] == "heavy" and x["at"] == 0 for x in s["sfx"]):
            errors.append(f"屏{n} 重卡点没有在第一帧配重档音效")
        if not s.get("heavy") and any(x["tier"] == "heavy" for x in s["sfx"]):
            errors.append(f"屏{n} 不是重卡点却用了重档音效")

    # 同一帧最多两个音效
    per_frame = Counter(s["start"] + x["at"] for s in screens for x in s["sfx"])
    for f, c in per_frame.items():
        if c > 2:
            errors.append(f"帧 {f} 叠了 {c} 个音效")

    # 重卡点位置
    heavy = [s for s in screens if s.get("heavy")]
    if not 3 <= len(heavy) <= 5:
        errors.append(f"重卡点 {len(heavy)} 处 不在 3–5 之间")
    for s in heavy:
        f = s["start"]
        if s["heavy"] == "主线问题":
            if not (first_phrase["start"] <= f < first_phrase["end"] and f in downbeats):
                errors.append(f"主线问题 f{f} 不在第一个大段的小节第一拍")
            if f / fps > 5:
                errors.append("主线问题晚于第 5 秒")
        elif s["heavy"] == "核心反转":
            if f != climax:
                errors.append(f"核心反转 f{f} ≠ climaxFrame {climax}")
        elif f not in accents:
            errors.append(f"{s['heavy']} f{f} 不在 accents 上")

    if len(you_hits) > 3:
        errors.append(f"「你」出现 {len(you_hits)} 次")
    if len(we_hits) > 1:
        errors.append(f"「我们」出现 {len(we_hits)} 次")

    with_people = [s for s in screens if s["characters"]]
    ratio = len(with_people) / len(screens)
    if ratio < 0.8:
        errors.append(f"有角色的屏只有 {ratio:.0%}")

    # 前 5 秒
    first = screens[0]
    early_sfx = [x for x in first["sfx"] if x["at"] == 0]
    if not early_sfx:
        errors.append("第一屏第 0 帧没有音效")

    # ---------- 输出 ----------
    out = []
    w = out.append
    w("# 情感漠视 字幕稿\n")
    w("> 本文件由 `npm run subtitles` 根据 `src/data/subtitles.ts` 和 `src/data/rhythm.json` 生成，改稿只改 subtitles.ts 后重新生成。\n")
    w(f"网格：{rhythm['bpm']:g} BPM，1 拍 {fpb:g} 帧，1 小节 {rhythm['framesPerBar']:g} 帧（{rhythm['framesPerBar'] / fps:g} 秒），"
      f"共 {len(bars)} 小节 {rhythm['durationInFrames']} 帧（{rhythm['durationSeconds']:g} 秒），climaxFrame = {climax}。"
      "时间码格式 时:分:秒:帧，fN 指本屏起点之后第 N 帧。\n")
    w("段落：" + "，".join(f"{x['name']} B{x['startBar'] + 1}–B{x['endBar']}（{x['start'] / fps:g}–{x['end'] / fps:g}s）" for x in rhythm["sections"]) + "\n")
    w("| 屏号 | 时间码 | 字幕（上行 / 下行） | 人物（谁 在做什么 景别） | 画面动作 | 画风 | 音效（名称 档位） | 卡点 |")
    w("|---|---|---|---|---|---|---|---|")
    for s in screens:
        sub = []
        if s.get("upper") and s.get("lower"):
            sub.append(f"{s['upper']} / {s['lower']}")
            sub.append("两行 同出" if s["lowerAt"] == s["start"] else f"两行 下行 +{s.get('lowerDelayBeats')}拍 f{s['lowerAt'] - s['start']}")
        elif s.get("upper"):
            sub.append(f"{s['upper']}")
            sub.append("单行")
        else:
            sub.append("无主字幕")
        if s.get("float"):
            at = f" f{s['floatAt'] - s['start']}" if s["floatAt"] != s["start"] else ""
            sub.append(f"大字 {s['float']}{at}")
        if s.get("labels"):
            sub.append("标签 " + " ｜ ".join(s["labels"]))
        if s.get("notes"):
            sub.append("出处 " + " ｜ ".join(s["notes"]))
        if s["chars"]:
            sub.append(f"{s['chars']}字 {s['cps']:.1f}字每秒")
        sfx = "<br>".join(f"f{x['at']} {x['name']} {tiers[x['tier']]['name']}" for x in s["sfx"]) or "无（留白）"
        poses = "<br>".join(f"f{c['offset']} {c['who']} {c['poseLabel']}（{c['pose']}）" for c in s.get("cast", []))
        people = s["people"] + (f"<br>**动作** {poses}" if poses else "")
        cue = s["cue"]
        if s.get("heavy"):
            cue = f"**★ {s['heavy']}** " + cue
        elif s.get("bigAction"):
            cue = "**大动作** " + cue
        time = f"{tc(s['start'], fps)}–{tc(s['end'], fps)}<br>B{s['startBar']}" + (f"–B{s['startBar'] + s['bars'] - 1}" if s["bars"] > 1 else "")
        w(f"| {s['n']} | {time} | {'<br>'.join(sub)} | {people} | {s['action']} | {styles[s['style']]} | {sfx} | {cue} |")

    w("\n## 附录\n")
    w(f"- **总字数**：{total_chars} 字（主字幕和主题词大字，不含附着标签和出处）")
    w(f"- **总时长**：{rhythm['durationInFrames']} 帧 = {rhythm['durationSeconds']:g} 秒，{len(screens)} 屏")
    w("- **重卡点**：" + "；".join(f"屏{s['n']} {tc(s['start'], fps)} {s['heavy']}「{plain(s['upper'])} {plain(s['lower'])}」" for s in heavy))
    big = [s for s in screens if s.get("bigAction")]
    w(f"- **大动作**：共 {len(big)} 处 " + "；".join(f"屏{s['n']} {tc(s['start'], fps)}" for s in big))
    hooks = [s for s in screens if s.get("hook")]
    gaps = [round((b["start"] - a["start"]) / fps, 1) for a, b in zip(hooks, hooks[1:])]
    w("- **小钩子**：" + "；".join(f"屏{s['n']} {s['start'] / fps:g}s {s['hook']}" for s in hooks) + f"（间隔 {' '.join(f'{g:g}' for g in gaps)} 秒）")
    w(f"- **「你」**：{len(you_hits)} 次，屏 " + " ".join(f"{n}（{screens[n - 1]['start'] / fps:g}s）" for n in you_hits) + f"；「我们」{len(we_hits)} 次")
    w(f"- **有角色的屏**：{len(with_people)} / {len(screens)} = {ratio:.0%}")

    appear = defaultdict(list)
    for s in screens:
        for c in s["characters"]:
            appear[c].append(s["n"])
    w("\n**人物出场统计**\n")
    w("| 人物 | 屏数 | 出现在 |")
    w("|---|---|---|")
    for c, ns in sorted(appear.items(), key=lambda kv: (-len(kv[1]), kv[1][0])):
        w(f"| {c} | {len(ns)} | {' '.join(map(str, ns))} |")

    w("\n**画风变奏清单**\n")
    w("| 画风 | 屏 | 时间 |")
    w("|---|---|---|")
    blocks = []
    for s in screens:
        if blocks and blocks[-1][0] == s["style"]:
            blocks[-1][2] = s
        else:
            blocks.append([s["style"], s, s])
    for st, a, b in blocks:
        w(f"| {styles[st]} | {a['n']}–{b['n']} | {a['start'] / fps:g}–{b['end'] / fps:g}s（B{a['startBar']} 起） |")

    if NOTES.exists():
        w("\n" + NOTES.read_text(encoding="utf-8").strip())

    w("\n## 校验\n")
    if errors:
        w("未通过：\n")
        for e in errors:
            w(f"- {e}")
    else:
        w("全部通过：字数和行长、每秒字数、下行读字时间、换屏对齐小节、下行对齐拍点、重卡点位置、同帧音效数、标点、说教词、「你」「我们」次数、角色在场比例。")

    OUT.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"写入 {OUT}  {len(screens)} 屏 {total_chars} 字")
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print("校验全部通过")


if __name__ == "__main__":
    main()
