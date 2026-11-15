"""Builds timeline.json (line + word timings + story events) and the full audio mix."""
import json, subprocess, numpy as np

SR = 44100
SCRIPT = [  # id, speaker, text, pause after
    ("n1", "N", "In dieser Stadt wächst jeder Mensch so groß, wie oft er lügt. Jede Lüge: plus eins. Und alle sehen deine Zahl.", .35),
    ("n2", "N", "Das ist Leo. Leo hat noch nie gelogen. Seine Zahl: Null.", .35),
    ("t1", "tim", "Ich hab meine Hausaufgaben gemacht! Ups.", .6),
    ("n3", "N", "Wer wieder schrumpfen will, muss die Wahrheit sagen. Und Aufgaben erfüllen.", .3),
    ("t2", "tim", "Okay, okay... ich trag ja schon die Kisten!", 1.0),
    ("n4", "N", "Aber einer ist ganz anders: der Bürgermeister. Klein, freundlich, und seine Zahl: Null.", .3),
    ("m1", "mayor", "Liebe Bürger! Ich lüge niemals! Hihihi!", .35),
    ("n5", "N", "Doch Leo merkte was Komisches. Warum trägt der Bürgermeister immer diesen riesigen Hut? Und warum müssen alle jeden Tag seine Aufgaben machen?", .3),
    ("l1", "leo", "Moment mal! Die Aufgaben sind gar nicht für die Stadt. Die sind für dich! Damit du klein bleibst!", .3),
    ("m2", "mayor", "Was? Das... das stimmt doch gar nicht!", .3),
    ("n6", "N", "Und bei dieser Lüge... fiel der Hut runter.", 1.3),
    ("l2", "leo", "Neunundneunzig?! Du hast uns alle verarscht!", .4),
    ("n7", "N", "Seitdem macht der Bürgermeister seine Aufgaben selbst. Ganz schön viele. Und der neue Bürgermeister? Der Kleinste der ganzen Stadt.", 2.2),
]

def load(p):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(b, np.float32).copy()

wj = json.load(open("words.json"))
t = 0.5
lines, voice = [], []
for lid, spk, text, gap in SCRIPT:
    a = load(f"voice/{lid}.wav"); dur = len(a) / SR
    toks = text.replace("...", " ").split()
    wh = wj[lid]
    if len(wh) == len(toks):
        tim = [(s, e) for _, s, e in wh]
    elif len(wh) < len(toks):
        tim = [(s, e) for _, s, e in wh[:len(toks) - 1]]
        a0 = tim[-1][1]; rest = toks[len(tim):]; step = (dur - a0) / len(rest)
        tim += [(a0 + i * step, a0 + (i + 1) * step) for i in range(len(rest))]
    else:
        a0, a1 = wh[0][1], wh[-1][2]; L = sum(len(x) + 2 for x in toks); c = a0
        tim = []
        for x in toks:
            d = (a1 - a0) * (len(x) + 2) / L; tim.append((c, c + d)); c += d
    words = [{"w": w, "s": round(t + s, 3), "e": round(t + e, 3)} for w, (s, e) in zip(toks, tim)]
    lines.append({"id": lid, "spk": spk, "start": round(t, 3), "end": round(t + dur, 3), "words": words})
    voice.append((t, a))
    t += dur + gap
TOTAL = round(t, 2)
L = {l["id"]: l for l in lines}
W = lambda lid, i: L[lid]["words"][i]["s"]
ev = {
    "bobTick": W("n1", 15),
    "timGrow": W("t1", 5),
    "timShrink": L["t2"]["end"] + 0.25,
    "hatFall": W("n6", 4),
    "mayorReveal": W("n6", 4) + 0.55,
    "mayorGrow": L["n6"]["end"] + 0.2,
}
json.dump({"total": TOTAL, "lines": lines, "ev": ev}, open("render/timeline.json", "w"), ensure_ascii=False, indent=1)

# ---------------- audio mix ----------------
N = int((TOTAL + 0.5) * SR)
vo = np.zeros(N, np.float32)
for st, a in voice:
    i = int(st * SR); vo[i:i + len(a)] += a
rng = np.random.default_rng(3)
fx = np.zeros(N, np.float32)
def put(at, sig, g=1.0):
    i = int(at * SR); n = min(len(sig), N - i); fx[i:i + n] += g * sig[:n]
def tone(f0, f1, d, kind="sine"):
    tt = np.arange(int(d * SR)) / SR
    f = f0 * (f1 / f0) ** (tt / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) if kind == "sine" else np.sign(np.sin(ph)) * 0.5
    return s.astype(np.float32)
def env(sig, a=0.005, r=None):
    n = len(sig); e = np.ones(n, np.float32)
    na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    e *= np.exp(-np.arange(n) / SR * (r if r else 0))
    return sig * e
pop = env(tone(500, 1400, 0.12), r=25)
boing = env(tone(180, 520, 0.5) * (1 + 0.5 * np.sin(2 * np.pi * 18 * np.arange(int(.5 * SR)) / SR)), r=5)
shrink = env(tone(900, 250, 0.6), r=4)
whoosh = env(np.convolve(rng.standard_normal(int(.5 * SR)), np.ones(40) / 40, "same").astype(np.float32) * np.hanning(int(.5 * SR)).astype(np.float32), a=0.05) * 2.5
rumble = (np.convolve(rng.standard_normal(int(2 * SR)), np.ones(300) / 300, "same") * 12).astype(np.float32) * np.hanning(int(2 * SR)).astype(np.float32)
grow = env(tone(90, 420, 2.0), a=0.1) * np.linspace(0.3, 1, int(2 * SR)).astype(np.float32)
put(ev["bobTick"], pop, .5); put(ev["bobTick"] + .05, boing, .3)
put(ev["timGrow"], pop, .5); put(ev["timGrow"] + .05, boing, .4)
put(ev["timShrink"], pop, .4); put(ev["timShrink"] + .05, shrink, .3)
put(ev["hatFall"], whoosh, .6)
put(ev["mayorReveal"], pop, .6)
put(ev["mayorGrow"], grow, .35); put(ev["mayorGrow"], rumble, .6)
for k in ("n2",):  # little pop when Leo's 0 is shown
    put(W("n2", 10), pop, .35)

# cheerful plucked background loop (Karplus-Strong), quiet
def pluck(freq, d=0.6):
    n = int(d * SR); p = int(SR / freq); buf = rng.uniform(-1, 1, p).astype(np.float32); out = np.zeros(n, np.float32)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out
cache = {}
def P(f):
    if f not in cache: cache[f] = pluck(f)
    return cache[f]
mus = np.zeros(N, np.float32)
bpm = 112; beat = 60 / bpm
chords = [[261.6, 329.6, 392.0], [196.0, 246.9, 293.7], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6]]
bass = [130.8, 98.0, 110.0, 87.3]
b = 0; tt = 0.0
while tt < TOTAL + 0.5:
    ci = (b // 4) % 4; ch = chords[ci]
    i = int(tt * SR)
    def add(sig, g):
        n = min(len(sig), N - i)
        if n > 0: mus[i:i + n] += g * sig[:n]
    if b % 4 in (0, 2): add(P(bass[ci]), .5)
    add(P(ch[b % 3]), .35);
    j = int((tt + beat / 2) * SR)
    if j < N:
        s = P(ch[(b + 1) % 3] * 2); n = min(len(s), N - j); mus[j:j + n] += .18 * s[:n]
    b += 1; tt += beat
# duck music under voice
vabs = np.abs(vo); win = int(.15 * SR)
envv = np.convolve(vabs, np.ones(win) / win, "same")
duck = 1 - 0.55 * np.clip(envv / 0.05, 0, 1)
mix = vo * 1.0 + fx * 0.8 + mus * 0.09 * duck
mix /= max(1e-6, np.abs(mix).max()) / 0.95
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "render/audio.wav"], input=mix.astype(np.float32).tobytes())
print("total", TOTAL, ev)
