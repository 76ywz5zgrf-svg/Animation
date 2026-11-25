"""Rendert das Video Bild für Bild (1920x1080, 25 fps) und mischt den Ton dazu.
python3 render.py preview 12.5 80 300   -> Standbilder in build/preview
python3 render.py video                 -> out/pieks-und-tupfi-folge-01.mp4
"""
import json, math, os, sys, subprocess, random
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageChops
import draw as D
from story import SCENES, CHORUS

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build'); OUT = os.path.join(HERE, 'out')
W, H, FPS = 1920, 1080, 25
TL = json.load(open(os.path.join(B, 'timeline.json')))

NUMERIC = {'x', 'y', 's', 'rot', 'a', 'glow', 'bubble', 'red', 'light', 'comb', 'shake'}
DEFAULT = dict(x=960, y=900, s=1.0, rot=0.0, a=1.0, z=0, flip=False, eyes='open', mouth='smile', pose='', var='', act='idle',
               rain=0, sparkle=0, glow=0, shape='cloud', red=0, dot=0, bubble=0, comb=0, tears=0, cap=1, lit=0, rainbow=0)
SCENE_DEFAULT = dict(bg=None, tele=0, flash=0, num='', title=0, shake=0, lamp=0, fact=0, next=0, light=0.0)
FLOATERS = {'wuschel', 'sola', 'mond', 'star', 'shootstar', 'curtain', 'applecl', 'tray', 'raytoe', 'blanket', 'pillow',
            'pot', 'lid', 'spoon', 'duck', 'trumpet', 'feather', 'funk', 'bridge', 'flowers'}
SPRITE_KEYS = {
    'pieks': ['var', 'eyes', 'mouth', 'pose'], 'tupfi': ['var', 'eyes', 'mouth', 'dot'], 'gustav': ['var', 'eyes', 'mouth', 'pose', 'comb'],
    'wuschel': ['shape', 'eyes', 'mouth', 'red'], 'oma': ['eyes', 'mouth', 'pose'], 'wolle': ['eyes', 'mouth'],
    'sola': ['var', 'eyes', 'mouth', 'cap', 'tears', 'comb'], 'mond': ['eyes', 'mouth'], 'frog': ['eyes', 'mouth', 'dot'],
    'mouse': ['eyes', 'mouth'], 'sheepkid': ['eyes', 'mouth'], 'owl': ['eyes', 'mouth'], 'sunny': ['var', 'eyes', 'mouth'],
    'yflower': ['eyes', 'mouth'], 'flowers': ['var'], 'star': ['eyes'], 'shootstar': [], 'applecl': [], 'curtain': ['var'],
    'tray': ['var'], 'blanket': [], 'bridge': ['lit'], 'pot': [], 'lid': [], 'spoon': [], 'duck': [], 'trumpet': [], 'feather': [],
    'funk': [], 'raytoe': [], 'pillow': [],
}
SPEAKER_ACTOR = {'brett': None, 'bridgelaugh': None, 'echo': None, 'erz': None}

def ease(u):
    u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)

class Track:
    def __init__(self, v0, numeric):
        self.numeric = numeric; self.segs = [(-1e9, 0.0, v0, v0, -1e9)]  # (t0, tw, vfrom, vto, setTime)
    def value(self, t):
        seg = None
        for s in self.segs:
            if s[0] <= t: seg = s
            else: break
        t0, tw, a, b, _ = seg
        if not self.numeric: return b
        if tw <= 0: return b
        u = ease((t - t0) / tw)
        return a + (b - a) * u
    def since(self, t):
        seg = None
        for s in self.segs:
            if s[0] <= t: seg = s
            else: break
        return t - seg[0]
    def set(self, t, v, tw):
        cur = self.value(t)
        if not self.numeric: tw = 0
        self.segs.append((t, tw, cur, v, t))

class SceneState:
    def __init__(self, sc, tl):
        self.sc, self.tl = sc, tl
        self.start, self.end = tl['start'], tl['end']
        self.kinds = {}; self.tracks = {}
        for name, init in sc['actors'].items():
            kind = init.get('type', name)
            self.kinds[name] = kind
            st = dict(DEFAULT); st.update({k: v for k, v in init.items() if k != 'type'})
            self.tracks[name] = {k: Track(v, k in NUMERIC) for k, v in st.items()}
        sd = dict(SCENE_DEFAULT); sd['bg'] = sc['bg']
        self.tracks['_'] = {k: Track(v, k in NUMERIC) for k, v in sd.items()}
        cx, cy, cz = sc['cam']
        self.cam = {'cx': Track(cx, True), 'cy': Track(cy, True), 'cz': Track(cz, True)}
        self.lines = []
        for bt in tl['beats']:
            t = bt['start']
            for name, chg in bt.get('set', {}).items():
                if name not in self.tracks: continue
                tw = chg.get('tw', bt.get('tw', 0.5))
                for k, v in chg.items():
                    if k == 'tw': continue
                    if k not in self.tracks[name]: self.tracks[name][k] = Track(DEFAULT.get(k, SCENE_DEFAULT.get(k, v)), k in NUMERIC)
                    self.tracks[name][k].set(t, v, tw if k in NUMERIC else 0)
            cam = bt.get('cam')
            ctw = bt.get('ctw', 0.8)
            if cam is None and bt['kind'] == 'line' and sc['auto']:
                acts = self.speaker_actors(bt)
                if acts:
                    x = sum(self.tracks[a]['x'].value(t + 0.3) for a in acts) / len(acts)
                    y = sum(self.tracks[a]['y'].value(t + 0.3) for a in acts) / len(acts)
                    bx, by, bz = sc['cam']
                    cam = (bx * 0.65 + x * 0.35, by * 0.8 + (y - 250) * 0.2, bz * 1.1)
            if cam is not None:
                for k, v in zip(('cx', 'cy', 'cz'), cam): self.cam[k].set(t, v, ctw)
            if bt['kind'] == 'line' and bt.get('mouth') != 'none':
                self.lines.append((t, bt))
    def speaker_actors(self, bt):
        spk = bt['spk']
        mem = CHORUS.get(spk, [spk])
        return [m for m in mem if m in self.tracks and SPEAKER_ACTOR.get(m, m) is not None]
    def mouth_open(self, name, t):
        for t0, bt in self.lines:
            if t0 <= t < t0 + bt['alen'] + 0.05:
                env = bt['env'].get(name)
                if env is None: continue
                k = int((t - t0) * FPS)
                if 0 <= k < len(env): return env[k]
        return 0.0
    def state(self, name, t):
        return {k: tr.value(t) for k, tr in self.tracks[name].items()}

STATES = [SceneState(sc, tl) for sc, tl in zip(SCENES, TL['scenes'])]

# ------------------------------------------------------------------ Hilfssprites
@lru_cache(maxsize=1)
def glow_sprite():
    im = Image.new('RGBA', (400, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([100, 100, 300, 300], fill=(255, 220, 120, 130))
    return im.filter(ImageFilter.GaussianBlur(45))

@lru_cache(maxsize=1)
def shadow_sprite():
    im = Image.new('RGBA', (300, 80), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([20, 15, 280, 65], fill=(20, 10, 40, 90))
    return im.filter(ImageFilter.GaussianBlur(8))

@lru_cache(maxsize=1)
def lantern(): return D.draw_lantern()

@lru_cache(maxsize=64)
def text_sprite(s, size, col=(255, 230, 80, 255), stroke=10):
    f = D.font(size)
    bbox = f.getbbox(s, stroke_width=stroke)
    im = Image.new('RGBA', (bbox[2] - bbox[0] + 20, bbox[3] - bbox[1] + 20), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10 - bbox[0], 10 - bbox[1]), s, font=f, fill=col, stroke_width=stroke, stroke_fill=(58, 42, 63, 255))
    return im

@lru_cache(maxsize=1)
def fact_card():
    p = D.Pen(560, 420)
    p.rrect(10, 10, 550, 410, 40, D.hexc('fff7e0'), w=6)
    p.circ(280, 190, 130, D.hexc('ffb43a'), w=5)
    for (x, y, r) in [(230, 160, 16), (250, 175, 9), (330, 230, 12), (300, 120, 8)]: p.circ(x, y, r, D.hexc('6a3a1a'), ol=None)
    p.text(280, 370, 'Sonnenflecken', 52, D.hexc('ff8a2a'), stroke=4, sfill=D.hexc('ffffff'))
    return p.done()

@lru_cache(maxsize=1)
def next_card():
    p = D.Pen(1300, 260)
    p.rrect(10, 10, 1290, 250, 60, D.hexc('2b2f78'), ol=D.hexc('ffd84a'), w=8)
    p.text(650, 80, 'Nächste Folge:', 56, D.hexc('ffffff'))
    p.text(650, 170, 'Der Mond hat Schluckauf!', 82, D.hexc('ffd84a'), stroke=5)
    return p.done()

@lru_cache(maxsize=1)
def title_logo():
    p = D.Pen(1400, 420)
    p.text(700, 150, 'Pieks & Tupfi', 190, D.hexc('ffd84a'), stroke=14)
    return p.done()

@lru_cache(maxsize=1)
def title_sub():
    p = D.Pen(1500, 160)
    p.rrect(40, 10, 1460, 150, 70, D.hexc('ff7fc0'), w=7)
    p.text(750, 82, 'Die Sonne hat verschlafen!', 88, D.hexc('ffffff'), stroke=6)
    return p.done()

@lru_cache(maxsize=1)
def paper():
    r = random.Random(3)
    im = Image.effect_noise((W, H), 40).convert('L')
    return im

TINT_NIGHT = (205, 215, 255)

@lru_cache(maxsize=3000)
def tinted_sprite(kind, key, tint, scale_q, flip):
    im = D.sprite(kind, key)
    if tint:
        r, g, b, a = im.split()
        r = r.point(lambda v: v * tint[0] // 255); g = g.point(lambda v: v * tint[1] // 255); b = b.point(lambda v: v * tint[2] // 255)
        im = Image.merge('RGBA', (r, g, b, a))
    if abs(scale_q - 1.0) > 0.005:
        im = im.resize((max(1, int(im.width * scale_q)), max(1, int(im.height * scale_q))), Image.BILINEAR)
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

def act_offsets(act, t, tau, phase, st):
    dx = dy = drot = 0.0; sx = sy = 1.0
    if act == 'idle': sy = 1 + 0.012 * math.sin(2 * math.pi * 0.6 * t + phase)
    elif act == 'bounce':
        v = abs(math.sin(math.pi * 2.2 * t + phase)); dy = -v * 38; sy = 1 + (0.06 if v < 0.15 else 0) * -1; sx = 2 - sy
    elif act == 'hop':
        if tau < 0.45: dy = -math.sin(math.pi * tau / 0.45) * 60
    elif act in ('shake', 'sweat'): dx = math.sin(t * 60) * (8 if act == 'shake' else 4)
    elif act == 'wobble': sx = 1 + 0.08 * math.sin(t * 18 + phase); sy = 1 - 0.08 * math.sin(t * 18 + phase); dx = math.sin(t * 9) * 6
    elif act == 'spin': drot = 360 * min(1.0, tau / 1.0)
    elif act == 'float': dy = math.sin(t * 1.6 + phase) * 12
    elif act == 'sleep': drot = math.sin(t * 0.8) * 4; sy = 1 + 0.02 * math.sin(t * 1.2)
    elif act == 'laugh': dy = -abs(math.sin(t * 14 + phase)) * 10
    elif act == 'walk': dy = -abs(math.sin(t * 9 + phase)) * 12; drot = math.sin(t * 9 + phase) * 3
    elif act == 'roll': drot = -st['x'] * 0.45
    elif act == 'nod': dy = math.sin(t * 10) * 6
    elif act == 'ears': drot = math.sin(t * 12) * 2.5
    elif act == 'sway': drot = math.sin(t * 1.5) * 5
    elif act == 'dance':
        bt = 104 / 60; u = math.sin(math.pi * bt * t + phase); dy = -abs(u) * 26; drot = math.sin(math.pi * bt * t / 2 + phase) * 6
    elif act == 'breathe': sy = 1 + 0.025 * math.sin(t * 1.5)
    elif act == 'tickle': drot = math.sin(t * 22) * 18
    elif act == 'nibble': dy = math.sin(t * 30) * 3
    elif act == 'stretch': sy = 1 + 0.08 * math.sin(math.pi * min(1, tau / 1.2)); sx = 2 - sy
    elif act == 'hic':
        u = tau % 0.9
        if u < 0.3: dy = -math.sin(math.pi * u / 0.3) * 30
    elif act == 'clap': sx = 1 + 0.06 * math.sin(t * 16)
    elif act == 'wave': drot = math.sin(t * 4 + phase) * 6
    elif act == 'bow': drot = max(0.0, math.sin(t * 1.2)) * 10
    return dx, dy, drot, sx, sy

def quant_op(v):
    if v < 0.12: return 0.0
    if v < 0.4: return 0.35
    if v < 0.7: return 0.65
    return 1.0

def render_actor(frame, name, kind, st, t, tau, ss):
    a = st['a']
    if a <= 0.01: return
    phase = (hash(name) % 100) / 15.0
    keyd = {}
    for k in SPRITE_KEYS.get(kind, []):
        keyd[k] = st.get(k, DEFAULT.get(k))
    if 'mouth' in keyd:
        op = quant_op(ss.mouth_open(name, t))
        if op: keyd['op'] = op
    if 'eyes' in keyd and keyd['eyes'] == 'open':
        if ((t + phase) % 4.3) < 0.13: keyd['eyes'] = 'closed'
    if kind == 'sola' and keyd.get('comb') is not None: keyd['comb'] = round(keyd['comb'] * 2) / 2
    key = tuple(sorted(keyd.items()))
    night = ss.cur_bg in D.NIGHT_BG
    tint = TINT_NIGHT if night and kind not in ('sola', 'star', 'shootstar') else None
    dx, dy, drot, sx, sy = act_offsets(st['act'], t, tau, phase, st)
    s = st['s']
    sq = round(s * 50) / 50
    im = tinted_sprite(kind, key, tint, sq, bool(st['flip']))
    if abs(sx - 1) > 0.004 or abs(sy - 1) > 0.004:
        im = im.resize((max(1, int(im.width * sx)), max(1, int(im.height * sy))), Image.BILINEAR)
    rot = st['rot'] + drot
    x, y = st['x'] + dx, st['y'] + dy
    # Schatten
    if kind not in FLOATERS and st['y'] > 600 and not ss.flight:
        sh = shadow_sprite().resize((max(4, int(im.width * 0.8)), max(4, int(40 * s))))
        frame.alpha_composite(sh, (int(st['x'] - sh.width / 2), int(st['y'] - sh.height / 2)))
    if abs(rot) > 0.3:
        w0, h0 = im.size
        im = im.rotate(-rot, resample=Image.BICUBIC, expand=True, center=(w0 / 2, h0 * 0.62))
        px, py = x - im.width / 2, y - h0 * 0.38 - im.height / 2
    else:
        px, py = x - im.width / 2, y - im.height
    if a < 0.99:
        im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    if kind == 'sola' and st.get('glow'):
        g = glow_sprite().resize((int(im.width * 1.6), int(im.height * 1.6)))
        frame.alpha_composite(g, (int(x - g.width / 2), int(y - im.height / 2 - g.height / 2)))
    paste(frame, im, px, py)
    # Zubehör
    if kind == 'tupfi' and st.get('var', '') == '' and (st.get('glow') or night):
        L = lantern().resize((int(90 * s * 0.9), int(120 * s * 0.9)))
        lx, ly = x + 118 * s * sx, y - 150 * s + math.sin(t * 3) * 3
        if night or st.get('glow'):
            g = glow_sprite().resize((int(300 * s), int(300 * s)))
            frame.alpha_composite(g, (int(lx - g.width / 2), int(ly + 20 * s - g.height / 2)))
        paste(frame, L, lx - L.width / 2, ly - L.height * 0.2)
    if kind == 'wuschel':
        if st.get('rain'):
            r = random.Random(int(t * 12))
            d = ImageDraw.Draw(frame)
            for k in range(10 * int(st['rain'])):
                rx = x + r.uniform(-90, 90) * s; ry = y - 40 * s + ((t * 400 + k * 53) % 200) * s
                d.line([(rx, ry), (rx - 2, ry + 14)], fill=(140, 200, 255, 220), width=4)
        if st.get('sparkle'):
            d = ImageDraw.Draw(frame); r = random.Random(7)
            for k in range(8):
                ang = r.uniform(0, 6.28) + t * 0.8; rr = r.uniform(100, 150) * s
                sx_, sy_ = x + math.cos(ang) * rr, y - 120 * s + math.sin(ang) * rr * 0.7
                b = 4 + 4 * abs(math.sin(t * 5 + k))
                d.line([(sx_ - b * 2, sy_), (sx_ + b * 2, sy_)], fill=(255, 255, 200, 230), width=3)
                d.line([(sx_, sy_ - b * 2), (sx_, sy_ + b * 2)], fill=(255, 255, 200, 230), width=3)
        if st.get('rainbow'):
            rb = rainbow_sprite(); paste(frame, rb, x - rb.width / 2, y - 60)
    if kind == 'pieks' and st.get('bubble', 0) > 0.05:
        b = st['bubble']; r_ = 18 + 50 * b
        d = ImageDraw.Draw(frame)
        bx, by = x + 40 * s, y - 210 * s
        d.ellipse([bx - r_, by - r_, bx + r_, by + r_], fill=(200, 230, 255, 90), outline=(255, 255, 255, 200), width=4)
        d.ellipse([bx - r_ * 0.5, by - r_ * 0.6, bx - r_ * 0.2, by - r_ * 0.3], fill=(255, 255, 255, 200))
    if kind == 'pieks' and st['eyes'] == 'closed' and st['act'] == 'sleep':
        zz = text_sprite('z', 60, (255, 255, 255, 255), 6)
        for k in range(3):
            u = (t * 0.6 + k / 3) % 1
            paste(frame, zz, x + 60 + u * 80, y - 300 * s - u * 120)

@lru_cache(maxsize=1)
def rainbow_sprite():
    p = D.Pen(420, 220)
    for i, c in enumerate(['ff5f5f', 'ff9f40', 'ffd83a', '6fd65a', '4f8dff', '9d6ad8']):
        p.arc(210, 220, 200 - i * 16, 200 - i * 16, 180, 360, fill=D.hexc(c), w=16)
    return p.done()

def paste(frame, im, x, y):
    x, y = int(round(x)), int(round(y))
    if x >= W or y >= H or x + im.width <= 0 or y + im.height <= 0: return
    cx0, cy0 = max(0, -x), max(0, -y)
    cx1, cy1 = min(im.width, W - x), min(im.height, H - y)
    if cx0 or cy0 or cx1 < im.width or cy1 < im.height:
        im = im.crop((cx0, cy0, cx1, cy1)); x += cx0; y += cy0
    frame.alpha_composite(im, (x, y))

@lru_cache(maxsize=8)
def bg_rgba(name, step):
    return D.background(name, step).convert('RGBA')

def ambient(frame, bgname, t):
    d = ImageDraw.Draw(frame)
    if bgname in ('village_night', 'square_night', 'obs_ext', 'mountain', 'bridge', 'moonsky', 'flight', 'sunroom', 'wall'):
        r = random.Random(42)
        for k in range(26):
            x, y = r.uniform(0, W), r.uniform(0, 520)
            b = max(0.0, math.sin(t * r.uniform(1.5, 3.5) + k)) ** 4
            if b > 0.05:
                l = 4 + 10 * b
                d.line([(x - l, y), (x + l, y)], fill=(255, 255, 220, int(230 * b)), width=3)
                d.line([(x, y - l), (x, y + l)], fill=(255, 255, 220, int(230 * b)), width=3)
    if bgname in ('forest', 'bridge'):
        r = random.Random(9)
        for k in range(22):
            x = (r.uniform(0, W) + math.sin(t * 0.5 + k) * 60) % W; y = r.uniform(300, 900) + math.cos(t * 0.7 + k) * 30
            b = 0.5 + 0.5 * math.sin(t * 3 + k)
            d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(190, 255, 120, int(120 + 120 * b)))

def find_state(t):
    for i, ss in enumerate(STATES):
        if ss.start <= t < ss.end: return i, ss
    return len(STATES) - 1, STATES[-1]

def render_frame(fi):
    t = fi / FPS
    idx, ss = find_state(t)
    sc = ss.sc
    sd = {k: tr.value(t) for k, tr in ss.tracks['_'].items()}
    bgname = sd['bg']; ss.cur_bg = bgname; ss.flight = bgname == 'flight'
    step = int(round(sd['light'] * 10)) if bgname in ('sunrise', 'evening') else None
    base = bg_rgba(bgname, step)
    if bgname == 'flight':
        off = int(t * 160) % W
        frame = Image.new('RGBA', (W, H))
        frame.paste(base.crop((off, 0, W, H)), (0, 0)); frame.paste(base.crop((0, 0, off, H)), (W - off, 0))
    else:
        frame = base.copy()
    ambient(frame, bgname, t)
    if bgname == 'sunrise' and sd['light'] > 0.3:
        rays = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(rays)
        sy = ss.tracks['sola']['y'].value(t) - 300
        for k in range(14):
            a = math.radians(k * 360 / 14 + t * 6)
            d.polygon([(960, sy), (960 + math.cos(a - 0.08) * 2000, sy + math.sin(a - 0.08) * 2000),
                       (960 + math.cos(a + 0.08) * 2000, sy + math.sin(a + 0.08) * 2000)], fill=(255, 240, 170, int(60 * sd['light'])))
        frame.alpha_composite(rays)
    names = sorted(ss.tracks.keys() - {'_'}, key=lambda n: ss.tracks[n]['z'].value(t))
    for name in names:
        st = ss.state(name, t)
        tau = ss.tracks[name]['act'].since(t)
        render_actor(frame, name, ss.kinds[name], st, t, tau, ss)
    # Overlays
    if sd['num']:
        tau = ss.tracks['_']['num'].since(t)
        sp = text_sprite(sd['num'], 260, (255, 216, 74, 255), 14)
        k = 1 + 0.35 * max(0, 1 - tau / 0.25)
        sp2 = sp.resize((int(sp.width * k), int(sp.height * k)))
        paste(frame, sp2, 960 - sp2.width / 2, 210 - sp2.height / 2)
    if sd['title']:
        tau = ss.tracks['_']['title'].since(t) if sd['title'] == 1 else 9
        lg = title_logo(); k = min(1.0, 0.3 + tau / 0.4)
        lg2 = lg.resize((int(lg.width * k), int(lg.height * k)))
        paste(frame, lg2, 960 - lg2.width / 2, 260 - lg2.height / 2)
        if sd['title'] == 2:
            tau2 = ss.tracks['_']['title'].since(t); su = title_sub(); k2 = min(1.0, 0.3 + tau2 / 0.4)
            su2 = su.resize((int(su.width * k2), int(su.height * k2)))
            paste(frame, su2, 960 - su2.width / 2, 470 - su2.height / 2)
    if sd['fact']:
        fc = fact_card(); paste(frame, fc, 1300, 80)
    if sd['next']:
        nc = next_card(); paste(frame, nc, 960 - nc.width / 2, 120)
    # Kamera
    cx, cy, cz = ss.cam['cx'].value(t), ss.cam['cy'].value(t), max(1.0, ss.cam['cz'].value(t))
    if sd['shake']: cx += math.sin(t * 50) * 10; cy += math.cos(t * 43) * 8; cz = max(cz, 1.02)
    if cz > 1.001:
        cw, ch = W / cz, H / cz
        x0 = min(max(cx - cw / 2, 0), W - cw); y0 = min(max(cy - ch / 2, 0), H - ch)
        frame = frame.transform((W, H), Image.EXTENT, (x0, y0, x0 + cw, y0 + ch), Image.BILINEAR)
    frame = frame.convert('RGB')
    if sd['tele']:
        mask = tele_mask(); black = Image.new('RGB', (W, H), (10, 8, 20))
        frame = Image.composite(frame, black, mask)
        ImageDraw.Draw(frame).ellipse([960 - 470, 540 - 470, 960 + 470, 540 + 470], outline=(217, 164, 65), width=22)
    if sd['flash']:
        g = ImageOps.posterize(frame, 4)
        warm = Image.new('RGB', (W, H), (255, 236, 200))
        g = Image.blend(g, warm, 0.25)
        frame = ImageChops.multiply(g, Image.merge('RGB', [paper().point(lambda v: 200 + v // 5)] * 3))
    # Übergänge
    fade = 1.0
    if sc['trans'] == 'fade' and t - ss.start < 0.35: fade = (t - ss.start) / 0.35
    nxt = STATES[idx + 1] if idx + 1 < len(STATES) else None
    if (nxt is None or nxt.sc['trans'] == 'fade') and ss.end - t < 0.35: fade = min(fade, (ss.end - t) / 0.35)
    if fade < 0.999:
        frame = Image.blend(Image.new('RGB', (W, H), (0, 0, 0)), frame, max(0.0, fade))
    return frame

@lru_cache(maxsize=1)
def tele_mask():
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([960 - 470, 540 - 470, 960 + 470, 540 + 470], fill=255)
    return m.filter(ImageFilter.GaussianBlur(4))

def render_chunk(args):
    ci, f0, f1 = args
    path = os.path.join(B, 'chunk_%03d.mp4' % ci)
    if os.path.exists(path + '.done'): return path
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(FPS),
                          '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-g', '50', path],
                         stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        p.stdin.write(render_frame(fi).tobytes())
    p.stdin.close(); p.wait()
    open(path + '.done', 'w').close()
    return path

def main():
    mode = sys.argv[1]
    if mode == 'preview':
        os.makedirs(os.path.join(B, 'preview'), exist_ok=True)
        for v in sys.argv[2:]:
            t = float(v); im = render_frame(int(t * FPS))
            im.resize((960, 540)).save(os.path.join(B, 'preview', 't%07.2f.png' % t))
        return
    if mode == 'video':
        nframes = int(TL['total'] * FPS)
        nproc = int(os.environ.get('NPROC', os.cpu_count()))
        per = 250
        chunks = [(i, f, min(nframes, f + per)) for i, f in enumerate(range(0, nframes, per))]
        from multiprocessing import Pool
        with Pool(nproc) as pool:
            for k, pth in enumerate(pool.imap(render_chunk, chunks)):
                print('chunk %d/%d' % (k + 1, len(chunks)), flush=True)
        lst = os.path.join(B, 'chunks.txt')
        with open(lst, 'w') as f:
            for i, _, _ in chunks: f.write("file 'chunk_%03d.mp4'\n" % i)
        out = os.path.join(OUT, 'pieks-und-tupfi-folge-01.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', os.path.join(B, 'master.wav'),
                        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
        print('fertig:', out)

if __name__ == '__main__':
    main()
