# 回避型依恋 · Remotion 纯代码短视频

1920×1080 / 30fps，画面、字幕、音效全部由代码生成（无实拍、无图库、无音频素材）。

## 目录

| 路径 | 作用 |
|---|---|
| `src/data/script.json` | **字幕定稿（唯一数据源）**：每屏开始帧/结束帧/文字/重点词/样式，以及该屏的音效 cue 与心跳节拍。画面和音效的时间都从这里取，改字幕只改这一个文件 |
| `src/components/Shell.tsx` | 贯穿全片的物件「壳与心跳」（本体 + 防御环 + 红色心跳点），各节复用 |
| `src/sections/*.tsx` | 每节一个组件，并导出本节的摄像机关键帧 |
| `src/lib/camera.ts` | 全片唯一摄像机（推/拉/摇/甩 + 漂移 + 震屏） |
| `src/lib/pulse.ts` | 心跳节拍轨：画面心跳与心跳音效共用 |
| `src/components/Subtitles.tsx` | 字幕层：normal / slam（砸字）/ title / note |
| `scripts/synth-sfx.mjs` | 纯代码合成所有 wav 到 `public/sfx/` |
| `scripts/check-script.mjs` | 字幕稿体检（时间轴、重点词、≤5 字/秒、宽度、音效名） |
| `scripts/extract-frames.mjs` | 每 2 秒抽一帧用于人工检查 |

## 命令

```bash
npm install
npm run check            # 字幕稿体检
npm run sfx              # 合成音效
npm run render:preview   # 体检 + 合成音效 + 渲染预览 → out/preview.mp4
npm run frames           # 每 2 秒抽帧 → out/frames/
npm run studio           # 本地预览编辑器
```

在已预装 Chromium headless shell 的环境里，可设 `REMOTION_BROWSER=/path/to/headless_shell` 跳过浏览器下载。
