#!/usr/bin/env python3
"""生成全片节奏网格 src/data/rhythm.json。

用法：
    python3 scripts/rhythm.py --seconds 148.8 --bpm 100 --climax 91.2

全片的时间都从这份网格里取：换屏对齐 bars，下行晚出对齐 beats，
重卡点放在 downbeats / climaxFrame / accents 上。
"""

import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 节奏曲线：开头快 → 故事推进中速 → 转折前放慢蓄势 → 高潮点揭晓 → 揭晓后加快 → 结尾放慢
SECTION_SPECS = [
    ("hook", "钩子", "fast"),
    ("story", "故事推进", "medium"),
    ("buildup", "蓄势", "slow"),
    ("climax", "高潮点", "hit"),
    ("after", "揭晓后", "fast"),
    ("ending", "结尾", "slow"),
]


def parse_args():
    p = argparse.ArgumentParser(description="生成节奏网格 rhythm.json")
    p.add_argument("--seconds", type=float, required=True, help="总时长（秒），会取整到最近的整小节")
    p.add_argument("--bpm", type=float, required=True, help="每分钟拍数，建议 90–110")
    p.add_argument("--climax", type=float, required=True, help="高潮点大约落在第几秒，会对齐到最近的小节第一拍")
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--beats-per-bar", type=int, default=4)
    p.add_argument("--beats-per-phrase", type=int, default=16)
    p.add_argument("--hook-seconds", type=float, default=5.0, help="钩子至少覆盖的秒数，向上取整到小节")
    p.add_argument("--buildup-bars", type=int, default=4, help="高潮点之前蓄势段的小节数")
    p.add_argument("--climax-bars", type=int, default=2, help="高潮点段的小节数")
    p.add_argument("--ending-ratio", type=float, default=0.18, help="结尾段占全片小节数的比例")
    p.add_argument("--out", default=str(ROOT / "src" / "data" / "rhythm.json"))
    return p.parse_args()


def main():
    a = parse_args()
    if not 90 <= a.bpm <= 110:
        print(f"提醒：bpm={a.bpm} 不在 90–110 之间")

    frames_per_beat = a.fps * 60.0 / a.bpm
    bar_seconds = a.beats_per_bar * 60.0 / a.bpm
    total_bars = max(1, round(a.seconds / bar_seconds))
    total_beats = total_bars * a.beats_per_bar

    def beat_frame(i):
        return round(i * frames_per_beat)

    duration = beat_frame(total_beats)
    beats = [beat_frame(i) for i in range(total_beats)]
    downbeats = beats[:: a.beats_per_bar]
    bars = [
        {"index": i, "start": beat_frame(i * a.beats_per_bar), "end": beat_frame((i + 1) * a.beats_per_bar)}
        for i in range(total_bars)
    ]

    beats_per_phrase = a.beats_per_phrase
    phrases = []
    for i in range(math.ceil(total_beats / beats_per_phrase)):
        start = beat_frame(i * beats_per_phrase)
        end = beat_frame(min((i + 1) * beats_per_phrase, total_beats))
        phrases.append({"index": i, "start": start, "end": end, "startBar": i * beats_per_phrase // a.beats_per_bar})

    # 高潮点：离 --climax 最近的小节第一拍
    climax_target = a.climax * a.fps
    climax_bar = min(range(total_bars), key=lambda i: abs(bars[i]["start"] - climax_target))
    climax_frame = bars[climax_bar]["start"]

    accents = [ph["start"] for ph in phrases if ph["start"] > climax_frame]

    # 段落，全部以小节为单位
    hook_bars = max(1, math.ceil(a.hook_seconds / bar_seconds - 1e-9))
    ending_bars = max(1, round(total_bars * a.ending_ratio))
    bounds = [
        0,
        hook_bars,
        climax_bar - a.buildup_bars,
        climax_bar,
        climax_bar + a.climax_bars,
        total_bars - ending_bars,
        total_bars,
    ]
    for (sid, _, _), lo, hi in zip(SECTION_SPECS, bounds, bounds[1:]):
        if hi <= lo:
            raise SystemExit(f"段落 {sid} 没有小节（{lo}→{hi}），调整 --climax / --buildup-bars / --ending-ratio")

    sections = [
        {
            "id": sid,
            "name": name,
            "pace": pace,
            "startBar": lo,
            "endBar": hi,
            "start": bars[lo]["start"],
            "end": bars[hi - 1]["end"],
        }
        for (sid, name, pace), lo, hi in zip(SECTION_SPECS, bounds, bounds[1:])
    ]

    data = {
        "fps": a.fps,
        "bpm": a.bpm,
        "beatsPerBar": a.beats_per_bar,
        "beatsPerPhrase": beats_per_phrase,
        "framesPerBeat": frames_per_beat,
        "framesPerBar": frames_per_beat * a.beats_per_bar,
        "durationInFrames": duration,
        "durationSeconds": duration / a.fps,
        "climaxFrame": climax_frame,
        "climaxBar": climax_bar,
        "beats": beats,
        "downbeats": downbeats,
        "bars": bars,
        "phrases": phrases,
        "accents": accents,
        "sections": sections,
    }

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fps = a.fps
    print(f"写入 {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")
    print(f"{a.bpm:g} BPM  1 拍 {frames_per_beat:g} 帧  1 小节 {bar_seconds:g} 秒  共 {total_bars} 小节 {duration} 帧 {duration / fps:g} 秒")
    print(f"高潮点 第 {climax_bar + 1} 小节 帧 {climax_frame}（{climax_frame / fps:g} 秒）")
    print("accents " + " ".join(f"{f}({f / fps:g}s)" for f in accents))
    for s in sections:
        print(f"  {s['name']:<6} B{s['startBar'] + 1}–B{s['endBar']}  {s['start'] / fps:g}–{s['end'] / fps:g} 秒  {s['pace']}")


if __name__ == "__main__":
    main()
