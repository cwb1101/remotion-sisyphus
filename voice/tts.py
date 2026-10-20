#!/usr/bin/env python3
"""肆号静匣Logos 锁定声线：成熟沙哑男声。

参数全部写死在这里，任何窗口、任何项目调用都得到同一个声音。
不要改 VOICES / SPEED / CHAIN；要换声线就新增一个预设，别动旧的。

用法：
  python3 voice/tts.py "要读的文本" out.wav
  python3 voice/tts.py --json src/subtitles.json --outdir public/vo
    JSON 是数组或 {"lines": [...]}，每项要有 id 和 text（可选 voiceText 覆盖朗读文本）。
    输出 <id>.wav 和 manifest.json（每条的秒数），画面时间轴从 manifest 取。
"""
import argparse, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "kokoro-multi-lang-v1_1")

# 试听编号 -> Kokoro v1.1-zh 说话人 id
VOICES = {"A": 63, "B": 68, "C": 81, "D": 84, "E": 88}
DEFAULT_VOICE = "D"
SPEED = 0.92
# 降 1 个半音（保留共振峰）+ 暖低频 + 去浑 + 颗粒感 + 轻度软削波 + 压缩 + 响度统一
CHAIN = (
    "rubberband=pitch=0.94:formant=preserved,highpass=f=60,lowshelf=g=3:f=180,"
    "equalizer=f=350:t=q:w=1:g=-2,equalizer=f=2800:t=q:w=1.5:g=1.5,volume=4dB,"
    "asoftclip=type=atan:threshold=0.7,"
    "acompressor=threshold=-18dB:ratio=3:attack=10:release=120,lowpass=f=11000,"
    "loudnorm=I=-16:TP=-3:LRA=7,aresample=48000"
)


def load_tts():
    import sherpa_onnx
    if not os.path.exists(os.path.join(MODEL, "model.onnx")):
        sys.exit("模型不存在，先运行 voice/setup.sh")
    m = MODEL
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=f"{m}/model.onnx", voices=f"{m}/voices.bin", tokens=f"{m}/tokens.txt",
                data_dir=f"{m}/espeak-ng-data", dict_dir=f"{m}/dict",
                lexicon=f"{m}/lexicon-us-en.txt,{m}/lexicon-zh.txt"),
            num_threads=4),
        rule_fsts=f"{m}/date-zh.fst,{m}/phone-zh.fst,{m}/number-zh.fst",
        max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)


def to_speech_text(text):
    # 字幕里的【】只是高亮标记；空格是停顿，朗读时换成逗号
    t = text.replace("【", "").replace("】", "")
    t = re.sub(r"\s+", "，", t.strip())
    return t if re.search(r"[。？！]$", t) else t + "。"


def synth(tts, text, out_wav, voice):
    import soundfile as sf
    audio = tts.generate(to_speech_text(text), sid=VOICES[voice], speed=SPEED)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, audio.samples, audio.sample_rate)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-af", CHAIN,
                    "-ac", "1", "-c:a", "pcm_s16le", out_wav], check=True)
    os.unlink(tmp.name)
    return sf.info(out_wav).duration


def main():
    p = argparse.ArgumentParser()
    p.add_argument("text", nargs="?")
    p.add_argument("out", nargs="?")
    p.add_argument("--json")
    p.add_argument("--outdir")
    p.add_argument("--voice", default=DEFAULT_VOICE, choices=sorted(VOICES))
    a = p.parse_args()
    tts = load_tts()
    if a.json:
        data = json.load(open(a.json, encoding="utf-8"))
        lines = data["lines"] if isinstance(data, dict) else data
        os.makedirs(a.outdir, exist_ok=True)
        manifest = {}
        for ln in lines:
            path = os.path.join(a.outdir, f"{ln['id']}.wav")
            manifest[ln["id"]] = round(synth(tts, ln.get("voiceText") or ln["text"], path, a.voice), 3)
            print(ln["id"], manifest[ln["id"]], "s")
        json.dump(manifest, open(os.path.join(a.outdir, "manifest.json"), "w"), ensure_ascii=False, indent=2)
    elif a.text and a.out:
        print(round(synth(tts, a.text, a.out, a.voice), 3), "s")
    else:
        p.print_help()


if __name__ == "__main__":
    main()
