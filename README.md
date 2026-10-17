# 为什么早熟的人都晚熟 Remotion 工程

抖音横屏知识短视频 1920×1080 30fps 画面全部由代码绘制 音效全部由代码合成 不使用任何素材

当前只做了预览段 开头加第一节 也就是 早熟陷阱 和 高配空转 两章 共 792 帧 26点4 秒

## 常用命令

```bash
npm install
# 云端容器里用预装的浏览器 本机开发可以不设
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

npm run render:preview   # 标点检查 合成音效 渲染 out/preview.mp4
npm run audit:preview    # 文字区域 静止检测 音频响度 单个音效频谱检查
npm run report:timing    # 每屏停留时长统计
npm run studio           # 打开 Remotion Studio 预览
```

## 改字幕只改一个文件

`src/data/script.json` 是唯一的字幕定稿

- `screens` 每屏的开始帧 结束帧 文字 高亮词 高亮颜色 高亮处理方式 音效档位和音效列表
- `chapters` 章节名 开始帧 结束帧 左上角角标和底部进度条都从这里读
- `labels` 画面信息层用到的所有文字

改完文字运行 `npm run retime` 会按 字数乘 4 帧加 10 帧 重新算每屏帧数和章节表
`npm run check:text` 会扫描数据文件和所有组件 组件源码里不允许出现中文 画面文字全部来自数据文件

## 目录

```
src/data/script.json      字幕 章节 信息层文字
src/sections/             每节一个组件 S1Trap 早熟陷阱 S2Idle 高配空转
src/components/Boulder    贯穿全片的巨石 低面多边形 可长大 发光 长出电路和岩层
src/components/Figure     SVG 几何人物 关节角度插值做动作
src/components/Subtitle   底部固定字幕 三种高亮处理 宋重下划 描边放大 数字扫光
src/components/Camera     连续镜头 推拉摇都按目标点插值
src/overlay/              角标 进度条 水印 固定在镜头之外
scripts/synth-audio.mjs   音效合成 48kHz 16bit 噪声先滤波 首尾淡入淡出 总线限幅
scripts/                  标点检查 节奏统计 画面审计 音频测量
public/fonts/             思源黑体 思源宋体 得意黑 裁剪后的 woff2 均为 SIL OFL 1.1
```

## 字体

`npm run fonts` 会从官方发布页下载字体原文件并裁成 GB2312 常用字加数据文件里出现的字
