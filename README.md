# remotion-sisyphus

《黑色生命力》：1920×1080 / 30fps 横屏知识短视频，画面和音效全部由代码生成（Remotion + 纯代码合成音效），不用任何素材。

当前进度：**预览**（开头 + 第一节 + 第二节前四屏，约 33 秒）。

## 目录

| 路径 | 内容 |
|---|---|
| `src/data/script.json` | **字幕定稿数据**：每屏的开始帧、结束帧、文字、重点词、重点词颜色、音效（相对本屏的帧偏移、类型、档位）、砸下来的大字。画面和音效的时间都从这里取，改字幕只改这一个文件 |
| `src/components/BlackStone.tsx` | 贯穿物件：黑石（外观 / 裂缝 / 轮廓光 / 剖面年轮） |
| `src/components/Figure.tsx` | 人物：SVG 几何人形，关节角度插值做动作（站、走、推、跪、跌坐、抬头、转身） |
| `src/components/Subtitles.tsx` | 字幕：固定在底部，不跟镜头缩放平移 |
| `src/components/ImpactWord.tsx` | 砸到画面中部偏左的大字（可碎裂飞向黑石） |
| `src/components/Camera.ts` | 连续镜头：关键帧推、拉、移，震动 |
| `src/sections/` | 每节一个组件：`Opening`、`Section1`、`Section2` |
| `scripts/build-audio.mjs` | 读 `script.json` 合成音效并混成 48kHz/16bit wav（带总线限幅） |
| `scripts/check-*.{sh,mjs}`, `scripts/*.py` | 字幕数据校验、成片响度/峰值/削波检查、噪声类音效放大检查 |

## 命令

```bash
npm install
npm run check:script        # 校验字幕数据（读速、行数、高亮数）
npm run audio               # 合成音效 → public/audio/preview-mix.wav
npx remotion render src/index.ts Preview out/preview.mp4
npm run check:audio         # ebur128 + astats + 逐样本扫描
npm run check:sfx           # 噪声类音效单独放大分析，输出 out/sfx-check/
npm run studio              # 预览/调试
```

字体：思源黑体（`@fontsource/noto-sans-sc`，Noto Sans SC 即思源黑体）。
