# 把若干帧拼成一张联系表（每格 960x540，左上角标帧号/秒数），方便快速目检
import sys
from PIL import Image, ImageDraw
files = sys.argv[2:]
out = sys.argv[1]
cols = 2
w, h = 960, 540
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (0, 0, 0))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    n = int(''.join(c for c in f.split('/')[-1] if c.isdigit()) or 0)
    d.rectangle([x, y, x + 150, y + 26], fill=(0, 0, 0))
    d.text((x + 6, y + 6), f'f{n}  {n/30:.2f}s', fill=(255, 255, 0))
    # 标出 x=1440 的分界线（右侧 1/4 不应出现字幕）
    d.line([x + 720, y, x + 720, y + h], fill=(255, 0, 255), width=1)
sheet.save(out)
