# remotion-sisyphus

MC 怀旧卡点短视频模板（「当我发现我怀念的不是学校而是…」那类），用 [Remotion](https://www.remotion.dev/) 写成。

- 卡点：按 BPM 自动算切点，切点都落在重拍上
- 转场：缩放模糊 + 径向拖影 + 白闪 + 抖动
- 画面：边缘模糊、暖色调、暗角、胶片颗粒、每拍轻微放大
- 字效：逐字砸入的黄色大标题、英文衬线小字、弹出的对白

拆解和制作思路见 [docs/怎么做.md](docs/怎么做.md)。

## 使用

```bash
npm install
npm run dev      # 打开 Remotion Studio 预览
npm run render   # 输出 out/huiyi.mp4
```

1. 素材放 `public/clips/`，BGM 放 `public/music/bgm.mp3`
2. 文案、节奏、素材路径都在 `src/huiyi/config.ts`
3. 没放素材时会显示占位画面，可以先看转场和字效

字体通过 Fontsource 随 npm 安装，不依赖 Google Fonts。首次渲染时 Remotion 会下载 Chrome Headless Shell；网络不通时可以用 `--browser-executable=<本机 Chrome 路径>` 指定浏览器。

## 目录

```
src/huiyi/
  config.ts    素材、文案、BPM —— 只需要改这个
  beat.ts      拍子 → 帧号换算
  HuiYi.tsx    主合成：场景排布、白闪、调色、颗粒、音乐
  Scene.tsx    单个场景：运镜、缩放模糊转场、边缘模糊、文字
  Text.tsx     标题、英文、对白
  Footage.tsx  素材 / 占位画面
  fonts.ts     字体加载
```
