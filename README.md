# 《他身边有人，但没人可说》

抖音横屏知识短视频（1920×1080 / 30fps），画面全部用 Remotion 代码绘制：逆光剪影人物、石柱大厅、长廊、贯穿全片的木椅，没有任何实拍、图库或音频素材。

当前进度：**完整片**（8 个场景，3:07），`Film` 合成；`Preview` 合成保留预览版（§0 + §1）。

## 快速开始

```bash
npm install
npm run render:film      # 字体子集化 → 合成音效 → 校验 → 8 段分段渲染（静音）→ 拼接 → 整片混音 + 响度统一 → out/film.mp4
SEGS=03-seawall,05-room npm run render:film   # 只重渲列出的段，其余沿用已有分段
npm run qa:film          # 每 2 秒抽一帧拼成 out/qa-film/contact-sheet.png（另有分页 sheet-NN.png），
                         # 自动检查颜色、右上角水印区、超过 3 秒的静止段、音轨静音 / 削顶
npm run render:preview   # 只渲预览版（§0 + §1）
npm run studio           # 交互预览（先跑一次 npm run sfx 生成音效）
```

需要 Python 3 和 `pip install fonttools brotli pillow`（字体子集化与质检用），以及 ffmpeg（抽帧用）。

## 改字幕只改一个文件

`src/data/script.ts` 是全片唯一的时间来源：每屏写清开始帧、结束帧、文字、重点词、版式、所属场景、音效 cue。
人物走位、门关上、椅子熄灭、镜头运动、音效、环境底噪的变化，全部按这里的帧号计算。改完后：

```bash
npm run check            # 阅读速度（5 字/秒，扣掉淡入淡出）、重点词 ≤2、相邻版式不重复、下方 ≥60%、居中 ≤20%、缺字
npm run render:preview
```

新增的字会在 `npm run fonts` 时自动从 Adobe 思源宋体 / 思源黑体原始字体里重新子集化，并检查是否缺字形。

## 结构

| 路径 | 内容 |
|---|---|
| `src/data/script.ts` | 字幕定稿（55 屏，全片） |
| `src/data/timeline.ts` | 由字幕稿推出场景时间段、音效帧、重点词落地帧 |
| `src/engine/projection.ts` | 2.5D 透视投影、近平面裁剪、雾 |
| `src/engine/world.tsx` | 前 / 中 / 后三层分层模糊、体积光锥、尘埃、镜头样条 |
| `src/engine/impact.ts` | 重点词 / 关键句落地时的震屏和曝光闪 |
| `src/components/Figure.tsx` + `poses.ts` | 人物：头、颈、躯干（长大衣）、上臂、前臂、手、大腿、小腿、脚分段，关节角度驱动，姿势之间平滑过渡，正面 / 背面 / 侧面三种视角，逆光轮廓光 |
| `src/components/Chair.tsx` | 贯穿物件：木椅（12 个长方体拼成，可旋转、打光、推到占满画面） |
| `src/components/Subtitle.tsx` | 9 种字幕版式、重点词砸落动画、字幕衬底 |
| `src/components/FilmLook.tsx` | 胶片颗粒、暗角、落地闪光 |
| `src/components/SfxTrack.tsx` | 按字幕稿把合成音效放上时间轴 |
| `src/sections/S0Opening.tsx` | §0 石柱大厅 |
| `src/sections/S1Corridor.tsx` | §1 长廊 |
| `src/sections/S2Mirrors.tsx` | §2 无限镜面 |
| `src/sections/S3Seawall.tsx` | §3 海边 |
| `src/sections/S4Arches.tsx` | §4 拱门 |
| `src/sections/S5Room.tsx` | §5 空房间 |
| `src/sections/S6Ridge.tsx` | §6 雾中山脊 |
| `src/sections/S7Stairs.tsx` | §7 旋转楼梯 + 片尾回到开场大厅 |
| `src/Film.tsx` | 完整片合成（场景交叠过渡、字幕、胶片质感、水印） |
| `src/components/Watermark.tsx` | 右上角固定水印 |
| `scripts/render-film.sh` | 分段渲染 + 拼接 + 混音合成 |
| `scripts/mix-audio.ts` | 按字幕稿时间轴离线混音 |
| `scripts/synth-sfx.ts` | 用代码合成全部 wav |
| `scripts/subset-fonts.py`, `check-glyphs.py` | 字体子集化与缺字检查 |
| `scripts/check-script.ts` | 字幕稿规则校验 |
| `scripts/qa-frames.py` | 渲染后抽帧质检 |
