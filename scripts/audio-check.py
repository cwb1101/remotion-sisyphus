"""逐个动作音/重音：瞬时响度峰值 vs 事件前的环境底（ebur128 M 值，400ms 窗）。
python3 scripts/audio-check.py public/audio/preview.wav"""
import json, re, subprocess, sys
path = sys.argv[1]
txt = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-v", "verbose", "-i", path, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
S = [(float(t), float(m), float(s)) for t, m, s in re.findall(r"t:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)", txt)]
I = float(re.search(r"I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold", txt).group(1))
TP = float(re.search(r"True peak:\s*\n\s*Peak:\s+(-?[\d.]+)", txt).group(1))
cues = json.load(open("src/data/cues.json"))
subs = json.load(open("src/data/subtitles.json"))
fps = cues["fps"]
end = subs["preview"]["to"] / fps
rows = []
for c in cues["cues"]:
    t0 = c["frame"] / fps
    if c["type"] == "ambience" or t0 >= end:
        continue
    pre = sorted(m for t, m, s in S if t0 - 2.0 <= t <= t0 - 0.5 and t > 0.5)
    if c.get("duck"):  # 重音：与压低前的环境底比
        d0 = c["duck"]["from"] / fps
        pre = sorted(m for t, m, s in S if d0 - 2.0 <= t <= d0 - 0.2 and t > 0.5)
    bed = pre[len(pre) // 2]
    pk = max(m for t, m, s in S if t0 <= t <= t0 + 1.5)
    rows.append({"time": round(t0, 2), "type": c["type"], "sound": c["sound"], "target_db": c["db"], "measured_db": round(pk - bed, 1)})
smax = max(s for t, m, s in S if t >= 3)
print(json.dumps({"integratedLUFS": I, "truePeakDBTP": TP, "maxShortTerm": smax, "shortTermOverI": round(smax - I, 1), "events": rows}, ensure_ascii=False, indent=1))
