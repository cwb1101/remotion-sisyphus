"""两遍 loudnorm: 整片响度 -14 LUFS, 真峰不超过 -1 dBTP

用法: python3 scripts/loudnorm.py in.wav out.wav
第一遍测量, 第二遍按测量值线性调整 (linear=true, 不改动态); 输出后再测一遍打印结果
"""

import json
import re
import subprocess
import sys

TARGET = {"I": -14.0, "TP": -1.0, "LRA": 11.0}


def measure(path, extra=""):
    f = f"loudnorm=I={TARGET['I']}:TP={TARGET['TP']}:LRA={TARGET['LRA']}{extra}:print_format=json"
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", f, "-f", "null", "-"], capture_output=True, text=True).stderr
    return json.loads(re.findall(r"\{[^{}]*\}", out, re.S)[-1])


def main(src, dst):
    m = measure(src)
    extra = (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
             f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    f = f"loudnorm=I={TARGET['I']}:TP={TARGET['TP']}:LRA={TARGET['LRA']}{extra},aresample=48000"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-af", f, "-ar", "48000", "-c:a", "pcm_s24le", dst], check=True)
    r = measure(dst)
    print(f"before I {m['input_i']} TP {m['input_tp']}  ->  after I {r['input_i']} LUFS  TP {r['input_tp']} dBTP  LRA {r['input_lra']}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
