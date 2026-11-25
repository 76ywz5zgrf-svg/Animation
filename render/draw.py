"""Figuren, Requisiten und Hintergründe – alles prozedural mit PIL gezeichnet (2x Supersampling)."""
import math, random
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import os

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, 'fonts', 'Fredoka.ttf')
W, H = 1920, 1080
SS = 2  # Supersampling

def font(size, weight=b'Bold'):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_name(weight)
    except Exception: pass
    return f

def hexc(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(len(c1)))

OUT = hexc('3a2a3f')  # Konturfarbe

class Pen:
    """Zeichnet in eine SS-fach vergrößerte Leinwand; Koordinaten in Endpixeln."""
    def __init__(self, w, h, bg=(0, 0, 0, 0)):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (int(w * SS), int(h * SS)), bg)
        self.d = ImageDraw.Draw(self.im)
    def S(self, v): return v * SS
    def _layer(self, fill):
        """Halbtransparente Füllungen auf eigener Ebene zeichnen und dann überblenden."""
        if fill is not None and len(fill) == 4 and fill[3] < 255:
            lay = Image.new('RGBA', self.im.size, (0, 0, 0, 0))
            return lay, ImageDraw.Draw(lay)
        return None, self.d
    def _merge(self, lay):
        if lay is not None: self.im.alpha_composite(lay)
    def ell(self, cx, cy, rx, ry, fill, ol=OUT, w=4):
        lay, d = self._layer(fill)
        d.ellipse([self.S(cx - rx), self.S(cy - ry), self.S(cx + rx), self.S(cy + ry)], fill=fill,
                  outline=ol if ol else None, width=int(self.S(w)) if ol else 0)
        self._merge(lay)
    def _ell_old(self, cx, cy, rx, ry, fill, ol=OUT, w=4):
        self.d.ellipse([self.S(cx - rx), self.S(cy - ry), self.S(cx + rx), self.S(cy + ry)], fill=fill,
                       outline=ol if ol else None, width=int(self.S(w)) if ol else 0)
    def circ(self, cx, cy, r, fill, ol=OUT, w=4): self.ell(cx, cy, r, r, fill, ol, w)
    def poly(self, pts, fill, ol=OUT, w=4):
        p = [(self.S(x), self.S(y)) for x, y in pts]
        lay, d = self._layer(fill)
        d.polygon(p, fill=fill, outline=None)
        self._merge(lay)
        if ol: self.d.line(p + [p[0]], fill=ol, width=int(self.S(w)), joint='curve')
    def line(self, pts, fill=OUT, w=4):
        lay, d = self._layer(fill)
        p = [(self.S(x), self.S(y)) for x, y in pts]
        d.line(p, fill=fill, width=int(self.S(w)), joint='curve')
        r = self.S(w) / 2
        for x, y in (p[0], p[-1]): d.ellipse([x - r, y - r, x + r, y + r], fill=fill)
        self._merge(lay)
    def arc(self, cx, cy, rx, ry, a0, a1, fill=OUT, w=4):
        lay, d = self._layer(fill)
        d.arc([self.S(cx - rx), self.S(cy - ry), self.S(cx + rx), self.S(cy + ry)], a0, a1, fill=fill, width=int(self.S(w)))
        self._merge(lay)
    def rrect(self, x0, y0, x1, y1, r, fill, ol=OUT, w=4):
        lay, d = self._layer(fill)
        d.rounded_rectangle([self.S(x0), self.S(y0), self.S(x1), self.S(y1)], radius=self.S(r), fill=fill,
                            outline=ol if ol else None, width=int(self.S(w)) if ol else 0)
        self._merge(lay)
    def _rrect_old(self, x0, y0, x1, y1, r, fill, ol=OUT, w=4):
        self.d.rounded_rectangle([self.S(x0), self.S(y0), self.S(x1), self.S(y1)], radius=self.S(r), fill=fill,
                                 outline=ol if ol else None, width=int(self.S(w)) if ol else 0)
    def text(self, x, y, s, size, fill, anchor='mm', stroke=0, sfill=OUT, weight=b'Bold'):
        self.d.text((self.S(x), self.S(y)), s, font=font(int(self.S(size)), weight), fill=fill, anchor=anchor,
                    stroke_width=int(self.S(stroke)), stroke_fill=sfill)
    def done(self):
        return self.im.resize((int(self.w), int(self.h)), Image.LANCZOS)

def starp(p, x, y, r, col):
    pts = []
    for k in range(10):
        a = math.radians(-90 + k * 36); rr = r if k % 2 == 0 else r * 0.45
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    p.poly(pts, col, w=3)

def shade(p, cx, cy, rx, ry, col, a=60):
    """weicher Glanzpunkt"""
    p.ell(cx, cy, rx, ry, (col[0], col[1], col[2], a), ol=None)

# ------------------------------------------------------------------ Gesichtsteile
def eyes(p, lx, rx_, y, r, iris, state, look=(0, 0), lashes=False, brow=None):
    for i, x in enumerate((lx, rx_)):
        if state == 'closed':
            p.arc(x, y, r * 0.9, r * 0.6, 20, 160, w=5)
        elif state == 'happy':
            p.arc(x, y + r * 0.4, r * 0.85, r * 0.85, 200, 340, w=6)
        elif state == 'wink' and i == 1:
            p.arc(x, y + r * 0.4, r * 0.85, r * 0.85, 200, 340, w=6)
        else:
            big = 1.18 if state == 'wide' else 1.0
            p.ell(x, y, r * 0.85 * big, r * big, hexc('ffffff'))
            ir = r * (0.5 if state == 'wide' else 0.66)
            lx2, ly2 = x + look[0] * r * 0.25, y + look[1] * r * 0.3 + (-r * 0.35 if state == 'up' else 0)
            p.circ(lx2, ly2 + r * 0.05, ir, iris, ol=None)
            p.circ(lx2, ly2 + r * 0.08, ir * 0.55, hexc('15101c'), ol=None)
            p.circ(lx2 - ir * 0.35, ly2 - ir * 0.3, ir * 0.32, hexc('ffffff'), ol=None)
            p.circ(lx2 + ir * 0.3, ly2 + ir * 0.35, ir * 0.15, hexc('ffffff'), ol=None)
            if state in ('sleepy',):
                p.d.chord([p.S(x - r * 0.95), p.S(y - r * 1.1), p.S(x + r * 0.95), p.S(y + r * 1.1)], 180, 360,
                          fill=brow or hexc('c9a27a'), outline=OUT, width=int(p.S(4)))
            if state == 'sad':
                p.line([(x - r * 0.8, y - r * 1.25 + (0 if i else r * 0.35)), (x + r * 0.8, y - r * 1.25 + (r * 0.35 if i else 0))], w=5)
            if lashes and state not in ('sleepy',):
                for k in (-1, 0, 1):
                    ax = x + k * r * 0.45 + (r * 0.5 if i else -r * 0.5) * 0.6
                    p.line([(ax, y - r * 0.92), (ax + (k * 6) + (8 if i else -8), y - r * 1.3)], w=4)

def mouth(p, cx, cy, wid, state, op=0.0, tongue=True, col=hexc('7a2236')):
    """op 0..1 = Öffnung beim Sprechen"""
    if op > 0.12 or state in ('o', 'yawn', 'open'):
        if state == 'yawn': o = 1.0
        elif state == 'o': o = max(op, 0.6)
        else: o = op
        hh = wid * (0.15 + 0.55 * o)
        ww = wid * (0.45 if state == 'o' else 0.62) * (1 if state != 'yawn' else 0.8)
        p.ell(cx, cy + hh * 0.3, ww, hh, col, w=4)
        if tongue and o > 0.35: p.ell(cx, cy + hh * 0.95, ww * 0.55, hh * 0.4, hexc('ff7f9a'), ol=None)
        return
    if state == 'grin':
        p.d.chord([p.S(cx - wid * 0.7), p.S(cy - wid * 0.45), p.S(cx + wid * 0.7), p.S(cy + wid * 0.55)], 0, 180, fill=col, outline=OUT, width=int(p.S(4)))
        p.d.chord([p.S(cx - wid * 0.35), p.S(cy + wid * 0.1), p.S(cx + wid * 0.35), p.S(cy + wid * 0.5)], 180, 360, fill=hexc('ff7f9a'))
    elif state == 'frown':
        p.arc(cx, cy + wid * 0.35, wid * 0.45, wid * 0.3, 205, 335, w=5)
    elif state == 'flat':
        p.line([(cx - wid * 0.35, cy + 4), (cx + wid * 0.35, cy)], w=5)
    elif state == 'tight':
        p.line([(cx - wid * 0.25, cy), (cx + wid * 0.25, cy)], w=6)
        p.ell(cx - wid * 0.28, cy, 5, 5, hexc('ff9fb0'), ol=None); p.ell(cx + wid * 0.28, cy, 5, 5, hexc('ff9fb0'), ol=None)
    else:  # smile
        p.arc(cx, cy - wid * 0.15, wid * 0.5, wid * 0.4, 25, 155, w=5)

# ------------------------------------------------------------------ Figuren
def draw_pieks(st):
    p = Pen(360, 400)
    var = st.get('var', '')
    if var == 'ball':
        cx, cy = 180, 280
        for k in range(26):
            a = 2 * math.pi * k / 26
            x1, y1 = cx + math.cos(a) * 90, cy + math.sin(a) * 90
            x2, y2 = cx + math.cos(a) * 128, cy + math.sin(a) * 128
            px, py = -math.sin(a) * 16, math.cos(a) * 16
            p.poly([(x1 + px, y1 + py), (x2, y2), (x1 - px, y1 - py)], hexc('6b3f22'), w=3)
            p.poly([(x1 + (x2 - x1) * 0.6 + px * 0.4, y1 + (y2 - y1) * 0.6 + py * 0.4), (x2, y2),
                    (x1 + (x2 - x1) * 0.6 - px * 0.4, y1 + (y2 - y1) * 0.6 - py * 0.4)], hexc('ff9a2e'), ol=None)
        p.circ(cx, cy, 98, hexc('8a5530'))
        p.circ(cx + 18, cy + 22, 52, hexc('e0b07a'), w=3)
        p.circ(cx + 52, cy + 22, 9, hexc('15101c'), ol=None)
        p.ell(cx - 40, cy + 85, 26, 18, hexc('2f7de1'))
        return p.done()
    cx, cy = 180, 235
    squash = var == 'squash'
    if squash: cy += 18
    # Stacheln hinten
    for k in range(19):
        a = math.radians(150 + k * 13.3)
        r0, r1 = 92, 150 + (12 if k % 2 else 0)
        x1, y1 = cx + math.cos(a) * r0, cy + math.sin(a) * r0 * 0.95
        x2, y2 = cx + math.cos(a) * r1, cy + math.sin(a) * r1 * 0.92
        px, py = -math.sin(a) * 22, math.cos(a) * 22
        p.poly([(x1 + px, y1 + py), (x2, y2), (x1 - px, y1 - py)], hexc('6b3f22'), w=3)
        tx, ty = x1 + (x2 - x1) * 0.62, y1 + (y2 - y1) * 0.62
        p.poly([(tx + px * 0.38, ty + py * 0.38), (x2, y2), (tx - px * 0.38, ty - py * 0.38)], hexc('ff9a2e'), ol=None)
    # Rucksack (rechts hinten)
    p.rrect(262, 200, 322, 300, 18, hexc('e8b83a'))
    p.poly([(296, 220), (284, 250), (296, 250), (286, 280), (308, 244), (296, 244), (304, 220)], hexc('e23b3b'), w=2)
    # Körper
    p.ell(cx, cy + 40, 108, 102 if not squash else 88, hexc('8a5530'))
    p.ell(cx, cy + 62, 74, 68 if not squash else 56, hexc('f0c48e'), w=3)
    # Tolle vorne
    for dx, ln in ((-26, 58), (0, 76), (26, 58)):
        p.poly([(cx + dx - 22, cy - 72), (cx + dx + 6, cy - 72 - ln), (cx + dx + 22, cy - 66)], hexc('6b3f22'), w=3)
        p.poly([(cx + dx - 6, cy - 72 - ln * 0.55), (cx + dx + 6, cy - 72 - ln), (cx + dx + 12, cy - 72 - ln * 0.5)], hexc('ff9a2e'), ol=None)
    # Gesicht
    p.ell(cx, cy - 4, 92, 80, hexc('e9b47c'))
    shade(p, cx - 30, cy - 40, 40, 20, (255, 255, 255), 50)
    eyes(p, cx - 38, cx + 38, cy - 14, 27, hexc('2fb36a'), st.get('eyes', 'open'), brow=hexc('e9b47c'))
    p.ell(cx - 62, cy + 26, 16, 10, (255, 120, 140, 110), ol=None); p.ell(cx + 62, cy + 26, 16, 10, (255, 120, 140, 110), ol=None)
    p.ell(cx, cy + 16, 14, 10, hexc('1a1218'), w=2)
    p.circ(cx - 4, cy + 12, 3.5, hexc('ffffff'), ol=None)
    mouth(p, cx, cy + 40, 34, st.get('mouth', 'smile'), st.get('op', 0))
    # Arme
    arm_up = st.get('pose') == 'cheer'
    if arm_up:
        p.ell(cx - 112, cy - 30, 18, 34, hexc('8a5530')); p.ell(cx + 112, cy - 30, 18, 34, hexc('8a5530'))
    else:
        p.ell(cx - 104, cy + 60, 20, 30, hexc('8a5530')); p.ell(cx + 104, cy + 60, 20, 30, hexc('8a5530'))
    # Stiefel
    if var == 'chaos':
        p.rrect(cx + 18, 330, cx + 88, 392, 12, hexc('c46a3c'))  # Blumentopf
        p.ell(cx + 53, 330, 38, 9, hexc('8f4a2a'))
        p.rrect(cx - 86, 330, cx - 22, 380, 18, hexc('2f7de1')); p.ell(cx - 54, 382, 38, 14, hexc('2f7de1'))
        # Stiefel auf dem Kopf
        p.rrect(cx - 40, cy - 168, cx + 30, cy - 96, 14, hexc('2f7de1')); p.ell(cx + 2, cy - 98, 50, 16, hexc('2f7de1'))
        p.rrect(cx - 46, cy - 182, cx + 36, cy - 160, 8, hexc('5aa0f5'))
        # Rucksack vorn
        p.rrect(cx - 46, cy + 70, cx + 46, cy + 150, 18, hexc('e8b83a'))
        p.poly([(cx, cy + 82), (cx - 12, cy + 112), (cx, cy + 112), (cx - 8, cy + 140), (cx + 12, cy + 104), (cx, cy + 104), (cx + 8, cy + 82)], hexc('e23b3b'), w=2)
    else:
        for sx in (-1, 1):
            bx = cx + sx * 52
            p.rrect(bx - 32, 322, bx + 32, 382, 18, hexc('2f7de1'))
            p.ell(bx + sx * 6, 384, 40, 14, hexc('2f7de1'))
            p.rrect(bx - 34, 318, bx + 34, 336, 8, hexc('5aa0f5'))
    return p.done()

DOTS_FRONT = [(-42, -58, 13), (50, 14, 15), (0, 52, 17), (-92, 10, 11), (92, 30, 11)]
DOTS_BACK = [(-30, -30, 16), (24, 40, 18)]
def draw_tupfi(st):
    p = Pen(320, 340)
    cx, cy = 160, 200
    var = st.get('var', '')
    fur = hexc('35c7c2'); furd = hexc('25a8a6')
    if var == 'scarves':
        p.ell(cx, cy + 10, 120, 118, fur)
        for i, col in enumerate(['e85d75', 'f2b134', '6c7ae0']):
            p.rrect(cx - 128, cy - 40 + i * 44, cx + 128, cy + 6 + i * 44, 22, hexc(col))
            for k in range(6): p.line([(cx - 110 + k * 44, cy - 34 + i * 44), (cx - 100 + k * 44, cy + 0 + i * 44)], hexc('ffffff', 120), w=4)
        p.ell(cx, cy - 92, 96, 44, hexc('9d6ad8')); p.circ(cx, cy - 136, 22, hexc('ffffff'))
        p.ell(cx, cy - 66, 70, 22, hexc('e85d75'))
        eyes(p, cx - 30, cx + 30, cy - 52, 18, hexc('8a4fd6'), 'open', lashes=True)
        p.ell(cx + 60, cy - 30, 7, 11, hexc('8fd6ff'))  # Schweißtropfen
        return p.done()
    back = var == 'back'
    # Ohren
    for sx in (-1, 1):
        ex = cx + sx * 70
        p.circ(ex, cy - 98, 32, fur); p.circ(ex, cy - 98, 18, hexc('ff9bc0'), ol=None)
    # Spange am linken Ohr (von Tupfi aus = rechts im Bild)
    fx_, fy_ = (cx + 88, cy - 120) if not back else (cx - 88, cy - 120)
    for k in range(5):
        a = math.radians(k * 72 - 90)
        p.circ(fx_ + math.cos(a) * 11, fy_ + math.sin(a) * 11, 9, hexc('ffd33d'), w=3)
    p.circ(fx_, fy_, 6, hexc('ff9a2e'), w=2)
    # Körper
    p.circ(cx, cy + 10, 120, fur)
    shade(p, cx - 40, cy - 50, 55, 35, (255, 255, 255), 55)
    p.ell(cx, cy + 110, 90, 18, (0, 0, 0, 40), ol=None)
    hl = st.get('dot', 0)
    if back:
        for i, (dx, dy, r) in enumerate(DOTS_BACK):
            lit = hl == 6 + i
            p.circ(cx + dx, cy + dy, r * (1.35 if lit else 1), hexc('ff5fa2' if lit else 'ff8cbc'), w=3)
            if lit: p.circ(cx + dx, cy + dy, r * 1.9, (255, 255, 255, 70), ol=None)
        for i in (3, 4):
            dx, dy, r = DOTS_FRONT[i]; p.circ(cx - dx, cy + dy, r, hexc('ff8cbc'), w=3)
        p.circ(cx, cy + 108, 16, fur)  # Schwänzchen
        for sx in (-1, 1): p.ell(cx + sx * 44, cy + 126, 22, 13, furd)
        return p.done()
    for i, (dx, dy, r) in enumerate(DOTS_FRONT):
        lit = hl == i + 1
        p.circ(cx + dx, cy + dy, r * (1.35 if lit else 1), hexc('ff5fa2' if lit else 'ff8cbc'), w=3)
        if lit: p.circ(cx + dx, cy + dy, r * 1.9, (255, 255, 255, 70), ol=None)
    eyes(p, cx - 36, cx + 36, cy - 26, 30, hexc('8a4fd6'), st.get('eyes', 'open'), lashes=True, brow=fur)
    p.ell(cx - 66, cy + 6, 15, 9, (255, 110, 150, 120), ol=None); p.ell(cx + 66, cy + 6, 15, 9, (255, 110, 150, 120), ol=None)
    mouth(p, cx, cy + 14, 24, st.get('mouth', 'smile'), st.get('op', 0))
    # Ärmchen + Füße
    p.ell(cx - 118, cy + 40, 16, 24, fur); p.ell(cx + 118, cy + 40, 16, 24, fur)
    for sx in (-1, 1): p.ell(cx + sx * 44, cy + 128, 24, 14, furd)
    return p.done()

def draw_lantern(glow=True):
    p = Pen(90, 120)
    p.line([(45, 6), (45, 30)], w=4)
    pts = []
    for k in range(10):
        a = math.radians(-90 + k * 36); r = 34 if k % 2 == 0 else 15
        pts.append((45 + math.cos(a) * r, 70 + math.sin(a) * r))
    p.poly(pts, hexc('ffd84a'), w=3)
    p.circ(45, 70, 9, hexc('fff6c2'), ol=None)
    return p.done()

def draw_gustav(st):
    p = Pen(460, 580)
    cx = 230
    var = st.get('var', ''); pose = st.get('pose', 'stand')
    puff = var == 'puff'
    by, br = 360, 150 if not puff else 175
    # Schwanzfedern
    for k, (dx, dy, a) in enumerate([(130, -40, -30), (150, 0, -10), (140, 40, 10)]):
        p.ell(cx + dx, by + dy - 30, 30, 70, hexc('f5f1e8'), w=3)
    # Beine
    for sx in (-1, 1):
        x = cx + sx * 50
        p.line([(x, by + 120), (x, 560)], hexc('f39a2b'), w=10)
        for d in (-22, 0, 22): p.line([(x, 560), (x + d, 572)], hexc('f39a2b'), w=8)
    # Körper
    p.ell(cx, by, br, br * 0.95, hexc('fbfaf6'))
    shade(p, cx - 50, by - 50, 70, 40, (255, 255, 255), 90)
    for k in range(5): p.arc(cx - 10 + k * 8, by + 30 + k * 14, 60, 30, 20, 160, fill=hexc('e4e0d6'), w=3)
    # Flügel
    if pose == 'point':
        p.poly([(cx + br - 30, by - 40), (cx + br + 150, by - 160), (cx + br + 120, by - 120), (cx + br + 10, by + 20)], hexc('f2eee4'), w=4)
        p.ell(cx - br + 8, by + 10, 38, 80, hexc('f2eee4'))
    elif pose == 'crow':
        p.ell(cx - br, by - 30, 40, 86, hexc('f2eee4')); p.ell(cx + br, by - 30, 40, 86, hexc('f2eee4'))
    else:
        p.ell(cx - br + 8, by + 10, 38, 80, hexc('f2eee4')); p.ell(cx + br - 8, by + 10, 38, 80, hexc('f2eee4'))
    # Wecker am grünen Band
    p.arc(cx, by - 120, 70, 60, 20, 160, fill=hexc('2e9e4f'), w=8)
    p.circ(cx, by - 52, 30, hexc('d9a441')); p.circ(cx, by - 52, 22, hexc('fff7e0'), w=2)
    p.line([(cx, by - 52), (cx, by - 66)], w=3); p.line([(cx, by - 52), (cx + 10, by - 48)], w=3)
    p.circ(cx - 22, by - 80, 8, hexc('d9a441'), w=2); p.circ(cx + 22, by - 80, 8, hexc('d9a441'), w=2)
    # Kopf
    hy = 165 if pose != 'crow' else 150
    flop = st.get('comb', 0)
    p.circ(cx - 34, hy - 82, 26, hexc('e8333a'))
    if flop: p.ell(cx + 6, hy - 70, 30, 18, hexc('e8333a'))
    else: p.circ(cx + 2, hy - 98, 28, hexc('e8333a'))
    p.circ(cx + 36, hy - 82, 26, hexc('e8333a'))
    p.circ(cx, hy, 88, hexc('fbfaf6'))
    shade(p, cx - 30, hy - 40, 40, 22, (255, 255, 255), 90)
    eyes(p, cx - 34, cx + 34, hy - 12, 24, hexc('e0951c'), st.get('eyes', 'open'), brow=hexc('fbfaf6'))
    # buschige Brauen
    for sx in (-1, 1):
        p.line([(cx + sx * 12, hy - 46), (cx + sx * 52, hy - 54)], hexc('cfc9bd'), w=12)
    # Schnabel
    op = st.get('op', 0); m = st.get('mouth', 'smile')
    if m in ('o',) or pose == 'crow': op = max(op, 0.8)
    gap = 6 + op * 30
    p.poly([(cx - 26, hy + 18), (cx + 26, hy + 18), (cx, hy + 52)], hexc('f59a23'), w=3)
    p.poly([(cx - 22, hy + 22 + gap), (cx + 22, hy + 22 + gap), (cx, hy + 46 + gap)], hexc('e0841a'), w=3)
    if gap > 10: p.poly([(cx - 18, hy + 24), (cx + 18, hy + 24), (cx, hy + 20 + gap)], hexc('7a2236'), ol=None)
    p.ell(cx + 4, hy + 74 + gap * 0.4, 14, 22, hexc('e8333a'))
    return p.done()

def cloud_blobs(p, pts, r, fill, shadow):
    for x, y in pts: p.circ(x, y + r * 0.18, r, shadow, ol=OUT, w=4)
    for x, y in pts: p.circ(x, y, r * 0.96, fill, ol=None)

def draw_wuschel(st):
    p = Pen(320, 260)
    cx, cy = 160, 135
    shape = st.get('shape', 'cloud')
    red = st.get('red', 0)
    fill = mix(hexc('ffffff'), hexc('ff9a9a'), 0.5) if red else hexc('ffffff')
    sh = hexc('c9b8ec')
    if shape == 'cloud':
        pts = [(cx - 70, cy + 10), (cx - 30, cy - 30), (cx + 30, cy - 36), (cx + 72, cy + 4), (cx, cy + 22), (cx - 40, cy + 30), (cx + 40, cy + 28)]
        cloud_blobs(p, pts, 46, fill, sh)
        ey = cy
    else:
        if shape == 'heart':
            pts = [(cx + 16 * math.sin(t) ** 3 * 6.2, cy - 10 - (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) * 6.2)
                   for t in [k * 2 * math.pi / 22 for k in range(22)]]
        elif shape == 'q':
            pts = [(cx + math.cos(a) * 52, cy - 50 + math.sin(a) * 50) for a in [math.radians(v) for v in range(180, 450, 30)]] + \
                  [(cx, cy + 20), (cx, cy + 40)]
        elif shape == '!':
            pts = [(cx, cy - 100 + k * 26) for k in range(5)]
        else:  # sun / sundot
            pts = [(cx + math.cos(a) * 44, cy + math.sin(a) * 44) for a in [k * math.pi / 4 for k in range(8)]] + [(cx, cy)]
            for k in range(8):
                a = k * math.pi / 4 + math.pi / 8
                pts.append((cx + math.cos(a) * 90, cy + math.sin(a) * 90))
        cloud_blobs(p, pts, 24 if shape != 'heart' else 26, fill, sh)
        if shape == 'q': cloud_blobs(p, [(cx, cy + 96)], 26, fill, sh)
        if shape == '!': cloud_blobs(p, [(cx, cy + 96)], 26, fill, sh)
        if shape in ('sun', 'sundot'):
            p.circ(cx, cy, 40, hexc('ffe46b'), w=3)
            if shape == 'sundot': p.circ(cx - 16, cy + 8, 7, hexc('7a4a2a'), ol=None)
        ey = cy - 20 if shape in ('heart',) else (cy - 60 if shape == 'q' else (cy - 70 if shape == '!' else cy))
    if shape in ('sun', 'sundot'): ey = cy - 4
    e = st.get('eyes', 'open')
    for sx in (-1, 1):
        x = cx + sx * 24
        if e in ('closed', 'happy'): p.arc(x, ey + 6, 10, 10, 200, 340, w=5)
        else:
            p.ell(x, ey, 9, 12, hexc('15101c'), ol=None); p.circ(x - 3, ey - 4, 3.5, hexc('ffffff'), ol=None)
            if e == 'sad': p.line([(x - 12, ey - 18 + (6 if sx < 0 else 0)), (x + 12, ey - 18 + (0 if sx < 0 else 6))], w=4)
    p.ell(cx - 46, ey + 16, 12, 7, hexc('ff9fb8'), ol=None); p.ell(cx + 46, ey + 16, 12, 7, hexc('ff9fb8'), ol=None)
    m = st.get('mouth', 'smile')
    if m == 'tight': p.line([(cx - 10, ey + 22), (cx + 10, ey + 22)], w=5)
    return p.done()

def draw_oma(st):
    p = Pen(440, 640)
    cx = 220
    grey = hexc('c9c6cf'); greyd = hexc('a9a5b2')
    # Ohren (hängend)
    for sx in (-1, 1):
        p.ell(cx + sx * 110, 170, 34, 110, grey); p.ell(cx + sx * 110, 175, 16, 84, hexc('f3b8c8'), ol=None)
    # Körper: Nachthemd + Strickjacke
    p.rrect(cx - 120, 330, cx + 120, 610, 70, hexc('a8d4f2'))
    for k in range(6): starp(p, cx - 80 + (k % 3) * 80, 560 - (k % 2) * 30, 11, hexc('ffe066'))
    p.rrect(cx - 132, 300, cx + 132, 540, 70, hexc('8d58c7'))
    p.rrect(cx - 26, 300, cx + 26, 540, 10, hexc('a87ad8'), w=3)
    for k in range(3): p.circ(cx, 350 + k * 60, 12, hexc('b47b45'), w=3)
    for k in range(5): p.line([(cx - 120, 330 + k * 40), (cx - 40, 330 + k * 40)], hexc('7a46b2'), w=3)
    if st.get('pose') == 'finger':
        p.ell(cx + 150, 300, 26, 60, hexc('8d58c7')); p.circ(cx + 160, 238, 18, grey); p.ell(cx + 162, 210, 6, 18, grey, w=3)
    else:
        p.ell(cx + 136, 400, 28, 66, hexc('8d58c7')); p.circ(cx + 140, 470, 18, grey)
    p.ell(cx - 136, 400, 28, 66, hexc('8d58c7')); p.circ(cx - 140, 470, 18, grey)
    for sx in (-1, 1): p.ell(cx + sx * 56, 618, 44, 18, greyd)
    # Kopf
    p.ell(cx, 230, 108, 98, grey)
    p.ell(cx, 270, 56, 40, hexc('efeaf2'), w=3)
    shade(p, cx - 40, 180, 40, 20, (255, 255, 255), 60)
    eyes(p, cx - 42, cx + 42, 222, 20, hexc('5a7dc2'), st.get('eyes', 'open'), brow=grey)
    # Brille
    for sx in (-1, 1): p.circ(cx + sx * 42, 222, 38, None, ol=hexc('d6a23a'), w=7)
    p.line([(cx - 6, 220), (cx + 6, 220)], hexc('d6a23a'), w=6)
    p.ell(cx, 256, 14, 10, hexc('ff8fae'), w=3)
    p.ell(cx - 74, 262, 15, 8, (255, 130, 160, 110), ol=None); p.ell(cx + 74, 262, 15, 8, (255, 130, 160, 110), ol=None)
    mouth(p, cx, 286, 30, st.get('mouth', 'smile'), st.get('op', 0))
    return p.done()

def draw_wolle(st):
    p = Pen(420, 500)
    cx = 210
    cream = hexc('fbf3e1'); crd = hexc('e8dcc2')
    body = [(cx + math.cos(a) * 130, 330 + math.sin(a) * 120) for a in [k * 2 * math.pi / 12 for k in range(12)]]
    cloud_blobs(p, body, 54, cream, crd)
    p.circ(cx, 330, 120, cream, ol=None)
    p.rrect(cx - 92, 280, cx + 92, 460, 40, hexc('ff9ec0'))
    for k in range(4):
        bx, by = cx - 50 + (k % 2) * 100, 330 + (k // 2) * 70
        p.circ(bx - 9, by, 10, None, ol=hexc('c96a2a'), w=4); p.circ(bx + 9, by, 10, None, ol=hexc('c96a2a'), w=4)
    p.ell(cx - 136, 350, 26, 50, cream); p.ell(cx + 136, 350, 26, 50, cream)
    for sx in (-1, 1): p.rrect(cx + sx * 54 - 18, 440, cx + sx * 54 + 18, 494, 10, hexc('6b5a5a'))
    # Kopf
    for sx in (-1, 1): p.ell(cx + sx * 96, 175, 34, 18, hexc('d9cfc8'))
    p.ell(cx, 180, 82, 92, hexc('e9dfd6'))
    cloud_blobs(p, [(cx - 50, 100), (cx, 86), (cx + 50, 100)], 32, cream, crd)
    p.rrect(cx - 60, 10, cx + 60, 86, 26, hexc('ffffff'))
    p.ell(cx, 30, 74, 32, hexc('ffffff'))
    eyes(p, cx - 30, cx + 30, 170, 20, hexc('7a5a3a'), st.get('eyes', 'open'), lashes=True, brow=hexc('e9dfd6'))
    p.ell(cx, 212, 16, 10, hexc('c98a8a'), w=3)
    mouth(p, cx, 236, 26, st.get('mouth', 'smile'), st.get('op', 0))
    return p.done()

def draw_sola(st):
    p = Pen(1000, 1000)
    cx, cy, R = 500, 500, 300
    var = st.get('var', 'neat')
    comb = st.get('comb', 0)
    messy = var == 'messy' and comb < 1
    rnd = random.Random(3)
    n = 18
    for k in range(n):
        a = 2 * math.pi * k / n
        jit = (rnd.uniform(-0.35, 0.35) if messy else 0) * (1 - comb * 0.6)
        rr = R + 95 + (rnd.uniform(-40, 70) if messy else 0) * (1 - comb * 0.6)
        x, y = cx + math.cos(a + jit) * rr, cy + math.sin(a + jit) * rr
        col = hexc('ffb43a') if k % 2 else hexc('ffc94a')
        p.ell(x, y, 66, 66 if not messy else rnd.uniform(46, 80), col, w=5)
        p.arc(x, y, 38, 38, int(math.degrees(a)) + 40, int(math.degrees(a)) + 300, fill=hexc('ffe48a'), w=10)
        if messy and k in (3, 11):
            for j in range(4): p.circ(x + math.cos(a) * (60 + j * 30), y + math.sin(a) * (60 + j * 30), 22 - j * 3, col, w=4)
    p.circ(cx, cy, R, hexc('ffd84a'), w=6)
    p.circ(cx - 70, cy - 90, 160, (255, 246, 190, 70), ol=None)
    eyes(p, cx - 105, cx + 105, cy - 30, 62, hexc('e0901c'), st.get('eyes', 'open'), lashes=True, brow=hexc('ffd84a'))
    if st.get('tears'):
        for sx in (-1, 1): p.ell(cx + sx * 105, cy + 52, 14, 22, hexc('9fe0ff'), w=3)
    p.ell(cx - 190, cy + 70, 48, 28, (255, 150, 60, 140), ol=None); p.ell(cx + 190, cy + 70, 48, 28, (255, 150, 60, 140), ol=None)
    # Der Fleck: rechte Wange der Sonne = links im Bild
    p.circ(cx - 175, cy + 40, 26, hexc('7a4a2a'), ol=None)
    mouth(p, cx, cy + 115, 80, st.get('mouth', 'smile'), st.get('op', 0))
    if st.get('cap', 1):
        p.poly([(cx - 250, cy - 210), (cx + 250, cy - 210), (cx + 300, cy - 480), (cx + 40, cy - 520)], hexc('ff8fc2'), w=6)
        p.rrect(cx - 280, cy - 250, cx + 280, cy - 180, 34, hexc('ffd1e6'), w=5)
        p.circ(cx + 320, cy - 480, 52, hexc('ffe14d'), w=5)
    return p.done()

def draw_mond(st):
    p = Pen(800, 800)
    cx, cy, R = 400, 420, 330
    big = Image.new('L', (800 * SS, 800 * SS), 0); d = ImageDraw.Draw(big)
    d.ellipse([(cx - R) * SS, (cy - R) * SS, (cx + R) * SS, (cy + R) * SS], fill=255)
    d.ellipse([(cx - R + 250) * SS, (cy - R - 30) * SS, (cx + R + 250) * SS, (cy + R - 30) * SS], fill=0)
    col = Image.new('RGBA', big.size, hexc('c9dcf5')); outl = Image.new('RGBA', big.size, OUT)
    mask_o = big.filter(ImageFilter.MaxFilter(9))
    p.im.paste(outl, (0, 0), mask_o); p.im.paste(col, (0, 0), big)
    for (x, y, r) in [(220, 300, 30), (180, 520, 22), (300, 650, 18)]: p.circ(x, y, r, hexc('b0c6e6'), ol=None)
    # Gesicht am Innenrand
    ex, ey = 300, 360
    e = st.get('eyes', 'sleepy')
    if e in ('closed',): p.arc(ex, ey, 34, 22, 20, 160, w=6)
    elif e == 'wink': p.arc(ex, ey + 10, 30, 30, 200, 340, w=6)
    else:
        p.ell(ex, ey, 34, 38, hexc('ffffff')); p.circ(ex + 8, ey + 6, 18, hexc('3f5f9a'), ol=None); p.circ(ex + 8, ey + 8, 9, hexc('15101c'), ol=None)
        p.circ(ex + 2, ey - 2, 5, hexc('ffffff'), ol=None)
        if e == 'sleepy':
            p.d.chord([p.S(ex - 36), p.S(ey - 40), p.S(ex + 36), p.S(ey + 40)], 180, 360, fill=hexc('c9dcf5'), outline=OUT, width=int(p.S(5)))
        if e == 'wide': p.ell(ex, ey, 40, 44, None)
    p.ell(ex + 70, ey + 70, 30, 22, hexc('b9cde8'), w=4)  # Nase
    op = st.get('op', 0)
    m = st.get('mouth', 'smile')
    if op > 0.12 or m == 'o': p.ell(ex + 40, ey + 150, 22, 10 + 26 * max(op, 0.5 if m == 'o' else 0), hexc('6a2a3a'), w=4)
    else: p.arc(ex + 40, ey + 130, 30, 24, 20, 160, w=5)
    cloud_blobs(p, [(ex + 10, ey + 118), (ex + 50, ey + 112), (ex + 90, ey + 120)], 22, hexc('ffffff'), hexc('dddde8'))
    p.poly([(120, 160), (430, 90), (560, -10), (520, 140)], hexc('2b3f8f'), w=6)
    p.rrect(110, 130, 460, 190, 28, hexc('4a63c2'), w=5)
    for k in range(5):
        a = math.radians(-90 + k * 72); b2 = math.radians(-90 + k * 72 + 36)
    star = []
    for k in range(10):
        a = math.radians(-90 + k * 36); r = 40 if k % 2 == 0 else 18
        star.append((560 + math.cos(a) * r, 0 + 30 + math.sin(a) * r))
    p.poly(star, hexc('ffe14d'), w=4)
    return p.done()

def draw_frog(st):
    p = Pen(200, 220); cx = 100
    p.ell(cx, 150, 80, 62, hexc('6fcf5c'))
    for sx in (-1, 1):
        p.circ(cx + sx * 40, 78, 30, hexc('6fcf5c'))
    eyes(p, cx - 40, cx + 40, 78, 20, hexc('3a2a1a'), st.get('eyes', 'open'), brow=hexc('6fcf5c'))
    p.poly([(cx - 60, 52), (cx + 30, 20), (cx + 70, 56)], hexc('6c8cf0'), w=3); p.circ(cx + 34, 18, 12, hexc('ffffff'))
    if st.get('dot'): p.circ(cx - 46, 150, 11, hexc('7a4a2a'), ol=None)
    p.ell(cx - 50, 140, 12, 7, (255, 120, 140, 100), ol=None); p.ell(cx + 50, 140, 12, 7, (255, 120, 140, 100), ol=None)
    mouth(p, cx, 140, 40, st.get('mouth', 'smile'), st.get('op', 0))
    for sx in (-1, 1): p.ell(cx + sx * 50, 208, 32, 12, hexc('4fb03f'))
    return p.done()

def draw_mouse(st):
    p = Pen(200, 220); cx = 100
    for sx in (-1, 1): p.circ(cx + sx * 52, 60, 34, hexc('b8aeb8')); p.circ(cx + sx * 52, 60, 20, hexc('ffb7c8'), ol=None)
    p.ell(cx, 160, 62, 56, hexc('7aa7e8'))
    p.ell(cx, 105, 58, 52, hexc('b8aeb8'))
    eyes(p, cx - 22, cx + 22, 98, 13, hexc('201820'), st.get('eyes', 'open'), brow=hexc('b8aeb8'))
    p.circ(cx, 124, 8, hexc('ff8fae'), w=2)
    mouth(p, cx, 136, 20, st.get('mouth', 'smile'), st.get('op', 0))
    return p.done()

def draw_sheepkid(st):
    p = Pen(200, 230); cx = 100
    cloud_blobs(p, [(cx - 50, 160), (cx, 140), (cx + 50, 160), (cx - 30, 190), (cx + 30, 190)], 36, hexc('fbf3e1'), hexc('e8dcc2'))
    p.ell(cx, 100, 50, 56, hexc('e9dfd6'))
    cloud_blobs(p, [(cx - 26, 52), (cx + 4, 44), (cx + 30, 54)], 20, hexc('fbf3e1'), hexc('e8dcc2'))
    eyes(p, cx - 20, cx + 20, 98, 13, hexc('5a3a2a'), st.get('eyes', 'open'), lashes=True, brow=hexc('e9dfd6'))
    mouth(p, cx, 130, 20, st.get('mouth', 'smile'), st.get('op', 0))
    return p.done()

def draw_owl(st):
    p = Pen(160, 180); cx = 80
    p.ell(cx, 100, 62, 72, hexc('8a6fc9'))
    p.ell(cx, 120, 40, 46, hexc('c7b6ee'), w=3)
    for sx in (-1, 1): p.poly([(cx + sx * 30, 40), (cx + sx * 54, 10), (cx + sx * 58, 50)], hexc('8a6fc9'), w=3)
    e = st.get('eyes', 'sleepy')
    eyes(p, cx - 26, cx + 26, 80, 20, hexc('f2b134'), e if e != 'open' else 'sleepy', brow=hexc('8a6fc9'))
    m = st.get('mouth', 'smile')
    if m == 'yawn': p.ell(cx, 116, 16, 20, hexc('7a2236'))
    else: p.poly([(cx - 8, 104), (cx + 8, 104), (cx, 118)], hexc('f2b134'), w=2)
    return p.done()

def draw_sunny(st):
    p = Pen(300, 520); cx = 150
    p.line([(cx, 220), (cx, 520)], hexc('3e9c3a'), w=18)
    p.ell(cx - 56, 380, 52, 22, hexc('5cc04a')); p.ell(cx + 56, 330, 52, 22, hexc('5cc04a'))
    hx, hy = (cx + 30, 200) if st.get('var') == 'down' else (cx, 150)
    for k in range(14):
        a = 2 * math.pi * k / 14
        p.ell(hx + math.cos(a) * 90, hy + math.sin(a) * 90, 34, 34, hexc('ffcf2e'), w=3)
    p.circ(hx, hy, 78, hexc('9a5a2a'))
    eyes(p, hx - 28, hx + 28, hy - 10, 16, hexc('2a1a10'), st.get('eyes', 'open') if st.get('var') != 'down' else 'sad', brow=hexc('9a5a2a'))
    mouth(p, hx, hy + 30, 26, st.get('mouth', 'smile') if st.get('var') != 'down' else 'frown', st.get('op', 0))
    return p.done()

def draw_yflower(st):
    p = Pen(220, 300); cx = 110
    p.line([(cx, 140), (cx, 300)], hexc('3e9c3a'), w=12)
    p.ell(cx - 40, 240, 40, 16, hexc('5cc04a'))
    for k in range(8):
        a = 2 * math.pi * k / 8
        p.ell(cx + math.cos(a) * 58, 110 + math.sin(a) * 58, 30, 30, hexc('b583e6'), w=3)
    p.circ(cx, 110, 50, hexc('ffd84a'))
    eyes(p, cx - 18, cx + 18, 96, 11, hexc('2a1a10'), st.get('eyes', 'sleepy'), brow=hexc('ffd84a'))
    m = 'yawn' if st.get('op', 0) > 0.1 else st.get('mouth', 'smile')
    mouth(p, cx, 122, 22, m, st.get('op', 0))
    return p.done()

def draw_flowers(st):
    p = Pen(1900, 160)
    rnd = random.Random(5); op = st.get('var') == 'open'
    for k in range(16):
        x = 60 + k * 118 + rnd.uniform(-20, 20); col = hexc(rnd.choice(['ff6fa0', 'ffcf2e', 'b583e6', 'ff8f4a', '6fb8ff']))
        p.line([(x, 60), (x, 160)], hexc('3e9c3a'), w=8)
        if op:
            for j in range(6):
                a = 2 * math.pi * j / 6; p.circ(x + math.cos(a) * 22, 50 + math.sin(a) * 22, 15, col, w=3)
            p.circ(x, 50, 13, hexc('ffe46b'), w=3)
        else:
            p.ell(x, 48, 15, 26, col, w=3)
    return p.done()

def draw_star(st):
    p = Pen(160, 160)
    pts = []
    for k in range(10):
        a = math.radians(-90 + k * 36); r = 70 if k % 2 == 0 else 32
        pts.append((80 + math.cos(a) * r, 84 + math.sin(a) * r))
    p.poly(pts, hexc('ffe14d'), w=4)
    eyes(p, 66, 94, 80, 8, hexc('201820'), st.get('eyes', 'happy'))
    mouth(p, 80, 98, 12, 'smile', 0)
    return p.done()

def draw_shootstar(st):
    p = Pen(420, 120)
    for k in range(12): p.ell(40 + k * 24, 60, 30 - k * 2, 10 - k * 0.6, (255, 240, 180, 200 - k * 15), ol=None)
    p.d = ImageDraw.Draw(p.im)
    im = draw_star(st).resize((110, 110)); p2 = p.done(); p2.alpha_composite(im, (0, 5))
    return p2.transpose(Image.FLIP_LEFT_RIGHT)

def draw_applecl(st):
    p = Pen(150, 170)
    p.circ(75, 100, 62, hexc('e8333a')); p.line([(75, 40), (80, 14)], hexc('6b3f22'), w=8)
    p.ell(98, 22, 22, 10, hexc('5cc04a')); p.circ(75, 100, 44, hexc('fff7e0'), w=3)
    p.line([(75, 100), (75, 72)], w=5); p.line([(75, 100), (94, 108)], w=5)
    for sx in (-1, 1): p.circ(75 + sx * 40, 42, 13, hexc('d9a441'), w=3)
    return p.done()

def draw_curtain(st):
    p = Pen(420, 460)
    if st.get('var') == 'open':
        for sx in (-1, 1):
            x = 210 + sx * 180
            p.poly([(x - 34, 0), (x + 34, 0), (x + 24, 440), (x - 24, 440)], hexc('e86c8a'), w=4)
    else:
        p.poly([(10, 0), (410, 0), (400, 440), (20, 440)], hexc('e86c8a'), w=4)
        for k in range(6): p.line([(50 + k * 64, 10), (54 + k * 64, 430)], hexc('c94f6e'), w=6)
    p.rrect(0, -6, 420, 18, 8, hexc('b47b45'))
    return p.done()

def draw_tray(st):
    p = Pen(260, 170)
    var = st.get('var', '')
    if var == 'risen':
        p.ell(130, 80, 110, 76, hexc('f2d08a')); shade(p, 100, 50, 50, 26, (255, 255, 255), 90)
        for k in range(3): p.arc(130, 60 + k * 18, 70, 20, 200, 340, fill=hexc('d6a85a'), w=4)
    else:
        p.ell(130, 128, 104, 16, hexc('f2d08a'))
        for sx in (-1, 1): p.circ(130 + sx * 30, 124, 4, hexc('2a1a10'), ol=None)
        p.arc(130, 136, 14, 6, 200, 340, w=3)
    p.rrect(6, 138, 254, 160, 8, hexc('9aa2b0'))
    return p.done()

def draw_simple(kind, st):
    if kind == 'pot':
        p = Pen(160, 130); p.rrect(20, 30, 140, 120, 18, hexc('9aa2b0')); p.rrect(6, 40, 26, 60, 6, hexc('6b7280')); p.rrect(134, 40, 154, 60, 6, hexc('6b7280'))
        p.ell(80, 30, 62, 12, hexc('c3c9d4')); return p.done()
    if kind == 'lid':
        p = Pen(150, 70); p.ell(75, 44, 70, 20, hexc('c3c9d4')); p.circ(75, 22, 12, hexc('6b3f22')); return p.done()
    if kind == 'spoon':
        p = Pen(60, 180); p.line([(30, 70), (30, 175)], hexc('c48a4a'), w=12); p.ell(30, 42, 24, 36, hexc('c48a4a')); return p.done()
    if kind == 'duck':
        p = Pen(140, 120); p.ell(70, 80, 56, 36, hexc('ffd83a')); p.circ(92, 40, 28, hexc('ffd83a'))
        p.poly([(116, 40), (138, 46), (116, 54)], hexc('ff8a2a'), w=3); p.circ(98, 34, 5, hexc('15101c'), ol=None); return p.done()
    if kind == 'trumpet':
        p = Pen(220, 100); p.rrect(20, 40, 150, 58, 8, hexc('f2b134')); p.poly([(140, 49), (210, 12), (210, 88)], hexc('f2b134'), w=4)
        for k in range(3): p.rrect(50 + k * 26, 18, 62 + k * 26, 42, 4, hexc('d9952a'))
        p.rrect(6, 40, 26, 58, 6, hexc('d9952a')); return p.done()
    if kind == 'feather':
        p = Pen(80, 260); p.ell(40, 120, 26, 110, hexc('fbfaf6')); p.line([(40, 20), (40, 250)], hexc('cfc9bd'), w=4)
        for k in range(7): p.line([(40, 50 + k * 26), (18, 40 + k * 26)], hexc('e4e0d6'), w=3); p.line([(40, 50 + k * 26), (62, 40 + k * 26)], hexc('e4e0d6'), w=3)
        return p.done()
    if kind == 'funk':
        p = Pen(140, 150); p.line([(96, 50), (118, 6)], w=4); p.circ(118, 6, 6, hexc('ff5f5f'))
        p.circ(70, 92, 52, hexc('f2a65a')); p.arc(70, 92, 34, 34, 0, 300, fill=hexc('c46a2a'), w=8); p.arc(70, 92, 16, 16, 0, 300, fill=hexc('c46a2a'), w=6)
        return p.done()
    if kind == 'raytoe':
        p = Pen(120, 90); p.ell(60, 52, 48, 34, hexc('ffc94a'), w=5); p.arc(60, 52, 28, 22, 40, 300, fill=hexc('ffe48a'), w=8); return p.done()
    if kind == 'pillow':
        p = Pen(600, 200); cloud_blobs(p, [(100, 120), (200, 90), (300, 80), (400, 90), (500, 120), (300, 140)], 70, hexc('ffffff'), hexc('d8d2ec'))
        return p.done()
    raise KeyError(kind)

def draw_blanket(st):
    p = Pen(1100, 560)
    pts = [(40, 560), (60, 300), (200, 140), (550, 70), (900, 140), (1040, 300), (1060, 560)]
    p.poly(pts, hexc('ff9ec8'), w=6)
    for k in range(5): p.arc(550, 560, 120 + k * 90, 380 + k * 40, 200, 340, fill=hexc('ffc3dd'), w=10)
    for k in range(9):
        x = 140 + k * 100; y = 330 + (k % 2) * 60
        starp(p, x, y, 24, hexc('ffd84a'))
    p.rrect(20, 500, 1080, 560, 30, hexc('ffd84a'), w=5)
    return p.done()

def draw_bridge(st):
    """8 Bretter, Geländer; lit = welches Brett leuchtet (9 = alle)"""
    p = Pen(900, 300)
    cols = ['ff5f5f', 'ff9f40', 'ffd83a', '6fd65a', '35c7c2', '4f8dff', '9d6ad8', 'ff7fc0']
    lit = st.get('lit', 0)
    p.line([(30, 70), (870, 70)], hexc('8a5530'), w=14)
    for k in range(9): p.line([(30 + k * 105, 70), (30 + k * 105, 200)], hexc('8a5530'), w=12)
    for i, c in enumerate(cols):
        x0 = 75 + i * 96
        on = lit == i + 1 or lit == 9
        col = mix(hexc(c), hexc('ffffff'), 0.55) if on else hexc(c)
        p.rrect(x0, 170, x0 + 88, 250, 14, col, w=5)
        if on: p.rrect(x0 - 8, 162, x0 + 96, 258, 18, None, ol=hexc('fff5b0'), w=6)
        eyes(p, x0 + 30, x0 + 58, 200, 8, hexc('201820'), 'happy' if on else 'closed')
        mouth(p, x0 + 44, 222, 12, 'grin' if on else 'smile', 0)
    return p.done()

DRAW = {'pieks': draw_pieks, 'tupfi': draw_tupfi, 'gustav': draw_gustav, 'wuschel': draw_wuschel, 'oma': draw_oma,
        'wolle': draw_wolle, 'sola': draw_sola, 'mond': draw_mond, 'frog': draw_frog, 'mouse': draw_mouse, 'sheepkid': draw_sheepkid,
        'owl': draw_owl, 'sunny': draw_sunny, 'yflower': draw_yflower, 'flowers': draw_flowers, 'star': draw_star,
        'shootstar': draw_shootstar, 'applecl': draw_applecl, 'curtain': draw_curtain, 'tray': draw_tray, 'blanket': draw_blanket,
        'bridge': draw_bridge}

@lru_cache(maxsize=4000)
def sprite(kind, key):
    st = dict(key)
    if kind in DRAW: return DRAW[kind](st)
    return draw_simple(kind, st)

# ------------------------------------------------------------------ Hintergründe
def vgrad(w, h, top, bot, mid=None):
    im = Image.new('RGBA', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1)
        if mid:
            c = mix(top, mid, t * 2) if t < 0.5 else mix(mid, bot, (t - 0.5) * 2)
        else: c = mix(top, bot, t)
        d.line([(0, y), (w, y)], fill=c)
    return im

def stars_layer(p, n, seed, area=(0, 0, W, 700), col=(255, 255, 230)):
    r = random.Random(seed)
    for _ in range(n):
        x, y = r.uniform(area[0], area[2]), r.uniform(area[1], area[3]); s = r.choice([2, 2, 3, 4])
        p.circ(x, y, s, col + (r.randint(140, 255),), ol=None)

def hills(p, base, amp, col, seed, ol=True, step=40):
    r = random.Random(seed); pts = [(0, H)]
    ph = r.uniform(0, 6)
    for x in range(0, W + step, step):
        pts.append((x, base - amp * (0.6 * math.sin(x / 300 + ph) + 0.4 * math.sin(x / 130 + ph * 2))))
    pts.append((W, H)); p.poly(pts, col, ol=OUT if ol else None, w=4)

def house(p, x, y, s, wall, roof, night=True):
    p.rrect(x - 70 * s, y - 120 * s, x + 70 * s, y, 26 * s, wall, w=4)
    p.circ(x, y - 64 * s, 24 * s, hexc('ffd36b') if night else hexc('9fd8ff'), w=4)
    p.line([(x - 24 * s, y - 64 * s), (x + 24 * s, y - 64 * s)], w=3); p.line([(x, y - 88 * s), (x, y - 40 * s)], w=3)
    p.d.chord([p.S(x - 110 * s), p.S(y - 230 * s), p.S(x + 110 * s), p.S(y - 70 * s)], 180, 360, fill=roof, outline=OUT, width=int(p.S(4)))
    for k in range(3): p.circ(x - 50 * s + k * 50 * s, y - 175 * s + (k % 2) * 18 * s, 12 * s, hexc('ffffff', 200), ol=None)
    p.rrect(x + 40 * s, y - 230 * s, x + 64 * s, y - 180 * s, 4 * s, hexc('a06a4a'), w=3)

def mountain(p, x, base, height, wid, col, snow=False, path=True):
    pts = [(x - wid, base)]
    for k in range(21):
        t = k / 20; xx = x - wid + 2 * wid * t
        yy = base - height * (1 - abs(2 * t - 1) ** 1.6)
        pts.append((xx, yy))
    pts.append((x + wid, base)); p.poly(pts, col, w=5)
    if path:
        for k in range(6):
            yy = base - height * (0.12 + k * 0.14); ww = wid * (1 - (0.12 + k * 0.14)) ** 0.62 * 0.8
            p.arc(x, yy, ww, 24, 0, 180, fill=hexc('e9d2a6', 200), w=6)

PALETTES = {
    'night': dict(top=hexc('141a4a'), mid=hexc('2b2f78'), bot=hexc('5a3f8f'), h1=hexc('2f5d6f'), h2=hexc('24485a'), ground=hexc('2e6b4a')),
    'day': dict(top=hexc('6fc3ff'), mid=hexc('a8ddff'), bot=hexc('fff0c2'), h1=hexc('7fd36a'), h2=hexc('5cbf5a'), ground=hexc('6fcf5c')),
}

def bg_village(night=True, square=False, festival=False, title=False):
    pal = PALETTES['night' if night else 'day']
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, pal['top'], pal['bot'], pal['mid']))
    if night: stars_layer(p, 140, 1)
    else:
        for (x, y, s) in [(300, 160, 1.0), (1300, 120, 1.3), (1700, 240, 0.8)]:
            cloud_blobs(p, [(x - 60 * s, y), (x, y - 30 * s), (x + 60 * s, y), (x, y + 10 * s)], 48 * s, hexc('ffffff'), hexc('dfe9f7'))
    mountain(p, 1500, 760, 560, 420, hexc('5a6fa8') if night else hexc('9db7e8'))
    hills(p, 700, 40, mix(pal['h1'], (40, 60, 90, 255), 0.25) if night else pal['h1'], 2)
    hills(p, 800, 30, pal['h2'], 3)
    if not square:
        for i, (x, sc, wall, roof) in enumerate([(260, 0.9, 'ffe1c7', 'ff7f7f'), (560, 0.75, 'd2f2e4', '7fb8ff'), (1320, 0.85, 'fff3b0', 'ff9fd0'),
                                                 (1640, 0.8, 'ffd7e8', '8fdc7f'), (1840, 0.6, 'd8e9ff', 'ffb36b')]):
            house(p, x, 830, sc, hexc(wall), hexc(roof), night)
        # Glockenturm
        p.rrect(900, 420, 1020, 840, 10, hexc('f0e2c8'), w=5)
        p.rrect(915, 470, 1005, 560, 40, hexc('2b2f60') if night else hexc('9fd8ff'), w=4)
        p.poly([(880, 430), (1040, 430), (960, 330)], hexc('ff7f7f'), w=5)
        p.rrect(880, 372, 1040, 392, 6, hexc('b47b45'))
        p.rect = None
        hills(p, 900, 18, pal['ground'], 4)
    else:
        for i, (x, sc, wall, roof) in enumerate([(180, 1.15, 'ffe1c7', 'ff7f7f'), (560, 1.0, 'fff3b0', 'ffb36b'), (1430, 1.1, 'd2f2e4', '7fb8ff'),
                                                 (1780, 1.0, 'ffd7e8', '8fdc7f')]):
            house(p, x, 790, sc, hexc(wall), hexc(roof), night)
        p.text(560, 590, 'BÄCKEREI', 30, hexc('ffffff'), stroke=4)
        p.poly([(0, 760), (W, 760), (W, H), (0, H)], hexc('d8c4a0') if not night else hexc('6f6890'), w=0, ol=None)
        for k in range(14):
            for j in range(4): p.ell(70 + k * 140 + (j % 2) * 70, 800 + j * 75, 60, 24, hexc('c9b48c') if not night else hexc('625b82'), ol=None)
        # Schneckenbrunnen
        p.ell(1020, 860, 230, 60, hexc('9fb3c8'))
        p.ell(1020, 846, 200, 44, hexc('6fb8ff') if not night else hexc('4a6fb0'), w=3)
        p.circ(1020, 760, 70, hexc('f2b0d0')); p.arc(1020, 760, 46, 46, 0, 320, fill=hexc('d98ab0'), w=10); p.arc(1020, 760, 22, 22, 0, 320, fill=hexc('d98ab0'), w=8)
        if night:
            for x in (140, 760, 1300, 1860):
                p.line([(x, 760), (x, 560)], hexc('3a2a3f'), w=10); p.circ(x, 548, 26, hexc('ffd36b'))
        if festival:
            for row in range(2):
                pts = [(0, 140 + row * 120), (W, 140 + row * 120)]
                p.line([(x, 140 + row * 120 + 40 * math.sin(x / 300)) for x in range(0, W + 20, 20)], hexc('8a5530'), w=4)
                for k in range(24):
                    x = k * 82 + 20; y = 140 + row * 120 + 40 * math.sin(x / 300)
                    p.poly([(x - 26, y), (x + 26, y), (x, y + 50)], hexc(['ff5f5f', 'ffd83a', '6fd65a', '4f8dff', 'ff7fc0', '9d6ad8'][k % 6]), w=3)
            p.rrect(560, 380, 1360, 480, 40, hexc('fff7e0'), w=6)
            p.text(960, 430, 'Danke, Sonne!', 64, hexc('ff8a2a'), stroke=4, sfill=hexc('ffffff'))
            for x in (300, 1650):
                p.rrect(x - 130, 760, x + 130, 800, 10, hexc('c48a4a'))
                for k in range(4): p.circ(x - 90 + k * 60, 745, 26, hexc('f2d08a'))
    if title:
        pass
    return p.done()

def bg_title():
    im = bg_village(night=False)
    return im

def bg_bedroom():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('3a2f5f'), hexc('2a2448')))
    # Höhlenwand aus Wurzeln
    for k in range(9):
        p.arc(960, -200, 700 + k * 60, 520 + k * 50, 0, 180, fill=hexc('4a3a6a'), w=18)
    p.circ(1440, 420, 210, hexc('17204f'), w=12)
    stars_layer(p, 25, 9, area=(1290, 270, 1590, 570))
    p.circ(1440, 420, 210, None, ol=hexc('8a5530'), w=26)
    p.poly([(0, 860), (W, 860), (W, H), (0, H)], hexc('5a4040'), ol=None)
    for k in range(10): p.line([(k * 200, 860), (k * 200 + 60, H)], hexc('4a3434'), w=6)
    p.ell(960, 980, 520, 70, hexc('7a3f6a'), ol=None)
    # Bett
    p.rrect(380, 700, 900, 840, 40, hexc('b47b45'))
    p.rrect(400, 640, 880, 760, 50, hexc('7fb8ff'))
    for k in range(4):
        for j in range(2): p.rrect(420 + k * 115, 650 + j * 50, 520 + k * 115, 694 + j * 50, 10, hexc(['ffb3c7', 'ffe08a', 'b8f0c0', 'c9b8ff'][(k + j) % 4]), w=3)
    p.ell(470, 640, 90, 40, hexc('ffffff'))
    p.rrect(250, 700, 410, 860, 12, hexc('a06a4a'))
    # Tür rechts
    p.rrect(1720, 520, 1900, 860, 90, hexc('a06a4a'), w=6); p.circ(1750, 700, 12, hexc('ffd36b'))
    return p.done()

def bg_obs_ext():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('141a4a'), hexc('5a3f8f'), hexc('2b2f78')))
    stars_layer(p, 160, 4)
    hills(p, 820, 40, hexc('24485a'), 7)
    p.poly([(0, H), (700, 900), (1100, 640), (1300, 600), (1500, 640), (1920, 860), (1920, H)], hexc('2e6b4a'), w=5)
    p.line([(450, H), (800, 840), (1100, 720), (1250, 650)], hexc('e9d2a6', 200), w=22)
    p.rrect(1220, 380, 1400, 640, 40, hexc('f3ead6'), w=6)
    p.circ(1310, 520, 30, hexc('ffd36b'))
    p.d.chord([p.S(1000), p.S(160), p.S(1620), p.S(560)], 180, 360, fill=hexc('e8333a'), outline=OUT, width=int(p.S(6)))
    for (x, y, r) in [(1150, 300, 30), (1300, 240, 36), (1460, 300, 30), (1220, 340, 18), (1400, 340, 20)]: p.circ(x, y, r, hexc('ffffff'), ol=None)
    p.d.chord([p.S(1240), p.S(130), p.S(1380), p.S(250)], 180, 360, fill=hexc('c3c9d4'), outline=OUT, width=int(p.S(5)))
    p.poly([(1320, 170), (1500, 70), (1512, 92), (1334, 196)], hexc('d9a441'), w=5)
    return p.done()

def bg_obs_int():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('6a3f5a'), hexc('a56a5a')))
    p.circ(960, 120, 300, hexc('1d2160'), w=8); stars_layer(p, 40, 11, area=(700, 0, 1220, 300))
    for k in range(3):
        x = 120 + k * 0
    p.rrect(60, 300, 420, 860, 20, hexc('8a5530'))
    for j in range(4):
        p.line([(60, 420 + j * 120), (420, 420 + j * 120)], hexc('6b3f22'), w=10)
        for k in range(7): p.rrect(80 + k * 46, 340 + j * 120, 116 + k * 46, 412 + j * 120, 6, hexc(['e85d75', 'f2b134', '6c7ae0', '5cc04a', 'ff9fd0'][(k + j) % 5]), w=3)
    p.rrect(1620, 260, 1880, 560, 20, hexc('f3ead6'), w=5)
    for k in range(6): p.circ(1680 + (k % 3) * 70, 330 + (k // 3) * 120, 10, hexc('3f5f9a'), ol=None)
    p.line([(1680, 330), (1750, 330), (1820, 450)], hexc('3f5f9a'), w=3)
    p.poly([(0, 860), (W, 860), (W, H), (0, H)], hexc('7a4a3a'), ol=None)
    p.ell(960, 960, 600, 80, hexc('d98ab0'), ol=None)
    # Fernrohr
    p.line([(1000, 860), (1060, 660), (1120, 860)], hexc('6b3f22'), w=14)
    p.poly([(950, 560), (1250, 330), (1290, 380), (990, 610)], hexc('d9a441'), w=6)
    p.circ(1270, 352, 40, hexc('b8862a'))
    p.rrect(1220, 760, 1300, 860, 10, hexc('a06a4a')); p.ell(1260, 750, 30, 12, hexc('ffffff'))
    return p.done()

def bg_tele_view():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('141a4a'), hexc('3a3f8f')))
    stars_layer(p, 120, 12, area=(0, 0, W, H))
    cloud_blobs(p, [(x, 820 + 20 * math.sin(x / 90)) for x in range(400, 1600, 90)], 70, hexc('d8d2ec'), hexc('a99fd0'))
    mountain(p, 960, 900, 360, 360, hexc('5a6fa8'), path=False)
    cloud_blobs(p, [(760, 560), (860, 520), (960, 510), (1060, 520), (1160, 560)], 70, hexc('ffffff'), hexc('d8d2ec'))
    glow = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse([780 * SS, 300 * SS, 1140 * SS, 560 * SS], fill=(255, 210, 90, 170))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    p.im.alpha_composite(glow)
    p.poly([(760, 520), (800, 400), (960, 350), (1120, 400), (1160, 520)], hexc('ff9ec8'), w=5)
    return p.done()

def bg_mountain():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('1a1f55'), hexc('6a4a9a'), hexc('34368a')))
    stars_layer(p, 130, 5)
    mountain(p, 1180, 900, 820, 640, hexc('5a6fa8'))
    glow = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse([1080 * SS, 20 * SS, 1280 * SS, 160 * SS], fill=(255, 210, 90, 200))
    p.im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(40)))
    hills(p, 900, 25, hexc('2e6b4a'), 6)
    p.line([(250, 720), (250, 900)], hexc('8a5530'), w=14)
    p.poly([(170, 700), (390, 700), (430, 740), (390, 780), (170, 780)], hexc('c48a4a'), w=5)
    p.text(290, 740, 'Gähnberg', 30, hexc('ffffff'), stroke=3)
    for x in (80, 1700, 1850): p.ell(x, 900, 60, 40, hexc('3e7c4a'))
    return p.done()

def bg_bridge():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('1a1f55'), hexc('4a4a9a')))
    stars_layer(p, 110, 6)
    hills(p, 640, 40, hexc('24485a'), 8)
    p.poly([(0, 760), (W, 760), (W, H), (0, H)], hexc('2e6b4a'), ol=None)
    p.poly([(560, 760), (1360, 760), (1500, H), (420, H)], hexc('3fa0d8'), w=5)
    for k in range(30):
        r = random.Random(k); x = r.uniform(600, 1320); y = r.uniform(800, 1060)
        p.ell(x, y, r.uniform(10, 30), 4, hexc('ffffff', 160), ol=None)
    for x in (300, 1600):
        for k in range(4): p.ell(x - 150 + k * 100, 900 + (k % 2) * 30, 80, 40, hexc('3e9c4a'), w=3)
    p.rrect(200, 650, 360, 740, 16, hexc('c48a4a')); p.text(280, 695, ':-)', 40, hexc('ffffff'), stroke=3)
    p.line([(280, 740), (280, 800)], hexc('8a5530'), w=12)
    return p.done()

def bg_forest():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('1c1650'), hexc('4a3a8a')))
    stars_layer(p, 60, 21, area=(0, 0, W, 300))
    r = random.Random(8)
    for layer, (col, cold, sc, y0) in enumerate([(hexc('4a3f96'), hexc('3a3080'), 0.75, 780), (hexc('6a55b8'), hexc('5a46a6'), 1.0, 910)]):
        for k in range(7):
            x = k * 300 + r.uniform(-50, 50) + layer * 150 - 60
            p.rrect(x - 30 * sc, y0 - 380 * sc, x + 30 * sc, y0, 14, hexc('5a4060'), w=4)
            cy = y0 - 470 * sc
            cloud_blobs(p, [(x - 110 * sc, cy + 30 * sc), (x, cy - 20 * sc), (x + 110 * sc, cy + 30 * sc), (x, cy + 60 * sc)], 100 * sc, col, cold)
            # Blatt-Schlafmütze mit Bommel
            dr = 1 if k % 2 else -1
            tip = (x + 120 * sc * dr, cy - 60 * sc)
            p.poly([(x - 50 * sc, cy - 105 * sc), (x + 50 * sc, cy - 105 * sc), (x + 70 * sc * dr, cy - 150 * sc), tip], cold, w=4)
            p.circ(tip[0], tip[1], 18 * sc, hexc('ffffff'))
    p.poly([(0, 900), (W, 900), (W, H), (0, H)], hexc('3e5a6a'), ol=None)
    p.ell(960, 1000, 900, 60, hexc('6f8a8a'), ol=None)
    for x in (200, 700, 1300, 1750): p.ell(x, 915, 70, 26, hexc('4f8a6a'), w=3)
    return p.done()

def bg_wall():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('1a1f55'), hexc('4a4a9a')))
    stars_layer(p, 80, 13)
    p.poly([(250, H), (300, -10), (1450, -10), (1500, H)], hexc('7a7aa8'), w=6)
    for k in range(10): p.line([(330 + k * 115, 0), (320 + k * 120, 900)], hexc('8f8fbc'), w=8)
    cloud_blobs(p, [(x, 60) for x in range(200, 1700, 110)], 70, hexc('d8d2ec'), hexc('a99fd0'))
    glow = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse([800 * SS, -120 * SS, 1100 * SS, 80 * SS], fill=(255, 210, 90, 200))
    p.im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(40)))
    p.poly([(1560, 300), (1700, 300), (1720, 900), (1540, 900)], hexc('7fd0ff'), w=5)
    for k in range(8): p.line([(1580 + k * 18, 300), (1575 + k * 20, 900)], hexc('d8f2ff'), w=4)
    p.poly([(0, 900), (W, 900), (W, H), (0, H)], hexc('2e6b4a'), ol=None)
    p.ell(1630, 930, 220, 50, hexc('5fb8e8'), w=4)
    return p.done()

def bg_sky(kind):
    if kind == 'flight':
        p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('0f1240'), hexc('6a4aa8'), hexc('2a2a7a')))
        stars_layer(p, 220, 14, area=(0, 0, W, 900))
        cloud_blobs(p, [(x, 1040 + 30 * math.sin(x / 200)) for x in range(-60, W + 120, 120)], 90, hexc('c9bdf0'), hexc('9f8fd8'))
        return p.done()
    if kind == 'moonsky':
        p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('0f1240'), hexc('3a2f8a')))
        stars_layer(p, 220, 15, area=(0, 0, W, H))
        return p.done()
    if kind == 'daysky':
        p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('8fd0ff'), hexc('ffe9c2')))
        for (x, y, s) in [(300, 260, 1.2), (1500, 200, 1.0), (1700, 700, 0.8)]:
            cloud_blobs(p, [(x - 60 * s, y), (x, y - 30 * s), (x + 60 * s, y)], 50 * s, hexc('ffffff'), hexc('dfe9f7'))
        return p.done()

def bg_sunroom(day=False):
    p = Pen(W, H)
    p.im.paste(vgrad(W * SS, H * SS, hexc('3a2f7a') if not day else hexc('8fd0ff'), hexc('ffb3c7') if not day else hexc('fff0c2'),
                     hexc('a35fa8') if not day else hexc('ffd8a8')))
    if not day: stars_layer(p, 90, 16, area=(0, 0, W, 500))
    cloud_blobs(p, [(x, 900 + 25 * math.sin(x / 150)) for x in range(-80, W + 120, 130)], 110, hexc('ffffff'), hexc('e2d4f2'))
    # Bett-Kopfteil (Wolke) und Kissen
    cloud_blobs(p, [(1260 + math.cos(a) * 470, 640 + math.sin(a) * 260) for a in [math.radians(180 + k * 20) for k in range(10)]], 90,
                hexc('fdf8ff'), hexc('e2d4f2'))
    # Schild
    p.line([(1700, 420), (1760, 520)], hexc('8a5530'), w=6); p.line([(1820, 420), (1760, 520)], hexc('8a5530'), w=6)
    p.rrect(1660, 520, 1860, 600, 14, hexc('c48a4a'))
    p.text(1760, 548, 'Bitte nicht', 26, hexc('ffffff'), stroke=3); p.text(1760, 578, 'stören', 26, hexc('ffffff'), stroke=3)
    # Sternentruhe (Easter Egg)
    p.rrect(150, 720, 290, 820, 16, hexc('8a5530')); p.d.chord([p.S(150), p.S(670), p.S(290), p.S(770)], 180, 360, fill=hexc('a06a4a'), outline=OUT, width=int(p.S(4)))
    for x in (190, 250): starp(p, x, 770, 14, hexc('ffd84a'))
    p.rrect(208, 740, 232, 770, 4, hexc('ffd84a'))
    return p.done()

def bg_beach():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('9fdcff'), hexc('fff6d8')))
    p.circ(1650, 180, 90, hexc('ffe066'), ol=None)
    p.poly([(0, 560), (W, 520), (W, 760), (0, 800)], hexc('5fb8e8'), w=4)
    p.poly([(0, 780), (W, 740), (W, H), (0, H)], hexc('f5dca0'), w=4)
    for (x, c) in [(300, 'ff9a2e'), (1550, '6fd65a')]:
        p.circ(x, 600, 46, hexc('fbe0c0')); p.circ(x - 20, 590, 6, hexc('201820'), ol=None); p.circ(x + 20, 590, 6, hexc('201820'), ol=None)
        p.arc(x, 605, 18, 12, 20, 160, w=4); p.ell(x, 650, 70, 22, hexc('5fb8e8', 200), ol=None)
    p.line([(1150, 900), (1150, 640)], hexc('8a5530'), w=8)
    p.d.chord([p.S(1000), p.S(560), p.S(1300), p.S(720)], 180, 360, fill=hexc('ff7fc0'), outline=OUT, width=int(p.S(4)))
    return p.done()

def bg_sunrise(t):
    p = Pen(W, H)
    top = mix(hexc('2a2a7a'), hexc('6fc3ff'), t); mid = mix(hexc('8a4fd6'), hexc('ffd27f'), t); bot = mix(hexc('ff8fae'), hexc('fff0c2'), t)
    p.im.paste(vgrad(W * SS, H * SS, top, bot, mid))
    mountain(p, 960, 1000, 380, 700, mix(hexc('4a4f8f'), hexc('9db7e8'), t), path=False)
    cloud_blobs(p, [(x, 1000 + 25 * math.sin(x / 150)) for x in range(-80, W + 120, 130)], 90, hexc('ffffff'), hexc('f2d8e8'))
    return p.done()

def bg_evening(t):
    p = Pen(W, H)
    top = mix(hexc('ff9f6a'), hexc('141a4a'), t); mid = mix(hexc('ffb3a0'), hexc('2b2f78'), t); bot = mix(hexc('ffe0a0'), hexc('5a3f8f'), t)
    p.im.paste(vgrad(W * SS, H * SS, top, bot, mid))
    if t > 0.5: stars_layer(p, int(160 * (t - 0.5) * 2), 17)
    hills(p, 760, 40, mix(hexc('6fae6a'), hexc('2f5d6f'), t), 2)
    hills(p, 880, 30, mix(hexc('5cbf5a'), hexc('24485a'), t), 3)
    for i, (x, sc, wall, roof) in enumerate([(200, 0.6, 'ffe1c7', 'ff7f7f'), (420, 0.5, 'd2f2e4', '7fb8ff'), (1650, 0.55, 'fff3b0', 'ff9fd0')]):
        house(p, x, 860, sc, hexc(wall), hexc(roof), night=t > 0.5)
    p.poly([(0, 1000), (W, 980), (W, H), (0, H)], mix(hexc('6fcf5c'), hexc('2e6b4a'), t), w=4)
    return p.done()

def bg_endcard():
    p = Pen(W, H); p.im.paste(vgrad(W * SS, H * SS, hexc('8fd0ff'), hexc('fff0c2'), hexc('c6ecff')))
    hills(p, 820, 40, hexc('7fd36a'), 2); hills(p, 930, 30, hexc('5cbf5a'), 3)
    for x0 in (90, 1310):
        p.rrect(x0, 170, x0 + 520, 470, 30, hexc('ffffff', 150), ol=hexc('ffffff'), w=6)
    p.text(350, 520, 'Nächstes Video', 40, hexc('ffffff'), stroke=4)
    p.text(1570, 520, 'Alle Folgen', 40, hexc('ffffff'), stroke=4)
    return p.done()

BG_FUNCS = {
    'village_night': lambda: bg_village(True), 'title_day': bg_title, 'bedroom': bg_bedroom,
    'square_night': lambda: bg_village(True, square=True), 'square_day': lambda: bg_village(False, square=True),
    'festival': lambda: bg_village(False, square=True, festival=True),
    'obs_ext': bg_obs_ext, 'obs_int': bg_obs_int, 'tele_view': bg_tele_view, 'mountain': bg_mountain, 'bridge': bg_bridge,
    'forest': bg_forest, 'wall': bg_wall, 'flight': lambda: bg_sky('flight'), 'moonsky': lambda: bg_sky('moonsky'),
    'daysky': lambda: bg_sky('daysky'), 'sunroom': bg_sunroom, 'sunroom_day': lambda: bg_sunroom(True), 'beach': bg_beach,
    'endcard': bg_endcard,
}

@lru_cache(maxsize=40)
def background(name, step=None):
    if name == 'sunrise': return bg_sunrise(step / 10)
    if name == 'evening': return bg_evening(step / 10)
    return BG_FUNCS[name]().convert('RGB')

NIGHT_BG = {'village_night', 'square_night', 'bedroom', 'obs_ext', 'mountain', 'bridge', 'forest', 'wall', 'flight', 'moonsky', 'tele_view'}
