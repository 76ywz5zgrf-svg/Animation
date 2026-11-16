#!/usr/bin/env python3
"""Erzeugt Sprechzeilen (Piper), Zeitplan (timeline.json) und die fertige Tonspur (audio.wav).

Aufruf:  python3 make_audio.py <ordner-mit-piper-modellen>
Liegt in voice_override/<id>.mp3|wav eine Datei, wird sie statt der Piper-Zeile benutzt
(z. B. spaeter eingesprochene ElevenLabs-Zeilen).
"""
import json, os, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "models")
OUT = os.path.join(HERE, "build")
VO = os.path.join(OUT, "vo")
OVR = os.path.join(HERE, "voice_override")
os.makedirs(VO, exist_ok=True)
SR = 44100

# Stimme: (modell, sprecher-id, tempo(length_scale), tonhoehe)
VOICES = {
    "erz": ("de_DE-thorsten-high", None, 0.92, 0.94),
    "wach": ("de_DE-karlsson-low", None, 0.95, 0.97),
    "putz": ("de_DE-kerstin-low", None, 0.95, 1.04),
    "dir": ("de_DE-pavoque-low", None, 1.0, 0.92),
}

# Szene -> Liste (id, stimme, text, pause davor)
SCRIPT = [
    ("hook", [("hook1", "erz", "Ein Diebstahl.", 0.25), ("hook2", "erz", "Drei Verdächtige.", 0.22),
              ("hook3", "erz", "Und nur einer lügt.", 0.28)]),
    ("crime", [("crime1", "erz", "Mitternacht.", 0.45), ("crime2", "erz", "In der ganzen Stadt fällt der Strom aus.", 0.25),
               ("crime3", "erz", "Am Morgen ist der goldene Pokal aus dem Museum verschwunden.", 0.75)]),
    ("det", [("det1", "erz", "Detektiv Fuchs befragt drei Verdächtige.", 0.45)]),
    ("s1", [("s1n", "erz", "Der Wachmann sagt:", 0.45), ("s1q", "wach", "Ich steckte die ganze Nacht im Aufzug fest!", 0.3)]),
    ("s2", [("s2n", "erz", "Die Putzfrau sagt:", 0.5), ("s2q", "putz", "Ich habe bei Kerzenlicht den Boden gewischt.", 0.3)]),
    ("s3", [("s3n", "erz", "Der Direktor sagt:", 0.5), ("s3q", "dir", "Ich habe die ganze Nacht in meinem Büro ferngesehen.", 0.3)]),
    ("q", [("q1", "erz", "Wer ist der Dieb?", 0.55)]),
    ("cd", [("cd1", "erz", "Du hast fünf Sekunden.", 0.4), ("cd2", "erz", "Schreib deine Antwort in die Kommentare!", 0.35)]),
    ("rev", [("rev1", "erz", "Die Auflösung:", 0.5), ("rev2", "erz", "Es war der Direktor!", 0.3)]),
    ("exp", [("exp1", "erz", "Ohne Strom läuft kein Fernseher.", 0.55), ("exp2", "erz", "Er hat gelogen!", 0.3)]),
    ("cta", [("cta1", "erz", "Richtig gelöst?", 0.5), ("cta2", "erz", "Dann folge mir für mehr Rätsel!", 0.25)]),
]
COUNTDOWN_LEN = 5.0
TAIL = 1.3


def run(cmd, **kw):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **kw)


def read_wav(path):
    with wave.open(path) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0


def synth(uid, voice, text):
    final = os.path.join(VO, uid + ".wav")
    src = None
    for ext in (".mp3", ".wav"):
        p = os.path.join(OVR, uid + ext)
        if os.path.exists(p):
            # Eingesprochene Zeilen: lange Pausen kuerzen, etwas mehr Tempo, Stimme praesenter
            src, filt = p, ("silenceremove=start_periods=1:start_threshold=-40dB:"
                            "stop_periods=-1:stop_duration=0.18:stop_threshold=-40dB,"
                            f"atempo={1.12 if 'q' not in uid else 1.06},"
                            "highpass=f=80,acompressor=threshold=-18dB:ratio=2.5:makeup=1.5")
    if src is None:
        model, spk, ls, pitch = VOICES[voice]
        src = os.path.join(VO, uid + "_raw.wav")
        cmd = [sys.executable, "-m", "piper", "-m", os.path.join(MODELS, model + ".onnx"),
               "--length-scale", str(ls), "-f", src]
        if spk is not None:
            cmd += ["--speaker", str(spk)]
        run(cmd, input=text.encode())
        with wave.open(src) as w:
            rate = w.getframerate()
        filt = (f"asetrate={int(rate * pitch)},aresample={SR},atempo={1 / pitch:.4f},"
                "silenceremove=start_periods=1:start_threshold=-45dB,"
                "highpass=f=70,acompressor=threshold=-20dB:ratio=3:makeup=2")
        if voice == "erz":
            filt += ",aecho=0.8:0.5:55:0.13"
    run(["ffmpeg", "-y", "-i", src, "-af", filt + ",areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
         f"loudnorm=I=-16:TP=-2,aresample={SR}", "-ac", "1", "-c:a", "pcm_s16le", final])
    return read_wav(final)


# ---------- Zeitplan ----------
t = 0.0
utt, scenes, clips = {}, [], []
for sid, lines in SCRIPT:
    start = t
    for uid, voice, text, gap in lines:
        a = synth(uid, voice, text)
        t += gap * 0.72  # knapper Schnitt = mehr Spannung
        utt[uid] = {"start": round(t, 3), "end": round(t + len(a) / SR, 3), "voice": voice, "text": text}
        clips.append((t, a))
        t += len(a) / SR
    if sid == "q":
        t += 0.85  # Frage kurz stehen lassen
    if sid == "cd":
        t = max(t, start + 0.35 + COUNTDOWN_LEN)
    scenes.append({"id": sid, "start": round(start, 3)})
t += TAIL
DUR = round(np.ceil(t * 24) / 24, 4)
for i, s in enumerate(scenes):
    s["end"] = scenes[i + 1]["start"] if i + 1 < len(scenes) else DUR
S = {s["id"]: s for s in scenes}
timeline = {"fps": 24, "duration": DUR, "scenes": scenes, "u": utt,
            "countdownStart": round(S["cd"]["start"] + 0.35, 3), "countdownLen": COUNTDOWN_LEN,
            "powerOff": round(utt["crime2"]["start"] + 0.62 * (utt["crime2"]["end"] - utt["crime2"]["start"]), 3)}
json.dump(timeline, open(os.path.join(OUT, "timeline.json"), "w"), indent=1, ensure_ascii=False)

# ---------- Musik & Effekte ----------
N = int(DUR * SR)
tt = np.arange(N) / SR
rng = np.random.default_rng(7)
music = np.zeros(N, np.float32)
sfx = np.zeros(N, np.float32)


def add(buf, at, sig, gain=1.0):
    i = int(at * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i]
    buf[i:i + len(sig)] += gain * sig.astype(np.float32)


def env_window(a, b, fade=0.4):
    return np.clip((tt - a) / fade, 0, 1) * np.clip((b - tt) / fade, 0, 1)


def lowpass(x, alpha):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha * (x[i] - acc)
        y[i] = acc
    return y


def pluck(f, d=0.32, bright=0.5):
    n = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * f * n) + bright * np.sin(4 * np.pi * f * n) + 0.25 * bright * np.sin(6 * np.pi * f * n)) * np.exp(-n * 9)


def bell(f, d=1.6):
    n = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * f * n) + 0.4 * np.sin(2 * np.pi * f * 2.01 * n) + 0.2 * np.sin(2 * np.pi * f * 3.0 * n)) * np.exp(-n * 3.2)


def kick(d=0.22):
    n = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * (48 * n + 60 * (1 - np.exp(-n * 30)) / 30)) * np.exp(-n * 16)


def noise_burst(d, color=0.02):
    x = rng.standard_normal(int(d * SR)).astype(np.float32)
    return lowpass(x, color) if color < 1 else x


def whoosh(d=0.35):
    n = np.linspace(0, 1, int(d * SR))
    return noise_burst(d, 0.25) * np.sin(np.pi * n) ** 2


def tick(f=1500):
    n = np.arange(int(0.05 * SR)) / SR
    return np.sin(2 * np.pi * f * n) * np.exp(-n * 90)


mystery_end = S["rev"]["start"]
# Dunkler Grundton (d-Moll) bis zur Aufloesung
drone = sum(np.sin(2 * np.pi * f * tt + p) * (0.75 + 0.25 * np.sin(2 * np.pi * r * tt))
            for f, p, r in ((73.42, 0, 0.11), (110.0, 1, 0.07), (146.83, 2, 0.13), (174.61, 0.5, 0.05)))
music += (0.035 * drone * env_window(0, mystery_end, 0.8)).astype(np.float32)

# Ostinato in Achteln
BPM = 104
step = 60 / BPM / 2
pattern = [146.83, 174.61, 220.0, 174.61, 146.83, 174.61, 233.08, 220.0]
k = 0
x = 0.0
while x < mystery_end - 0.1:
    in_cd = x >= S["cd"]["start"]
    quiet = x < S["det"]["start"]
    add(music, x, pluck(pattern[k % 8] * (2 if in_cd else 1)), 0.035 if quiet else 0.06)
    if k % 4 == 0:
        add(music, x, kick(), 0.22 if (quiet or in_cd) else 0.12)
    if in_cd and k % 2 == 1:
        add(music, x, kick(), 0.12)
    k += 1
    x += step

# Schnitt-Whooshes
for s in scenes[1:]:
    add(sfx, s["start"] - 0.12, whoosh(), 0.16)
# Donner beim Stromausfall
th = noise_burst(2.4, 0.012)
th *= np.exp(-np.linspace(0, 5, len(th))) * (1 + 0.6 * np.sin(np.linspace(0, 40, len(th))))
add(sfx, timeline["powerOff"], th / (np.abs(th).max() + 1e-9), 0.5)
add(sfx, timeline["powerOff"], kick(0.5), 0.5)
# Countdown-Ticks
for i in range(int(COUNTDOWN_LEN)):
    add(sfx, timeline["countdownStart"] + i, tick(1300 + 120 * i), 0.3)
    add(sfx, timeline["countdownStart"] + i + 0.5, tick(900), 0.12)
for j in range(4):
    add(sfx, timeline["countdownStart"] + 4 + j * 0.25, tick(1900), 0.18)
# Aufloesung: Fanfare + heller Teppich
r0 = utt["rev2"]["start"] - 0.05
for j, f in enumerate((587.33, 739.99, 880.0, 1174.66)):
    add(sfx, r0 + 0.09 * j, bell(f), 0.16)
add(sfx, r0, kick(0.4), 0.45)
sw = noise_burst(1.2, 1.0) * np.exp(-np.linspace(0, 6, int(1.2 * SR)))
add(sfx, r0, sw, 0.05)
pad = sum(np.sin(2 * np.pi * f * tt) for f in (146.83, 220.0, 293.66, 369.99))
music += (0.022 * pad * env_window(S["rev"]["start"] + 0.3, DUR, 0.6)).astype(np.float32)
happy = [293.66, 369.99, 440.0, 587.33, 440.0, 369.99, 493.88, 440.0]
k = 0
x = S["exp"]["start"]
while x < DUR - 0.6:
    add(music, x, pluck(happy[k % 8], 0.3, 0.3), 0.05)
    if k % 4 == 0:
        add(music, x, kick(), 0.1)
    k += 1
    x += step
add(sfx, utt["exp1"]["end"] - 0.25, tick(300) * 3, 0.25)  # "falsch"-Buzzer zum roten X
add(sfx, utt["cta1"]["start"], bell(1174.66, 1.0), 0.1)

# ---------- Mischung ----------
voice = np.zeros(N, np.float32)
for at, a in clips:
    add(voice, at, a, 1.0)
# Musik unter der Stimme absenken
level = np.abs(voice)
win = int(0.25 * SR)
smooth = np.convolve(level, np.ones(win) / win, mode="same")
duck = 1.0 - 0.55 * np.clip(smooth / 0.04, 0, 1)
mix = voice * 1.25 + (music * duck + sfx * (0.6 + 0.4 * duck)) * 1.5
fade = np.clip((DUR - tt) / 0.5, 0, 1)
mix = np.tanh(mix * 1.1) * fade
stereo = np.stack([mix, mix], axis=1)
with wave.open(os.path.join(OUT, "audio.wav"), "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(stereo, -1, 1) * 32767).astype(np.int16).tobytes())
print("Dauer:", DUR, "s")
for s in scenes:
    print(f"  {s['id']:6s} {s['start']:6.2f} – {s['end']:6.2f}")
