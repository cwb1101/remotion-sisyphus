# 堂吉诃德 · 代码动画知识短片（Remotion）

1920×1080 / 30fps 横屏。画面全部用代码绘制（SVG 形状、渐变、光、文字），音效全部由脚本合成，不使用任何图片、视频或音频素材。

当前进度：**预览版**——开头 + 第一节（约 37 秒）。

## 快速开始

```bash
npm install
npm run render:preview   # 生成音效和颗粒贴图 → 检查字幕数据 → 渲染 out/preview.mp4
npm run frames           # 每 2 秒抽一帧，拼成 out/frames/overview.jpg
npm run studio           # 在浏览器里逐帧预览
```

渲染命令等价于：

```bash
node scripts/gen-sfx.mjs && node scripts/gen-grain.mjs
node scripts/check-subtitles.mjs
npx remotion render Preview out/preview.mp4
```

## 改字幕只改一个文件

`src/data/subtitles.json` 是唯一的数据源。每屏包含：

| 字段 | 含义 |
|---|---|
| `start` / `end` | 开始帧（含）/ 结束帧（不含），30fps |
| `text` | 字幕全文 |
| `highlight` | 重点词（铜金色高亮） |
| `layout` | 版式代号 A–H（见文件顶部 `layouts` 说明） |
| `scene` | 所属场景 |
| `options` | 版式参数：竖排方向、放大的字、英文小注等 |
| `emphasis` | `"slam"` = 关键句砸下来（大字 + 震屏 + 尘土 + 低音） |
| `sfx` | 本屏音效：`sound` 对应 `public/sfx/<sound>.wav`，`at` 为相对本屏开始的帧 |

画面动作的时间点都从这里取：场景用 `at(屏id, 比例)` 和 `cue(屏id, 音效名)` 对齐，例如书堆在 `thud` 音效那一帧长高、剑在 `sword` 音效那一帧挥下。调整某屏时长后，画面和音效会一起移动。

`npm run check` 会检查：每屏是否读得完（按每秒 5 字，扣除入场/出场帧）、相邻两屏版式是否重复、居中版式是否超过两成、文字估算宽度是否超出 80px 安全边距、音效文件是否存在。

## 目录

```
src/
  data/subtitles.json   字幕定稿（唯一数据源）
  data/script.ts        数据类型与时间工具：getScreen / at / cue / sceneRange
  Video.tsx             总装：场景按数据排列、字幕轨、震屏、胶片质感、音轨
  scenes/Opening.tsx    开头 · 风车平原
  scenes/Section1.tsx   第一节 · 书架长廊
  components/
    Figure.tsx          人物：头/躯干/上臂/前臂/手/大腿/小腿/脚分段，关节角度摆姿势，poseAt 平滑过渡
    Horse.tsx           马（步态、人立）
    Helmet.tsx          贯穿物件：头盔 ⇄ 铜盆（形变、碎裂、聚合、金色轮廓光）
    Windmill.tsx        风车
    Subtitle.tsx        字幕版式 A–H、砸字特效、震屏
    FilmLook.tsx        胶片颗粒、暗角、闪烁
    Light.tsx           体积光、浮尘
    Layer.tsx           分层（景深模糊）
  lib/camera.ts         透视相机：一个连续镜头在场景间推拉摇移
scripts/
  gen-sfx.mjs           合成全部音效（wav）
  gen-grain.mjs         生成胶片颗粒贴图
  check-subtitles.mjs   字幕数据自检
  extract-frames.sh     抽帧 + 总览图
  stills.sh             渲染若干静帧拼图（调试用）
```

## 字体

思源宋体 / 思源黑体使用 Google Fonts 分发的同一字形版本 Noto Serif SC / Noto Sans SC（`@fontsource` 包，随 npm 安装到本地，渲染时不联网）。主字幕不小于 64px。
