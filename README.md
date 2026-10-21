# remotion-sisyphus

「现状偏差」横屏知识短视频（1920×1080 / 30fps / 约 150 秒），画面与音效全部由代码生成。

## 目录

- `src/data/subtitles.json`：字幕定稿，唯一数据源。每屏的开始帧、结束帧、文字、重点词与颜色、cue、音效类型与档位都在这里；画面和音效的时间都从这里取
- `src/sections/`：每节一个组件，共九节：`S01Hook`（开头）→ `S02Question` → `S03Choice` → `S04Name`（现状偏差）→ `S05Examples`（工作与关系）→ `S06Threshold`（承受线）→ `S07Ledger`（两本账）→ `S08Installment`（分期付款）→ `S09Close`（回收问题）；节与节的交接状态在 `continuity.ts`
- `src/components/Room.tsx`：贯穿全片的物件（会变窄的房间）；`Door.tsx` 右侧禁字区里的门
- `src/components/Person.tsx` + `src/lib/pose.ts`：几何人形，关节角插值 + 手臂 IK
- `src/components/Subtitle.tsx`：底部字幕，不随镜头运动；`BigWord.tsx`：舞台大字；`Labels.tsx`：画面小字。三者越出安全区（右侧禁字区、水印区、字幕区、画外）都会直接报错
- `src/components/Watermark.tsx`：右上角固定水印「肆号静匣Logos」，在镜头之外
- `src/lib/camera.ts`：全片一条连续镜头轨道（推、拉、摇、震）
- `scripts/synth_sfx.py`：按字幕数据合成音效（48kHz/16bit）和连续的环境和弦垫底（自动校准到约 -20 LUFS）；`scripts/audio_check.py`：响度、峰值、削波、静音、同步、噪声检查
- `scripts/seam_check.py`：分段渲染的接缝检查；`scripts/motion_check.py`：找出静止超过 2 秒的段落；`scripts/stills.mjs`：批量渲染静帧
- `scripts/subtitle_rules.py`：字幕规范校验（时长、分行、高亮数量与颜色一致性）

## 渲染完整片

```bash
npm install
pip install numpy scipy pillow
# export REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell   # 需要时
npm run render:film         # 分段渲染 → out/film.mp4，并打印接缝、音频、静止段落检查
```

## 渲染预览

```bash
npm install
pip install numpy scipy
# 本机没有 Remotion 自带的 Chrome Headless Shell 时，指定一个本地浏览器：
# export REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell
npm run render:preview      # → out/preview.mp4，并打印音频实测
npm run check:frames        # 每 2 秒抽一帧到 out/frames/
```

音频不走 Remotion 的混音：`render:preview` 先渲染无声画面，再用 ffmpeg 把合成好的 `public/audio/sfx.wav` 封装进去，避免单声道上混被压低 3dB 和 AAC 前置延迟造成的声画偏移。
