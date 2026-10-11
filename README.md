# remotion-sisyphus

抖音横屏知识短视频《西西弗斯》：1920×1080 / 30fps，无口播，画面和音效全部由代码生成。

## 常用命令

```bash
npm install
npm run check            # 字幕数据自检（帧号连续、重点词、每屏够不够读完）
npm run render           # 完整片：合成音效 → 每节分段渲染 → 全片音轨 → 拼接成 out/sisyphus.mp4
npm run render -- --only=answer,ending   # 只重渲某几节（其余沿用 out/parts 里的分段），再重新拼接
npm run render:preview   # 只渲染预览（开头 + 第一节）到 out/preview.mp4
npm run studio           # 在浏览器里逐帧预览
npx remotion still src/index.ts Cover out/cover.png   # 16:9 封面（加 --browser-executable 同上）
npx remotion still src/index.ts CoverVertical out/cover_9x16.png   # 9:16 竖版封面
```

渲染用的是机器上已装的 Chromium headless shell（`/opt/pw-browsers/...`）。换机器时设环境变量 `REMOTION_BROWSER=`（留空），并去掉 `render:preview` 里的 `--browser-executable`，Remotion 会自己下载浏览器。

## 结构

| 文件 | 作用 |
|---|---|
| `src/data/subtitles.ts` | **字幕定稿，唯一的时间来源**：每屏的开始帧、结束帧、文字、重点词、样式。画面和音效都按 id 引用这里的帧号，改字幕只改这一个文件 |
| `src/components/Orb.tsx` | 贯穿全片的物件：一个圆。扮演石头、西西弗斯、宙斯、死神、冥后、众神、片名的太阳 |
| `src/sections/Opening.tsx` | 开头（第 1–6 屏） |
| `src/sections/Myth.tsx` | 第一节“他是谁”（第 7–15 屏） |
| `src/sections/Punishment.tsx` | 第二节“惩罚”（第 16–23 屏） |
| `src/sections/Absurd.tsx` | 第三节“荒诞”（第 24–28 屏） |
| `src/sections/Descent.tsx` | 第四节“下山”（第 29–37 屏） |
| `src/sections/Answer.tsx` | 第五节“回答”（第 38–44 屏） |
| `src/sections/Ending.tsx` | 结尾（第 45–49 屏），最后一帧接回第 0 帧 |
| `src/components/Watermark.tsx` | 右上角固定水印（屏幕坐标，不随镜头变化） |
| `scripts/render-full.ts` | 分段渲染 + 拼接 |
| `src/Film.tsx` | 把各节摆进同一个世界坐标，用一台连续运动的相机拍成一个镜头 |
| `src/components/Subtitles.tsx` | 字幕层：普通 / 重点词砸下 / 片名 / 计数器，以及对应的冲击音效 |
| `scripts/synth-sfx.mjs` | 用代码合成全部音效到 `public/sfx/*.wav`（不用任何音频素材） |
| `docs/script.md` | 字幕稿（表格版，含画面与音效设计） |

字体：思源宋体 / 思源黑体（Noto Serif SC / Noto Sans SC，SIL OFL），来自 npm 的 `@fontsource`，渲染时不联网。
