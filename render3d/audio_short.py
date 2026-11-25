"""Ton für das 3D-Kurzvideo (nutzt die Stimmen/Geräusche/Musik aus ../render/audio.py).
Ergebnis: build/short_master.wav, build/short_timeline.json
"""
import json, os, sys, math, subprocess
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'render'))
import audio as AU

FPS = 24
B = os.path.join(HERE, 'build'); os.makedirs(B, exist_ok=True)

def L(spk, text, fx=None, sfx=None, rate=1.0, gap=0.25, word=None):
    return dict(kind='line', spk=spk, text=text, fx=fx, sfx=sfx, rate=rate, gap=gap, word=word)
def A(dur, sfx=None, word=None):
    return dict(kind='act', dur=dur, sfx=sfx, word=word)

SHOTS = [
    ('hook', 'night', [
        A(0.8, sfx='tick'),
        L('erz', 'Jeden Morgen um sechs Uhr kräht Gustav. Und dann geht die Sonne auf.', rate=1.05),
        L('gustav', 'Kikerikiiii!', fx='crow', sfx='fanfare', word='KIKERIKI!'),
        A(1.5, sfx='drumroll'),
        A(1.3, sfx='cricket', word='?!'),
        L('gustav', 'Die Sonne ist nicht aufgegangen!', rate=1.0),
        A(0.6, sfx='hit'),
    ]),
    ('square', 'mystery', [
        L('tupfi', 'Schau mal! Die Sonne liegt noch im Bett. Ganz oben auf dem Gähnberg!'),
        L('pieks', 'Kein Problem, ich hab einen Plan!'),
        A(0.7, sfx='whoosh'),
    ]),
    ('flight', 'flight', [
        A(1.0, sfx='wind'),
        L('erz', 'Die kleine Wolke Wuschel fliegt alle hinauf. Vorbei an Opa Mond.', rate=1.05),
        L('mond', 'Bitte weckt die Sonne. Ich bin sooo müde.', rate=0.95),
        A(0.8, sfx='whoosh'),
    ]),
    ('bedroom', 'secret', [
        A(1.2, sfx='breath'),
        L('gustav', 'Kikeri... Quaaaaak!', fx='duck', word='QUAAAK!'),
        A(0.6, sfx='flop'),
        L('sola', 'Hihihi! Nein! Ich komme nicht raus!', word='HIHIHI!'),
        L('tupfi', 'Warum versteckst du dich denn?', rate=0.95),
        L('sola', 'Ich hab einen Fleck bekommen. Mitten im Gesicht!', rate=0.95),
        A(2.6, sfx=[('drumroll_long', 0.0), ('pling', 2.3)]),
    ]),
    ('reveal', 'warm', [
        L('pieks', 'Der ist doch winzig!'),
        L('tupfi', 'Ich hab sieben Tupfen. Und weißt du was? Jeder Tupfen ist toll!', rate=0.95),
        L('erz', 'Übrigens: Auch die echte Sonne hat Flecken. Sie heißen Sonnenflecken.', rate=1.0),
        L('sola', 'Dann steh ich jetzt auf!'),
    ]),
    ('sunrise', 'sunrise', [
        A(4.6, sfx='swell', word='WOW!'),
        L('erz', 'Und so ging die Sonne doch noch auf.'),
        A(1.4, sfx=[('pop', 0.0), ('pop', 0.25), ('pop', 0.5), ('pop', 0.75), ('cheer', 0.3)]),
    ]),
    ('finale', 'theme', [
        L('gustav', 'Kikerikiiiiii!', fx='opera', word='KIKERIKI!'),
        A(0.9),
        L('gustav', 'Pünktlich, oder?'),
        L('alle', 'Ganz knapp, Gustav!', sfx=[('laugh_group', 0.9)]),
        A(3.2, sfx=[('sparkle', 0.2), ('puffpuff', 1.2)], word='END'),
    ]),
]

def envelope(a):
    hop = AU.SR // FPS
    n = max(1, int(math.ceil(len(a) / hop)))
    pad = np.pad(a, (0, n * hop - len(a)))
    rms = np.sqrt((pad.reshape(n, hop) ** 2).mean(1))
    m = np.percentile(rms, 95) + 1e-6
    return [round(float(min(1, r / m)), 2) for r in rms]

def build():
    t = 0.0; shots = []; D = []; S = []; M = []; words = []
    for name, cue, items in SHOTS:
        s0 = t; ev = []
        for it in items:
            if it['kind'] == 'line':
                a, parts = AU.speak(it['spk'], it['text'], it['rate'], it['fx'])
                dur = len(a) / AU.SR + it['gap']
                D.append((t, a))
                ev.append(dict(kind='line', spk=it['spk'], text=it['text'], start=t, dur=dur, alen=len(a) / AU.SR,
                               env={m: envelope(p) for m, p in parts.items()}))
            else:
                dur = it['dur']; ev.append(dict(kind='act', start=t, dur=dur))
            if it.get('word'): words.append(dict(t=t, word=it['word']))
            sf = it.get('sfx')
            if sf:
                if isinstance(sf, str): sf = [(sf, 0.0)]
                for nm, off in sf:
                    S.append((t + off, AU.laughs(nm) if nm.startswith('laugh') else AU.sfx(nm)))
            t += dur
        shots.append(dict(name=name, start=s0, end=t, events=ev))
        M.append((s0, cue, t - s0))
    total = t + 0.3
    print('Länge Kurzvideo: %.2f s' % total)
    N = int(total * AU.SR) + AU.SR
    Dt = np.zeros(N, np.float32); St = np.zeros(N, np.float32); Mt = np.zeros(N, np.float32)
    for st, a in D: AU.put(Dt, a, st)
    for st, a in S: AU.put(St, a, st)
    for st, cue, dur in M:
        y = AU.render_cue(cue, dur + 0.6)[:int((dur + 0.4) * AU.SR)]
        y = y * (0.09 / (np.sqrt(np.mean(y ** 2)) + 1e-6))
        n = len(y); fi, fo = int(0.15 * AU.SR), int(0.4 * AU.SR)
        e = np.ones(n); e[:fi] = np.linspace(0, 1, fi); e[-fo:] = np.linspace(1, 0, fo)
        AU.put(Mt, y * e, st)
    env = np.sqrt(np.convolve(Dt ** 2, np.ones(3528) / 3528, 'same'))
    duck = AU.onepole_lp(np.where(env > 0.01, 0.38, 1.0), 3.0)
    mix = Dt + St * 0.8 + Mt * 0.55 * duck
    mix = mix / (np.max(np.abs(mix)) + 1e-6) * 0.95
    raw = os.path.join(B, 'short_raw.wav'); AU.write_wav(raw, mix)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100',
                    os.path.join(B, 'short_master.wav')], check=True)
    json.dump(dict(total=total, fps=FPS, shots=shots, words=words), open(os.path.join(B, 'short_timeline.json'), 'w'))

if __name__ == '__main__':
    build()
