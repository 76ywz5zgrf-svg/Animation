"""Builds timeline.json (line + word timings + story events) and the full audio mix."""
import json, subprocess, numpy as np

SR = 44100
SCRIPT = [  # id, speaker ("T" = on-screen text only, no voice), text, pause after
    ("n0", "N", "Er sagt, er lügt nie. Aber er versteckt etwas.", .3),
    ("n1", "T", "In dieser Stadt wächst jeder, der lügt. Und jeder sieht deine Zahl.", .1),
    ("n2", "N", "Leo hat noch nie gelogen. Zahl: Null.", .15),
    ("t1", "tim", "Ich hab meine Hausaufgaben gemacht! Ups.", .45),
    ("n3", "N", "Schrumpfen? Geht nur mit der Wahrheit. Und mit Aufgaben.", .55),
    ("n4", "T", "Nur einer ist anders: der Bürgermeister. Klein. Beliebt. Zahl: Null.", .1),
    ("m1", "mayor", "Liebe Bürger! Ich lüge niemals! Hahaha!", .15),
    ("n5", "N", "Aber Leo fiel was auf. Warum trägt er immer diesen Hut? Und warum machen alle anderen seine Aufgaben?", .1),
    ("l1", "leo", "Moment mal! Die Aufgaben sind gar nicht für die Stadt. Die sind für dich! Damit du klein bleibst!", .1),
    ("m2", "mayor", "Was? Das... das stimmt doch gar nicht!", .05),
    ("n6", "T", "Und mit dieser Lüge... fiel der Hut.", 1.0),
    ("l2", "leo", "Neunundneunzig?! Du hast uns alle verarscht!", .2),
    ("n7", "T", "Jetzt macht er seine Aufgaben selbst. Und der neue Bürgermeister? Der Kleinste der Stadt.", .1),
    ("n8", "T", "Und du? Wie groß wärst du? Schreib's in die Kommentare!", 1.2),
]

def load(p):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(b, np.float32).copy()

wj = json.load(open("words.json"))
t = 0.3
lines, voice, ticks = [], [], []
for lid, spk, text, gap in SCRIPT:
    toks = text.replace("...", " ").split()
    if spk == "T":  # text card: fast TikTok reading pace, no voice
        tim, c = [], 0.0
        for x in toks:
            d = 0.2 + 0.035 * len(x) + (0.25 if x[-1] in ".?!:" else 0); tim.append((c, c + d)); c += d
        dur = c; a = None; wh = None
    else:
        a = load(f"voice/{lid}.wav"); dur = len(a) / SR; wh = wj[lid]
    if wh is None: pass
    elif len(wh) == len(toks):
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
    if a is not None: voice.append((t, a))
    else: ticks.extend(w['s'] for w in words)
    t += dur + gap
TOTAL = round(t, 2)
L = {l["id"]: l for l in lines}
W = lambda lid, i: L[lid]["words"][i]["s"]
ev = {
    "bobTick": -100.0,
    "timGrow": W("t1", 5),
    "timShrink": L["n3"]["end"] + 0.1,
    "hatFall": W("n6", 4),
    "mayorReveal": W("n6", 4) + 0.55,
    "mayorGrow": max(L["n6"]["end"] + 0.2, W("n6", 4) + 1.4),
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
put(ev["timGrow"], pop, .5); put(ev["timGrow"] + .05, boing, .4)
put(ev["timShrink"], pop, .4); put(ev["timShrink"] + .05, shrink, .3)
put(ev["hatFall"], whoosh, .6)
for tk in ticks: put(tk, env(tone(1800, 1200, 0.04), r=60), .25)
put(ev["mayorReveal"], pop, .6)
put(ev["mayorGrow"], grow, .35); put(ev["mayorGrow"], rumble, .6)
for k in ("n2",):  # little pop when Leo's 0 is shown
    put(W("n2", 6), pop, .35)

# tense pulsing score: kick, offbeat hats, saw bass; drops out before the reveal, then hits
mus = np.zeros(N, np.float32)
bpm = 128; beat = 60 / bpm
def saw(f, d):
    tt = np.arange(int(d * SR)) / SR; x = 2 * ((tt * f) % 1) - 1
    x = np.convolve(x, np.ones(18) / 18, "same")
    return (x * np.exp(-tt * 6)).astype(np.float32)
kick = env(tone(140, 42, 0.32), r=9)
hat = np.diff(rng.standard_normal(int(.05 * SR) + 1)).astype(np.float32) * np.exp(-np.arange(int(.05 * SR)) / SR * 80).astype(np.float32) * .25
roots = [110.0, 87.3, 130.8, 98.0]
def addm(at, sig, g):
    i = int(at * SR); n = min(len(sig), N - i)
    if n > 0 and i >= 0: mus[i:i + n] += g * sig[:n]
silence = (ev["hatFall"] - 1.6, ev["hatFall"])
b = 0; tt = 0.0
while tt < TOTAL:
    inten = 0.55 if tt < L["n4"]["start"] else (0.8 if tt < L["l1"]["start"] else 1.0)
    if not (silence[0] <= tt < silence[1]):
        r = roots[(b // 8) % 4]
        if tt > 0.3: addm(tt, kick, 0.9 * inten)
        addm(tt + beat / 2, hat, 0.6 * inten)
        addm(tt, saw(r, beat * .45), .35 * inten); addm(tt + beat / 2, saw(r * (2 if b % 2 else 1), beat * .45), .3 * inten)
        if tt > L["l1"]["start"]: addm(tt + beat / 4, hat, .35)
    b += 1; tt += beat
# riser into the hat fall + big impacts
rl = 1.6; rn = int(rl * SR); tt_ = np.arange(rn) / SR
riser = (np.diff(rng.standard_normal(rn + 1)) * (tt_ / rl) ** 2 * .5 + np.sin(2 * np.pi * np.cumsum(200 * 4 ** (tt_ / rl)) / SR) * (tt_ / rl) * .3).astype(np.float32)
addm(ev["hatFall"] - rl, riser, .8)
boom = (env(tone(90, 28, 1.6), r=2.2) + np.convolve(rng.standard_normal(int(1.6 * SR)), np.ones(200) / 200, "same").astype(np.float32) * np.exp(-np.arange(int(1.6 * SR)) / SR * 3).astype(np.float32) * 6)
for e in ("hatFall", "mayorReveal", "mayorGrow"): addm(ev[e], boom, 1.0)
addm(0.0, boom, .7)
# duck music under voice
vabs = np.abs(vo); win = int(.15 * SR)
envv = np.convolve(vabs, np.ones(win) / win, "same")
duck = 1 - 0.55 * np.clip(envv / 0.05, 0, 1)
mix = vo * 1.0 + fx * 0.8 + mus * 0.22 * duck
mix /= max(1e-6, np.abs(mix).max()) / 0.95
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "render/audio.wav"], input=mix.astype(np.float32).tobytes())
print("total", TOTAL, ev)
