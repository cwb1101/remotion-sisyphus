# remotion-sisyphus

抖音横屏知识短片《总观效应》，Remotion 制作。

- 全片设定与风格规矩：`docs/brief.md`（每一步都必须遵守）
- 音乐分析：`docs/music-analysis.md`，原始数据 `assets/music/bgm.analysis.json`（帧号按 30fps）
- 方案：`docs/plan.md`
- 已定：开头 A「地平线是直的」+ 视觉 V2「鎏金暗场 · 一粒尘埃」
- **字幕定稿：`src/data/subtitles.ts`**（唯一来源；画面、音效、卡点都按屏号从这里和 `src/data/beatmap.json` 取时间）
  改完跑 `npm run check` 校验规则。`docs/subtitles.md` 是第 2 步的设计稿（画面 / 音效描述），时间以 subtitles.ts 为准
- 依赖：`npm install`；`pip install -r scripts/requirements.txt`
- 音频：`python scripts/bgm.py --seconds 147.4 --drop 23`（→ `public/audio/bgm.wav`、`src/data/beatmap.json`）；`npm run sfx`（→ `public/sfx/*.wav`）
- 预览：`npm run render:preview`（→ `out/preview.mp4`，前 33 秒，已定稿，不要改）
- 整片：`npm run render`（= `python scripts/render_full.py`，分段渲染 → `out/overview.mp4`，-14 LUFS / 真峰值 ≤ -1 dBTP）
  只重渲某几段：`python scripts/render_full.py 3 5`；只重做音频和合成：`python scripts/render_full.py mux`
  注意：尘埃位置依赖从第 0 帧累加的变速时间，改了任何一段的 speed 轨道，后面所有段都要重渲
- 自查：`python scripts/review_frames.py out/overview.mp4 out/review-full`（联系表、重卡点前后帧、音频起音）；
  `npm run check:shot`（镜头轨道逐帧连续性，只允许重卡点上的瞬变）

## 代码结构
- `src/Film.tsx`：一镜到底；层级 镜头层 → 闪光 → 主字幕 → 水印（镜头层外）
- `src/film/shot.ts`：镜头 = 钉住地球上的一点 + 缩放；各节只往轨道里加关键帧
- `src/film/cues.ts`：`move()` 让镜头运动从小节线出发、落在底鼓上
- `src/components/Mote.tsx`：贯穿物件（那粒尘埃 = 地球），超大半径时只画画面附近的弧
- `src/sections/*.tsx`：每节一个文件，导出 keys / sfx / Overlay（Hook、Evidence、Naming、Viewer、Mechanism、Answer、Return）
- 预览段在 `Film.tsx` 里用 `freezeAt(…, screen(10).end)` 钉住；后面各节的轨道只往后加关键帧
- 一节的轨道在本节最后一屏结束时要有值（保持帧），否则会提前往下一节的值漂
