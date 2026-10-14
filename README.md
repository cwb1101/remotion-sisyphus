# 泪失禁体质 · Remotion 横屏知识短视频

1920×1080 / 30fps，全部画面与音效由代码生成，不使用任何素材。

## 目录

| 路径 | 说明 |
|---|---|
| `src/data/script.json` | **字幕定稿（唯一数据源）**：每屏开始/结束帧、文字、高亮词与颜色、音效类型与档位、画面 cue |
| `src/sections/` | 每节一个组件：`Opening`（第一节 钩子）、`NotADiagnosis`（第二节 先说清楚） |
| `src/components/tear/` | 贯穿物件：泪滴 `Tear` → 水位线 `WaterLine` → 容器 `Vessel` |
| `src/components/Figure.tsx` | SVG 几何人形，关节角度插值驱动动作 |
| `src/components/Subtitles.tsx` | 主字幕，固定底部居中，不随镜头移动 |
| `src/shot.ts` | 一镜到底的镜头路径与场景光线（关键帧全部取自字幕数据） |
| `scripts/build-sfx.mjs` | 按字幕数据合成音效轨（48kHz/16bit wav） |

## 命令

```bash
npm install
npm run check            # 字幕稿规范检查（读速、高亮数、行数）
npm run render:preview   # 检查 → 合成音效 → 渲染 out/preview.mp4
npm run qa:audio         # 成片响度 / 峰值 / 削波检查
npm run studio           # 本地预览
```

改字幕只改 `src/data/script.json`，然后重新渲染即可（`render:preview` 会自动重新生成音效）。
