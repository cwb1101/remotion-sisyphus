# 野马效应 · 横屏知识短视频（Remotion）

1920×1080 / 30fps，画面、字幕、音效全部由代码生成，不用任何实拍、图库或音频素材。
目前完成：**预览版（屏 1–15，0–36 秒）**，以及人物骨骼演示 `PersonRig`。

## 只改一个文件

`src/data/script.json` 是字幕定稿，也是全片的时间轴。每一屏写明：

| 字段 | 含义 |
|---|---|
| `start` / `end` | 开始帧 / 结束帧（30fps） |
| `text` | 字幕全文 |
| `highlights` | 重点词与颜色（只允许 `#FF5A3C` 暖色、`#4FD1C5` 冷色） |
| `big` | 需要“砸下来”的大字（必须复用本屏同色高亮词） |
| `beats` | 屏内节拍点（相对帧），画面动作和音效都对齐到这里 |
| `sfx` | 音效类型与档位（`weak` / `mid` / `strong`），可挂在某个 beat 上 |
| `counter` / `step` | 左上角「锯子移动距离 0 cm」与步骤编号 |

`beds` 是环境铺底（垫音、沙粒），同样按帧号排布。改完字幕后跑一遍 `npm run build:preview`，校验、音频、画面都会按新时间重算。

## 目录

```
src/
  data/script.json      字幕定稿 + 时间轴（唯一数据源）
  Film.tsx              整片：一个世界坐标 + 一台相机；字幕/大字/标注在相机之外
  sections/             每节一个组件（S1 钩子 / S2 划伤 / S3 升级三连），各自给出相机、光线、画面
  components/
    Saw.tsx             贯穿物件：锯子（冷光扫过、齿变长变暖、缩成“刺块”）
    Snake.tsx           蛇（连续变细的身体，缠绕时分锯条上下两层）
    Person.tsx          几何人形，关节角度插值（走、推、停、抬头、转身）
    Subtitle.tsx        底部居中字幕（x 360–1560，底边距底 116px，64px 思源黑体）
    BigWord.tsx         大字砸下 + 全屏冲击波（限制在 x ≤ 1530）
    Hud.tsx             左上角计数器与步骤编号
    Ground.tsx          地面、草叶、光池与暗角
scripts/
  check-script.mjs      字幕稿校验（读完时长、两行、高亮数、颜色、大字宽度）
  synth-audio.mjs       代码合成音效 → public/audio/preview.wav（48kHz/16bit）
  qa-audio.py           响度、峰值、削波、超 -6dBFS 时间点、噪声单轨嘶声/轰鸣、咔哒、静音检查
  qa-frames.py          逐帧文字层检查（禁字区、底边、字幕范围、行数、高亮颜色）+ 每 2 秒联系表
```

## 命令

```bash
npm install
npm run build:preview          # 校验字幕 → 合成音频 → 渲染 out/preview.mp4
npm run qa:audio               # 音频自检（需要 python3 + numpy + ffmpeg）
npm run qa:frames              # 画面自检
npm run render:rig             # 人物骨骼演示 out/person-rig.mp4
npm run studio                 # 在浏览器里预览、拖时间轴
```

在没有 Remotion 自带浏览器的环境里，给 render 命令加 `--browser-executable=<chrome-headless-shell 路径>`。
