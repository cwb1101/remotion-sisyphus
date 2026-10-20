# 锁定声线

肆号静匣Logos 专用配音：成熟、低沉、略带沙哑的男声。离线合成，参数写死在 `tts.py`，任何窗口跑出来都是同一个声音。

```bash
bash voice/setup.sh                                          # 装引擎、下模型（一次）
python3 voice/tts.py "要读的文本" out.wav                     # 单句
python3 voice/tts.py --json src/subtitles.json --outdir public/vo   # 每屏一个 wav + manifest.json
```

`samples/` 里是五个候选声线（A–E）读同一段文字的试听，默认用 D。
