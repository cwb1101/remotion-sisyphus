"""画面自检。

1) 逐帧扫描“只有文字层”的渲染（Film textOnly=true），检查：
   · 右侧禁字区 x ≥ 1560 有没有任何文字像素
   · 底部 80px 以内有没有字（字幕底边要离底 ≥ 80px）
   · 字幕区（y 700–1000）的字是否都在 x 360–1560 之内、是否最多两行
   · 每屏完全显示时，高亮颜色是否和字幕稿一致（暖色/冷色出现与否），有没有第三种颜色
2) 从成片每 2 秒抽一帧，拼成联系表，供人工检查遮挡、穿模和裁切。

   并检查右上角水印每一帧都在、位置固定。
用法：python3 scripts/qa-frames.py out/qa/textonly_film.mp4 out/film.mp4 out/qa/film
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

W, H, FPS = 1920, 1080, 30
script = json.loads(Path(__file__).resolve().parent.parent.joinpath('src/data/script.json').read_text())
WARM, COOL = script['colors']['warm'], script['colors']['cool']


def frames(path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n = 0
    while True:
        raw = p.stdout.read(W * H * 3)
        if len(raw) < W * H * 3:
            break
        yield n, np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.int32)
        n += 1


def cue_at(f):
    for c in script['cues']:
        if c['start'] <= f < c['end']:
            return c
    return None


def hue_of(hex_color):
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60


WARM_H, COOL_H = hue_of(WARM), hue_of(COOL)


def classify(img):
    """按色相判断：亮且饱和的像素只能落在暖色或冷色色相 ±22° 内，否则算第三种颜色。"""
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mx, mn = np.max(img, -1), np.min(img, -1)
    d = (mx - mn).astype(np.float64)
    lum = (r * 299 + g * 587 + b * 114) // 1000
    bright = lum > 70
    safe = np.where(d == 0, 1, d)
    h = np.where(mx == r, ((g - b) / safe) % 6, np.where(mx == g, (b - r) / safe + 2, (r - g) / safe + 4)) * 60
    sat = d / np.where(mx == 0, 1, mx)
    colored = (sat > 0.35) & (mx > 90)
    near = lambda h0: np.minimum(np.abs(h - h0), 360 - np.abs(h - h0)) < 22
    warm = colored & near(WARM_H) & (mx > 170)
    cool = colored & near(COOL_H) & (mx > 150)
    white = (r > 200) & (g > 200) & (b > 200)
    other = colored & ~near(WARM_H) & ~near(COOL_H)
    return bright, warm, cool, white, other


def main():
    text_video, film, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    issues = []
    checked = 0
    for f, img in frames(text_video):
        checked += 1
        bright, warm, cool, white, other = classify(img)
        if bright[:, 1560:].any():
            ys, xs = np.where(bright[:, 1560:])
            issues.append({'frame': f, 'issue': '右侧禁字区出现文字像素', 'n': int(len(xs)), 'x_max': int(xs.max() + 1560)})
        if bright[H - 80:, :].any():
            issues.append({'frame': f, 'issue': '底部 80px 内出现文字'})
        sub = bright[700:H - 80]
        if sub.any():
            ys, xs = np.where(sub)
            if xs.min() < 360 - 8 or xs.max() > 1560:
                issues.append({'frame': f, 'issue': '字幕超出 x 360–1560', 'x': [int(xs.min()), int(xs.max())]})
            if ys.max() - ys.min() > 2 * 64 * 1.32 + 24:
                issues.append({'frame': f, 'issue': '字幕超过两行', 'height': int(ys.max() - ys.min())})
        c = cue_at(f)
        if c and c['start'] + 6 <= f < c['end'] - 6:
            zone = slice(700, H - 80)
            nw, nc = int(warm[zone].sum()), int(cool[zone].sum())
            want_w = any(h['color'] == WARM for h in c['highlights'])
            want_c = any(h['color'] == COOL for h in c['highlights'])
            if want_w != (nw > 300) or want_c != (nc > 300):
                issues.append({'frame': f, 'cue': c['id'], 'issue': '高亮颜色与字幕稿不一致', 'warm_px': nw, 'cool_px': nc, 'want_warm': want_w, 'want_cool': want_c})
            if int(white[zone].sum()) < 300 and len(c['text']) > sum(len(h['word']) for h in c['highlights']):
                issues.append({'frame': f, 'cue': c['id'], 'issue': '字幕区没有白字'})
        if int(other.sum()) > 400:
            issues.append({'frame': f, 'issue': '出现第三种强调色', 'n': int(other.sum())})

    # 联系表：每 2 秒一帧（每张 4×4），同时检查水印：每一帧右上角都要有，位置不动
    total = script['cues'][-1]['end'] if 'film' in film.name else script['previewEnd']
    secs = list(range(0, int(total / FPS), 2))
    wm_boxes = []
    for t in secs:
        png = out / f'full_{t:03d}s.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t + 0.5), '-i', str(film), '-frames:v', '1', str(png)], check=True)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(png), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
        img = np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.int32)
        region = img[0:110, 1560:, :]
        lum = (region[..., 0] * 299 + region[..., 1] * 587 + region[..., 2] * 114) // 1000
        bg = np.median(lum)
        ys, xs = np.where(lum > bg + 35)
        if len(xs) < 150:
            issues.append({'second': t + 0.5, 'issue': '右上角水印缺失或太淡', 'px': int(len(xs))})
        else:
            wm_boxes.append((int(xs.min()) + 1560, int(ys.min()), int(xs.max()) + 1560, int(ys.max())))
    if wm_boxes:
        # 只比较水印框的上边和右边：左下方偶尔飘过的星点、尘粒会把检测框拉大，但不是水印在动
        arr = np.array(wm_boxes)
        spread = (arr.max(axis=0) - arr.min(axis=0)).tolist()
        if max(spread[1], spread[2]) > 3:
            issues.append({'issue': '水印位置不固定', 'spread_px': spread})
    sheet = out / 'contact_%02d.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '1', '-pattern_type', 'glob', '-i', str(out / 'full_*s.png'),
                    '-vf', 'scale=480:-1,tile=4x4', str(sheet)], check=True)

    by_type = {}
    for i in issues:
        by_type[i['issue']] = by_type.get(i['issue'], 0) + 1
    (out / 'frame_issues.json').write_text(json.dumps(issues, ensure_ascii=False, indent=1))
    print(json.dumps({'frames_checked': checked, 'issue_count': len(issues), 'by_type': by_type, 'first_issues': issues[:20],
                      'watermark_box': list(wm_boxes[0]) if wm_boxes else None, 'contact_sheets': str(sheet), 'stills_every_2s': len(secs)}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
