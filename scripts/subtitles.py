"""字幕稿：数据 + 排时 + 规则校验。

用法: python scripts/subtitles.py
读:   src/data/beatmap.json（scripts/bgm.py 生成）
写:   src/data/subtitles.json（给后面的 Remotion 用）, docs/subtitles.md（字幕稿表格）

排时规则:
  - 每屏从一个小节线开始，持续整数个小节（误差 0 帧）
  - 屏长取 max(最少小节数, 读字所需小节数)，读字速度 ≤ 4 字/秒，且 ≥ 2 秒
  - 重卡点屏必须落在 accent（高潮段乐句起点）上；不在的话把前一屏拉长到下一个 accent
    （只往后推，不为卡点提前切）
校验: 每屏 ≤ 15 字、【】最多一个、同一画面（scene）最多两屏、重卡点 3–5 个。
"""
import json
import math
import re

FPS = 30
MAX_CHARS = 15
MAX_CPS = 4.0
MIN_SEC = 2.0

# (字幕, 最少小节数, 画面id, 画面动作, 音效, 重卡点名 或 None, 附着标签/注释)
SCREENS = [
    # ---- 钩子 ----
    ("你见过的每一条地平线，", 2, "A",
     "暖近黑底，四角压暗。画面下 1/3 一条象牙白细线横贯全屏，线上方贴着一层极薄的金色光晕；失焦尘埃分三层慢慢漂；镜头以每秒 0.3% 缓慢上移",
     "—（只有 BGM）", None, ""),
    ("都是【直的】。", 2, "A",
     "一道金色反光沿着线从左扫到右，扫过的地方尘埃被短暂照亮",
     "glint：高频正弦簇，0.4s 衰减，落在底鼓上", None, ""),
    ("升到400公里高——", 2, "B",
     "镜头上升，线往下沉，两端开始往下弯；线右侧出现高度标签，数字从 0 滚到 400",
     "whoosh：粉噪声配带通滤波从 300Hz 扫到 3kHz，1.4s", None, "高度 0 → 400 km"),
    ("它就【弯】了。", 2, "B",
     "弯成一道明显的弧，弧上那层金色薄光变清楚",
     "swell：低频正弦渐强 0.8s", None, "国际空间站轨道高度约 400 km"),
    ("再远一点，它合成一个圆。", 2, "C",
     "镜头继续后拉，弧的两端在画面外合拢，一个完整的球进画：左上被暖光照亮，右下是暗面，边缘一圈金色薄边",
     "—", None, ""),
    ("不少人，从这里看过地球。", 2, "C",
     "一粒金色小光点绕着球的轨道慢慢转，身后拖一道淡淡的轨迹",
     "tick：1.8kHz 短正弦，0.03s，落在小光点出现的那拍", None, ""),
    ("回来后，说自己【变了】。", 2, "D",
     "小光点离开轨道，落回球面，落点泛起一圈涟漪",
     "thud：80Hz 短击，0.2s", None, ""),
    ("可他们只是，看了一眼。", 2, "D",
     "（break 段，低频被抽空）漂浮全部放慢到 30%，光线降到 70%，球随镜头的“吸气”微微缩小",
     "reverse swell：反向噪声渐强 2.4s，收在 drop 前一帧", None, ""),
    ("看一眼地球，为什么能【改变一个人】？", 4, "E",
     "【大动作①】一束斜光从左上划过全屏，光里的尘埃一下全亮；球边缘闪一下；字幕从 1.15 倍、模糊状态砸到 1 倍并变清晰",
     "boom：45Hz 正弦加噪声瞬态，1.2s 衰减", "主线问题", ""),
    # ---- 实证 ----
    ("1968年，阿波罗8号绕月。", 2, "F",
     "画面底部（安全区以上）升起一道巨大的灰白弧线，是月球的边缘；球变小，从月球弧线后面慢慢升起",
     "—", None, "《地球升起》· 1968.12.24"),
    ("「我们去探索月球，却发现了【地球】。」", 3, "F",
     "球完全升出月球弧线，停住，只轻轻自转（晨昏线缓慢移动）",
     "bell：FM 合成钟声，一下，很轻", None, "比尔·安德斯 · NASA 口述历史 · 1997"),
    ("那圈薄光，就是全部的空气。", 2, "G1",
     "镜头推到球的边缘，那圈金色薄边铺满画面宽度，成了一条发亮的细带",
     "air：滤过的白噪声，很低", None, ""),
    ("把地球缩成一个篮球——", 2, "G2",
     "镜头急退，球缩到画面中央的篮球大小",
     "whoosh 下行", None, "篮球直径约 24 cm"),
    ("空气层不到【2毫米】。", 2, "G2",
     "球边缘出现一把放大镜式的比例尺，两道刻度之间写着 1.9 mm",
     "tick ×2，落在两道刻度出现的那两拍", None, "示意：以 100 km 卡门线计，6371 km 地球半径"),
    ("演《星际迷航》船长的沙特纳，", 2, "H",
     "球回到正常大小，球顶边缘一个小光点准备升空",
     "—", None, "威廉·沙特纳"),
    ("90岁时，真的飞上了太空。", 2, "H",
     "小光点沿抛物线升到球外的黑暗里，画面上跳出年龄“90”",
     "whoosh 上行", None, "2021.10.13 · 蓝色起源 NS-18 · 全程约 10 分钟"),
    ("「我感受过最强烈的【悲伤】之一。」", 4, "I",
     "【大动作②】小光点停在抛物线顶点时，斜光熄灭，尘埃停住一拍，全屏只剩那颗球还亮着，球的光晕在 4 个小节里极慢地呼吸、变暗；「悲伤」染成朱红",
     "sub drop：60Hz 正弦从 120Hz 下滑，1.5s，压低高频", "核心反转", "沙特纳《Boldly Go》· 2022"),
    ("不止他一个。", 2, "J",
     "光重新亮起；四周的尘埃一粒粒亮起来，像别的观察者",
     "glint，一粒一下，落在 8 分音符上", None, ""),
    ("这种转变，有个名字——", 2, "J",
     "亮起的尘埃开始朝球靠拢，越转越快",
     "reverse swell 1.4s，收在下一屏第一帧前", None, ""),
    ("【总观效应】", 4, "K",
     "【大动作③】四个金字从上方砸下，落定时一道光环从球外推开到全屏；亮起的尘埃聚成一圈轨道，绕着球转",
     "boom 加 bell 叠层，2s 尾音", "主题词",
     "The Overview Effect · 弗兰克·怀特 1987 年提出 · 指看到整个地球后发生的认知转变"),
    ("去过太空的，只有七百多人。", 2, "L",
     "轨道上的光点正好 746 粒，计数标签从 0 滚到 746",
     "tick 渐密（计数音）", None, "746 人 · 截至 2026.10 · 卡门线口径"),
    ("1990年，探测器回头了——", 2, "M",
     "镜头猛退，轨道和光点散开；一束很宽的斜光横过画面，球缩成光里的一粒尘",
     "whoosh 长音，下行", None, "旅行者 1 号 · 1990.2.14 · 距地球约 60 亿公里"),
    ("地球只有【0.12】个像素。", 3, "M",
     "【大动作④】尘埃一拍之内塌成一个比像素还小的光点；旁边放大出一个像素方格，方格里只有 12% 被点亮",
     "reverse suck 加 kick 加高频 tick", "落到观众", "NASA/JPL 图像 PIA00452 说明"),
    ("这一帧画面，有207万个像素。", 3, "N",
     "一道细细的象牙白边框沿着画面内缘描一圈（绕开右上角水印），角上标出尺寸",
     "tick 连续四下，落在画框四个角上", None, "1920 × 1080 = 2,073,600"),
    ("地球，还不到其中一个。", 2, "N",
     "边框淡去，聚光收拢到中心那个光点上",
     "—", None, ""),
    ("你认识的每一个人，", 2, "O1",
     "光点外圈泛起极轻的呼吸光（亮度 ±10%）",
     "—", None, ""),
    ("包括正在看视频的【你】，", 2, "O1",
     "从光点伸出一根细线，朝镜头方向（画面下方中央，停在底部 10% 安全区以上）越来越近、越来越粗",
     "swell 很短", None, ""),
    ("都在这一粒光里。", 2, "O2",
     "细线收回；光束慢慢转动，光点就是满屏尘埃里普通的一粒",
     "air", None, ""),
    # ---- 机制 ----
    ("心理学家认为，这是【敬畏】。", 2, "P1",
     "镜头推回去，光点重新长成球，并且一直变大",
     "swell 长音", None, "Keltner & Haidt, 2003"),
    ("一，大到无法忽视。", 2, "P1",
     "球大到撑出画面四边，只剩一段弧和薄边",
     "—", None, "浩大 vastness"),
    ("二，大到旧认知装不下。", 2, "P2",
     "尘埃聚成一个小圆环（“旧认知”），想把球套住，被撑开、出现裂口",
     "低频拉伸音：正弦慢慢降调", None, "需要顺应 need for accommodation"),
    ("装不下，就只能【重画】。", 2, "P2",
     "小圆环碎成尘埃，再在更远的地方合成一个大得多的圆环",
     "glint 倒放后接正放", None, ""),
    ("重画之后，“我”变小了。", 2, "Q",
     "一粒象牙白尘埃标着“我”，外面套一圈朱红细线（边界），尘埃缩小",
     "tick 下行", None, "Bai 等，2017"),
    ("“我们”，变大了。", 2, "Q",
     "大圆环标着“我们”，向外扩，把所有尘埃都圈进来；每一小簇尘埃外面还留着一圈朱红细线",
     "swell", None, ""),
    ("回到开头的问题——", 2, "Q2",
     "所有尘埃和圆环慢慢退远，球回到画面正中，第 9 屏那束斜光重新淡入",
     "reverse swell 短", None, ""),
    ("改变人的，不是地球有多美。", 2, "R",
     "镜头慢慢后拉，球、圆环、全部尘埃都进画，晨昏线缓慢转动",
     "—", None, ""),
    ("是第一次，一眼看到了【全部】。", 2, "R",
     "“全景”构图下镜头继续极慢后拉（每秒 1%），光在呼吸",
     "—", None, ""),
    ("退得够远，【边界】就不见了。", 4, "S",
     "【大动作⑤】所有朱红细线同时断开，碎成金色尘埃，往外飘散；全屏亮一拍后回落",
     "boom 加空气噪声尾，2s", "金句", ""),
    # ---- 回扣 ----
    ("下一次你看地平线，", 2, "T",
     "镜头俯冲向球面，弧被拉平，回到开头那条直线（构图和第 1 屏完全一样）",
     "whoosh 下行", None, ""),
    ("它还是【直的】。", 2, "T",
     "和第 2 屏一样，一道金色反光从左扫到右",
     "glint（和第 2 屏同一个音）", None, ""),
    ("但你知道，它是圆的一小段，", 2, "U",
     "直线两端外侧淡淡续出一道很大的弧，暗示它是一个巨大的圆",
     "—", None, ""),
    ("上面，站着所有人。", 4, "U",
     "线上从左到右一粒粒亮起极小的光点（就是前面那些尘埃），四个小节里慢慢亮满整条线",
     "tick 很轻，一粒一下", None, ""),
]

CREDITS = [
    "出处",
    "Frank White, The Overview Effect, 1987",
    "NASA: Earthrise, Apollo 8, 1968-12-24；Bill Anders, JSC Oral History, 1997",
    "NASA/JPL: PIA00452 Pale Blue Dot, 1990-02-14",
    "William Shatner, Boldly Go, 2022（Variety 摘录）",
    "Keltner & Haidt, Cognition and Emotion, 2003",
    "Bai et al., JPSP, 2017",
    "Yaden et al., Psychology of Consciousness, 2016",
    "人数：Al Jazeera, 2026-10（卡门线口径）",
    "示意：大气厚度按 100 km 卡门线换算",
    "画面与音效均为代码绘制/合成 · 本片由 AI 辅助制作",
]

UNSURE = [
    ("第 6–7 屏「不少人，从这里看过地球。回来后，说自己变了。」",
     "依据是怀特 1987 年的访谈和 Yaden 等 2016 年的综述，但“不少”没有统计数字，属于概括。"
     "想更稳妥可以改成「有人回来后，说自己变了。」"),
    ("第 12 屏「那圈薄光，就是全部的空气。」",
     "肉眼看到的那圈光是低层大气；稀薄的外逸层延伸得远得多。"
     "第 14 屏的 2 毫米也取决于按 100 km 卡门线算。备选：「那圈薄光，是我们呼吸的全部空气。」"),
    ("第 33 屏「重画之后，“我”变小了。」",
     "Bai 等 2017 年的研究证明敬畏会让“自我”感觉变小（small self），"
     "但“先重画认知、再变小”的先后顺序是叙事上的简化，研究里并没有测这个顺序。"),
]

PUNCT = re.compile(r"[，。、！？：；“”‘’「」《》【】—…·\s,.!?:;\"'()（）-]")


def count_chars(s):
    return len(PUNCT.sub("", s))


def tc(frame):
    s = frame / FPS
    return f"{int(s // 60):02d}:{s % 60:05.2f}"


def main():
    bm = json.load(open("src/data/beatmap.json"))
    bars = bm["bars"]
    accents = set(bm["accents"])
    acc_bars = [i for i, f in enumerate(bars) if f in accents]
    hit = bm["finalHitFrame"]
    end = bm["durationInFrames"]
    bar_sec = (bars[1] - bars[0]) / FPS

    rows = []
    b = 0
    for idx, (text, min_bars, scene, visual, sfx, heavy, label) in enumerate(SCREENS):
        if heavy:
            nxt = next(a for a in acc_bars if a >= b)
            if nxt > b and rows:
                rows[-1]["bars"] += nxt - b
                rows[-1]["note"].append(f"为对齐 accent 拉长 {nxt - b} 小节")
            b = nxt
        n = count_chars(text)
        need = max(min_bars, math.ceil(n / MAX_CPS / bar_sec - 1e-9), math.ceil(MIN_SEC / bar_sec))
        rows.append(dict(no=idx + 1, text=text, scene=scene, visual=visual, sfx=sfx, heavy=heavy,
                         label=label, chars=n, bar=b, bars=need, note=[]))
        b += need

    credits_bar = b
    for r in rows:
        r["start"] = bars[r["bar"]]
        r["end"] = bars[r["bar"] + r["bars"]] if r["bar"] + r["bars"] < len(bars) else end
        r["sec"] = (r["end"] - r["start"]) / FPS
        r["cps"] = r["chars"] / r["sec"]

    # ---- 校验 ----
    errs = []
    for r in rows:
        if r["chars"] > MAX_CHARS:
            errs.append(f"#{r['no']} {r['chars']} 字 > {MAX_CHARS}")
        if r["cps"] > MAX_CPS:
            errs.append(f"#{r['no']} {r['cps']:.2f} 字/秒")
        if r["sec"] < MIN_SEC:
            errs.append(f"#{r['no']} 只有 {r['sec']:.2f}s")
        if r["text"].count("【") > 1:
            errs.append(f"#{r['no']} 高亮多于一个")
        if r["start"] not in bars:
            errs.append(f"#{r['no']} 未对齐小节")
        if r["heavy"] and r["start"] not in accents:
            errs.append(f"#{r['no']} 重卡点不在 accent")
    from collections import Counter
    for sc, c in Counter(r["scene"] for r in rows).items():
        if c > 2:
            errs.append(f"画面 {sc} 挂了 {c} 屏")
    heavies = [r for r in rows if r["heavy"]]
    if not 3 <= len(heavies) <= 5:
        errs.append(f"重卡点 {len(heavies)} 个")
    credits_start = bars[credits_bar] if credits_bar < len(bars) else end
    if (end - credits_start) / FPS < 4:
        errs.append(f"出处只剩 {(end - credits_start) / FPS:.1f}s")

    total_chars = sum(r["chars"] for r in rows)

    # ---- 输出 JSON ----
    out = {
        "fps": FPS,
        "durationInFrames": end,
        "screens": [
            {k: r[k] for k in ("no", "text", "scene", "label", "heavy", "start", "end", "chars")}
            | {"highlight": (re.search(r"【(.+?)】", r["text"]) or [None, None])[1],
               "plain": r["text"].replace("【", "").replace("】", "")}
            for r in rows
        ],
        "credits": {"start": credits_start, "end": end, "lines": CREDITS},
        "finalHitFrame": hit,
    }
    json.dump(out, open("src/data/subtitles.json", "w"), ensure_ascii=False, indent=1)

    # ---- 输出 Markdown ----
    md = ["# 字幕稿：总观效应", "",
          "> 由 `scripts/subtitles.py` 根据 `src/data/beatmap.json` 生成，改字幕请改脚本后重跑。",
          "> 时间码 = 分:秒.百分秒（30fps 帧号写在卡点列）。字数不计标点和【】。", "",
          "| 屏号 | 时间码 | 字幕 | 画面动作 | 音效 | 卡点 |", "|---|---|---|---|---|---|"]
    for r in rows:
        cue = f"bar {r['bar']} · f{r['start']}"
        if r["start"] in accents:
            cue += " · accent"
        if r["start"] == bm["dropFrame"]:
            cue += " · **drop**"
        if r["heavy"]:
            cue = f"**★重卡点：{r['heavy']}** · " + cue
        if r["note"]:
            cue += " · " + "；".join(r["note"])
        vis = r["visual"] + (f"<br>标签：{r['label']}" if r["label"] else "")
        md.append(f"| {r['no']} | {tc(r['start'])}–{tc(r['end'])}（{r['sec']:.1f}s） | {r['text']}<br>"
                  f"<sub>{r['chars']} 字 · {r['cps']:.1f} 字/秒</sub> | {vis} | {r['sfx']} | {cue} |")
    md.append(f"| 片尾 | {tc(credits_start)}–{tc(end)}（{(end - credits_start) / FPS:.1f}s） | （出处，注释字号） "
              f"| 开头那条直线留在画面下 1/3，出处列表在线上方逐行淡入；收尾重击（f{hit}）时直线亮一下，然后整体淡出 "
              f"| 收尾重击跟 BGM 走，不另加音效 | bar {credits_bar} · f{credits_start} · 收尾重击 f{hit} |")
    md += ["", "### 片尾出处", ""] + [f"- {c}" for c in CREDITS[1:]]
    md += ["", "## 统计", "",
           f"- 屏数：{len(rows)} 屏字幕 + 1 屏出处",
           f"- 总字数：{total_chars} 字（不计标点，不含出处）",
           f"- 总时长：{end / FPS:.2f}s（{end} 帧）；字幕段 {tc(rows[0]['start'])}–{tc(credits_start)}，出处 {(end - credits_start) / FPS:.1f}s",
           f"- 平均速度：{total_chars / ((credits_start - rows[0]['start']) / FPS):.2f} 字/秒；最快一屏 {max(r['cps'] for r in rows):.2f} 字/秒",
           "", "### 重卡点", ""]
    for i, r in enumerate(heavies, 1):
        md.append(f"{i}. **{r['heavy']}**：第 {r['no']} 屏 {r['text']}· {tc(r['start'])} · 帧 {r['start']}"
                  + (" · drop" if r["start"] == bm["dropFrame"] else " · accent"))
    md += ["", "### 最没把握的三句", ""]
    md += [f"{i}. {a}：{b}" for i, (a, b) in enumerate(UNSURE, 1)]
    open("docs/subtitles.md", "w").write("\n".join(md) + "\n")

    print(f"{len(rows)} 屏，{total_chars} 字，出处从 bar {credits_bar}（{credits_start / FPS:.2f}s）到 {end / FPS:.2f}s")
    for r in rows:
        flag = f"  ★{r['heavy']}" if r["heavy"] else ""
        print(f"#{r['no']:>2} bar{r['bar']:>3}+{r['bars']} {tc(r['start'])} {r['chars']:>2}字 {r['cps']:.1f}/s "
              f"[{r['scene']}] {r['text']}{flag} {'；'.join(r['note'])}")
    print("校验:", "全部通过" if not errs else errs)


if __name__ == "__main__":
    main()
