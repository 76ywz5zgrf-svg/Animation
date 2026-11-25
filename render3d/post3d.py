"""Nachbearbeitung: Comic-Lautwörter, Raster, Abschlusskarte, Zusammenschnitt mit Ton.
python3 post3d.py  -> out/pieks-und-tupfi-3d-kurzvideo.mp4 (1080x1920)
"""
import json, math, os, subprocess, glob
from functools import lru_cache
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build'); OUT = os.path.join(HERE, '..', 'render', 'out')
FONT = os.path.join(HERE, '..', 'render', 'fonts', 'Fredoka.ttf')
TL = json.load(open(os.path.join(B, 'short_timeline.json')))
W, H, FPS = 1080, 1920, 24
INK = (40, 20, 45, 255)

def font(size):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_name(b'Bold')
    except Exception: pass
    return f

@lru_cache(maxsize=16)
def burst(word, color):
    s = 2
    w, h = 900 * s, 520 * s
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx, cy = w / 2, h / 2; pts = []
    n = 18
    for k in range(n * 2):
        a = math.pi * k / n; r = (1.0 if k % 2 == 0 else 0.72)
        pts.append((cx + math.cos(a) * r * w * 0.46, cy + math.sin(a) * r * h * 0.44))
    d.polygon(pts, fill=color, outline=INK, width=14 * s)
    f = font(150 * s if len(word) < 6 else 120 * s)
    d.text((cx, cy), word, font=f, fill=(255, 255, 255, 255), anchor='mm', stroke_width=12 * s, stroke_fill=INK)
    im = im.resize((w // s, h // s), Image.LANCZOS).rotate(-7, resample=Image.BICUBIC, expand=True)
    return im

@lru_cache(maxsize=1)
def endcard():
    s = 2
    im = Image.new('RGBA', (W * s, 760 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.text((W * s / 2, 200 * s), 'Pieks & Tupfi', font=font(150 * s), fill=(255, 216, 74, 255), anchor='mm', stroke_width=14 * s, stroke_fill=INK)
    d.rounded_rectangle([90 * s, 330 * s, (W - 90) * s, 470 * s], radius=70 * s, fill=(255, 127, 192, 255), outline=INK, width=10 * s)
    d.text((W * s / 2, 400 * s), 'Jeder Tupfen ist toll!', font=font(84 * s), fill=(255, 255, 255, 255), anchor='mm', stroke_width=8 * s, stroke_fill=INK)
    return im.resize((W, 760), Image.LANCZOS)

@lru_cache(maxsize=1)
def halftone():
    im = Image.new('L', (W, H), 255); d = ImageDraw.Draw(im)
    step = 9
    for y in range(0, H, step):
        for x in range((y // step) % 2 * step // 2, W, step):
            d.ellipse([x - 1.6, y - 1.6, x + 1.6, y + 1.6], fill=222)
    return Image.merge('RGB', [im] * 3)

COLORS = {'KIKERIKI!': (255, 196, 40, 255), '?!': (120, 200, 255, 255), 'QUAAAK!': (120, 230, 120, 255),
          'HIHIHI!': (255, 140, 200, 255), 'WOW!': (255, 160, 60, 255)}

def overlay(im, t):
    for i, w in enumerate(TL['words']):
        u = t - w['t']
        if w['word'] == 'END':
            if u >= 0:
                ec = endcard(); k = min(1.0, 0.4 + u / 0.35)
                e2 = ec.resize((int(ec.width * k), int(ec.height * k)), Image.LANCZOS)
                im.alpha_composite(e2, (int(W / 2 - e2.width / 2), int(330 - e2.height / 2 + 120)))
            continue
        if 0 <= u < 1.4:
            b = burst(w['word'], COLORS.get(w['word'], (255, 216, 74, 255)))
            k = 0.3 + 0.9 * min(1, u / 0.18) if u < 0.18 else (1.2 - 0.2 * min(1, (u - 0.18) / 0.1))
            b2 = b.resize((max(1, int(b.width * k * 0.9)), max(1, int(b.height * k * 0.9))), Image.LANCZOS)
            if u > 1.15:
                a = 1 - (u - 1.15) / 0.25
                b2.putalpha(b2.getchannel('A').point(lambda v: int(v * a)))
            x = W * (0.32 if i % 2 == 0 else 0.68); y = 360
            im.alpha_composite(b2, (int(x - b2.width / 2), int(y - b2.height / 2)))
    return im

def process(args):
    idx, f = args
    out = os.path.join(B, 'post', 'p%05d.png' % idx)
    if os.path.exists(out): return
    src = os.path.join(B, 'frames', 'f%05d.png' % f)
    im = Image.open(src).convert('RGB').resize((W, H), Image.LANCZOS)
    im = ImageChops.multiply(im, halftone())
    im = overlay(im.convert('RGBA'), (f - 1) / FPS)
    im.convert('RGB').save(out, compress_level=1)

if __name__ == '__main__':
    os.makedirs(os.path.join(B, 'post'), exist_ok=True)
    frames = sorted(int(os.path.basename(p)[1:6]) for p in glob.glob(os.path.join(B, 'frames', 'f*.png')))
    with Pool(4) as pool: pool.map(process, list(enumerate(frames)))
    out = os.path.join(OUT, 'pieks-und-tupfi-3d-kurzvideo.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS / 2), '-i', os.path.join(B, 'post', 'p%05d.png'),
                    '-i', os.path.join(B, 'short_master.wav'), '-r', str(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    print('fertig:', out)
