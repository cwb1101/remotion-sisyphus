# remotion-sisyphus

抖音横屏知识短视频《为什么说早熟的人通常都晚熟》——1920×1080 / 30fps，全部画面和音效由代码生成，无素材。

## 唯一的数据源

`src/data/script.json`：全片 56 屏字幕定稿。每屏有开始帧、结束帧、文字、重点词及颜色、音效档位和音效时间点，砸字的屏还带大字位置。
画面动作和音效的时间都从这个文件取，改字幕只改这一个文件，然后重跑下面的命令。

## 完整片

```bash
# 云端容器里用预装的 headless shell；本地可省略 REMOTION_BROWSER
REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell ./scripts/render-film.sh
python3 -I scripts/check-video.py out/film.mp4 out/film-text.mp4         # 字幕区 / 禁字区 / 静止段 / 分段接缝 + 每 2 秒抽帧
python3 -I scripts/check-audio.py out/film.mp4 public/audio/sfx-full.wav  # 响度、峰值、削波、静音段、接缝、嘶声、咔哒
```

`render-film.sh`：校验字幕 → 合成整条音轨 → 按 `script.json` 的 `film.segments` 分 4 段静音渲染 → 无损拼接 → 一次性配上整条音轨（AAC 256k）。

## 预览（前 30 秒）

```bash
npm install
npm run check:script              # 校验字幕：读得完、≤2 行、每帧高亮 ≤2、大字不进禁字区、档位合法
npm run sfx                       # 合成音效 → public/audio/sfx-preview.wav（48kHz/16bit）
# 云端容器里用预装的 headless shell；本地可省略 REMOTION_BROWSER
REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
  npx remotion render Preview out/preview.mp4 --concurrency=4
REMOTION_BROWSER=... npx remotion render PreviewTextOnly out/preview-text.mp4 --concurrency=4 --muted
python3 -I scripts/check-video.py out/preview.mp4 out/preview-text.mp4   # 禁字区 / 字幕区 / 大字区 + 每 2 秒抽帧
python3 -I scripts/check-audio.py out/preview.mp4 public/audio/sfx-preview.wav  # 响度、峰值、削波、嘶声、咔哒、静音
```

## 结构

- `src/sections/`：每节一个组件（`Opening` / `Thesis` / `Early` / `HalfSeen` / `NotLazy` / `Walkers` / `Exit` / `Ending`）。`rigs.ts` 是前三节的机位与交接，`story.ts` 是后半片共用的世界状态（少年、先走路的人、气球、天色、脚印）
- `src/Film.tsx`：完整片，一个连续镜头，节与节之间没有黑场
- `src/components/Watermark.tsx`：右上角固定水印，不受镜头影响
- `src/components/Balloon.tsx`：贯穿物件（发光气球 = 想法）
- `src/components/Figure.tsx`：SVG 几何人形，参数控制姿态、朝向、大小、颜色，动作靠关节角度插值
- `src/components/Subtitle.tsx`：底部字幕，屏幕坐标固定，不受镜头影响
- `src/components/BigWord.tsx`：砸下来的大字，落地帧 = 该屏第一个音效
- `scripts/gen-sfx.mjs`：音效合成（正弦/三角波 + 带限噪声），总线前视限幅
