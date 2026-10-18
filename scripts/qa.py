"""渲染后的自动质检

用法:
    python3 scripts/qa.py out/preview.mp4 out/qa

需要先准备 (见 docs/render.md):
    out/qa/meta.json        npx tsx scripts/qa-meta.ts out/qa/meta.json <帧数>
    out/qa/chars/*.png      人物遮罩序列 (身体红 头绿 手蓝 脚黄), 0.5 倍
    out/qa/subs/*.png       文字遮罩序列 (字幕 钉住的重点词 注释 = 白), 0.5 倍

输出:
    out/qa/contact.png      每 2 秒一帧的联系表 (带帧号)
    out/qa/heavy-<帧>.png   每个重卡点前后各 3 帧
    out/qa/report.md        逐条检查结果
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from PIL import Image
from scipy import ndimage

W, H = 1920, 1080
WM = (1640, 18, 1902, 88)        # 水印禁区 (屏幕坐标)
BAND = (0.70, 0.90)              # 主字幕允许的上下范围 (字顶 / 字底, 占画面高度)
RIGHT_LIMIT = 0.62               # 字幕行以外的文字不能放到这条线右边


def load(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.int16)


def masks(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return {
        "any": (r > 90) | (g > 90) | (b > 90),
        "head": (g > 120) & (r < 110) & (b < 110),
        "hand": (b > 120) & (r < 110) & (g < 110),
        "foot": (r > 120) & (g > 120) & (b < 110),
    }


def frames_from_video(video, nums, width=480):
    sel = "+".join(f"eq(n\\,{n})" for n in nums)
    cmd = ["ffmpeg", "-loglevel", "error", "-i", str(video), "-vf", f"select='{sel}',scale={width}:-1",
           "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    h = int(round(width * H / W))
    arr = np.frombuffer(raw, np.uint8).reshape(-1, h, width, 3)
    return arr


def label(img, text):
    from PIL import ImageDraw
    im = Image.fromarray(img)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 150, 22], fill=(0, 0, 0))
    d.text((5, 5), text, fill=(255, 255, 0))
    return np.asarray(im)


def tile(imgs, cols):
    h, w = imgs[0].shape[:2]
    rows = (len(imgs) + cols - 1) // cols
    out = np.zeros((rows * h, cols * w, 3), np.uint8)
    for i, im in enumerate(imgs):
        out[(i // cols) * h:(i // cols + 1) * h, (i % cols) * w:(i % cols + 1) * w] = im
    return out


def main(video, qa_dir):
    qa = Path(qa_dir)
    meta = json.loads((qa / "meta.json").read_text())
    fps, end = meta["fps"], meta["end"]
    chars = sorted((qa / "chars").glob("*.png"))
    subs = sorted((qa / "subs").glob("*.png"))
    problems, notes = [], []

    # ---------- 联系表 ----------
    nums = list(range(0, end, 2 * fps))
    shots = frames_from_video(video, nums)
    imgs = [label(im, f"f{n} {n / fps:.0f}s") for im, n in zip(shots, nums)]
    Image.fromarray(tile(imgs, 4)).save(qa / "contact.png")

    # ---------- 重卡点前后 3 帧 ----------
    heavy_rows = []
    for h in meta["heavy"]:
        win = list(range(h - 3, h + 4))
        fr = frames_from_video(video, win, 480)
        Image.fromarray(tile([label(im, f"f{n} {'<=HIT' if n == h else ''}") for im, n in zip(fr, win)], 4)).save(qa / f"heavy-{h}.png")
        wide = list(range(h - 8, h + 9))
        fr2 = frames_from_video(video, wide, 320).astype(np.int16)
        diff = [float(np.abs(fr2[i + 1] - fr2[i]).mean()) for i in range(len(wide) - 1)]
        peak = wide[1 + int(np.argmax(diff))]
        heavy_rows.append((h, peak, diff))
        if not (h - 1 <= peak <= h + 3):
            problems.append(f"重卡点 f{h}: 画面变化最大的一帧在 f{peak}, 没落在拍上")

    # 声音: 重卡点附近的起音是否在拍上
    wav = qa / "audio.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(video), "-ac", "1", "-ar", "48000", str(wav)], check=True)
    y, sr = sf.read(wav)
    # 用重音效本身的波形 (public/sfx/slam.wav) 和成片做互相关, 找出它在成片里的确切位置
    slam, ssr = sf.read(Path(__file__).resolve().parent.parent / "public/sfx/slam.wav")
    slam = slam[: int(0.25 * ssr)]
    audio_rows = []
    for h in meta["heavy"]:
        c = int(h / fps * sr)
        a, b = c - int(0.2 * sr), c + int(0.2 * sr) + len(slam)
        seg = y[a:b]
        xc = np.correlate(seg, slam, mode="valid")
        k = a + int(np.argmax(np.abs(xc)))
        off = (k / sr - h / fps) * fps
        audio_rows.append((h, off))
        if abs(off) > 1.5:
            problems.append(f"重卡点 f{h}: 重音效起音偏了 {off:+.1f} 帧")

    # ---------- 逐帧遮罩检查 ----------
    s = None
    per_screen = {sc["id"]: {"head": 0, "text": 0, "n": 0} for sc in meta["screens"]}
    screen_of = {}
    for sc in meta["screens"]:
        for f in range(sc["start"], sc["end"]):
            screen_of[f] = sc
    flags = {k: [] for k in ["wm_char", "wm_text", "band", "edge", "right", "face", "hand", "head_crop", "foot_crop", "dot"]}
    for f in range(min(len(chars), len(subs), end)):
        cm = masks(load(chars[f]))
        glow = meta["frames"][f].get("glow", 0)
        if glow:
            # 换场亮光盖住的圆: 里面的人物看不见, 不参与遮挡和水印检查
            gh, gw = cm["any"].shape
            yy, xx = np.ogrid[:gh, :gw]
            covered = (xx - gw / 2) ** 2 + (yy - gh / 2) ** 2 < (glow * gw / W) ** 2
            cm = {k: v & ~covered for k, v in cm.items()}
        sv = load(subs[f]).max(axis=2)
        sm = sv > 110          # 所有文字 (主字幕 白 / 钉住的重点词 浅灰 / 注释 深灰)
        main_sub = sv > 220    # 只有主字幕
        hh, ww = sm.shape
        s = ww / W
        sc = screen_of.get(f)
        x0, y0, x1, y1 = [int(v * s) for v in WM]
        if cm["any"][y0:y1, x0:x1].any():
            flags["wm_char"].append(f)
        if sm[y0:y1, x0:x1].any():
            flags["wm_text"].append(f)
        band_top = int(0.60 * hh)
        main = main_sub[band_top:]
        ys = np.where(main.any(axis=1))[0]
        if len(ys):
            top, bot = (ys[0] + band_top) / hh, (ys[-1] + band_top) / hh
            if top < BAND[0] - 0.02 or bot > BAND[1]:
                flags["band"].append(f)
            xs = np.where(main.any(axis=0))[0]
            if xs[0] < 6 or xs[-1] > ww - 7:
                flags["edge"].append(f)
        if sm[:band_top, int(RIGHT_LIMIT * ww):].any():
            flags["right"].append(f)
        if (cm["head"] & sm).sum() > 12:
            flags["face"].append(f)
        if (cm["hand"] & sm).sum() > 10:
            flags["hand"].append(f)
        fm = meta["frames"][f]
        if not fm["closeup"]:
            hd = cm["head"]
            # 头顶被画面上沿裁掉一定算; 左右两侧只在镜头静止时算 (运动中人物入画出画是正常的)
            side = (hd[:, :2].any() or hd[:, -2:].any()) and not fm["moving"]
            if hd[:2].any() or side:
                flags["head_crop"].append(f)
            ft = cm["foot"]
            if ft[-2:].any():
                flags["foot_crop"].append(f)
        lab, n = ndimage.label(cm["head"])
        if n and not glow:
            sizes = ndimage.sum(cm["head"], lab, range(1, n + 1))
            boxes = ndimage.find_objects(lab)
            for sz, bx in zip(sizes, boxes):
                touching = bx[0].start == 0 or bx[1].start == 0 or bx[1].stop >= ww or bx[0].stop >= hh
                if sz < 30 and not touching:
                    # 被别人挡住只露出一点的头不算; 四周 4 像素内没有身体的才算孤零零的点
                    blob = ndimage.binary_dilation(lab == (list(sizes).index(sz) + 1), iterations=4)
                    if not (blob & (cm["any"] & ~cm["head"])).any():
                        flags["dot"].append(f)
                        break
        if sc and not glow:
            # 换场亮光盖住的帧不计入 看得到人物 的比例
            ps = per_screen[sc["id"]]
            ps["n"] += 1
            ps["head"] += int(cm["head"].any())
            ps["text"] += int(len(ys) > 0)

    names = {
        "wm_char": "人物进入水印区", "wm_text": "文字进入水印区", "band": "主字幕超出 70%-90% 高度带",
        "edge": "字幕贴边或出画", "right": "字幕行以外的文字放在了画面右侧", "face": "人物的脸被字幕挡住",
        "hand": "人物的手被字幕挡住", "head_crop": "非特写镜头里头被裁掉", "foot_crop": "非特写镜头里脚被裁掉",
        "dot": "出现点一样大小的人头",
    }

    def spans(fs):
        if not fs:
            return ""
        out, a, b = [], fs[0], fs[0]
        for x in fs[1:]:
            if x == b + 1:
                b = x
            else:
                out.append((a, b))
                a = b = x
        out.append((a, b))
        return ", ".join(f"f{a}" if a == b else f"f{a}-{b}" for a, b in out[:12]) + (" ..." if len(out) > 12 else "")

    for k, fs in flags.items():
        if fs:
            problems.append(f"{names[k]}: {len(fs)} 帧 ({spans(fs)})")

    for sc in meta["screens"]:
        ps = per_screen[sc["id"]]
        if not ps["n"]:
            continue
        if ps["head"] / ps["n"] < 0.9:
            problems.append(f"屏 {sc['id']} 只有 {ps['head'] / ps['n']:.0%} 的帧里看得到人物的头")
        if sc["text"] and ps["text"] / ps["n"] < 0.85:
            problems.append(f"屏 {sc['id']} 字幕只在 {ps['text'] / ps['n']:.0%} 的时间里可读")
        notes.append(f"| {sc['id']} | {sc['start']}-{sc['end']} | {sc['text'] or '（无字）'} | {ps['head'] / ps['n']:.0%} | {ps['text'] / ps['n']:.0%} | {'是' if sc['closeup'] else ''} |")

    duck_rows = []
    for h in meta["heavy"]:
        vols = [meta["frames"][x]["bgm"] for x in range(max(0, h - 4), min(end, h + 24))]
        base = meta["frames"][max(0, h - 10)]["bgm"]
        low = min(vols)
        dur = sum(1 for v in vols if v < base * 0.9) / fps
        db = 20 * np.log10(low / base)
        duck_rows.append(f"| {h} | {base:.3f} | {low:.3f} | {db:.1f} dB | {dur:.2f} 秒 |")
        if not (-6.5 <= db <= -3.5) or not (0.35 <= dur <= 0.7):
            problems.append(f"重卡点 f{h}: BGM 让位 {db:.1f}dB {dur:.2f}秒, 不在 4-6dB 约 0.5 秒")
    kicks = set(meta["kicks"])
    cam_rows = [f"| {m['name']} | {m['start']} | {m['end']} | {'穿物件换场 (瞬切)' if m.get('cut') else '是' if m['end'] in kicks else '否'} |" for m in meta["camera"]]
    for m in meta["camera"]:
        if m.get("cut"):
            continue
        if m["end"] not in kicks:
            problems.append(f"镜头 {m['name']} 没有落在底鼓上")

    # ---------- ffmpeg: 静止画面 静音 响度 ----------
    import re as _re

    def ff(args):
        return subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video)] + args + ["-f", "null", "-"], capture_output=True, text=True).stderr

    fz = ff(["-map", "0:v", "-vf", "freezedetect=n=-60dB:d=3"])
    freezes = [(float(a), float(b)) for a, b in zip(_re.findall(r"freeze_start: ([\d.]+)", fz), _re.findall(r"freeze_duration: ([\d.]+)", fz))]
    for a, d in freezes:
        problems.append(f"画面静止超过 3 秒: {a:.2f}s 起 {d:.2f} 秒")
    sl = ff(["-map", "0:a", "-af", "silencedetect=noise=-50dB:d=0.5"])
    silences = [(float(a), float(b)) for a, b in zip(_re.findall(r"silence_start: ([\d.]+)", sl), _re.findall(r"silence_duration: ([\d.]+)", sl))]
    tail = end / fps - 1.5
    for a, d in silences:
        if a < tail:
            problems.append(f"意外静音: {a:.2f}s 起 {d:.2f} 秒")
    eb = ff(["-map", "0:a", "-af", "ebur128=peak=true:framelog=info"])
    integ = float(_re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)[-1])
    tpk = float(_re.findall(r"Peak:\s+(-?[\d.]+) dBFS", eb)[-1])
    if abs(integ + 14) > 1.0:
        problems.append(f"整片响度 {integ} LUFS, 不在 -14 附近")
    if tpk > -1.0:
        problems.append(f"真峰 {tpk} dBTP 超过 -1")
    # 瞬时响度 (400ms) 逐 0.1 秒: 重卡点前后 0.5 秒里的最大值 应高于其他时间的最大值
    mom = [(float(t), float(m)) for t, m in _re.findall(r"t:\s*([\d.]+)\s+TARGET:-?\d+ LUFS\s+M:\s*(-?[\d.]+)", eb)]
    hv = [h / fps for h in meta["heavy"]]
    near = lambda t: any(-0.1 <= t - x <= 0.6 for x in hv)
    other = max((m for t, m in mom if not near(t)), default=-99)
    loud_rows = []
    for x in hv:
        pk = max((m for t, m in mom if -0.1 <= t - x <= 0.6), default=-99)
        loud_rows.append(f"| {x:.2f}s | {pk:.1f} LUFS | {other:.1f} LUFS | {'是' if pk >= other else '否'} |")
        if pk < other:
            problems.append(f"重卡点 {x:.2f}s 的瞬时响度 {pk:.1f} 低于别处最大值 {other:.1f}")

    # 逐屏一帧: 每屏中间那一帧, 用来对照字幕 人物 动作
    mids = [(sc["start"] + sc["end"]) // 2 for sc in meta["screens"]]
    fr = frames_from_video(video, mids, 384)
    imgs = [label(im, f"#{sc['id']} f{m}") for im, m, sc in zip(fr, mids, meta["screens"])]
    Image.fromarray(tile(imgs, 7)).save(qa / "screens.png")

    rep = ["# 质检报告", "", f"视频 `{video}` 共 {end} 帧; 遮罩序列 {len(chars)} / {len(subs)} 帧", "",
           f"整片响度 **{integ} LUFS** 真峰 **{tpk} dBTP**; 静止超过 3 秒的段落 {len(freezes)} 处; 静音段 {len([1 for a, d in silences if a < tail])} 处", "",
           "## 问题", ""] + ([f"- ❌ {p}" for p in problems] or ["- 没有发现问题"]) + [
           "", "## 逐屏", "", "| 屏 | 帧 | 字幕 | 看得到人物的帧 | 字幕可读的帧 | 特写 |", "|---|---|---|---|---|---|"] + notes + [
           "", "## 重卡点", "", "| 帧 | 画面变化最大的帧 | 重音效起音偏差 (帧) |", "|---|---|---|"] + [
           f"| {h} | {p} | {o:+.1f} |" for (h, p, _), (_, o) in zip(heavy_rows, audio_rows)] + [
           "", "## BGM 让位", "", "| 重卡点帧 | BGM 平时音量 | 最低 | 压低 | 持续 |", "|---|---|---|---|---|"] + duck_rows + [
           "", "## 重卡点响度", "", "| 时间 | 重卡点 0.5 秒内瞬时响度最大 | 其余时间最大 | 最响 |", "|---|---|---|---|"] + loud_rows + [
           "", "## 镜头落点", "", "| 机位 | 开始帧 (小节) | 落定帧 | 落在底鼓上 |", "|---|---|---|---|"] + cam_rows + [""]
    (qa / "report.md").write_text("\n".join(rep))
    print("\n".join(problems) if problems else "no problems")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
