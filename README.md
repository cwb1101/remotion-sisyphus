# remotion-sisyphus

《比冷暴力更磨人的情感漠视》—— Vibe 知识大赏风格横屏知识短片（1920×1080 / 30fps / 无口播），画面、音效全部由代码生成。

## 目录

- `src/data/script.ts`：**字幕定稿，全片唯一的时间来源**（每屏开始帧、结束帧、文字、重点词，各节小标题、本期主题）
- `src/data/timeline.ts`：画面节拍与音效时间轴，全部用 `beat(字幕屏, 偏移帧)` 挂在字幕上
- `src/sections/`：每节一个组件（S0 一个字、S1 不是冷暴力……）
- `src/components/`：贯穿物件 `EmotionBall`、人物 `Person`（SVG，可换动作/表情）、字幕、主题标注等
- `scripts/synth_sfx.py`：用代码合成全部音效 → `public/sfx/*.wav`
- `scripts/check-script.ts`：字幕自检（标点、阅读时长、行数行宽、右侧禁区）
- `scripts/qa.sh`：渲染后自检（抽帧联系表、音频峰值/咔哒声/高频）
- `scripts/mix_audio.py`：按时间轴把音效 + 柔和和弦垫音混成整片音轨
- `scripts/render-film.sh`：分段渲染（每节一段）→ 无损拼接 → 混入音轨
- `film/`：完整成片和自检联系表
- `preview/`：开头 + 第一节的预览片

## 命令

```bash
npm install
npm run render:film      # 完整片：合成音效 → 字幕自检 → 混音 → 分段渲染 → 合成 out/film.mp4
bash scripts/render-film.sh s3 s5   # 只重渲某几节，其余沿用已渲好的分段
npm run qa:film          # 成片自检：每 2 秒抽帧、小标题、静止段、黑场、音频
npm run render:preview   # 合成音效 → 字幕自检 → 渲染 out/preview.mp4（0–25s）
npm run qa               # 抽帧 + 音频检查，结果在 out/qa/
npm run studio           # 在浏览器里实时预览、拖时间轴
```

需要 Python 3 + numpy（合成音效）。本机若没有 `/opt/pw-browsers` 下的 Chromium，Remotion 会自动下载浏览器，或用环境变量 `REMOTION_BROWSER` 指定。
