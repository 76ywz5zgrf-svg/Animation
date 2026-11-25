"""Erzeugt Sprache (Piper TTS), Geräusche, Musik und die fertige Tonspur.
Ergebnis: build/master.wav, build/timeline.json, out/untertitel.srt
"""
import hashlib, json, os, re, subprocess, wave, math
import numpy as np
from story import SCENES, CHORUS

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build'); os.makedirs(os.path.join(B, 'tts'), exist_ok=True)
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
VOX = os.path.join(HERE, 'voices')
SR = 44100
FPS = 25
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ Stimmen
# (Modell, Sprecher-ID, Halbtöne, Längenfaktor, Lautstärke)
VOICES = {
    'pieks':  ('de_DE-karlsson-low', None, 5.0, 0.95, 1.0),
    'tupfi':  ('de_DE-kerstin-low', None, 4.0, 1.05, 1.0),
    'gustav': ('de_DE-thorsten-medium', None, -1.5, 1.0, 1.0),
    'oma':    ('de_DE-eva_k-x_low', None, -1.0, 1.15, 1.0),
    'sola':   ('de_DE-ramona-low', None, 3.0, 1.05, 1.0),
    'mond':   ('de_DE-thorsten_emotional-medium', 5, -4.0, 1.25, 1.0),
    'wolle':  ('de_DE-eva_k-x_low', None, 2.0, 1.0, 1.0),
    'erz':    ('de_DE-kerstin-low', None, 0.0, 1.1, 0.95),
    'frog1':  ('de_DE-karlsson-low', None, 8.0, 0.9, 0.9),
    'sheepkid': ('de_DE-kerstin-low', None, 7.0, 1.1, 0.9),
    'sunny':  ('de_DE-ramona-low', None, 1.0, 1.2, 0.9),
    'yflower': ('de_DE-eva_k-x_low', None, -2.0, 1.4, 0.9),
    'brett':  ('de_DE-kerstin-low', None, 9.0, 0.9, 0.8),
    'bridgelaugh': ('de_DE-thorsten-medium', None, -5.0, 1.0, 1.0),
    'echo':   ('de_DE-karlsson-low', None, 5.0, 1.1, 0.5),
}
VOICE_NAMES = {'pieks': 'Pieks', 'tupfi': 'Tupfi', 'gustav': 'Gustav', 'oma': 'Oma Mümmel', 'sola': 'Sonne',
               'mond': 'Opa Mond', 'wolle': 'Frau Wolle', 'erz': 'Erzählerin', 'frog1': 'Frosch', 'sheepkid': 'Kleines Schaf',
               'sunny': 'Sonnenblume', 'yflower': 'Blume', 'brett': 'Brücke', 'bridgelaugh': 'Brücke', 'echo': 'Echo',
               'chor': 'Pieks & Tupfi', 'alle': 'Alle', 'alle5': 'Alle', 'pg': 'Pieks & Gustav'}

_loaded = {}
def piper_voice(model):
    if model not in _loaded:
        from piper import PiperVoice
        _loaded[model] = PiperVoice.load(os.path.join(VOX, model + '.onnx'))
    return _loaded[model]

def clean_tts(t):
    t = t.replace('–', ',').replace('…', '...').replace('„', '').replace('“', '').replace('?!', '?')
    return t

def read_wav(p):
    with wave.open(p) as w:
        n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
        if ch == 2: a = a.reshape(-1, 2).mean(1)
    assert sr == SR, (p, sr)
    return a

def write_wav(p, a):
    a = np.clip(a, -1, 1)
    if a.ndim == 1: a = np.stack([a, a], 1)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((a * 32767).astype(np.int16).tobytes())

FX_FILTERS = {
    'crow': 'vibrato=f=6:d=0.25',
    'goat': 'vibrato=f=11:d=0.6,tremolo=f=11:d=0.5',
    'duck': 'highpass=f=500,lowpass=f=2600,vibrato=f=9:d=0.4,volume=1.6',
    'opera': 'vibrato=f=5.5:d=0.35,aecho=0.8:0.5:60|120:0.3|0.2',
    'echo': 'aecho=0.8:0.7:450|900|1350:0.5|0.35|0.2,lowpass=f=3000',
    'whisper': 'highpass=f=250,volume=0.75',
    'wobble': 'tremolo=f=9:d=0.8',
    'yawn': 'vibrato=f=3:d=0.2',
    'radio': 'highpass=f=450,lowpass=f=3200,acrusher=bits=10:mix=0.25,volume=1.3',
}

def tts_one(spk, text, rate=1.0, fx=None):
    model, sid, semi, ls, vol = VOICES[spk]
    key = hashlib.md5(repr((spk, text, rate, fx, VOICES[spk], 3)).encode()).hexdigest()[:16]
    outp = os.path.join(B, 'tts', key + '.wav')
    if not os.path.exists(outp):
        from piper import SynthesisConfig
        raw = os.path.join(B, 'tts', key + '_raw.wav')
        cfg = SynthesisConfig(length_scale=ls / rate, speaker_id=sid, noise_scale=0.6, noise_w_scale=0.7)
        with wave.open(raw, 'wb') as w:
            piper_voice(model).synthesize_wav(clean_tts(text), w, syn_config=cfg)
        flt = []
        if semi: flt.append('rubberband=pitch=%.5f' % (2 ** (semi / 12)))
        if fx == 'yawn': flt.append('rubberband=tempo=0.75')
        if fx in FX_FILTERS: flt.append(FX_FILTERS[fx])
        flt.append('volume=%.2f' % vol)
        flt.append('silenceremove=start_periods=1:start_threshold=-50dB')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', ','.join(flt), '-ar', str(SR), '-ac', '1', outp], check=True)
        os.remove(raw)
    a = read_wav(outp)
    # Stille am Ende abschneiden
    idx = np.where(np.abs(a) > 0.01)[0]
    if len(idx): a = a[:idx[-1] + int(0.08 * SR)]
    return a

def stretch(a, target_len):
    """Zeitstrecken über ffmpeg/rubberband auf Ziellänge (Samples)."""
    if len(a) == 0 or abs(len(a) - target_len) < SR * 0.03:
        return a[:target_len] if len(a) >= target_len else np.pad(a, (0, target_len - len(a)))
    key = hashlib.md5(a[:2000].tobytes() + str((len(a), target_len)).encode()).hexdigest()[:16]
    pin = os.path.join(B, 'tts', 'st_in_' + key + '.wav'); pout = os.path.join(B, 'tts', 'st_' + key + '.wav')
    if not os.path.exists(pout):
        write_wav(pin, a)
        ratio = len(a) / target_len
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pin, '-af', 'rubberband=tempo=%.4f' % ratio, '-ar', str(SR), '-ac', '1', pout], check=True)
        os.remove(pin)
    b = read_wav(pout)
    return b[:target_len] if len(b) >= target_len else np.pad(b, (0, target_len - len(b)))

def speak(spk, text, rate=1.0, fx=None):
    """Gibt (audio, {mitglied: audio}) zurück; Chor = mehrere Stimmen gemischt."""
    if spk in CHORUS:
        parts = {m: tts_one(m, text, rate, fx if fx in FX_FILTERS else None) for m in CHORUS[spk]}
        n = int(np.mean([len(p) for p in parts.values()]))
        parts = {m: stretch(p, n) for m, p in parts.items()}
        mix = sum(parts.values()) / math.sqrt(len(parts)) * 0.95
        return mix, parts
    a = tts_one(spk, text, rate, fx if fx in FX_FILTERS else None)
    return a, {spk: a}

def envelope(a):
    hop = SR // FPS
    n = max(1, int(math.ceil(len(a) / hop)))
    pad = np.pad(a, (0, n * hop - len(a)))
    rms = np.sqrt((pad.reshape(n, hop) ** 2).mean(1))
    m = np.percentile(rms, 95) + 1e-6
    return [round(float(min(1, r / m)), 2) for r in rms]

# ------------------------------------------------------------------ Klangbausteine
def t_(d): return np.arange(int(d * SR)) / SR
def adsr(n, a=0.01, d=0.1, s=0.7, r=0.1):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na) if na else e[:na]
    nd = min(nd, n - na); e[na:na + nd] = np.linspace(1, s, nd) if nd else e[na:na + nd]
    if nr and nr < n: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def mtof(m): return 440 * 2 ** ((m - 69) / 12)

_note_cache = {}
def pluck(f, d, bright=0.5, decay=0.996):
    key = ('pl', round(f, 2), round(d, 3), bright, decay)
    if key in _note_cache: return _note_cache[key]
    n = int(d * SR); N = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, N) * 0.8
    buf = bright * buf + (1 - bright) * np.convolve(buf, np.ones(3) / 3, 'same')
    out = np.zeros(n + N)
    out[:N] = buf
    k = N
    while k < n:
        prev = out[k - N:k]
        nxt = decay * 0.5 * (prev + np.roll(prev, 1))
        m = min(N, n - k)
        out[k:k + m] = nxt[:m]
        k += N
    y = out[:n] * adsr(n, 0.002, 0.05, 1, min(0.05, d / 3))
    _note_cache[key] = y
    return y

def bell(f, d, partials=((1, 1), (2.76, 0.4), (5.4, 0.18), (8.9, 0.08)), dec=3.0):
    key = ('bl', round(f, 2), round(d, 3), dec)
    if key in _note_cache: return _note_cache[key]
    t = t_(d); y = np.zeros_like(t)
    for p, amp in partials:
        y += amp * np.sin(2 * np.pi * f * p * t) * np.exp(-t * dec * (0.6 + p * 0.5))
    y *= adsr(len(t), 0.002, 0.0, 1, 0.02)
    _note_cache[key] = y
    return y

def sine(f, d, a=0.01, r=0.1, harm=0.0, vib=0.0, vibf=5):
    t = t_(d)
    ph = 2 * np.pi * f * t + (vib * np.sin(2 * np.pi * vibf * t) if vib else 0)
    y = np.sin(ph) + harm * np.sin(2 * ph)
    return y * adsr(len(t), a, 0.05, 0.85, r)

def reed(f, d, vib=0.004, bright=5, a=0.03, r=0.08):
    """Klarinette/Fagott-artig: ungerade Obertöne."""
    t = t_(d)
    ph = 2 * np.pi * f * t * (1 + vib * np.sin(2 * np.pi * 5 * t))
    y = sum(np.sin((2 * k + 1) * ph) / (2 * k + 1) ** 1.3 for k in range(bright))
    return y * adsr(len(t), a, 0.05, 0.8, r) * 0.5

def brass(f, d, a=0.05, r=0.1, n=8):
    t = t_(d)
    ph = 2 * np.pi * f * t
    env = adsr(len(t), a, 0.1, 0.8, r)
    y = sum(np.sin(k * ph) / k * np.clip(env * 1.4 - k * 0.08, 0, 1) for k in range(1, n))
    return y * env * 0.45

def pad(fs, d, a=0.6, r=0.8):
    t = t_(d); y = np.zeros_like(t)
    for f in fs:
        for det in (0.997, 1.0, 1.003):
            y += np.sin(2 * np.pi * f * det * t + rng.uniform(0, 6)) * 0.33
            y += 0.12 * np.sin(4 * np.pi * f * det * t)
    return y / max(1, len(fs)) * adsr(len(t), a, 0.2, 0.9, r)

def noise(d, lp=None, hp=None):
    y = rng.uniform(-1, 1, int(d * SR))
    if lp: y = onepole_lp(y, lp)
    if hp: y = y - onepole_lp(y, hp)
    return y

def onepole_lp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], x)

def kick(d=0.25):
    t = t_(d); f = 120 * np.exp(-t * 25) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
def snare(d=0.18): t = t_(d); return (noise(d, lp=6000) * 0.8 + 0.3 * np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 22)
def hat(d=0.05): t = t_(d); return noise(d, hp=7000) * np.exp(-t * 80) * 0.5
def clap(d=0.15):
    t = t_(d); e = np.exp(-t * 30)
    for k in (0.01, 0.02): e += np.exp(-np.clip(t - k, 0, None) * 60) * (t > k)
    return noise(d, lp=5000, hp=800) * e * 0.5

def put(buf, x, start):
    s = int(start * SR)
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s]

# ------------------------------------------------------------------ Geräusche
def sweep(f0, f1, d, shape='exp', wave_='sine'):
    t = t_(d)
    f = f0 * (f1 / f0) ** (t / d) if shape == 'exp' else np.linspace(f0, f1, len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) if wave_ == 'sine' else (2 * ((ph / (2 * np.pi)) % 1) - 1)

def sfx(name):
    if name == 'tick': y = bell(2400, 0.08, dec=40) * 0.4; y[:int(0.03 * SR)] += noise(0.03, hp=3000) * 0.15; return y
    if name == 'click': return noise(0.03, hp=2000) * np.exp(-t_(0.03) * 120) * 0.6
    if name == 'alarm':
        y = np.zeros(int(1.3 * SR))
        for k in range(int(1.3 / 0.06)):
            put(y, bell(2200 + (k % 2) * 300, 0.12, dec=12) * 0.35, k * 0.06)
        return y
    if name == 'ring':
        y = np.zeros(int(1.6 * SR))
        for k in range(int(1.6 / 0.1)):
            put(y, bell(1500 + (k % 2) * 250, 0.18, dec=10) * 0.35, k * 0.1)
        return y
    if name == 'fanfare':
        y = np.zeros(int(1.6 * SR))
        for i, (m, st, d) in enumerate([(67, 0, 0.18), (67, 0.2, 0.18), (72, 0.4, 0.9)]):
            for mm in (m, m + 4, m + 7):
                put(y, brass(mtof(mm), d) * 0.18, st)
        return y
    if name in ('drumroll', 'drumroll_long'):
        d = 1.7 if name == 'drumroll' else 3.1
        y = np.zeros(int((d + 0.3) * SR))
        k = 0.0
        while k < d:
            put(y, snare(0.08) * (0.25 + 0.35 * k / d), k); k += 0.045
        return y
    if name == 'cricket':
        y = np.zeros(int(0.9 * SR))
        for k in range(3):
            put(y, sine(4300, 0.07, a=0.005, r=0.02) * (0.5 + 0.5 * np.sin(2 * np.pi * 60 * t_(0.07))) * 0.25, k * 0.1)
        return y
    if name == 'hit':
        y = np.zeros(int(1.2 * SR))
        for m in (48, 55, 60, 64, 67, 72): put(y, brass(mtof(m), 0.8, a=0.005, r=0.5) * 0.15, 0)
        put(y, kick(0.5) * 0.7, 0); put(y, noise(0.6, lp=3000) * np.exp(-t_(0.6) * 8) * 0.3, 0)
        return y
    if name == 'boing':
        t = t_(0.45); f = 180 + 260 * np.exp(-t * 6) * (1 + 0.35 * np.sin(2 * np.pi * 14 * t))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.5
    if name == 'hop':
        t = t_(0.25); return sweep(300, 700, 0.25) * np.exp(-t * 8) * 0.3
    if name == 'hiccup_boing':
        return np.concatenate([sweep(500, 900, 0.08) * 0.4, sfx('boing') * 0.8])
    if name == 'tada':
        y = np.zeros(int(1.0 * SR))
        put(y, sum(bell(mtof(m), 0.8) for m in (72, 76, 79)) * 0.2, 0.0)
        put(y, sum(pluck(mtof(m), 0.6) for m in (60, 64, 67)) * 0.25, 0.0)
        return y
    if name == 'curtain': return noise(0.7, lp=2500, hp=300) * adsr(int(0.7 * SR), 0.1, 0.2, 0.6, 0.3) * 0.35
    if name in ('swoosh', 'whoosh'):
        d = 0.35 if name == 'swoosh' else 0.6
        t = t_(d); y = noise(d, lp=4000, hp=400) * np.sin(np.pi * t / d) ** 2
        return y * 0.5
    if name in ('plopp', 'pop', 'plop'):
        return sweep(900, 260, 0.09) * np.exp(-t_(0.09) * 30) * 0.6
    if name == 'squeak':
        t = t_(0.25); f = 1800 + 900 * np.sin(2 * np.pi * 6 * t)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(len(t), 0.01, 0.05, 0.8, 0.05) * 0.2
    if name == 'knock':
        y = np.zeros(int(0.6 * SR))
        for k in (0, 0.22):
            put(y, (sine(180, 0.08, a=0.001, r=0.05) + noise(0.08, lp=1200) * 0.6) * np.exp(-t_(0.08) * 40) * 0.6, k)
        return y
    if name in ('bonk', 'thump', 'plumps'):
        f = {'bonk': 140, 'thump': 90, 'plumps': 110}[name]
        t = t_(0.3); y = np.sin(2 * np.pi * np.cumsum(f * np.exp(-t * 6) + 50) / SR) * np.exp(-t * 14)
        if name == 'bonk': y += bell(900, 0.3, dec=12) * 0.2
        return y * 0.7
    if name == 'murmur':
        y = np.zeros(int(3.0 * SR))
        for k in range(10):
            put(y, noise(0.5, lp=900, hp=200) * np.sin(np.pi * t_(0.5) / 0.5) * 0.12, rng.uniform(0, 2.5))
        return y
    if name == 'pfft':
        t = t_(0.8); return noise(0.8, lp=1500, hp=200) * np.exp(-t * 3) * 0.35 + sweep(300, 90, 0.8, 'lin') * np.exp(-t * 3) * 0.15
    if name == 'inflate':
        t = t_(1.7); return (noise(1.7, lp=1200, hp=200) * 0.25 + sweep(150, 700, 1.7) * 0.12) * adsr(len(t), 0.1, 0, 1, 0.1)
    if name == 'inflate_up':
        t = t_(3.0); return (noise(3.0, lp=1500, hp=200) * 0.2 + sweep(120, 900, 3.0) * 0.15) * adsr(len(t), 0.2, 0, 1, 0.2)
    if name == 'pling': return bell(mtof(88), 1.0) * 0.3 + bell(mtof(84), 1.0) * 0.15
    if name == 'sparkle':
        y = np.zeros(int(1.4 * SR))
        for k in range(9): put(y, bell(mtof(84 + rng.choice([0, 2, 4, 7, 9, 12])), 0.6) * 0.12, k * 0.12)
        return y
    if name == 'surr': t = t_(2.0); return sine(110, 2.0, harm=0.5) * (0.5 + 0.5 * np.sin(2 * np.pi * 8 * t)) * 0.12
    if name == 'zoom': return sweep(200, 600, 2.5) * adsr(int(2.5 * SR), 0.3, 0, 1, 0.3) * 0.08 + noise(2.5, lp=1000) * 0.05
    if name == 'crash':
        y = noise(0.5, lp=3000) * np.exp(-t_(0.5) * 10) * 0.5
        y[:int(0.3 * SR)] += kick(0.3) * 0.6
        return y
    if name == 'cacophony':
        y = np.zeros(int(1.5 * SR))
        for k in range(8):
            f = rng.uniform(300, 1200)
            metal = sum(np.sin(2 * np.pi * f * p * t_(0.4)) for p in (1, 2.4, 3.9)) * np.exp(-t_(0.4) * 8) * 0.1
            put(y, metal, k * 0.15)
        put(y, brass(mtof(58), 1.0) * 0.2, 0.2); put(y, brass(mtof(61), 0.8) * 0.2, 0.5)
        put(y, sfx('squeak') * 1.5, 0.4)
        return y
    if name == 'elephant':
        t = t_(1.2); f = 260 + 120 * np.sin(np.pi * t / 1.2) + 15 * np.sin(2 * np.pi * 7 * t)
        ph = 2 * np.pi * np.cumsum(f) / SR
        y = sum(np.sin(k * ph) / k for k in range(1, 10)) * adsr(len(t), 0.05, 0.1, 0.9, 0.2)
        return y * 0.25
    if name == 'wahwah':
        y = np.zeros(int(2.0 * SR))
        for i, m in enumerate([58, 57, 56]): put(y, brass(mtof(m), 0.4) * 0.3, i * 0.42)
        t = t_(0.9); put(y, brass(mtof(55), 0.9) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * t)) * 0.3, 1.26)
        return y
    if name == 'drip': return sweep(600, 1600, 0.06) * np.exp(-t_(0.06) * 40) * 0.4
    if name in ('pff_sad', 'pff_yes', 'puffpuff', 'puff_big', 'strain'):
        def puff(d, lp, vol, pitch=None):
            t = t_(d); y = noise(d, lp=lp, hp=150) * np.sin(np.pi * t / d) ** 1.5 * vol
            if pitch: y += sine(pitch, d, a=0.02, r=0.05) * np.sin(np.pi * t / d) * vol * 0.3
            return y
        if name == 'pff_sad':
            y = np.zeros(int(1.8 * SR)); put(y, puff(0.6, 1500, 0.5, 520), 0); put(y, puff(0.8, 1200, 0.45, 440), 0.8); return y
        if name == 'pff_yes': return puff(0.3, 2500, 0.6, 880)
        if name == 'puffpuff':
            y = np.zeros(int(0.8 * SR)); put(y, puff(0.25, 2500, 0.6, 990), 0); put(y, puff(0.25, 2500, 0.6, 1180), 0.33)
            put(y, bell(mtof(91), 0.5) * 0.12, 0.33); return y
        if name == 'puff_big': return puff(1.0, 600, 0.9, 110)
        if name == 'strain':
            t = t_(2.4); y = puff(2.4, 1800, 0.5, None) + sine(600, 2.4, a=0.1, r=0.2, vib=4, vibf=9) * 0.08
            return y
    if name == 'swirl':
        t = t_(1.4); return noise(1.4, lp=2500, hp=300) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t)) * np.sin(np.pi * t / 1.4) * 0.35 + \
            sweep(400, 1600, 1.4) * 0.06
    if name == 'snore':
        d = 2.8; t = t_(d); y = np.zeros_like(t)
        for k in range(2):
            seg = t_(1.2); s = noise(1.2, lp=500, hp=60) * np.sin(np.pi * seg / 1.2) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * seg))
            put(y, s * 0.5, k * 1.4)
        return y
    if name == 'yawn_small': return sine(500, 0.9, a=0.2, r=0.4, vib=3, vibf=4) * 0.1 + noise(0.9, lp=900) * adsr(int(0.9 * SR), 0.2, 0, 1, 0.4) * 0.1
    if name == 'slurp':
        y = np.zeros(int(1.3 * SR))
        for k in range(5): put(y, noise(0.18, lp=2500, hp=700) * np.sin(np.pi * t_(0.18) / 0.18) * 0.45 + sweep(400, 900, 0.18) * 0.06, k * 0.22)
        return y
    if name == 'wind': t = t_(4.5); return noise(4.5, lp=600, hp=80) * (0.5 + 0.3 * np.sin(2 * np.pi * 0.4 * t)) * adsr(len(t), 1.0, 0, 1, 1.0) * 0.3
    if name == 'huii': return sweep(700, 1700, 0.6) * adsr(int(0.6 * SR), 0.05, 0.1, 0.8, 0.2) * 0.15 + sfx('sparkle')[:int(0.6 * SR)] * 0.5
    if name == 'slide': t = t_(1.8); return sweep(500, 200, 1.8) * 0.08 * adsr(len(t), 0.2, 0, 1, 0.3)
    if name == 'breath':
        y = np.zeros(int(3.4 * SR))
        for k in range(2): put(y, noise(1.4, lp=700, hp=100) * np.sin(np.pi * t_(1.4) / 1.4) ** 2 * 0.12, k * 1.6)
        return y
    if name == 'flop': return sweep(400, 120, 0.4) * np.exp(-t_(0.4) * 6) * 0.35
    if name == 'feather':
        y = np.zeros(int(1.6 * SR))
        for k in range(6): put(y, noise(0.15, lp=6000, hp=2000) * np.sin(np.pi * t_(0.15) / 0.15) * 0.25, k * 0.25)
        return y
    if name == 'dun':
        y = np.zeros(int(1.2 * SR))
        for m in (45, 52, 57): put(y, brass(mtof(m), 0.9, a=0.01, r=0.4) * 0.18, 0)
        return y
    if name == 'sniff':
        y = np.zeros(int(1.0 * SR))
        for k in (0, 0.35): put(y, noise(0.2, lp=3000, hp=800) * np.sin(np.pi * t_(0.2) / 0.2) * 0.3, k)
        return y
    if name == 'giggle':
        y = np.zeros(int(1.0 * SR))
        for k in range(4): put(y, sine(700 + k * 40, 0.1, a=0.01, r=0.04) * 0.15, k * 0.13)
        return y
    if name == 'stups': return sine(300, 0.08, a=0.001, r=0.05) * np.exp(-t_(0.08) * 40) * 0.4
    if name == 'funk':
        y = noise(0.9, lp=5000, hp=500) * 0.15 * (rng.uniform(0, 1, int(0.9 * SR)) > 0.6)
        put(y, sine(1200, 0.12) * 0.15, 0.7); return y
    if name == 'stretch': return sine(300, 1.4, a=0.3, r=0.6, vib=2, vibf=3) * 0.0 + sweep(200, 500, 1.4) * adsr(int(1.4 * SR), 0.3, 0, 1, 0.6) * 0.1
    if name == 'brush':
        t = t_(0.7); return noise(0.7, lp=5000, hp=1500) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * np.sin(np.pi * t / 0.7) * 0.3
    if name == 'bling':
        y = np.zeros(int(1.2 * SR))
        for i, m in enumerate([84, 88, 91, 96]): put(y, bell(mtof(m), 0.9) * 0.18, i * 0.06)
        return y
    if name == 'swell':
        d = 6.4; t = t_(d); y = np.zeros_like(t)
        k = 0.0
        while k < 2.5:
            put(y, kick(0.2) * 0.25 * (0.3 + k / 2.5), k); k += 0.07
        y += pad([mtof(m) for m in (48, 55, 60, 64, 67)], d, a=4.0, r=1.0) * 0.18
        put(y, sfx('hit') * 0.8, 4.2)
        return y
    if name == 'cheer':
        y = np.zeros(int(2.6 * SR))
        for k in range(14):
            put(y, noise(0.6, lp=2500, hp=400) * np.sin(np.pi * t_(0.6) / 0.6) * 0.08, rng.uniform(0, 1.8))
        put(y, sfx('applause_small') * 0.8, 0.2)
        return y
    if name == 'applause_small':
        y = np.zeros(int(1.4 * SR))
        for k in range(40): put(y, clap(0.08) * rng.uniform(0.3, 0.7), rng.uniform(0, 1.2))
        return y
    if name == 'tupf': return noise(0.1, lp=3000, hp=500) * np.exp(-t_(0.1) * 30) * 0.3
    raise KeyError(name)

def laughs(kind):
    """Lachen aus mehreren Stimmen."""
    who = {'laugh_crowd': ['frog1', 'sheepkid', 'pieks', 'sunny', 'brett'], 'laugh_group': ['pieks', 'tupfi', 'gustav', 'sola'],
           'laugh_two': ['pieks', 'tupfi']}[kind]
    y = np.zeros(int(3.0 * SR))
    for i, w in enumerate(who):
        a = tts_one(w, 'Hahaha!' if i % 2 == 0 else 'Hihihi!', 1.0)
        put(y, a * 0.45, i * 0.12)
    return y

# ------------------------------------------------------------------ Musik
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def chord(name, octave=4):
    root = NOTE[name[0]] + 12 * (octave + 1)
    minor = 'm' in name[1:] and 'maj' not in name
    tri = [0, 3, 7] if minor else [0, 4, 7]
    if '7' in name: tri.append(11 if 'maj' in name else 10)
    return [root + i for i in tri]

THEME = [(76, 1), (79, 1), (81, 1), (79, 1), (76, 1), (74, 1), (72, 2), (74, 1), (76, 1), (79, 1), (84, 1), (83, 2), (79, 2),
         (81, 1), (79, 1), (76, 1), (74, 1), (76, 1), (74, 1), (72, 2), (74, 1), (76, 1), (74, 1), (71, 1), (72, 4)]
SONGMEL = [(76, 1), (76, 1), (79, 2), (77, 1), (76, 1), (74, 2), (74, 1), (74, 1), (77, 2), (76, 1), (74, 1), (72, 2)]

CUES = {
    'night':   dict(bpm=70, prog=['Cmaj7', 'Am7', 'Fmaj7', 'G'], pad=0.22, twinkle=0.12),
    'theme':   dict(bpm=124, prog=['C', 'G', 'Am', 'F'], strum=0.22, bass=0.25, clap=0.12, mel=THEME, melv=0.16, mel_inst='bell'),
    'morning': dict(bpm=112, prog=['C', 'F', 'G', 'C'], pizz=0.2, bassoon=0.12, bass=0.15),
    'mystery': dict(bpm=92, prog=['Am', 'F', 'Dm', 'E'], pizz=0.16, celesta=0.1, pad=0.08, bass=0.12),
    'cozy':    dict(bpm=84, prog=['F', 'C', 'Dm', 'C'], musicbox=0.14, pad=0.1, bass=0.1),
    'march':   dict(bpm=116, prog=['C', 'G', 'C', 'F', 'C', 'G', 'C', 'C'], snare=0.1, bass=0.2, strum=0.12, mel=THEME, melv=0.12, mel_inst='reed'),
    'sleepy':  dict(bpm=64, prog=['Fmaj7', 'Em7', 'Dm7', 'C'], pad=0.16, harp=0.12, bassoon=0.1),
    'flight':  dict(bpm=96, prog=['C', 'Am', 'F', 'G'], pad=0.22, harp=0.15, twinkle=0.1, bass=0.15, mel=THEME, melv=0.1, mel_inst='bell'),
    'secret':  dict(bpm=76, prog=['Am', 'Fmaj7', 'C', 'G'], harp=0.14, pad=0.12),
    'warm':    dict(bpm=84, prog=['C', 'Em', 'F', 'G'], harp=0.12, pad=0.12, musicbox=0.06, bass=0.1),
    'song':    dict(bpm=104, prog=['C', 'F', 'G', 'C'], strum=0.22, bass=0.25, clap=0.12, mel=SONGMEL, melv=0.12, mel_inst='bell'),
    'endcard': dict(bpm=104, prog=['C', 'F', 'G', 'C'], strum=0.2, bass=0.22, clap=0.1, mel=SONGMEL, melv=0.2, mel_inst='bell'),
    'sunrise': dict(bpm=90, prog=['C', 'G', 'Am', 'F'], pad=0.2, brass=0.14, bass=0.2, timp=0.18, mel=THEME, melv=0.14, mel_inst='brass'),
    'polka':   dict(bpm=132, prog=['C', 'G', 'G', 'C', 'C', 'F', 'G', 'C'], tuba=0.25, accordion=0.13, mel=THEME, melv=0.13, mel_inst='reed'),
    'evening': dict(bpm=70, prog=['F', 'C', 'Dm', 'G'], musicbox=0.12, pad=0.14),
}

def render_cue(name, dur, bars_exact=None):
    c = CUES[name]; spb = 60 / c['bpm']; bar = 4 * spb
    nbars = bars_exact or int(math.ceil(dur / bar)) + 1
    y = np.zeros(int((nbars * bar + 2) * SR))
    prog = c['prog']
    for b in range(nbars):
        ch = chord(prog[b % len(prog)]); t0 = b * bar
        root = ch[0]
        if 'pad' in c: put(y, pad([mtof(m) for m in ch], bar + 0.4, a=0.5, r=0.6) * c['pad'], t0)
        if 'bass' in c:
            for k, st in enumerate([0, 2]): put(y, sine(mtof(root - 24 + (7 if k else 0)), spb * 1.6, a=0.01, r=0.2, harm=0.3) * c['bass'], t0 + st * spb)
        if 'strum' in c:
            for k in range(4):
                for j, m in enumerate(sorted(ch)):
                    put(y, pluck(mtof(m), spb * 0.95, bright=0.7) * c['strum'] * (1 if k % 2 == 0 else 0.7), t0 + k * spb + j * 0.012)
                if k % 2 == 1:
                    for j, m in enumerate(sorted(ch)):
                        put(y, pluck(mtof(m), spb * 0.45, bright=0.7) * c['strum'] * 0.5, t0 + (k + 0.5) * spb + j * 0.01)
        if 'clap' in c:
            for k in (1, 3): put(y, clap() * c['clap'] * 2, t0 + k * spb)
            for k in range(8): put(y, hat() * c['clap'], t0 + k * spb / 2)
            put(y, kick() * c['clap'] * 2.5, t0); put(y, kick() * c['clap'] * 2.5, t0 + 2 * spb)
        if 'snare' in c:
            for k in range(4): put(y, snare() * c['snare'] * (1.4 if k in (1, 3) else 0.7), t0 + k * spb)
            put(y, snare(0.1) * c['snare'] * 0.6, t0 + 3.5 * spb)
            put(y, kick() * c['snare'] * 2, t0)
        if 'pizz' in c:
            arp = [ch[0], ch[1], ch[2], ch[1], ch[0] + 12, ch[2], ch[1], ch[2]]
            for k, m in enumerate(arp): put(y, pluck(mtof(m), spb * 0.4, bright=0.9, decay=0.985) * c['pizz'], t0 + k * spb / 2)
        if 'harp' in c:
            arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12]
            for k, m in enumerate(arp): put(y, pluck(mtof(m), spb * 1.5, bright=0.4, decay=0.998) * c['harp'], t0 + k * spb / 2)
        if 'bassoon' in c:
            for k in (0, 1.5, 2, 3): put(y, reed(mtof(root - 12 + (7 if k == 2 else 0)), spb * 0.45, bright=4) * c['bassoon'], t0 + k * spb)
        if 'celesta' in c and b % 2 == 0:
            for k, m in enumerate([ch[2] + 12, ch[1] + 12, ch[0] + 12]): put(y, bell(mtof(m), 1.0) * c['celesta'], t0 + (2 + k * 0.5) * spb)
        if 'musicbox' in c:
            pat = [ch[0] + 12, ch[2] + 12, ch[1] + 24, ch[2] + 12, ch[0] + 24, ch[2] + 12]
            for k, m in enumerate(pat): put(y, bell(mtof(m), 0.9, dec=4) * c['musicbox'], t0 + k * bar / 6)
        if 'twinkle' in c:
            for k in range(3): put(y, bell(mtof(rng.choice([84, 86, 88, 91, 93, 96])), 0.9) * c['twinkle'], t0 + rng.uniform(0, bar))
        if 'brass' in c:
            for m in ch: put(y, brass(mtof(m), bar * 0.95, a=0.15, r=0.3) * c['brass'] * 0.6, t0)
        if 'timp' in c:
            put(y, sine(mtof(root - 24), 0.7, a=0.005, r=0.4) * np.exp(-t_(0.7) * 4) * c['timp'] * 2, t0)
        if 'tuba' in c:
            for k in range(4):
                if k % 2 == 0: put(y, brass(mtof(root - 24 + (0 if k == 0 else 7)), spb * 0.5, a=0.01, n=5) * c['tuba'], t0 + k * spb)
                else:
                    for m in ch: put(y, reed(mtof(m), spb * 0.35, vib=0.002, bright=6, a=0.01, r=0.05) * c['accordion'], t0 + k * spb)
    if 'mel' in c:
        mel = c['mel']; L = sum(d for _, d in mel); k = 0.0
        total_beats = nbars * 4
        inst = {'bell': lambda f, d: bell(f, d + 0.6), 'reed': lambda f, d: reed(f, d * 0.9), 'brass': lambda f, d: brass(f, d * 0.95)}[c['mel_inst']]
        while k < total_beats:
            for m, d in mel:
                if k >= total_beats: break
                put(y, inst(mtof(m), d * spb) * c['melv'], k * spb)
                k += d
    return y

# ------------------------------------------------------------------ Zeitleiste
def build():
    timeline = []; t = 0.0
    dlg = []; sfx_ev = []; music_ev = []; subs = []
    for sc in SCENES:
        s0 = t; beats_out = []
        for bt in sc['beats']:
            if bt['kind'] == 'line':
                a, parts = speak(bt['spk'], bt['text'], bt['rate'], bt['fx'])
                dur = len(a) / SR + bt['gap']
                dlg.append((t, a))
                if bt['fx'] and bt['fx'].startswith('note'):
                    i = int(bt['fx'][4:]); sfx_ev.append((t, bell(mtof([72, 74, 76, 77, 79, 81, 83, 84][i]), 1.2) * 0.28))
                env = {m: envelope(p) for m, p in parts.items()}
                beats_out.append(dict(bt, start=t, dur=dur, env=env, alen=len(a) / SR))
                subs.append((t, t + len(a) / SR, VOICE_NAMES.get(bt['spk'], bt['spk']), bt['text']))
            elif bt['kind'] == 'act':
                dur = bt['dur']; beats_out.append(dict(bt, start=t))
            elif bt['kind'] == 'song':
                spb = 60 / bt['bpm']; bar = 4 * spb
                for bi, (who, text) in enumerate(bt['bars']):
                    st = t + bi * bar
                    if who:
                        a, parts = speak(who, text, 1.05)
                        n = len(a); maxn = int(bar * 0.94 * SR)
                        if n > maxn:
                            parts = {m: stretch(p, maxn) for m, p in parts.items()}
                            a = sum(parts.values()) / math.sqrt(len(parts))
                        dlg.append((st + 0.03, a * 1.05))
                        beats_out.append(dict(kind='line', spk=who, text=text, set={}, sfx=None, cam=None, start=st + 0.03, dur=bar - 0.03,
                                              env={m: envelope(p) for m, p in parts.items()}, alen=len(a) / SR, tw=0.3, mouth=None, ctw=0.8, fx=None))
                        subs.append((st + 0.03, st + 0.03 + len(a) / SR, VOICE_NAMES.get(who, who), '♪ ' + text))
                    else:
                        beats_out.append(dict(kind='act', dur=bar, set={}, sfx=None, cam=None, start=st, tw=0.5, ctw=0.8))
                dur = len(bt['bars']) * bar
                music_ev.append((t, 'song', dur, len(bt['bars'])))
            elif bt['kind'] == 'fill':
                dur = max(0.5, bt['total'] - (t - s0)); beats_out.append(dict(kind='act', dur=dur, set={}, sfx=None, cam=None, start=t, tw=0.5, ctw=0.8))
            sfxl = bt.get('sfx')
            if sfxl:
                if isinstance(sfxl, str): sfxl = [(sfxl, 0.0)]
                for nm, off in sfxl:
                    snd = laughs(nm) if nm.startswith('laugh') else sfx(nm)
                    sfx_ev.append((t + off, snd))
            t += dur
        if sc['music'] != 'song' and sc['music']:
            music_ev.append((s0, sc['music'], t - s0, None, sc['mvol']))
        timeline.append(dict(name=sc['name'], start=s0, end=t, beats=beats_out))
    total = t + 0.5
    print('Gesamtlänge: %d:%05.2f' % (total // 60, total % 60))
    N = int(total * SR) + SR
    D = np.zeros(N, np.float32); S = np.zeros(N, np.float32); M = np.zeros(N, np.float32)
    for st, a in dlg: put(D, a, st)
    for st, a in sfx_ev: put(S, a, st)
    # Musik pro Szene, mit Ein-/Ausblenden; gleiche Cues hintereinander laufen weiter
    for ev in music_ev:
        st, cue, dur = ev[0], ev[1], ev[2]
        vol = ev[4] if len(ev) > 4 and ev[4] is not None else 1.0
        if cue == 'song':
            y = render_cue('song', dur, bars_exact=ev[3])[:int(dur * SR)]
        else:
            y = render_cue(cue, dur + 0.6)[:int((dur + 0.5) * SR)]
        rms = np.sqrt(np.mean(y ** 2)) + 1e-6
        y = y * (0.09 / rms)
        n = len(y); fi = int(0.25 * SR); fo = int(0.6 * SR)
        e = np.ones(n); e[:fi] = np.linspace(0, 1, fi); e[-fo:] = np.linspace(1, 0, fo)
        put(M, y * e * vol, st)
    # Ducking: Musik leiser, wenn gesprochen wird
    hop = 441
    env = np.sqrt(np.convolve(D ** 2, np.ones(hop * 8) / (hop * 8), 'same'))
    duck = np.where(env > 0.01, 0.38, 1.0)
    duck = onepole_lp(duck, 3.0)
    mix = D * 1.0 + S * 0.8 + M * 0.55 * duck
    mix = mix / (np.max(np.abs(mix)) + 1e-6) * 0.95
    raw = os.path.join(B, 'mix_raw.wav'); write_wav(raw, mix)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), os.path.join(B, 'master.wav')], check=True)
    json.dump(dict(total=total, scenes=timeline), open(os.path.join(B, 'timeline.json'), 'w'))
    with open(os.path.join(OUT, 'untertitel.srt'), 'w') as f:
        def ts(x): return '%02d:%02d:%02d,%03d' % (x // 3600, x % 3600 // 60, x % 60, (x % 1) * 1000)
        for i, (a, b, who, text) in enumerate(subs, 1):
            f.write('%d\n%s --> %s\n%s: %s\n\n' % (i, ts(a), ts(b), who, text))
    return total

if __name__ == '__main__':
    build()
