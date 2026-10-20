"""把多张帧拼成联系表：python3 scripts/sheet.py 输出.jpg 列数 图片...（每格标注文件名）"""
import sys
from PIL import Image, ImageDraw

out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W, H = 640, 360
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (W * cols, H * rows), "black")
for i, fp in enumerate(files):
    im = Image.open(fp).convert("RGB").resize((W, H))
    d = ImageDraw.Draw(im)
    label = fp.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    d.rectangle([0, 0, 120, 26], fill="black")
    d.text((6, 6), label, fill="yellow")
    # 标出 x=1440 的字幕禁区边界
    d.line([(1440 * W / 1920, 0), (1440 * W / 1920, H)], fill=(255, 0, 255), width=1)
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(out, quality=88)
print(out)
