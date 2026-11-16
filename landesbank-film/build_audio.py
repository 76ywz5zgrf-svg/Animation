#!/usr/bin/env python3
"""Erzeugt Stimmen (Piper TTS, lokal), SFX, Musik, Timeline und Untertitel."""
import json, os, hashlib, subprocess, wave
import numpy as np
from scipy import signal
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.environ.get("PIPER_VOICES", os.path.join(HERE, "voices"))
B = os.path.join(HERE, "build"); os.makedirs(B + "/lines", exist_ok=True)
os.makedirs(HERE + "/output", exist_ok=True)
SR = 44100
rng = np.random.default_rng(7)

VOICES = {
    "BEN":    dict(model="de_DE-thorsten-high", speaker=None, length=0.92, af=""),
    "MALIK":  dict(model="de_DE-mls-medium", speaker=126, length=0.78, af=""),
    "SOLDAT": dict(model="de_DE-thorsten_emotional-medium", speaker=1, length=0.95,
                   af="rubberband=pitch=0.84,"),
    "FUNK":   dict(model="de_DE-thorsten_emotional-medium", speaker=4, length=0.95,
                   af="rubberband=pitch=0.9,highpass=f=600,lowpass=f=2600,acrusher=bits=7:mix=0.5,"),
}
_loaded = {}


def tts(who, text, whisper, room):
    v = VOICES[who]
    key = hashlib.md5(json.dumps([v, text, whisper, room], sort_keys=True).encode()).hexdigest()[:12]
    out = f"{B}/lines/{who}_{key}.wav"
    if not os.path.exists(out):
        if v["model"] not in _loaded:
            _loaded[v["model"]] = PiperVoice.load(f"{VO}/{v['model']}.onnx")
        raw = out + ".raw.wav"
        with wave.open(raw, "wb") as w:
            _loaded[v["model"]].synthesize_wav(text, w, syn_config=SynthesisConfig(
                speaker_id=v["speaker"], length_scale=v["length"]))
        trim = "silenceremove=start_periods=1:start_threshold=-45dB"
        af = v["af"] + f"{trim},areverse,{trim},areverse,loudnorm=I=-18:TP=-2,"
        if whisper: af += "highpass=f=180,volume=0.7,"
        if room: af += "aecho=0.8:0.6:45|90:0.22|0.12,"
        af += "afade=t=in:d=0.01"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", af, "-ar", str(SR), "-ac", "1", out], check=True)
        os.remove(raw)
    w = wave.open(out)
    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768.0


# ---------- Timeline ----------
script = json.load(open(f"{HERE}/script.json"))
T = 0.0; shots = []
for s in script["shots"]:
    cur = s.get("pad_start", 0.3); lines = []
    for l in s["lines"]:
        x = tts(l["who"], l["say"], l.get("whisper", False), s.get("room", False))
        d = len(x) / SR
        st = l["at"] if "at" in l else cur + l.get("gap", 0.0)
        lines.append(dict(who=l["who"], text=l.get("sub", l["say"]), start=round(st, 3), dur=round(d, 3), _x=x,
                          whisper=l.get("whisper", False)))
        cur = st + d
    dur = max(s.get("min", 0), cur + s.get("pad_end", 0.3)) if lines else s["min"]
    dur = round(dur * 30) / 30
    shots.append(dict(id=s["id"], start=round(T, 4), dur=dur, lines=lines, amb=s.get("amb"), sfx=s.get("sfx", []),
                      title=s.get("title")))
    T += dur
TOTAL = T; N = int(TOTAL * SR) + SR // 2
print("total", round(TOTAL, 2), "s")


def put(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g


def env(n, a=0.005, r=0.2):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e


def lp(x, f): b, a = signal.butter(2, f / (SR / 2)); return signal.lfilter(b, a, x)
def bp(x, f1, f2): b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], "band"); return signal.lfilter(b, a, x)
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))


# ---------- SFX ----------
def sfx_buzz():
    out = np.zeros(int(1.3 * SR))
    for k in range(2):
        t = tt(0.42); b = np.sign(np.sin(2 * np.pi * 165 * t)) * 0.5 + np.sin(2 * np.pi * 82 * t)
        put(out, lp(b, 900) * env(len(t), 0.01, 0.05), k * 0.6)
    return out * 0.35


def step(heavy=1.0):
    t = tt(0.16); x = lp(noise(0.16), 500) * np.exp(-t * 35) * 1.4 + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 40)
    return x * 0.5 * heavy


def sfx_run():
    out = np.zeros(int(3.3 * SR))
    for k in range(13): put(out, step(1.0 + 0.2 * rng.random()), 0.05 + k * 0.245)
    return out


def sfx_steps():
    out = np.zeros(int(4 * SR))
    for k in range(6): put(out, step(0.6), 0.2 + k * 0.6)
    return lp(out, 1500) + 0.3 * np.roll(lp(out, 800), int(0.07 * SR))


def sfx_steps_slow():
    out = np.zeros(int(4.5 * SR))
    for k in range(6): put(out, step(1.1), 0.1 + k * 0.72)
    return out + 0.4 * np.roll(lp(out, 700), int(0.09 * SR))


def sfx_heart():
    out = np.zeros(int(5.2 * SR))
    for k in range(6):
        for o, g in ((0, 1.0), (0.17, 0.7)):
            t = tt(0.22); put(out, np.sin(2 * np.pi * (58 - 60 * t) * t) * np.exp(-t * 18) * g, k * 0.82 + o)
    return out * 0.9


def sfx_beep():
    t = tt(0.12); return np.sin(2 * np.pi * 1400 * t) * env(len(t), 0.003, 0.03) * 0.25


def sfx_ding():
    t = tt(1.6)
    return (np.sin(2 * np.pi * 1046 * t) + 0.5 * np.sin(2 * np.pi * 1568 * t) + 0.25 * np.sin(2 * np.pi * 2093 * t)) * np.exp(-t * 3.2) * 0.22


def sfx_door():
    t = tt(0.7); return (lp(noise(0.7), 400) * np.exp(-t * 9) * 1.5 + np.sin(2 * np.pi * 55 * t) * np.exp(-t * 7)) * 0.6


def sfx_creak():
    t = tt(2.2); f = 180 + 60 * np.sin(2 * np.pi * 1.3 * t) + 25 * np.sin(2 * np.pi * 7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t) ** 2)
    return bp(x + 0.4 * noise(2.2), 300, 2400) * env(len(t), 0.2, 0.4) * 0.22


def sfx_clunk():
    t = tt(1.4); x = np.sin(2 * np.pi * 48 * t) * np.exp(-t * 5) * 1.2 + lp(noise(1.4), 900) * np.exp(-t * 14)
    for f in (212, 347, 533, 811): x += 0.18 * np.sin(2 * np.pi * f * t) * np.exp(-t * 6)
    return x * 0.6


def sfx_groan():
    t = tt(2.4); f = 62 + 14 * np.sin(2 * np.pi * 0.6 * t)
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) + 0.5 * lp(noise(2.4), 300)
    return lp(x, 420) * env(len(t), 0.4, 0.9) * 0.4


def sfx_boom():
    t = tt(2.4); f = 30 + 55 * np.exp(-t * 5)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8) + lp(noise(2.4), 220) * np.exp(-t * 3) * 0.6) * 0.75


def sfx_riser():
    t = tt(1.2); x = noise(1.2); out = np.zeros_like(x)
    for i in range(6):
        seg = slice(i * len(x) // 6, (i + 1) * len(x) // 6); out[seg] = bp(x, 300 + 500 * i, 900 + 900 * i)[seg]
    return out * (t / 1.2) ** 2 * 0.5


def sfx_alarm(d):
    t = tt(d); f = np.where((t * 1.6) % 1 < 0.5, 620, 830)
    x = signal.square(2 * np.pi * np.cumsum(f) / SR) * 0.5
    x = lp(x, 2600); x = x + 0.35 * np.roll(x, int(0.11 * SR))
    return x * env(len(t), 0.05, 0.12) * 0.2


SFX = dict(buzz=sfx_buzz, run=sfx_run, steps=sfx_steps, steps_slow=sfx_steps_slow, heart=sfx_heart, beep=sfx_beep,
           ding=sfx_ding, door=sfx_door, creak=sfx_creak, clunk=sfx_clunk, groan=sfx_groan, boom=sfx_boom, riser=sfx_riser)

voice = np.zeros(N); fx = np.zeros(N)
for s in shots:
    for l in s["lines"]:
        put(voice, l["_x"], s["start"] + l["start"], 1.0)
    for name, at in s["sfx"]:
        if name == "alarm":
            put(fx, sfx_alarm(s["dur"] - at), s["start"] + at)
        else:
            put(fx, SFX[name](), s["start"] + at)
# Handy-Vibration bei Maliks Nachricht
mt = next(s for s in shots if s["id"] == "malik_talk")
put(fx, sfx_buzz(), mt["start"] + mt["lines"][2]["start"] - 1.15)

# ---------- Ambience ----------
amb = np.zeros(N)
for s in shots:
    n = int(s["dur"] * SR) + int(0.1 * SR); d = n / SR + 0.01; t = tt(d)[:n]
    if s["amb"] == "night":
        a = lp(noise(d), 350)[:n] * (0.7 + 0.3 * np.sin(2 * np.pi * 0.13 * t)) * 0.09
    elif s["amb"] == "indoor":
        a = (np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t)) * 0.02 + lp(noise(d), 900)[:n] * 0.035
    elif s["amb"] == "vault":
        a = (np.sin(2 * np.pi * 43 * t) + 0.4 * np.sin(2 * np.pi * 129 * t)) * 0.03 + bp(noise(d), 400, 3000)[:n] * 0.012
    else:
        a = np.zeros(n)
    put(amb, a[:n] * env(n, 0.08, 0.08), s["start"])

# ---------- Musik ----------
INT = dict(intro_wide=.15, phone=.25, malik_talk=.3, decide=.45, bank_wide=.6, barrier=.5, soldier_zoom=.6,
           run=.9, corridor=.4, hide=.3, hide_pov=.3, elevator=.45, vault_wide=.65, wheel=.7, reveal=.8,
           folder=.85, alarm=1.0, end=.2)


def intensity(t):
    for s in shots:
        if s["start"] <= t < s["start"] + s["dur"]: return INT[s["id"]]
    return 0


t = np.arange(N) / SR
grid = np.arange(0, N / SR, 0.05)
inten = np.convolve(np.array([intensity(x) for x in grid]), np.ones(12) / 12, "same")
inten = np.interp(t, grid, inten)
drone = sum(np.sin(2 * np.pi * f * t + p) * g for f, g, p in
            ((36.7, 1, 0), (73.4, .5, 1), (73.9, .4, 2), (110.1, .22, 0), (146.8, .12, 3)))
drone *= (0.75 + 0.25 * np.sin(2 * np.pi * 0.08 * t)) * 0.10
bpm = 108; beat = 60 / bpm
pulse = np.zeros(N); k = 0
tp = tt(0.3); pn = lp((np.sin(2 * np.pi * 73.4 * tp) + 0.4 * signal.sawtooth(2 * np.pi * 73.4 * tp)) * np.exp(-tp * 14), 600)
while k * beat / 2 < TOTAL:
    tk = k * beat / 2; it = intensity(tk)
    if it >= 0.45 and (it >= 0.6 or k % 2 == 0):
        put(pulse, pn, tk, 0.16 * it * (1.0 if k % 4 == 0 else 0.7))
    k += 1
chords = [(146.8, 174.6, 220.0), (116.5, 146.8, 174.6), (98.0, 146.8, 196.0), (110.0, 138.6, 164.8)]
pad = np.zeros(N); bar = beat * 8
for i in range(int(TOTAL / bar) + 1):
    tb = tt(bar + 1.0); c = chords[i % 4]
    x = sum(np.sin(2 * np.pi * f * tb) + 0.5 * np.sin(2 * np.pi * f * 1.004 * tb) + 0.25 * np.sin(2 * np.pi * f * 2 * tb) for f in c)
    put(pad, x * env(len(tb), 1.2, 1.4), i * bar, 0.022)
pad *= 0.4 + inten
tick = np.zeros(N); tc = tt(0.03); tck = np.sin(2 * np.pi * 2300 * tc) * np.exp(-tc * 220)
for s in shots:
    if s["amb"] == "vault" or s["id"] == "end":
        j = 0.0
        while j < s["dur"] - 0.05:
            put(tick, tck, s["start"] + j, 0.22 if j % 1 == 0 else 0.1); j += 0.5
music = drone + pulse + pad + tick
fade = np.ones(N); nf = int(1.2 * SR); fade[int(TOTAL * SR) - nf:int(TOTAL * SR)] = np.linspace(1, 0, nf); fade[int(TOTAL * SR):] = 0


def duck(bed, key, amt=0.5):
    e = np.clip(lp(np.abs(key), 6) * 12, 0, 1)
    return bed * (1 - amt * e)


def save(name, x):
    x = (np.tanh(x * fade * 1.5) * 0.9)[: int(TOTAL * SR)]
    st = (np.clip(np.stack([x, x], 1), -1, 1) * 32767).astype(np.int16)
    w = wave.open(f"{B}/{name}", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(st.tobytes()); w.close()


bed = fx * 0.9 + amb + music
save("audio_full.wav", voice * 1.15 + duck(bed, voice, 0.45))
save("audio_novoice.wav", bed)

# ---------- Timeline JSON ----------
tl = dict(fps=30, total=round(TOTAL, 4), frames=int(round(TOTAL * 30)),
          shots=[dict(id=s["id"], start=s["start"], dur=s["dur"], title=s["title"],
                      lines=[{k: v for k, v in l.items() if k != "_x"} for l in s["lines"]]) for s in shots])
json.dump(tl, open(f"{B}/timeline.json", "w"), ensure_ascii=False, indent=1)


# ---------- Untertitel (ASS) ----------
def ts(x):
    return f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"


COL = {"BEN": "&H00FFFFFF", "MALIK": "&H0046D2FF", "SOLDAT": "&H00FFC58A", "FUNK": "&H00B4F0B4"}
ass = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter ExtraBold,62,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,60,60,560,1
Style: Time,Inter ExtraBold,66,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,1,0,1,5,2,7,60,60,150,1
Style: Place,Inter SemiBold,38,&H00E6E6E6,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,4,1,7,62,60,228,1
Style: Badge,Inter ExtraBold,40,&H003C3CE6,&H00FFFFFF,&H00181818,&HA0000000,-1,0,0,0,100,100,2,0,3,10,0,8,60,60,70,1
Style: End,Inter ExtraBold,96,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,2,0,1,6,0,5,60,60,0,1
Style: End2,Inter SemiBold,48,&H003C3CE6,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,1,0,1,4,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def chunks(text, maxc=22):
    out = []; cur = ""
    for w in text.split():
        if cur and (len(cur) + 1 + len(w) > maxc or cur[-1] in ".!?"):
            out.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    return out


ev = []; ev_nosub = []
badge = f"Dialogue: 0,{ts(0.2)},{ts(shots[0]['dur'])},Badge,,0,0,0,,{{\\fad(300,300)}}TEIL 1"
ev.append(badge); ev_nosub.append(badge)
for s in shots:
    if s["title"]:
        a, b = s["start"] + 0.35, s["start"] + min(s["dur"], 4.0)
        for st_, tx in (("Time", s["title"][0]), ("Place", s["title"][1])):
            e = f"Dialogue: 0,{ts(a)},{ts(b)},{st_},,0,0,0,,{{\\fad(250,350)}}{tx}"; ev.append(e); ev_nosub.append(e)
    if s["id"] == "end":
        a, b = s["start"] + 0.3, s["start"] + s["dur"]
        for e in (f"Dialogue: 0,{ts(a)},{ts(b)},End,,0,0,0,,{{\\fad(300,500)\\pos(540,880)}}TEIL 2 FOLGT …",
                  f"Dialogue: 0,{ts(a + 0.5)},{ts(b)},End2,,0,0,0,,{{\\fad(300,500)\\pos(540,1010)}}NOCH 45 MINUTEN BIS 03:00 UHR"):
            ev.append(e); ev_nosub.append(e)
    for l in s["lines"]:
        cs = chunks(l["text"]); tot = sum(len(c) + 4 for c in cs); t0 = s["start"] + l["start"]
        for c in cs:
            d = l["dur"] * (len(c) + 4) / tot
            ev.append(f"Dialogue: 1,{ts(t0)},{ts(t0 + d)},Sub,,0,0,0,,{{\\c{COL[l['who']]}&}}{c}")
            t0 += d
open(f"{B}/subs.ass", "w").write(ass + "\n".join(ev) + "\n")
open(f"{B}/titles_only.ass", "w").write(ass + "\n".join(ev_nosub) + "\n")


# ---------- Stimmenskript ----------
def mmss(x): return f"{int(x // 60):02d}:{x % 60:04.1f}"


SCENE = dict(intro_wide="SZENE 1 – Altstadt, 23:47 Uhr", bank_wide="SZENE 2 – Vor der Landesbank, 01:12 Uhr",
             corridor="SZENE 3 – Im Gebäude, Versorgungsgang", vault_wide="SZENE 4 – Ebene −3, 02:14 Uhr", end="ENDE")
ACTION = dict(
    intro_wide="Kamera fährt von den Dächern hinunter zu Ben und Malik unter der Laterne.",
    phone="POV: Bens Handy vibriert. Nachricht von unbekannter Nummer: „HEUTE NACHT. 03:00 UHR. ATOMSCHLAG. Die Wahrheit liegt in der LANDESBANK. Ebene −3. Sag es NIEMANDEM.“",
    malik_talk="POV: Ben zeigt Malik das Handy. Dann vibriert Maliks eigenes Handy.",
    decide="Nahaufnahme, langsamer Zoom auf beide.",
    bank_wide="Kameraschwenk von links nach rechts über die Landesbank: Zaun, Lkw, Suchscheinwerfer, Bundeswehr-Posten.",
    barrier="POV: Die beiden kauern hinter einer Betonsperre. Der Suchscheinwerfer streift über sie – ducken!",
    soldier_zoom="Zoom auf den Posten am Lieferanteneingang, der um die Ecke verschwindet.",
    run="POV: Sprint durch die Lücke im Zaun zur Seitentür. (keine Stimme – nur Schritte)",
    corridor="POV: Schleichen durch den Gang. Am Ende taucht ein Taschenlampenkegel auf.",
    hide="Seitliche Kamera: Beide hinter Kisten, der Soldat kommt näher. Herzschlag.",
    hide_pov="POV durch den Spalt neben den Kisten: Der Lichtkegel streift vorbei, der Soldat dreht um.",
    elevator="POV: Finger drückt im Aufzug auf „−3“.",
    vault_wide="Kamerafahrt: riesige runde Tresortür, die beiden wirken winzig davor.",
    wheel="POV: Hände drehen das Rad. Die Tür schwingt auf. (keine Stimme – Metall, Knarren)",
    reveal="POV: Kein Tresorraum – eine Kommandozentrale. Riesiger Bildschirm mit Deutschlandkarte und Countdown.",
    folder="Zoom auf die rote Akte „OPERATION MORGENROT – STRENG GEHEIM“, dann auf den Countdown.",
    alarm="Alarm! Rotes Licht. POV dreht sich um: Soldaten mit Taschenlampen in der Tür. Hände hoch.",
    end="Schwarzbild: „TEIL 2 FOLGT … – Noch 45 Minuten bis 03:00 Uhr“")
md = ["# Stimmenskript – „Ebene −3“ (Teil 1)", "",
      f"Gesamtlänge: {TOTAL:.1f} s · Format 9:16 (1080×1920), 30 fps", "",
      "## Rollen", "",
      "| Rolle | Wer | Stimme / Spielweise | Untertitelfarbe |", "|---|---|---|---|",
      "| **BEN** | POV-Person (man sieht nur seine Hände) | jung, angespannt, entschlossen | weiß |",
      "| **MALIK** | sein bester Freund | erst skeptisch, dann nervös; flüstert ab der Bank | gelb |",
      "| **SOLDAT** | Bundeswehr-Posten | tief, hart; laut bei „Stehen bleiben!“ | hellblau |",
      "| **FUNK** | Funkspruch | verrauscht, monoton | hellgrün |", "",
      "Die Zeit vor jeder Zeile ist der Einsatz im Video (mm:ss.s). *(geflüstert)* = Flüsterton.", ""]
n = 0
for s in shots:
    if s["id"] in SCENE: md += ["", f"## {SCENE[s['id']]}", ""]
    md += [f"**[{mmss(s['start'])}] Bild:** {ACTION[s['id']]}", ""]
    for l in s["lines"]:
        n += 1
        w = " *(geflüstert)*" if l["whisper"] else ""
        md.append(f"{n}. `{mmss(s['start'] + l['start'])}` **{l['who']}**{w}: „{l['text']}“")
    if s["lines"]: md.append("")
open(f"{HERE}/output/Stimmenskript.md", "w").write("\n".join(md) + "\n")
print(json.dumps([(s["id"], s["start"], s["dur"]) for s in shots]))
