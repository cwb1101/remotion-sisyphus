# 泪失禁体质 — Remotion 知识短片

1920×1080 · 30fps · 无口播。画面、字体渲染、声音全部由代码生成，不用任何实拍、图库或音频素材。
当前进度：前 30.6 秒预览（序“满” + 01“现象”）。

## 改字幕 / 改声音只改这两个文件

| 文件 | 内容 |
|---|---|
| `src/data/subtitles.json` | 字幕定稿：每屏的开始帧、结束帧、文字、重点词、版式、所属场景；各节起止帧 |
| `src/data/cues.json` | 声音 cue 表：帧、类型（ambience / action / accent）、对应画面动作、相对环境底的 dB、重音前压低 |

画面里的动作（水滴落桌、脚步落地、推门、擦眼）都从这两个文件取帧号，改了这里画面和声音一起动。

## 组件

- `src/sections/S00Window.tsx`、`S01Arcade.tsx`：每节一个组件（2.5D 分层相机，前/中/后三层视差）
- `src/components/Glass.tsx`：贯穿全片的物件（玻璃杯：弯月面、波纹、溢出、水渍、焦散）
- `src/components/Figure.tsx` + `poses.ts`：人物（头/颈/躯干与长外套/上臂/前臂/手/大腿/小腿/脚分段，关节角度摆姿势，姿势平滑过渡，脚步锁定的走路）
- `src/components/Subtitle.tsx`：字幕版式（按数据文件的 layout 摆放；需要随机的位置用 `random(seed)`）
- `src/components/Grade.tsx`：全局调色层（灰阶曲线、整体曝光、暗角、颗粒），整体调亮调暗改 `GRADE`
- `src/lib/camera.tsx`：针孔相机（推/拉/平移，各层按深度不同速度）

## 命令

```bash
npm install
npm run fonts          # 生成字体子集并校验没有缺字（思源宋体 SemiBold / 思源黑体 Light / Source Sans 3 Light）
npm run audio          # 按 cue 表合成 public/audio/preview.wav，ebur128 实测并校到 -18 LUFS
npx remotion render src/index.ts Preview out/preview.mp4 --codec=h264 --crf=18
python3 scripts/qc.py out/preview.mp4          # 抽帧总览、逐帧 YAVG、字幕对比度/出画/阅读速度、颜色
python3 scripts/audio-check.py out/preview.mp4 # 逐个音效相对环境底的实测电平
```

字体来自 Google 发布的开源版本（Noto Serif SC / Noto Sans SC，即思源宋体/思源黑体的同一套字形，SIL OFL）。

## 预览交付（`preview/`）

- `tears-preview-30s.mp4` 预览成片
- `contact-sheet.png` 每 2 秒一帧的总览
- `qc-report.json`、`yavg-per-frame.csv`、`audio-check.json` 自检数值
