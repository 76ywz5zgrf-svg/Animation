#!/usr/bin/env python3
"""Spricht alle Zeilen mit Chatterbox (mehrsprachig) ein und legt sie in voice_override/ ab.
Jede Aufnahme wird mit Whisper gegengeprueft; bei Abweichung wird neu gewuerfelt.
Aufruf (in einer Umgebung mit chatterbox-tts + faster-whisper):  python gen_voices.py [gruppe ...]
"""
import difflib, json, os, re, sys
import numpy as np, torch, torchaudio, soundfile as sf
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "stimm_referenzen")
OUT = os.path.join(HERE, "voice_override")
os.makedirs(OUT, exist_ok=True)
torch.set_num_threads(4)

# Stimme: (uebertreibung, cfg) – mehr Uebertreibung = aufgeregter, weniger = sanfter
STYLE = {"erz": (0.85, 0.35), "wach": (0.75, 0.4), "putz": (0.35, 0.5), "dir": (0.55, 0.45)}
# Gruppe -> (stimme, [(id, satz), ...]); Saetze einer Gruppe werden am Stueck gesprochen
GROUPS = {
    "hook": ("erz", [("hook1", "Ein Diebstahl!"), ("hook2", "Drei Verdächtige!"), ("hook3", "Und nur einer lügt.")]),
    "crimeA": ("erz", [("crime1", "Mitternacht!"), ("crime2", "In der ganzen Stadt fällt der Strom aus!")]),
    "crimeB": ("erz", [("crime3", "Am Morgen ist der goldene Pokal aus dem Museum verschwunden!")]),
    "det": ("erz", [("det1", "Detektiv Fuchs befragt drei Verdächtige.")]),
    "s1n": ("erz", [("s1n", "Der Wachmann sagt:")]),
    "s1q": ("wach", [("s1q", "Ich steckte die ganze Nacht im Aufzug fest!")]),
    "s2n": ("erz", [("s2n", "Die Putzfrau sagt:")]),
    "s2q": ("putz", [("s2q", "Ich habe bei Kerzenlicht den Boden gewischt.")]),
    "s3n": ("erz", [("s3n", "Der Direktor sagt:")]),
    "s3q": ("dir", [("s3q", "Ich habe die ganze Nacht in meinem Büro ferngesehen.")]),
    "q": ("erz", [("q1", "Wer ist der Dieb?")]),
    "cd": ("erz", [("cd1", "Du hast fünf Sekunden!"), ("cd2", "Schreib deine Antwort in die Kommentare!")]),
    "rev": ("erz", [("rev1", "Und die Auflösung:"), ("rev2", "Es war der Direktor!")]),
    "exp": ("erz", [("exp1", "Ohne Strom läuft kein Fernseher!"), ("exp2", "Er hat gelogen!")]),
    "cta": ("erz", [("cta1", "Richtig gelöst?"), ("cta2", "Dann folge mir für mehr Rätsel!")]),
}
norm = lambda s: re.sub(r"[^a-zäöüß0-9 ]", "", s.lower().replace("5", "fünf").replace("3", "drei")).split()

tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
asr = WhisperModel("small", device="cpu", compute_type="int8")
report = {}
for gid in (sys.argv[1:] or GROUPS):
    voice, sents = GROUPS[gid]
    text = " ".join(s for _, s in sents)
    want = norm(text)
    ex, cfg = STYLE[voice]
    best = None
    for seed in range(1, 6):
        torch.manual_seed(seed * 101 + len(text))
        wav = tts.generate(text, language_id="de", audio_prompt_path=os.path.join(REF, voice + ".wav"),
                           exaggeration=ex, cfg_weight=cfg)
        a = wav.squeeze().numpy(); sr = tts.sr
        tmp = os.path.join(OUT, f"_{gid}.wav"); sf.write(tmp, a, sr)
        segs, _ = asr.transcribe(tmp, language="de", word_timestamps=True, beam_size=5)
        words = [w for s in segs for w in s.words]
        got = norm(" ".join(w.word for w in words))
        score = difflib.SequenceMatcher(None, want, got).ratio()
        dur = len(a) / sr
        ok_len = 0.045 * len(text) <= dur <= 0.16 * len(text) + 0.6
        print(f"[{gid}] seed {seed}: {dur:.2f}s score {score:.2f} -> {' '.join(got)}", flush=True)
        cand = (score + (0.0 if ok_len else -0.5), a, sr, words, got, dur)
        if best is None or cand[0] > best[0]:
            best = cand
        if score >= 0.93 and ok_len:
            break
    score, a, sr, words, got, dur = best
    os.remove(os.path.join(OUT, f"_{gid}.wav"))
    # Schnittpunkte zwischen den Saetzen
    cuts = [0.0]
    if len(sents) > 1:
        counts = np.cumsum([len(norm(s)) for _, s in sents])[:-1]
        wn = [w for w in words if norm(w.word)]
        for c in counts:
            if len(wn) == len(want) and 0 < c < len(wn):
                cuts.append((wn[c - 1].end + wn[c].start) / 2)
            else:  # Notloesung: nach Zeichenanteil
                cuts.append(dur * sum(len(s) for _, s in sents[: list(counts).index(c) + 1]) / len(text))
    cuts.append(dur)
    for (uid, s), t0, t1 in zip(sents, cuts[:-1], cuts[1:]):
        sf.write(os.path.join(OUT, uid + ".wav"), a[int(t0 * sr): int(t1 * sr)], sr)
    report[gid] = {"score": round(score, 2), "dauer": round(dur, 2), "erkannt": " ".join(got), "schnitte": [round(c, 2) for c in cuts]}
    json.dump(report, open(os.path.join(OUT, "_bericht.json"), "w"), indent=1, ensure_ascii=False)
print("fertig")
