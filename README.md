# remotion-sisyphus

《七宗罪》横屏知识短片（1920×1080，30fps，无口播），全部画面和音效都由代码生成。
当前是预览版：开头（0–10 秒）+ 第一节「致命是源头」（10–28 秒）。

## 渲染

```bash
npm install
npm run render:preview   # 校验字幕稿 → 合成音效 → 渲染 out/preview.mp4
npm run dev              # 打开 Remotion Studio 预览
./scripts/qa.sh          # 成片自查：抽帧联系表（out/qa/）+ 音频峰值和高频能量
```

## 结构

| 文件 | 作用 |
|---|---|
| `src/data/script.ts` | **字幕定稿**：每屏的开始帧、结束帧、文字、重点词、小标题，以及画面节点和音效时间轴。改字幕只改这里 |
| `src/world.ts` | 世界坐标布局 + 全片唯一的镜头轨道（推、拉、移、甩都在这里） |
| `src/sections/Section0.tsx` | 〇 不犯法的罪（含 `opening/OpeningCuts.tsx` 前 2.4 秒的剪辑段） |
| `src/sections/Section1.tsx` | 一 致命是源头 |
| `src/components/DesireGauge.tsx` | 贯穿物件「欲望水位计」试管，各节复用 |
| `src/components/Person.tsx` | 可换动作、表情的 SVG 小人 |
| `src/components/Overlay.tsx` | 底部字幕、中央大字、左上角主题标注、音效轨 |
| `scripts/gen-sfx.ts` | 用代码合成全部音效 wav（时间与长度从字幕稿取） |
| `scripts/check-script.ts` | 字幕稿校验：标点、读速、行宽、行数、重叠 |
