"""把若干 PNG 拼成一张两列的总览图：python3 scripts/sheet.py out.png a.png b.png ..."""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W, H = 960, 540
cols = 2
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols, H * rows), (40, 40, 40))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((W, H))
    ImageDraw.Draw(im).text((8, 8), f.split('/')[-1], fill=(255, 0, 0))
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(out)
