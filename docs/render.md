# 渲染与质检

## 一键渲染预览并质检

```bash
npm install
bash scripts/render-preview.sh          # 默认合成 Preview (屏 1-13, 0-1146 帧, 38.2 秒)
```

它依次做:

1. `npx tsx scripts/check-subtitles.ts` 检查字幕稿和动作库, 重新生成 `docs/subtitles.md`
2. `npx tsx scripts/qa-meta.ts` 导出质检元数据
3. 渲染人物遮罩和文字遮罩 (0.5 倍 png 序列)
4. `npx remotion render Preview out/preview.mp4`
5. `python3 scripts/qa.py out/preview.mp4 out/qa` 出 `out/qa/report.md` `contact.png` `heavy-<帧>.png`

单独渲染:

```bash
npx remotion render Preview out/preview.mp4      # 预览
npx remotion render Film out/film.mp4            # 整片 (后面几节还没做)
npx remotion studio                               # 本机预览编辑
npx tsx scripts/stills.ts out/stills 0,510,900   # 批量出静帧
python3 scripts/sfx.py                            # 重新合成音效
python3 scripts/bgm.py --seconds 144.1 --drop 17.07  # 重新拼音乐和卡点表
```

`remotion.config.ts` 里指定了云端容器的 headless Chromium; 本机渲染时删掉那一行。

## 结构

| 文件 | 作用 |
|---|---|
| `src/data/subtitles.ts` | **唯一的时间来源**: 每屏开始帧 结束帧 文字 重点词 机位 人物动作 (pose + 第几拍) 音效 |
| `src/data/beatmap.json` `beatmap.ts` | 拍 底鼓 小节 乐句 accents drop |
| `src/data/poses.ts` | 动作库 + spring 过渡 + 走路跑步循环 (步点卡在拍上) |
| `src/data/shots.ts` | 机位 (世界坐标) |
| `src/lib/timeline.ts` | 把拍号换成帧号: 人物关键帧 音效 脚步 镜头运动 重卡点 |
| `src/components/Character.tsx` | 骨骼人物 |
| `src/components/Crowd.tsx` | 群像 |
| `src/components/Cup.tsx` | 贯穿物件 白瓷杯 |
| `src/components/Camera.tsx` | 连续镜头: 小节线起 落在底鼓上; 读字时缓慢漂移; 重卡点冲一下加震动 |
| `src/components/Subtitles.tsx` | 主字幕 钉住的重点词 注释 |
| `src/components/Watermark.tsx` | 水印 (镜头层外) |
| `src/components/SoundLayer.tsx` | BGM + 合成音效, 重音效时 BGM 压低 5dB |
| `src/components/Atmosphere.tsx` | 尘埃 四角压暗 重卡点闪光 |
| `src/sections/Hook.tsx` | 第 1 节 钩子 (屏 1-9) |
| `src/sections/Evidence.tsx` | 第 2 节 实证 (屏 10-13) |
| `src/sections/cast.ts` | 主角 对方 的外形和走位, 各节共用 |

## 动作库

站立 stand | 走路循环 walk | 奔跑 run | 推 push | 拉 pull | 坐 sit | 抬头 lookUp | 低头 lookDown | 伸手 reach | 指向 point | 跌倒 fall | 爬起 getUp | 转身 turn | 举手 raiseHand | 抱头 holdHead | 跪坐 kneel | 捧杯 holdCup | 倒 pour | 递出 offer | 探身 lean | 后靠 leanBack | 抱重物 carry | 被压弯 stagger | 看手机 phone | 垂头丧气 slump | 击掌 highFive | 传递 pass | 侧躺 lieSide | 拥抱 hug | 打字 type

- 关节: 颈 肩 肘 腕 髋 膝 踝; 肘和膝只能往一个方向弯 (限位在 `clampPose`, 检查脚本保证动作库本身不超限)
- 关键帧可以上下半身分开: `pose: 'reach', lower: 'sit'` = 坐着伸手
- 过渡用 spring; `speed: 'snap'` + `lead` 让重卡点的动作峰值正好落在拍上
- 走路每拍一步, 跑步每半拍一步, 脚步声自动生成
- 双手拿东西用两节 IK (`ikF` `ikB`), `between` 让物件夹在身体和近侧手之间
