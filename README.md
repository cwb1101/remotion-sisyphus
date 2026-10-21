# remotion-sisyphus

「现状偏差」横屏知识短视频（1920×1080 / 30fps / 约 150 秒），画面与音效全部由代码生成。

## 目录

- `src/data/subtitles.json`：字幕定稿，唯一数据源。每屏的开始帧、结束帧、文字、重点词与颜色、cue、音效类型与档位都在这里；画面和音效的时间都从这里取
- `src/sections/`：每节一个组件（目前完成开头 `S01Hook`、第一节 `S02Question`、第二节 `S03Choice`）
- `src/components/Room.tsx`：贯穿全片的物件（会变窄的房间）；`Door.tsx` 右侧禁字区里的门
- `src/components/Person.tsx` + `src/lib/pose.ts`：几何人形，关节角插值 + 手臂 IK
- `src/components/Subtitle.tsx`：底部字幕，不随镜头运动；`BigWord.tsx`：舞台大字（越出安全区会直接报错）
- `src/lib/camera.ts`：全片一条连续镜头轨道（推、拉、摇、震）
- `scripts/synth_sfx.py`：按字幕数据合成音效（48kHz/16bit）；`scripts/audio_check.py`：响度、峰值、削波、静音、同步、噪声检查
- `scripts/subtitle_rules.py`：字幕规范校验（时长、分行、高亮数量与颜色一致性）

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
