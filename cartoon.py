#!/usr/bin/env python3
"""Bunte Tier-Abenteuer – eine 2D-Zeichentrick-Animation (60 s, 1280x720, 30 fps).

Rendert alle Bilder mit Cairo, erzeugt Musik + Soundeffekte mit numpy
und setzt alles mit ffmpeg zu einem MP4 zusammen.

    pip install pycairo numpy
    python3 cartoon.py            # -> bunte_tier_abenteuer.mp4
"""
import math
import random
import subprocess
import sys
import wave
from multiprocessing import Pool

import cairo
import numpy as np

W, H, FPS = 1280, 720, 30
PI2 = 2 * math.pi
OUT = (0.12, 0.09, 0.12)


def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def shade(c, f):
    return tuple(max(0, min(1, v * f)) for v in c)


def lerp(a, b, k):
    return a + (b - a) * k


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(k):
    k = clamp(k)
    return k * k * (3 - 2 * k)


def seg(u, a, b):
    """0..1 progress of u through [a,b] (eased)."""
    return ease((u - a) / (b - a)) if b > a else float(u >= b)


C = {
    "red": hx("#ff3b3b"), "blue": hx("#2f6bff"), "pink": hx("#ff3fb4"),
    "cyan": hx("#20d3ee"), "green": hx("#4fd64a"), "yellow": hx("#ffd83a"),
    "orange": hx("#ff9a2e"), "purple": hx("#b04cff"), "grey": hx("#9aa0a8"),
    "brown": hx("#b7865a"), "white": (1, 1, 1),
}


# ---------------------------------------------------------------- primitives
def fill_stroke(ctx, col, lw=5, out=OUT):
    ctx.set_source_rgb(*col)
    ctx.fill_preserve()
    ctx.set_source_rgb(*out)
    ctx.set_line_width(lw)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()


def ellipse(ctx, x, y, rx, ry):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(max(rx, 0.01), max(ry, 0.01))
    ctx.new_sub_path()
    ctx.arc(0, 0, 1, 0, PI2)
    ctx.restore()


def rrect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def thick_line(ctx, pts, col, w, lw=5):
    """Cartoon 'tube' (e.g. trunk, tail) with outline."""
    for width, c in ((w + lw * 2, OUT), (w, col)):
        ctx.move_to(*pts[0])
        if len(pts) == 4:
            ctx.curve_to(*pts[1], *pts[2], *pts[3])
        else:
            for p in pts[1:]:
                ctx.line_to(*p)
        ctx.set_source_rgb(*c)
        ctx.set_line_width(width)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.stroke()


def shine(ctx, x, y, rx, ry, a=0.45):
    ellipse(ctx, x, y, rx, ry)
    ctx.set_source_rgba(1, 1, 1, a)
    ctx.fill()


def text(ctx, s, x, y, size, col, lw=10, anchor="c", out=OUT):
    ctx.select_font_face("DejaVu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(size)
    e = ctx.text_extents(s)
    tx = x - (e.width / 2 + e.x_bearing) if anchor == "c" else x
    ty = y - (e.height / 2 + e.y_bearing)
    ctx.move_to(tx, ty)
    ctx.text_path(s)
    ctx.set_source_rgb(*out)
    ctx.set_line_width(lw)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.stroke_preserve()
    ctx.set_source_rgb(*col)
    ctx.fill()
    return e.x_advance


def bouncy_title(ctx, s, cx, y, size, t, cols, lw=12):
    ctx.select_font_face("DejaVu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(size)
    total = ctx.text_extents(s).x_advance
    x = cx - total / 2
    for i, ch in enumerate(s):
        ctx.set_font_size(size)
        adv = ctx.text_extents(ch).x_advance
        dy = -abs(math.sin(t * 5 + i * 0.6)) * size * 0.18
        if ch != " ":
            ctx.save()
            ctx.translate(x + adv / 2, y + dy)
            ctx.rotate(math.sin(t * 4 + i) * 0.08)
            text(ctx, ch, 0, 0, size, cols[i % len(cols)], lw)
            ctx.restore()
        x += adv


def star(ctx, x, y, r, col, rot=0, lw=3):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45
        a = -math.pi / 2 + i * math.pi / 5
        (ctx.move_to if i == 0 else ctx.line_to)(math.cos(a) * rr, math.sin(a) * rr)
    ctx.close_path()
    ctx.restore()
    fill_stroke(ctx, col, lw)


def heart(ctx, x, y, s, col):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.move_to(0, 6)
    ctx.curve_to(-14, -4, -8, -16, 0, -8)
    ctx.curve_to(8, -16, 14, -4, 0, 6)
    ctx.close_path()
    ctx.restore()
    fill_stroke(ctx, col, 3)


def sparkles(ctx, cx, cy, u, n=10, rad=140, seed=1):
    rnd = random.Random(seed)
    cols = [C["yellow"], C["white"], C["cyan"], C["pink"]]
    for i in range(n):
        a = rnd.uniform(0, PI2)
        ph = (u * 1.4 + rnd.random()) % 1.0
        r = rad * (0.4 + 0.8 * ph)
        s = 14 * math.sin(math.pi * ph)
        if s > 1:
            star(ctx, cx + math.cos(a) * r, cy + math.sin(a) * r * 0.8, s, cols[i % 4], u * 3 + i, 2.5)


# ---------------------------------------------------------------- background
CLOUDS = [(150, 90, 1.0), (520, 60, 0.8), (900, 110, 1.2), (1250, 70, 0.9)]


def background(ctx, t, horizon=330, sea=True):
    g = cairo.LinearGradient(0, 0, 0, horizon)
    g.add_color_stop_rgb(0, *hx("#38b6ff"))
    g.add_color_stop_rgb(1, *hx("#c7f0ff"))
    ctx.rectangle(0, 0, W, horizon + 2)
    ctx.set_source(g)
    ctx.fill()
    # sun
    ctx.save()
    ctx.translate(1120, 90)
    ctx.rotate(t * 0.3)
    for i in range(12):
        ctx.rotate(PI2 / 12)
        ctx.move_to(52, -8)
        ctx.line_to(78, 0)
        ctx.line_to(52, 8)
        ctx.close_path()
        fill_stroke(ctx, C["yellow"], 3)
    ctx.restore()
    ellipse(ctx, 1120, 90, 48, 48)
    fill_stroke(ctx, hx("#ffe14d"), 4)
    # sun face
    for ex in (-15, 15):
        ellipse(ctx, 1120 + ex, 82, 4, 6)
        ctx.set_source_rgb(*OUT)
        ctx.fill()
    ctx.arc(1120, 95, 16, 0.2, math.pi - 0.2)
    ctx.set_line_width(4)
    ctx.stroke()
    # clouds
    for cx, cy, s in CLOUDS:
        x = (cx + t * 18 * s) % (W + 300) - 150
        ctx.save()
        ctx.translate(x, cy)
        ctx.scale(s, s)
        for dx, dy, r in ((-45, 8, 30), (-10, -12, 40), (35, 2, 32), (0, 14, 30)):
            ctx.new_sub_path()
            ctx.arc(dx, dy, r, 0, PI2)
        ctx.restore()
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(8)
        ctx.stroke_preserve()
        ctx.set_source_rgb(1, 1, 1)
        ctx.fill()
    # distant islands + trees
    for ix, iw in ((-60, 380), (420, 260), (860, 420)):
        ellipse(ctx, ix + iw / 2, horizon + 4, iw / 2, 30)
        fill_stroke(ctx, hx("#5cd65c"), 4)
    for tx_, tc in ((90, "#2fa84f"), (230, "#ff7a3d"), (520, "#2fa84f"), (980, "#2fa84f"), (1110, "#ffb02e")):
        ctx.rectangle(tx_ - 5, horizon - 40, 10, 40)
        fill_stroke(ctx, C["brown"], 3)
        ellipse(ctx, tx_, horizon - 52, 26, 30)
        fill_stroke(ctx, hx(tc), 4)
    if sea:
        g = cairo.LinearGradient(0, horizon, 0, H)
        g.add_color_stop_rgb(0, *hx("#2b8cff"))
        g.add_color_stop_rgb(1, *hx("#1250c4"))
        ctx.rectangle(0, horizon + 10, W, H)
        ctx.set_source(g)
        ctx.fill()
        ctx.set_source_rgba(1, 1, 1, 0.7)
        ctx.set_line_width(3)
        rnd = random.Random(7)
        for i in range(26):
            y = horizon + 25 + (i % 13) * 30
            x = (rnd.uniform(0, W) + t * 25 * (1 + i % 3)) % (W + 80) - 40
            ctx.move_to(x, y)
            ctx.curve_to(x + 10, y - 6, x + 20, y - 6, x + 30, y)
            ctx.stroke()


def tiled_floor(ctx, y0, y1, col1, col2, grid=60, x0=0, x1=W):
    ctx.rectangle(x0, y0, x1 - x0, y1 - y0)
    ctx.set_source_rgb(*col1)
    ctx.fill()
    ctx.set_source_rgb(*col2)
    ctx.set_line_width(2)
    rows = int((y1 - y0) / 28) + 1
    for r in range(rows):
        y = y0 + r * 28
        ctx.move_to(x0, y)
        ctx.line_to(x1, y)
        ctx.stroke()
        off = (r % 2) * grid / 2
        x = x0 + off
        while x < x1:
            ctx.move_to(x, y)
            ctx.line_to(x, min(y + 28, y1))
            ctx.stroke()
            x += grid
    ctx.rectangle(x0, y0, x1 - x0, y1 - y0)
    ctx.set_source_rgb(*OUT)
    ctx.set_line_width(5)
    ctx.stroke()


def brick_wall(ctx, x0, y0, w, h, col=hx("#d9654a")):
    ctx.rectangle(x0, y0, w, h)
    ctx.set_source_rgb(*col)
    ctx.fill()
    ctx.set_source_rgb(*shade(col, 0.7))
    ctx.set_line_width(2)
    bh, bw = 22, 54
    r = 0
    y = y0
    while y < y0 + h:
        ctx.move_to(x0, y)
        ctx.line_to(x0 + w, y)
        ctx.stroke()
        x = x0 + (bw / 2 if r % 2 else 0)
        while x < x0 + w:
            ctx.move_to(x, y)
            ctx.line_to(x, min(y + bh, y0 + h))
            ctx.stroke()
            x += bw
        y += bh
        r += 1
    ctx.rectangle(x0, y0, w, h)
    ctx.set_source_rgb(*OUT)
    ctx.set_line_width(5)
    ctx.stroke()


# ---------------------------------------------------------------- characters
def dino(ctx, x, y, s, col, t, spots=None, walk=0.0, facing=1, squash=1.0, mouth=0.0,
         sitting=False, key=None, eyes="happy"):
    """Cartoon T-Rex. (x, y) = point between the feet."""
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * facing * (2 - squash) ** 0.5, s * squash)
    dark = shade(col, 0.72)
    ph = t * 9 * walk
    sw = math.sin(ph) * 0.55 * min(walk, 1)
    bob = -abs(math.sin(ph)) * 6 * min(walk, 1)
    ctx.translate(0, bob)

    def leg(ang, c):
        ctx.save()
        ctx.translate(0, -70)
        if sitting:
            ctx.rotate(-1.1 + ang * 0.4)
        else:
            ctx.rotate(ang)
        rrect(ctx, -14, -5, 28, 72, 13)
        fill_stroke(ctx, c, 5)
        ellipse(ctx, 10, 66, 22, 10)
        fill_stroke(ctx, c, 5)
        ctx.restore()

    ctx.save()
    ctx.translate(-18, 0)
    leg(-sw, dark)
    ctx.restore()
    # tail
    tw = math.sin(t * 4) * 10
    ctx.move_to(-40, -120)
    ctx.curve_to(-110, -115, -150, -80 + tw, -185, -70 + tw)
    ctx.curve_to(-150, -60 + tw, -100, -60, -40, -72)
    ctx.close_path()
    fill_stroke(ctx, col, 5)
    # back spikes
    for i, (sx, sy) in enumerate(((-90, -110), (-55, -136), (-15, -148), (25, -150))):
        ctx.move_to(sx - 13, sy + 8)
        ctx.line_to(sx, sy - 18)
        ctx.line_to(sx + 13, sy + 8)
        ctx.close_path()
        fill_stroke(ctx, spots or C["yellow"], 4)
    # body
    ellipse(ctx, 0, -100, 68, 52)
    fill_stroke(ctx, col, 5)
    ellipse(ctx, 18, -86, 36, 32)
    ctx.set_source_rgba(1, 1, 1, 0.35)
    ctx.fill()
    if spots:
        for sx, sy, r in ((-35, -118, 13), (-8, -132, 9), (-48, -88, 9), (-20, -95, 7)):
            ellipse(ctx, sx, sy, r, r * 0.85)
            fill_stroke(ctx, spots, 3)
    shine(ctx, -20, -130, 22, 10)
    ctx.save()
    ctx.translate(18, 0)
    leg(sw, col)
    ctx.restore()
    # little arm
    ctx.save()
    ctx.translate(52, -110)
    ctx.rotate(0.6 + math.sin(t * 6) * 0.25)
    rrect(ctx, -6, 0, 12, 34, 6)
    fill_stroke(ctx, col, 4)
    ctx.restore()
    # neck + head
    ctx.move_to(30, -140)
    ctx.curve_to(45, -175, 75, -180, 85, -160)
    ctx.line_to(60, -110)
    ctx.close_path()
    fill_stroke(ctx, col, 5)
    ctx.save()
    ctx.translate(78, -190)
    ctx.rotate(-0.08 + math.sin(t * 3) * 0.04)
    # jaw
    ctx.save()
    ctx.rotate(mouth * 0.5)
    rrect(ctx, -10, 8, 88, 24, 12)
    fill_stroke(ctx, col, 5)
    ctx.restore()
    # skull
    ctx.move_to(-38, 10)
    ctx.curve_to(-42, -35, 10, -48, 55, -32)
    ctx.curve_to(95, -20, 98, 5, 90, 18)
    ctx.line_to(-30, 22)
    ctx.close_path()
    fill_stroke(ctx, col, 5)
    if mouth > 0.05:
        for i in range(5):
            tx_ = 15 + i * 14
            ctx.move_to(tx_, 18)
            ctx.line_to(tx_ + 6, 28)
            ctx.line_to(tx_ + 12, 18)
            ctx.close_path()
            fill_stroke(ctx, (1, 1, 1), 2)
    else:
        ctx.move_to(30, 16)
        ctx.curve_to(50, 26, 70, 24, 88, 14)
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(4)
        ctx.stroke()
    ellipse(ctx, 82, -10, 3, 3)
    ctx.set_source_rgb(*OUT)
    ctx.fill()
    shine(ctx, 20, -32, 20, 7)
    # eye
    ellipse(ctx, 18, -14, 20, 22)
    fill_stroke(ctx, (1, 1, 1), 4)
    blink = (t % 3.1) < 0.12
    if eyes == "dizzy":
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(4)
        for a in range(0, 540, 30):
            r = a / 540 * 13
            aa = math.radians(a) + t * 10
            (ctx.move_to if a == 0 else ctx.line_to)(22 + math.cos(aa) * r, -12 + math.sin(aa) * r)
        ctx.stroke()
    elif blink:
        ctx.move_to(4, -12)
        ctx.line_to(34, -12)
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(5)
        ctx.stroke()
    else:
        ellipse(ctx, 25, -12, 10, 12)
        ctx.set_source_rgb(*OUT)
        ctx.fill()
        ellipse(ctx, 28, -17, 4, 4)
        ctx.set_source_rgb(1, 1, 1)
        ctx.fill()
    if eyes == "scared":
        ctx.move_to(0, -44)
        ctx.line_to(34, -38)
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(5)
        ctx.stroke()
    if key is not None:
        ctx.save()
        ctx.translate(92, 18)
        draw_key(ctx, 0, 0, key, 0.8, rot=0.0)
        ctx.restore()
    ctx.restore()
    ctx.restore()


def elephant(ctx, x, y, s, col, t, walk=0.0, facing=1, squash=1.0, spots=None, eyes="happy", trunk_up=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s * facing * (2 - squash) ** 0.5, s * squash)
    dark = shade(col, 0.75)
    ph = t * 7 * walk
    bob = -abs(math.sin(ph)) * 5 * min(walk, 1)
    ctx.translate(0, bob)

    def leg(lx, ang, c):
        ctx.save()
        ctx.translate(lx, -70)
        ctx.rotate(ang)
        rrect(ctx, -18, -10, 36, 82, 14)
        fill_stroke(ctx, c, 5)
        for k in (-9, 0, 9):
            ellipse(ctx, k, 66, 4, 3)
            ctx.set_source_rgb(1, 1, 1)
            ctx.fill()
        ctx.restore()

    sw = math.sin(ph) * 0.35 * min(walk, 1)
    leg(-55, sw, dark)
    leg(40, -sw, dark)
    # tail
    thick_line(ctx, [(-100, -120), (-125, -110), (-130, -90), (-128, -70)], col, 7, 4)
    ellipse(ctx, -128, -66, 7, 9)
    fill_stroke(ctx, OUT, 2)
    ellipse(ctx, 0, -120, 105, 70)
    fill_stroke(ctx, col, 5)
    if spots:
        for sx, sy, r in ((-50, -140, 16), (-15, -160, 11), (-60, -100, 11), (10, -118, 14), (-30, -95, 8)):
            ellipse(ctx, sx, sy, r, r * 0.85)
            fill_stroke(ctx, spots, 3)
    shine(ctx, -25, -165, 40, 12)
    leg(-30, -sw, col)
    leg(65, sw, col)
    # head
    ellipse(ctx, 100, -150, 58, 55)
    fill_stroke(ctx, col, 5)
    # ear
    ew = 1 + math.sin(t * 5) * 0.08
    ellipse(ctx, 70, -150, 38 * ew, 50)
    fill_stroke(ctx, shade(col, 0.88), 5)
    ellipse(ctx, 72, -150, 24 * ew, 34)
    ctx.set_source_rgba(1, 0.6, 0.75, 0.6)
    ctx.fill()
    # tusk
    ctx.move_to(130, -118)
    ctx.curve_to(150, -100, 165, -105, 172, -118)
    ctx.curve_to(160, -108, 148, -112, 140, -122)
    ctx.close_path()
    fill_stroke(ctx, (1, 1, 0.95), 4)
    # trunk
    sway = math.sin(t * 3) * 10
    tu = trunk_up
    end = (lerp(150, 200, tu) + sway * 0.4, lerp(-40, -230, tu))
    thick_line(ctx, [(140, -140), (175, lerp(-120, -170, tu)), (lerp(170, 210, tu) + sway, lerp(-80, -210, tu)), end],
               col, 26, 5)
    # eye
    ellipse(ctx, 118, -168, 13, 15)
    fill_stroke(ctx, (1, 1, 1), 4)
    if (t % 2.7) < 0.12:
        ctx.move_to(106, -166)
        ctx.line_to(130, -166)
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(4)
        ctx.stroke()
    else:
        ellipse(ctx, 122, -166, 7, 9)
        ctx.set_source_rgb(*OUT)
        ctx.fill()
        ellipse(ctx, 124, -170, 3, 3)
        ctx.set_source_rgb(1, 1, 1)
        ctx.fill()
    if eyes == "sad":
        ctx.move_to(104, -190)
        ctx.line_to(132, -196)
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(4)
        ctx.stroke()
        ellipse(ctx, 116, -146, 4, 7)
        ctx.set_source_rgb(*hx("#5fc8ff"))
        ctx.fill()
    ellipse(ctx, 130, -140, 10, 6)
    ctx.set_source_rgba(1, 0.4, 0.6, 0.5)
    ctx.fill()
    ctx.restore()


# ---------------------------------------------------------------- props
def dome(ctx, x, y, col, lift=0.0, wob=0.0, face=True, w=110, h=230):
    """Colour-change dome with a cute cheeky face."""
    ctx.save()
    ctx.translate(x, y - lift)
    sx = 1 + wob * 0.12
    ctx.scale(sx, 2 - sx)
    ctx.move_to(-w, 0)
    ctx.curve_to(-w * 1.02, -h * 0.75, -w * 0.55, -h, 0, -h)
    ctx.curve_to(w * 0.55, -h, w * 1.02, -h * 0.75, w, 0)
    ctx.close_path()
    fill_stroke(ctx, col, 6)
    # drip pattern
    ctx.save()
    ctx.move_to(-w, 0)
    ctx.curve_to(-w * 1.02, -h * 0.75, -w * 0.55, -h, 0, -h)
    ctx.curve_to(w * 0.55, -h, w * 1.02, -h * 0.75, w, 0)
    ctx.close_path()
    ctx.clip()
    ctx.set_source_rgba(1, 1, 1, 0.35)
    ctx.set_line_width(4)
    for i in range(-5, 6):
        xx = i * 22
        ctx.move_to(xx, -h)
        ctx.curve_to(xx + 8, -h * 0.6, xx - 8, -h * 0.4, xx + 4, 0)
        ctx.stroke()
    ctx.restore()
    shine(ctx, -w * 0.45, -h * 0.72, 16, 36, 0.5)
    if face:
        for sgn in (-1, 1):
            ctx.save()
            ctx.translate(sgn * 40, -h * 0.55)
            ctx.scale(sgn, 1)
            ctx.move_to(-28, -14)
            ctx.curve_to(-10, -30, 25, -12, 28, 10)
            ctx.curve_to(5, 22, -30, 14, -28, -14)
            ctx.close_path()
            fill_stroke(ctx, (1, 1, 1), 5)
            ellipse(ctx, 6, 0, 9, 10)
            ctx.set_source_rgb(*OUT)
            ctx.fill()
            ellipse(ctx, 9, -4, 3, 3)
            ctx.set_source_rgb(1, 1, 1)
            ctx.fill()
            ctx.restore()
        ctx.arc(0, -h * 0.32, 26, 0.25, math.pi - 0.25)
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(5)
        ctx.stroke()
    ctx.restore()
    ellipse(ctx, x, y + 2, w * 0.9 * (1 - min(lift, 200) / 400), 10)
    ctx.set_source_rgba(0, 0, 0, 0.18)
    ctx.fill()


def tricycle(ctx, x, y, s, t, spin):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    for wx, r in ((-55, 30), (70, 42)):
        ellipse(ctx, wx, -r, r, r)
        fill_stroke(ctx, hx("#333333"), 5)
        ellipse(ctx, wx, -r, r * 0.6, r * 0.6)
        fill_stroke(ctx, hx("#dddddd"), 4)
        ctx.save()
        ctx.translate(wx, -r)
        ctx.rotate(spin * 60 / r)
        ctx.set_source_rgb(*OUT)
        ctx.set_line_width(3)
        for k in range(4):
            ctx.move_to(0, 0)
            ctx.line_to(r * 0.6 * math.cos(k * math.pi / 2), r * 0.6 * math.sin(k * math.pi / 2))
            ctx.stroke()
        ctx.restore()
    thick_line(ctx, [(-55, -30), (0, -55), (70, -42)], C["blue"], 12, 4)
    thick_line(ctx, [(50, -90), (70, -42)], C["blue"], 12, 4)
    thick_line(ctx, [(40, -95), (65, -95)], hx("#444444"), 8, 3)
    rrect(ctx, -30, -72, 50, 16, 8)
    fill_stroke(ctx, C["blue"], 4)
    ctx.restore()


def glove_post(ctx, px, arm_y, path_y, punch):
    # post behind path
    rrect(ctx, px - 70, arm_y - 30, 34, path_y - arm_y + 30, 12)
    fill_stroke(ctx, hx("#555b66"), 5)
    rrect(ctx, px - 75, arm_y - 10, 85, 22, 10)
    fill_stroke(ctx, C["blue"], 5)
    gy = arm_y + 20 + punch * (path_y - arm_y - 140)
    # spring arm
    ctx.set_source_rgb(*OUT)
    ctx.set_line_width(5)
    n = 8
    for i in range(n + 1):
        yy = arm_y + 10 + (gy - arm_y - 10) * i / n
        xx = px + (12 if i % 2 else -12)
        (ctx.move_to if i == 0 else ctx.line_to)(xx, yy)
    ctx.stroke()
    # glove
    ctx.save()
    ctx.translate(px, gy + 50)
    rrect(ctx, -25, -55, 50, 30, 8)
    fill_stroke(ctx, (1, 1, 1), 5)
    ellipse(ctx, 0, 0, 46, 42)
    fill_stroke(ctx, hx("#e8252b"), 5)
    ellipse(ctx, -36, -6, 16, 22)
    fill_stroke(ctx, hx("#e8252b"), 5)
    shine(ctx, 12, -14, 18, 10, 0.5)
    ctx.move_to(-10, 20)
    ctx.curve_to(0, 28, 15, 28, 25, 18)
    ctx.set_source_rgb(*OUT)
    ctx.set_line_width(4)
    ctx.stroke()
    ctx.restore()
    return gy + 92  # bottom of glove


def stone_path(ctx, y, x0=-10, x1=W + 10):
    rrect(ctx, x0, y, x1 - x0, 46, 6)
    fill_stroke(ctx, hx("#e9e6e0"), 5)
    ctx.set_source_rgb(*hx("#c9c4bb"))
    ctx.set_line_width(2)
    x = x0
    while x < x1:
        ctx.move_to(x, y + 4)
        ctx.line_to(x, y + 42)
        ctx.stroke()
        x += 70
    brick_wall(ctx, x0, y + 46, x1 - x0, 50, hx("#c96d4f"))


def draw_key(ctx, x, y, col, s=1.0, rot=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(s, s)
    rrect(ctx, 0, -6, 70, 12, 5)
    fill_stroke(ctx, col, 4)
    for kx in (48, 60):
        ctx.rectangle(kx, 4, 8, 14)
        fill_stroke(ctx, col, 4)
    ellipse(ctx, -14, 0, 20, 20)
    fill_stroke(ctx, col, 4)
    ellipse(ctx, -14, 0, 8, 8)
    fill_stroke(ctx, (1, 1, 1), 3)
    ctx.restore()


def key_stand(ctx, x, floor, col, has_key, t):
    ellipse(ctx, x, floor, 40, 12)
    fill_stroke(ctx, hx("#9aa0a8"), 4)
    rrect(ctx, x - 6, floor - 120, 12, 120, 5)
    fill_stroke(ctx, hx("#c0c4ca"), 4)
    if has_key:
        draw_key(ctx, x, floor - 150 + math.sin(t * 3 + x) * 4, col, 0.9, -math.pi / 2)


def cage(ctx, x0, floor, w, h, open_k, lock_col, inner_fn):
    rrect(ctx, x0, floor - h, w, h, 6)
    fill_stroke(ctx, hx("#f2f2f2"), 5)
    # tiles inside
    ctx.save()
    ctx.rectangle(x0, floor - h, w, h)
    ctx.clip()
    ctx.set_source_rgb(*hx("#d8dde3"))
    ctx.set_line_width(2)
    for i in range(0, int(w), 30):
        ctx.move_to(x0 + i, floor - h)
        ctx.line_to(x0 + i, floor)
        ctx.stroke()
    for j in range(0, int(h), 30):
        ctx.move_to(x0, floor - h + j)
        ctx.line_to(x0 + w, floor - h + j)
        ctx.stroke()
    ctx.restore()
    inner_fn()
    # bars (portcullis)
    ctx.save()
    ctx.rectangle(x0, floor - h, w, h)
    ctx.clip()
    oy = -open_k * (h - 20)
    for i in range(1, 9):
        bx = x0 + w * i / 9
        rrect(ctx, bx - 5, floor - h + oy, 10, h, 4)
        fill_stroke(ctx, hx("#8f99a6"), 3)
    rrect(ctx, x0, floor - h * 0.55 + oy, w, 14, 5)
    fill_stroke(ctx, hx("#8f99a6"), 3)
    ctx.restore()
    rrect(ctx, x0 - 10, floor - h - 22, w + 20, 26, 6)
    fill_stroke(ctx, C["green"], 5)
    rrect(ctx, x0 - 14, floor - h, 18, h, 5)
    fill_stroke(ctx, C["green"], 5)
    rrect(ctx, x0 + w - 4, floor - h, 18, h, 5)
    fill_stroke(ctx, C["green"], 5)


def padlock(ctx, x, y, col, open_k, fall):
    ctx.save()
    ctx.translate(x, y + fall)
    ctx.rotate(fall / 200)
    ctx.arc(0, -22 - open_k * 18, 16, math.pi, 0)
    ctx.set_source_rgb(*OUT)
    ctx.set_line_width(13)
    ctx.stroke()
    ctx.arc(0, -22 - open_k * 18, 16, math.pi, 0)
    ctx.set_source_rgb(*hx("#c0c4ca"))
    ctx.set_line_width(6)
    ctx.stroke()
    rrect(ctx, -24, -24, 48, 44, 8)
    fill_stroke(ctx, col, 5)
    ellipse(ctx, 0, -4, 6, 6)
    ctx.set_source_rgb(*OUT)
    ctx.fill()
    ctx.rectangle(-2, -2, 4, 12)
    ctx.fill()
    ctx.restore()


def spring_pad(ctx, x, floor, col, comp):
    top = floor - 130 + comp * 60
    ctx.set_source_rgb(*OUT)
    ctx.set_line_width(7)
    n = 9
    for i in range(n + 1):
        yy = floor - 6 - (floor - 6 - top) * i / n
        xx = x + (38 if i % 2 else -38)
        (ctx.move_to if i == 0 else ctx.line_to)(xx, yy)
    ctx.stroke()
    ellipse(ctx, x, floor, 55, 12)
    fill_stroke(ctx, hx("#888888"), 4)
    ellipse(ctx, x, top + 10, 80, 14)
    fill_stroke(ctx, shade(col, 0.7), 5)
    ellipse(ctx, x, top, 80, 16)
    fill_stroke(ctx, col, 5)
    return top


def ball(ctx, x, y, r, col):
    ellipse(ctx, x, y, r, r)
    fill_stroke(ctx, col, 4)
    for a in range(0, 360, 72):
        ellipse(ctx, x + math.cos(math.radians(a)) * r * 0.55, y + math.sin(math.radians(a)) * r * 0.55, r * 0.18, r * 0.18)
        ctx.set_source_rgb(*OUT)
        ctx.fill()
    shine(ctx, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.2, 0.6)


def bomb(ctx, x, y, fuse_k, t, scale=1.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    flen = 80 * (1 - fuse_k)
    fx, fy = 30 + flen * 0.5, -70 - flen * 0.7
    thick_line(ctx, [(20, -60), (fx, fy)], hx("#c9a36b"), 6, 3)
    rrect(ctx, 5, -78, 30, 22, 5)
    fill_stroke(ctx, hx("#555555"), 4)
    ellipse(ctx, 0, 0, 62, 62)
    fill_stroke(ctx, hx("#25252b"), 5)
    shine(ctx, -24, -26, 18, 12, 0.5)
    for ex in (-20, 20):
        ellipse(ctx, ex, -5, 12, 14)
        fill_stroke(ctx, (1, 1, 1), 3)
        ellipse(ctx, ex + 3, -3, 5, 6)
        ctx.set_source_rgb(*OUT)
        ctx.fill()
    ctx.arc(0, 18, 20, 0.2, math.pi - 0.2)
    ctx.set_source_rgb(1, 1, 1)
    ctx.set_line_width(5)
    ctx.stroke()
    if fuse_k < 1:
        for i in range(6):
            a = t * 20 + i
            r = 12 + 8 * math.sin(t * 30 + i)
            star(ctx, fx + math.cos(a) * r * 0.5, fy + math.sin(a) * r * 0.5, 9, C["yellow"] if i % 2 else C["orange"], a, 2)
    ctx.restore()


def burger(ctx, x, y, s):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    rrect(ctx, -60, -22, 120, 24, 12)
    fill_stroke(ctx, hx("#e8a64a"), 4)
    rrect(ctx, -64, -40, 128, 20, 8)
    fill_stroke(ctx, hx("#6b3a1f"), 4)
    ctx.move_to(-66, -42)
    for i in range(9):
        ctx.line_to(-66 + i * 16.5 + 8, -30 if i % 2 else -52)
    ctx.line_to(66, -42)
    fill_stroke(ctx, hx("#ffd23a"), 3)
    rrect(ctx, -68, -56, 136, 14, 7)
    fill_stroke(ctx, hx("#4fd64a"), 4)
    ctx.move_to(-62, -56)
    ctx.curve_to(-62, -120, 62, -120, 62, -56)
    ctx.close_path()
    fill_stroke(ctx, hx("#f0b050"), 5)
    for sx, sy in ((-30, -80), (0, -92), (28, -78), (-10, -70), (40, -66)):
        ellipse(ctx, sx, sy, 5, 3)
        ctx.set_source_rgb(1, 1, 0.9)
        ctx.fill()
    ctx.restore()


# ---------------------------------------------------------------- scenes
def scene_intro(ctx, u, t):
    background(ctx, t)
    tiled_floor(ctx, 560, H, hx("#f6dcc8"), hx("#e3bfa6"))
    for i, (dx, col) in enumerate(((160, "green"), (380, "yellow"), (900, "pink"), (1120, "cyan"))):
        dome(ctx, dx, 600, C[col], wob=math.sin(t * 6 + i) * 0.4)
    pop = max(seg(u, 0.0, 0.6), 0.01)
    ctx.save()
    ctx.translate(W / 2, 250)
    ctx.scale(pop * (1 + 0.1 * math.sin(u * 8) * (1 - seg(u, 0.6, 1.5))), pop)
    bouncy_title(ctx, "Bunte Tier-", 0, -60, 96, t, [C["red"], C["yellow"], C["green"], C["cyan"], C["pink"], C["orange"], C["purple"]])
    bouncy_title(ctx, "Abenteuer!", 0, 60, 110, t + 1, [C["orange"], C["blue"], C["pink"], C["yellow"], C["green"], C["red"]])
    ctx.restore()
    dino(ctx, lerp(-200, 470, seg(u, 0.8, 2.4)), 690, 0.75, C["green"], t, spots=C["yellow"],
         walk=1 if 0.8 < u < 2.4 else 0, mouth=0.6 * (u > 2.6))
    elephant(ctx, lerp(W + 250, 820, seg(u, 1.2, 2.8)), 690, 0.75, C["grey"], t,
             walk=1 if 1.2 < u < 2.8 else 0, facing=-1, trunk_up=seg(u, 2.8, 3.4))


DOME_X = [190, 390, 640, 890, 1090]
DOME_C = ["green", "yellow", "pink", "cyan", "orange"]


def colour_change(ctx, u, t, animal, idx, before, after, label):
    """Animal walks under dome idx, gets a new colour, hops away."""
    background(ctx, t)
    brick_wall(ctx, 0, 300, W, 150)
    for i, c in enumerate(DOME_C):
        rrect(ctx, 60 + i * 240, 320, 120, 70, 6)
        fill_stroke(ctx, C[c], 4)
    tiled_floor(ctx, 450, H, hx("#f6dcc8"), hx("#e3bfa6"))
    floor = 640
    dx = DOME_X[idx]
    # dome motion
    lift = 0.0
    lift += 300 * seg(u, 2.6, 3.1) - 300 * seg(u, 3.3, 3.7)        # up, then drop
    lift += 300 * seg(u, 5.4, 5.8) - 300 * seg(u, 7.0, 7.4)        # reveal, then back
    wob = math.sin(u * 30) * (seg(u, 3.7, 3.9) - seg(u, 5.2, 5.4))
    for i, c in enumerate(DOME_C):
        if i != idx:
            dome(ctx, DOME_X[i], floor, C[c], wob=math.sin(t * 5 + i) * 0.15)
    # animal
    walking_in = u < 2.6
    x = lerp(-220, dx - 10, seg(u, 0.0, 2.6) if False else clamp(u / 2.6))
    hop = 0.0
    if u >= 5.8:
        x = lerp(dx - 10, 1500, clamp((u - 6.3) / 3.0)) if u > 6.3 else dx - 10
        k = (u - 5.8) / 0.5
        hop = abs(math.sin(math.pi * k)) * 90 if u < 6.3 + 3 else 0
    changed = u >= 5.0
    col, spots = after if changed else before
    walk = 1.0 if (walking_in or u > 6.3) else 0.0
    sq = 1.0
    if 5.8 <= u < 6.3:
        sq = 1 - 0.25 * math.sin(math.pi * (u - 5.8) / 0.5) * (1 if hop < 20 else -0.6)
    animal(ctx, x, floor - hop, col, spots, t, walk, sq, u)
    dome(ctx, dx, floor, C[DOME_C[idx]], lift=lift, wob=wob)
    if 3.7 < u < 5.4:
        sparkles(ctx, dx, floor - 130, u, 14, 160, seed=idx)
        text(ctx, "Plopp!" if u < 4.4 else "Zauber!", dx, floor - 300 - 10 * math.sin(u * 10), 54, C["yellow"], 8)
    if 5.8 < u < 7.5:
        sparkles(ctx, x, floor - 120, u, 10, 130, seed=3)
        text(ctx, label, W / 2, 110, 76, after[0], 10)


def dino_actor(ctx, x, y, col, spots, t, walk, sq, u):
    dino(ctx, x, y, 0.8, col, t, spots=spots, walk=walk, squash=sq, mouth=0.7 if 5.8 < u < 7.0 else 0)


def elephant_actor(ctx, x, y, col, spots, t, walk, sq, u):
    elephant(ctx, x, y, 0.62, col, t, walk=walk, squash=sq, spots=spots, trunk_up=1.0 if 5.8 < u < 7.5 else 0)


def scene_dome_dino(ctx, u, t):
    colour_change(ctx, u, t, dino_actor, 2, (C["grey"], None), (C["pink"], C["blue"]), "Pinker Dino!")


def scene_dome_elephant(ctx, u, t):
    colour_change(ctx, u, t, elephant_actor, 3, (C["grey"], None), (C["purple"], C["cyan"]), "Lila Elefant!")


def punch_curve(u, t0, hold=0.3):
    if u < t0:
        return 0.0
    k = u - t0
    if k < 0.18:
        return ease(k / 0.18)
    if k < 0.18 + hold:
        return 1.0
    return 1 - ease((k - 0.18 - hold) / 0.45)


G1, G2 = 470, 860


def ride_x(u):
    pts = [(0, -180), (1.8, 330), (2.9, 330), (4.3, 720), (5.3, 845), (7.3, 845), (10, 1500)]
    for (a, xa), (b, xb) in zip(pts, pts[1:]):
        if u <= b:
            return lerp(xa, xb, (u - a) / (b - a))
    return pts[-1][1]


def scene_path(ctx, u, t):
    background(ctx, t, horizon=300)
    path_y = 560
    p1 = max(punch_curve(u, 1.9), punch_curve(u, 4.6 + 1.6, 0.2) * 0)  # glove 1
    p1 = punch_curve(u, 1.9) + punch_curve(u, 4.8)
    p2 = punch_curve(u, 0.7) + punch_curve(u, 5.6, 0.5)
    stone_path(ctx, path_y)
    x = ride_x(u)
    hit = clamp((u - 5.75) / 0.1) * (1 - seg(u, 6.4, 7.0))
    sq = 1 - 0.45 * hit
    dizzy = 6.1 < u < 7.4
    tricycle(ctx, x - 10, path_y + 4, 0.95, t, x / 30)
    dino(ctx, x - 25, path_y - 52 + 40 * (1 - sq), 0.62, C["pink"], t, spots=C["blue"], walk=1.0 if u < 1.8 or 2.9 < u < 5.3 or u > 7.3 else 0.0,
         sitting=True, squash=sq, mouth=0.8 if 2.0 < u < 2.8 else 0, eyes="dizzy" if dizzy else "happy")
    glove_post(ctx, G1, 220, path_y, clamp(p1))
    glove_post(ctx, G2, 220, path_y, clamp(p2) * (0.86 if u > 5 else 1))
    if 5.75 < u < 6.4:
        text(ctx, "BOING!", G2, 160, 70, C["yellow"], 10)
    if dizzy:
        for i in range(4):
            a = t * 6 + i * PI2 / 4
            star(ctx, x + 40 + math.cos(a) * 60, path_y - 200 + math.sin(a) * 16, 14, C["yellow"], a, 3)
    if 2.0 < u < 2.8:
        text(ctx, "Huch!", 330, 150, 60, C["white"], 9)
    if u > 7.6:
        text(ctx, "Weiter geht's!", W / 2, 110, 70, C["orange"], 10)


KEYS = [(250, "green"), (390, "yellow"), (530, "red")]


def scene_keys(ctx, u, t):
    background(ctx, t)
    tiled_floor(ctx, 440, H, hx("#e9b46f"), hx("#c98d4a"), grid=120)
    floor = 640
    cage_x, cage_w, cage_h = 820, 330, 300
    has_key = u < 2.4
    # dino path
    if u < 2.0:
        x = lerp(-200, 530 - 125, clamp(u / 2.0))
        walk = 1
    elif u < 2.6:
        x, walk = 530 - 125, 0
    elif u < 4.6:
        x = lerp(530 - 125, 690, (u - 2.6) / 2.0)
        walk = 1
    elif u < 6.2:
        x, walk = 690, 0
    else:
        x = lerp(690, 520, seg(u, 6.2, 6.8))
        walk = 0
    hopy = abs(math.sin(math.pi * clamp((u - 6.2) / 0.6))) * 70 if 6.2 < u < 6.8 else 0
    lock_open = seg(u, 4.8, 5.2)
    fall = 0 if u < 5.3 else min((u - 5.3) ** 2 * 900, 160)
    door = seg(u, 5.6, 6.4)
    for kx, kc in KEYS:
        key_stand(ctx, kx, floor, C[kc], not (kc == "red" and not has_key), t)
    ex = lerp(cage_x + 140, 700, seg(u, 6.8, 8.8))

    def inner():
        if u < 6.8:
            elephant(ctx, cage_x + 140, floor, 0.68, C["grey"], t, eyes="sad" if u < 5.6 else "happy")

    cage(ctx, cage_x, floor, cage_w, cage_h, door, C["red"], inner)
    if u >= 6.8:
        elephant(ctx, ex, floor, 0.68, C["grey"], t, walk=1 if u < 8.8 else 0, facing=-1, trunk_up=seg(u, 8.8, 9.3))
    if fall < 150:
        padlock(ctx, cage_x - 4, floor - 160, C["red"], lock_open, fall)
    keycol = C["red"] if 2.4 <= u < 5.0 else None
    dino(ctx, x, floor - hopy, 0.78, C["pink"], t, spots=C["blue"], walk=walk, key=keycol,
         mouth=0.25 if keycol is not None else (0.7 if u > 6.2 else 0))
    if 2.2 < u < 3.2:
        text(ctx, "Roter Schlüssel!", W / 2, 110, 66, C["red"], 10)
    if 4.8 < u < 5.6:
        text(ctx, "Klick!", cage_x - 4, floor - 270, 60, C["yellow"], 9)
    if u > 7.0:
        for i in range(5):
            k = (u * 0.6 + i * 0.2) % 1
            heart(ctx, (ex + x) / 2 + math.sin(u * 3 + i) * 70, floor - 260 - k * 220, 1.6 + i % 2 * 0.6,
                  [C["pink"], C["red"]][i % 2])
        text(ctx, "Befreit!", W / 2, 110, 80, C["green"], 10)


def scene_springs(ctx, u, t):
    background(ctx, t)
    brick_wall(ctx, 0, 330, W, 120, hx("#d8b48a"))
    text(ctx, "Hüpf-Party", W / 2, 390, 70, C["yellow"], 9)
    tiled_floor(ctx, 450, H, hx("#f2f2f2"), hx("#d0d0d0"))
    floor = 660
    rnd = random.Random(4)
    for i in range(26):
        bx = rnd.uniform(0, W)
        ball(ctx, bx, floor - rnd.uniform(0, 30) + 10, rnd.uniform(16, 24), [C["pink"], C["purple"], C["cyan"]][i % 3])
    pads = [(300, C["pink"], 0.0), (640, C["yellow"], 0.27), (980, C["red"], 0.5)]
    per = 0.9
    tops = []
    heights = []
    for px, pc, off in pads:
        k = ((u + off) / per) % 1.0
        h = math.sin(math.pi * k) * 230
        comp = clamp(1 - h / 40) if h < 40 else 0
        heights.append((h, comp, k))
        tops.append(spring_pad(ctx, px, floor, pc, comp))
    # flying balls
    for i in range(10):
        k = (u * 0.7 + i * 0.1) % 1
        bx = 120 + i * 115 + math.sin(i) * 40
        by = floor - 40 - math.sin(math.pi * k) * (300 + 60 * (i % 3))
        ball(ctx, bx, by, 18, [C["pink"], C["purple"], C["cyan"], C["orange"]][i % 4])
    (h0, c0, _), (h1, c1, _), (h2, c2, _) = heights
    dino(ctx, 300 - 10, tops[0] - h0 + 2, 0.62, C["pink"], t, spots=C["blue"], squash=1 - 0.3 * c0 + 0.12 * (h0 > 60), mouth=0.7)
    ctx.save()
    ctx.translate(640, tops[1] - h1)
    ctx.rotate(u * 4)
    ctx.translate(-640, -(tops[1] - h1))
    ball(ctx, 640, tops[1] - h1 - 40, 40, C["green"])
    ctx.restore()
    elephant(ctx, 980 - 10, tops[2] - h2 + 2, 0.52, C["purple"], t, spots=C["cyan"], squash=1 - 0.3 * c2 + 0.1 * (h2 > 60),
             facing=-1, trunk_up=1)
    text(ctx, "Hopp! Hopp!", W / 2, 110 + math.sin(u * 7) * 8, 80, C["pink"], 10)


def scene_bomb(ctx, u, t):
    boom = u - 4.0
    shake = (6 * math.exp(-max(boom, 0) * 3) * math.sin(u * 80)) if boom > 0 else 0
    ctx.save()
    ctx.translate(shake * 3, shake * 2)
    background(ctx, t)
    tiled_floor(ctx, 460, H + 20, hx("#eeeeee"), hx("#cfcfcf"))
    floor = 650
    # wall with alcove and shutter door
    rrect(ctx, 300, 180, 900, 400, 4)
    fill_stroke(ctx, hx("#e8c9a5"), 5)
    ctx.save()
    ctx.rectangle(300, 180, 900, 400)
    ctx.clip()
    ctx.set_source_rgb(*hx("#d2ad85"))
    ctx.set_line_width(2)
    for yy in range(180, 580, 40):
        ctx.move_to(300, yy)
        ctx.line_to(1200, yy)
        ctx.stroke()
    ctx.restore()
    bouncy_title(ctx, "Was ist drin?", 750, 230, 54, t, [C["orange"], C["blue"], C["pink"], C["green"]], 8)
    # alcove with bomb
    rrect(ctx, 380, 300, 260, 280, 6)
    fill_stroke(ctx, hx("#fafafa"), 5)
    rrect(ctx, 380, 290, 260, 26, 4)
    fill_stroke(ctx, C["red"], 4)
    # shutter door
    rrect(ctx, 820, 290, 280, 290, 6)
    fill_stroke(ctx, hx("#3a2a40"), 5)
    if boom > 0.6:
        burger(ctx, 960, 560, 1.3 + 0.05 * math.sin(u * 8))
        sparkles(ctx, 960, 470, u, 10, 140, 9)
    open_k = seg(u, 4.6, 5.4)
    sh = 290 * (1 - open_k)
    if sh > 2:
        rrect(ctx, 820, 290, 280, sh, 4)
        fill_stroke(ctx, C["pink"], 5)
        ctx.set_source_rgba(0, 0, 0, 0.2)
        ctx.set_line_width(3)
        for yy in range(300, int(290 + sh), 22):
            ctx.move_to(826, yy)
            ctx.line_to(1094, yy)
            ctx.stroke()
        if sh > 160:
            text(ctx, "?", 960, 290 + sh / 2, 170, (1, 1, 1), 12)
    if boom < 0:
        sc = 1 + 0.06 * math.sin(u * (8 + u * 6))
        bomb(ctx, 510, 510, clamp(u / 4.0), t, sc)
    # animals watching
    scared = 1.5 < u < 4.2
    dino(ctx, 160, floor + 40, 0.62, C["pink"], t, spots=C["blue"], eyes="scared" if scared else "happy",
         mouth=0.8 if boom > 0.8 else 0, squash=1 + 0.05 * math.sin(u * 40) * scared)
    elephant(ctx, 1180, floor + 50, 0.5, C["purple"], t, spots=C["cyan"], facing=-1,
             trunk_up=1 if boom > 0.8 else 0, squash=1 + 0.05 * math.sin(u * 40 + 1) * scared)
    if scared:
        text(ctx, "3" if u < 2.4 else ("2" if u < 3.2 else "1"), 510, 360, 70, C["red"], 9)
    ctx.restore()
    if 0 < boom < 1.4:
        k = boom / 1.4
        r = 60 + 700 * ease(min(k * 1.5, 1))
        a = 1 - k
        for rr, col in ((r, C["yellow"]), (r * 0.7, C["orange"]), (r * 0.4, (1, 1, 1))):
            ctx.save()
            ctx.translate(510, 500)
            ctx.new_path()
            for i in range(24):
                rad = rr * (1 if i % 2 == 0 else 0.75)
                ang = i * PI2 / 24 + boom
                (ctx.move_to if i == 0 else ctx.line_to)(math.cos(ang) * rad, math.sin(ang) * rad)
            ctx.close_path()
            ctx.set_source_rgba(*col, a)
            ctx.fill()
            ctx.restore()
        if boom < 0.9:
            text(ctx, "BUMM!", 510, 300, 140 * (0.8 + k), C["red"], 14)
    if boom > 0:
        confetti(ctx, boom, 510, 480)
    if boom > 1.2:
        text(ctx, "Juhu! Ein Burger!", W / 2, 110 + math.sin(u * 6) * 6, 72, C["yellow"], 10)


def confetti(ctx, k, cx, cy, n=80, seed=11):
    rnd = random.Random(seed)
    cols = [C["red"], C["yellow"], C["green"], C["cyan"], C["pink"], C["orange"], C["purple"]]
    for i in range(n):
        a = rnd.uniform(-math.pi, 0)
        v = rnd.uniform(400, 1000)
        x = cx + math.cos(a) * v * k
        y = cy + math.sin(a) * v * k + 500 * k * k
        if y > H + 20:
            continue
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(k * 10 + i)
        ctx.scale(1, abs(math.sin(k * 8 + i)) + 0.2)
        rrect(ctx, -8, -5, 16, 10, 2)
        fill_stroke(ctx, cols[i % len(cols)], 2)
        ctx.restore()


def scene_outro(ctx, u, t):
    background(ctx, t)
    tiled_floor(ctx, 560, H, hx("#f6dcc8"), hx("#e3bfa6"))
    for i, (dx, col) in enumerate(((140, "orange"), (1140, "cyan"))):
        dome(ctx, dx, 620, C[col], wob=math.sin(t * 6 + i) * 0.4)
    bouncy_title(ctx, "ENDE", W / 2, 230, 170, t, [C["red"], C["yellow"], C["green"], C["cyan"]], 14)
    text(ctx, "Bis zum nächsten Mal!", W / 2, 380, 56, C["white"], 9)
    dino(ctx, 470, 690 - abs(math.sin(u * 5)) * 40, 0.7, C["pink"], t, spots=C["blue"], mouth=0.7)
    elephant(ctx, 840, 690 - abs(math.sin(u * 5 + 1)) * 30, 0.62, C["purple"], t, spots=C["cyan"], facing=-1, trunk_up=1)
    confetti(ctx, (u % 2) / 2 + 0.05, W / 2, 300, 60, seed=int(u / 2) + 3)
    fade = seg(u, 3.4, 4.0)
    if fade > 0:
        ctx.rectangle(0, 0, W, H)
        ctx.set_source_rgba(0, 0, 0, fade)
        ctx.fill()


SCENES = [
    (4.0, scene_intro),
    (10.0, scene_dome_dino),
    (10.0, scene_path),
    (10.0, scene_keys),
    (9.0, scene_dome_elephant),
    (6.0, scene_springs),
    (7.0, scene_bomb),
    (4.0, scene_outro),
]
TOTAL = sum(d for d, _ in SCENES)
STARTS = []
_acc = 0.0
for _d, _f in SCENES:
    STARTS.append(_acc)
    _acc += _d


def render_frame(i):
    t = i / FPS
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H)
    ctx = cairo.Context(surf)
    ctx.set_source_rgb(1, 1, 1)
    ctx.paint()
    for start, (d, fn) in zip(STARTS, SCENES):
        if start <= t < start + d or (fn is SCENES[-1][1] and t >= start):
            fn(ctx, t - start, t)
            # iris wipe between scenes
            u = t - start
            k = max(1 - u / 0.35, 0) if start > 0 else 0
            if k > 0:
                ctx.rectangle(0, 0, W, H)
                ellipse(ctx, W / 2, H / 2, 800 * (1 - k), 800 * (1 - k))
                ctx.set_fill_rule(cairo.FILL_RULE_EVEN_ODD)
                ctx.set_source_rgb(0, 0, 0)
                ctx.fill()
                ctx.set_fill_rule(cairo.FILL_RULE_WINDING)
            break
    surf.flush()
    return bytes(surf.get_data())


# ---------------------------------------------------------------- audio
SR = 44100


def tone(f, dur, kind="sq", vol=0.2):
    n = int(SR * dur)
    tt = np.arange(n) / SR
    if kind == "sq":
        w = np.sign(np.sin(PI2 * f * tt)) * 0.5 + np.sin(PI2 * f * tt) * 0.5
    elif kind == "tri":
        w = 2 / np.pi * np.arcsin(np.sin(PI2 * f * tt))
    else:
        w = np.sin(PI2 * f * tt)
    env = np.minimum(1, tt / 0.01) * np.exp(-tt * 4 / dur)
    return w * env * vol


def sweep(f0, f1, dur, vol=0.35, wob=0):
    n = int(SR * dur)
    tt = np.arange(n) / SR
    f = np.geomspace(f0, f1, n) * (1 + wob * np.sin(PI2 * 25 * tt))
    ph = np.cumsum(f) / SR
    return np.sin(PI2 * ph) * np.exp(-tt * 3 / dur) * vol


def noise(dur, vol=0.5, decay=4):
    n = int(SR * dur)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(1)
    x = rng.uniform(-1, 1, n)
    x = np.convolve(x, np.ones(12) / 12, mode="same")
    return x * np.exp(-tt * decay) * vol * 3


def build_audio(path):
    n = int(SR * TOTAL) + SR
    mix = np.zeros(n)

    def add(sig, at):
        a = int(at * SR)
        b = min(n, a + len(sig))
        mix[a:b] += sig[: b - a]

    # happy background melody (C major, 140 bpm)
    beat = 60 / 140
    melody = [0, 4, 7, 12, 7, 4, 5, 9, 12, 9, 5, 9, 7, 11, 14, 11, 7, 4, 2, 7, 4, 0, 4, 7]
    bass = [0, 0, 5, 5, 7, 7, 0, 0]
    t = 0.0
    i = 0
    while t < TOTAL - 1:
        note = melody[i % len(melody)]
        add(tone(523.25 * 2 ** (note / 12), beat * 0.9, "sq", 0.06), t)
        if i % 2 == 0:
            b = bass[(i // 2) % len(bass)]
            add(tone(130.8 * 2 ** (b / 12), beat * 1.8, "tri", 0.12), t)
        if i % 2 == 1:
            add(noise(0.05, 0.05, 60), t)
        t += beat / 2 * 2 if i % 4 != 3 else beat / 2 * 2
        i += 1

    sfx = []
    s = dict(zip([f.__name__ for _, f in SCENES], STARTS))
    for name in ("scene_dome_dino", "scene_dome_elephant"):
        b = s[name]
        sfx += [(b + 2.6, "up"), (b + 3.6, "thud"), (b + 3.9, "magic"), (b + 5.4, "up"), (b + 5.8, "boing"), (b + 6.3, "pop")]
    b = s["scene_path"]
    sfx += [(b + 0.7, "punch"), (b + 1.9, "punch"), (b + 4.8, "punch"), (b + 5.75, "boing"), (b + 6.2, "dizzy")]
    b = s["scene_keys"]
    sfx += [(b + 2.4, "pop"), (b + 4.8, "click"), (b + 5.6, "up"), (b + 7.0, "magic")]
    b = s["scene_springs"]
    k = 0.0
    while k < 6.0:
        sfx.append((b + k, "boing_s"))
        k += 0.45
    b = s["scene_bomb"]
    sfx += [(b + 1.5, "tick"), (b + 2.4, "tick"), (b + 3.2, "tick"), (b + 4.0, "boom"), (b + 4.6, "up"), (b + 5.2, "magic")]
    sfx += [(s["scene_intro"] + 0.1, "magic"), (s["scene_outro"] + 0.1, "magic")]
    for at, kind in sfx:
        sig = {
            "up": lambda: sweep(300, 900, 0.35, 0.25),
            "thud": lambda: sweep(160, 50, 0.3, 0.6),
            "magic": lambda: sum(np.pad(tone(880 * 2 ** (j / 12), 0.25, "sin", 0.15), (int(k * 0.07 * SR), SR))[: int(0.9 * SR)]
                                 for k, j in enumerate((0, 4, 7, 12, 16, 19))),
            "boing": lambda: sweep(180, 520, 0.5, 0.45, wob=0.15),
            "boing_s": lambda: sweep(200, 420, 0.25, 0.2, wob=0.1),
            "pop": lambda: sweep(900, 1600, 0.08, 0.4),
            "punch": lambda: noise(0.15, 0.35, 25) + sweep(140, 60, 0.15, 0.5),
            "dizzy": lambda: sweep(1200, 700, 0.8, 0.12, wob=0.3),
            "click": lambda: noise(0.05, 0.5, 80) + sweep(2000, 1500, 0.05, 0.2),
            "tick": lambda: tone(1000, 0.1, "sin", 0.3),
            "boom": lambda: noise(1.2, 0.9, 3) + sweep(120, 30, 1.2, 0.8),
        }[kind]()
        add(sig, at)
    mix = mix[: int(SR * TOTAL)]
    fade = np.ones_like(mix)
    fl = int(SR * 0.6)
    fade[-fl:] = np.linspace(1, 0, fl)
    mix = np.tanh(mix * 1.2) * fade
    pcm = (mix * 32000).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "bunte_tier_abenteuer.mp4"
    wav = out.rsplit(".", 1)[0] + "_audio.wav"
    build_audio(wav)
    nframes = int(TOTAL * FPS)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool() as pool:
        for k, frame in enumerate(pool.imap(render_frame, range(nframes), chunksize=8)):
            proc.stdin.write(frame)
            if k % 150 == 0:
                print(f"frame {k}/{nframes}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("fertig:", out)


if __name__ == "__main__":
    main()
