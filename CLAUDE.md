# remotion-sisyphus

抖音横屏知识短片《总观效应》，Remotion 制作。

- 全片设定与风格规矩：`docs/brief.md`（每一步都必须遵守）
- 音乐分析：`docs/music-analysis.md`，原始数据 `assets/music/bgm.analysis.json`（帧号按 30fps）
- 方案：`docs/plan.md`
- 已定：开头 A「地平线是直的」+ 视觉 V2「鎏金暗场 · 一粒尘埃」
- 字幕稿：`docs/subtitles.md`（由 `scripts/subtitles.py` 生成，同时输出 `src/data/subtitles.json`）
- 依赖：`pip install -r scripts/requirements.txt`
- 流程：`python scripts/analyze_music.py` → `python scripts/bgm.py --seconds 147.4 --drop 23`（→ `public/audio/bgm.wav`、`src/data/beatmap.json`）→ `python scripts/subtitles.py`
