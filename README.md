# remotion-sisyphus

《黑色生命力》：1920×1080 / 30fps 横屏知识短视频，约 2 分钟。画面和音效全部由代码生成（Remotion + 纯代码合成音效），不用任何素材。

## 目录

| 路径 | 内容 |
|---|---|
| `src/data/script.json` | **字幕定稿数据**：每屏的开始帧、结束帧、文字、重点词、重点词颜色、音效（相对本屏的帧偏移、类型、档位）、砸下来的大字、屏上文字（研究标签、气泡标注、石面浮字、词卡）。画面和音效的时间都从这里取，改字幕只改这一个文件 |
| `src/components/BlackStone.tsx` | 贯穿物件：黑石（外观 / 裂缝 / 轮廓光 / 剖面年轮） |
| `src/components/Figure.tsx` | 人物：SVG 几何人形，关节角度插值做动作（站、走、推、跪、跌坐、后背顶、抬头、转身、蹲下递东西……） |
| `src/components/Subtitles.tsx` | 字幕：固定在底部，不跟镜头缩放平移 |
| `src/components/ImpactWord.tsx` | 砸到画面中部偏左的大字（可碎裂飞向黑石） |
| `src/components/Overlays.tsx` | 左上角标签、右上角固定水印、漫延的黑、光束、黑色粒子群 |
| `src/components/DarkBox.tsx`、`Abstract.tsx` | 暗盒；白熊实验 / 情绪波纹等示意图元素 |
| `src/sections/` | 每节一个组件：`Opening`、`Section1`…`Section6`，整片是一个连续镜头 |
| `src/Preview.tsx` / `src/Full.tsx` | 预览（前 33 秒）/ 完整片 |
| `scripts/build-audio.mjs` | 读 `script.json` 合成音效 + 纯音铺底，按 BS.1770 自动定铺底电平，总线限幅，输出 48kHz/16bit wav |
| `scripts/render-full.sh` | 完整片分段渲染 → 拼接 → 一次性封装整条音轨 → 接缝检查 |
| `scripts/check-*`、`scripts/*.py` | 字幕数据校验、版式抽检、静止画面检测、响度/峰值/削波/静音检查、噪声音效放大分析、接缝检查 |

## 命令

```bash
npm install
npm run render:full     # 完整片 → out/heise-shengmingli.mp4（可设 REMOTION_BROWSER 指定浏览器）
npm run check:full      # ebur128 / astats / silencedetect / 逐样本扫描 + 每 2 秒抽帧版式检查 + 静止检测
npm run check:sfx       # 噪声类音效单独放大分析，输出 out/sfx-check/
npm run render:preview  # 只渲染前 33 秒预览
npm run studio          # 预览/调试
```

字体：思源黑体（`@fontsource/noto-sans-sc`，Noto Sans SC 即思源黑体）。
