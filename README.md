# remotion-sisyphus

抖音横屏知识短片（Remotion，全代码动画）。

- `prompts/提示词-优化版.md`：分 4 步的提示词（方案 → 字幕稿 → 30 秒样片 → 完整片）
- `assets/music/bgm_source.mp3`：BGM 原曲（168 BPM，44.6 秒）
- `scripts/bgm.py`：把 BGM 按乐句拼接到成片长度，并导出 30fps 卡点表

```bash
pip install numpy   # 另外需要 ffmpeg
python3 scripts/bgm.py --seconds 150 --drop 22
# → public/audio/bgm.wav + src/data/beatmap.json
```
