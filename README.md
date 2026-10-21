# 现状偏差 · Remotion 知识短视频

1920×1080 / 30fps / 约 150 秒，无口播，没有实拍或图库素材，画面全部由代码生成。画风是暖棕金色柔光配暗调夜曲。

## 目录

| 路径 | 内容 |
|---|---|
| `src/data/script.ts` | **字幕定稿**，全片唯一的文字和时间来源。每屏写明开始帧、结束帧、文字、重点词；还包括小节小标题、本期主题、画面大字和标签 |
| `src/data/timeline.ts` | `at('s01-02', 20)` 这类辅助函数，画面和音效都通过它从字幕屏取时间 |
| `src/theme.ts` | 画风参数：色板、字体、发光（核心线宽、内外层模糊半径、强度和呼吸周期）、噪点、尘埃、字幕样式 |
| `src/components/Glow.tsx` | 通用柔光组件，所有金色元素都包在里面 |
| `src/components/*` | 可复用图形：发光线条、光点节点、分叉结构、轨道、冲击波和粒子、HUD 计数器、引言卡和砸字、背景层、字幕、主题标注 |
| `src/motif/` | 贯穿全片的物件「轨道上的光点」，以及它在全片连续的运动时间线 |
| `src/sections/` | 每节一个组件，同时导出本节的调度（镜头、光线、尘埃冲击、音效） |
| `src/camera/Camera.tsx` | 连续镜头：关键帧平滑插值、微漂移和冲击推拉，提供世界坐标层 |
| `src/sfx/` 与 `scripts/synth-sfx.mjs` | 音效清单和合成器，生成 `public/sfx/*.wav` |
| `scripts/check-script.ts` | 字幕稿自检：标点、阅读速度、重叠、重点词、行宽 |
| `scripts/review.py` | 渲染后自检：每 2 秒抽一帧，检查画风数值、噪点闪烁和音频峰值 |

## 命令

```bash
npm install
npm run sfx              # 合成音效
npm run check            # 检查字幕稿
npm run studio           # 打开 Remotion Studio 预览

# 渲染 31 秒预览（开头 + 第一节 + 第二节到实验结束）
npm run render:preview   # 输出 out/preview.mp4

# 本机已有 Chrome Headless Shell 时，可以指定它，不用联网下载
REMOTION_BROWSER_EXECUTABLE=/path/to/headless_shell npm run render:preview

# 渲染后自检
python3 scripts/review.py out/preview.mp4
```

改字幕只需要改 `src/data/script.ts`。画面、镜头和音效都以「某一屏开始帧 + 偏移」来定位，会跟着字幕一起移动。
