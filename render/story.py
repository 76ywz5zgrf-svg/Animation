"""Pieks & Tupfi – Folge 1: Die Sonne hat verschlafen.
Die komplette Folge als Daten: Szenen, Dialoge, Bewegungen, Kamera, Geräusche.
Zeiten ergeben sich aus der echten Länge der Sprachaufnahmen (siehe audio.py).
"""

def L(spk, text, set=None, sfx=None, cam=None, rate=1.0, fx=None, gap=0.3, tw=0.5, mouth=None, ctw=0.8):
    return dict(kind='line', spk=spk, text=text, set=set or {}, sfx=sfx, cam=cam, rate=rate,
                fx=fx, gap=gap, tw=tw, mouth=mouth, ctw=ctw)

def A(dur, set=None, sfx=None, cam=None, tw=0.5, ctw=0.8):
    return dict(kind='act', dur=dur, set=set or {}, sfx=sfx, cam=cam, tw=tw, ctw=ctw)

def P(**kw):
    return kw

# Chor-Sprecher: wer gemeinsam spricht
CHORUS = {
    'chor': ['pieks', 'tupfi'],
    'alle': ['pieks', 'tupfi', 'gustav'],
    'alle5': ['pieks', 'tupfi', 'gustav', 'sola'],
    'pg': ['pieks', 'gustav'],
}

SCENES = []
def scene(name, bg, music, actors, beats, cam=(960, 540, 1.0), trans='fade', mvol=1.0, auto=True):
    SCENES.append(dict(name=name, bg=bg, music=music, actors=actors, beats=beats, cam=cam,
                       trans=trans, mvol=mvol, auto=auto))

G = 960  # Bodenlinie für die vordere Reihe

# ---------------------------------------------------------------- SZENE 0
scene('s00_coldopen', 'village_night', 'night', {
    'gustav': P(x=960, y=372, s=0.42, z=5),
}, [
    A(2.2, sfx=[('tick', 0.0), ('tick', 1.0)]),
    A(1.3, set={'gustav': P(act='shake', eyes='wide', mouth='o')}, sfx='alarm'),
    A(0.8, set={'gustav': P(act='idle', eyes='open', mouth='smile')}, sfx='click',
      cam=(960, 330, 2.1), ctw=1.2),
    L('gustav', 'Meine Damen und Herren! Es ist sechs Uhr! Zeit für den Sonnenaufgang!',
      set={'gustav': P(pose='point')}, rate=0.95),
    L('gustav', 'Kikerikiiii!', set={'gustav': P(pose='crow', s=0.46)}, sfx='fanfare', fx='crow'),
    A(1.7, set={'gustav': P(pose='point', s=0.42)}, sfx='drumroll', cam=(1250, 300, 1.5), ctw=1.4),
    A(2.0, sfx=[('cricket', 0.1), ('cricket', 1.1)]),
    L('gustav', 'Sonne? Huhuu? Sonne?!', set={'gustav': P(pose='stand', mouth='smile')}, cam=(960, 330, 2.1)),
    L('gustav', 'Die Sonne ist nicht aufgegangen!', set={'gustav': P(eyes='wide', mouth='o', act='shake')},
      cam=(960, 315, 3.0), ctw=0.4, rate=0.95),
    A(0.7, sfx='hit'),
], trans='cut', auto=False)

# ---------------------------------------------------------------- SZENE 1 – INTRO
scene('s01_intro', 'title_day', 'theme', {
    'pieks': P(x=-250, y=G, var='ball', act='roll', z=5),
    'tupfi': P(x=2200, y=G, z=5, act='bounce'),
    'gustav': P(x=1560, y=G - 10, s=0.75, a=0, z=3),
    'wuschel': P(x=400, y=420, a=0, act='float', z=6),
}, [
    A(1.6, set={'pieks': P(x=760, tw=1.5), 'tupfi': P(x=1160, tw=1.5)}, sfx=[('whoosh', 0.0), ('boing', 1.3)]),
    A(0.6, set={'pieks': P(var='', act='hop', eyes='happy', mouth='grin'), 'tupfi': P(act='hop', mouth='grin'),
               'gustav': P(a=1), 'wuschel': P(a=1, sparkle=1)}, sfx='pop'),
    L('chor', 'Pieks und Tupfi, hey, hey, hey! Ein Abenteuer jeden Tag, olé!', rate=0.95,
      set={'pieks': P(act='bounce'), 'tupfi': P(act='bounce'), '_': P(title=1)}, sfx='sparkle'),
    L('erz', 'Pieks und Tupfi in: Die Sonne hat verschlafen!', set={'_': P(title=2)}, rate=1.05),
    A(1.2),
], auto=False, mvol=0.9)

# ---------------------------------------------------------------- SZENE 2 – Wurzelzimmer
scene('s02_bedroom', 'bedroom', 'morning', {
    'pieks': P(x=620, y=760, var='ball', eyes='closed', act='sleep', z=5),
    'applecl': P(x=330, y=700, z=4),
    'curtain': P(x=1440, y=640, z=2),
    'tupfi': P(x=1440, y=560, s=0.75, a=0, z=1, glow=1),
}, [
    A(1.6, set={'applecl': P(act='shake')}, sfx='ring'),
    A(0.45, set={'applecl': P(act='idle'), 'pieks': P(x=900, y=360, act='roll', eyes='open', tw=0.42)}, sfx='boing'),
    A(0.45, set={'pieks': P(x=1250, y=560, tw=0.42)}, sfx='boing'),
    A(0.45, set={'pieks': P(x=820, y=250, tw=0.42)}, sfx='boing'),
    A(0.45, set={'pieks': P(x=560, y=600, tw=0.42)}, sfx='boing'),
    A(0.8, set={'pieks': P(x=900, y=G, var='', act='hop', tw=0.42, mouth='grin', eyes='happy')}, sfx='tada'),
    L('pieks', 'Guten Morgen, Welt! Heute wird ein Super-Tag!', set={'pieks': P(eyes='open')}),
    A(1.0, set={'pieks': P(x=1150), 'curtain': P(var='open')}, sfx='curtain'),
    A(1.3, set={'pieks': P(mouth='flat', eyes='open')}, sfx='cricket'),
    L('pieks', 'Hm. Ein ziemlich dunkler Super-Tag.', set={'pieks': P(mouth='flat')}),
    L('pieks', 'Stiefel... Stiefel... ah, da!', set={'pieks': P(x=700, act='walk', mouth='smile')}),
    A(1.8, set={'pieks': P(var='chaos', act='hop', x=760)}, sfx=[('swoosh', 0.0), ('plopp', 0.6), ('squeak', 1.1)]),
    L('pieks', 'Fertig! Wie immer perfekt.', set={'pieks': P(act='idle', mouth='grin', eyes='happy')}),
    A(1.0, set={'tupfi': P(a=1), 'pieks': P(eyes='open')}, sfx='knock'),
    L('tupfi', 'Pieks? Bist du schon wach?', set={'_': P(lamp=1)}),
    L('pieks', 'Hellwach! Sag mal, Tupfi, warum ist es noch so dunkel?'),
    L('tupfi', 'Das weiß niemand! Komm schnell, alle sind auf dem Dorfplatz!'),
    L('tupfi', 'Hihi... Pieks? Dein Stiefel.', set={'tupfi': P(mouth='grin', act='laugh', eyes='happy')}),
    A(1.2, set={'pieks': P(eyes='up', mouth='flat'), 'tupfi': P(act='idle', eyes='open')}),
    L('pieks', 'Das ist... ein ganz neuer Hut-Trend!', set={'pieks': P(eyes='open', mouth='grin')}),
    A(1.3, set={'pieks': P(var='', act='spin')}, sfx=[('swoosh', 0.0), ('swoosh', 0.35), ('swoosh', 0.7)]),
    L('pieks', 'Los geht\'s!', set={'pieks': P(act='hop')}),
    A(0.9, set={'pieks': P(x=1820, act='walk', tw=0.5)}, sfx=[('bonk', 0.5)]),
    A(0.8, set={'pieks': P(act='shake', eyes='closed')}),
    A(0.8, set={'pieks': P(x=2300, act='walk', eyes='open', tw=0.5)}, sfx='whoosh'),
], cam=(960, 540, 1.0))

# ---------------------------------------------------------------- SZENE 3 – Dorfplatz
CROWD = {
    'frog1': P(type='frog', x=1280, y=870, s=0.85, z=2), 'mouse1': P(type='mouse', x=1450, y=860, s=0.8, z=2),
    'frog2': P(type='frog', x=300, y=860, s=0.75, z=2, flip=True), 'sheepkid': P(type='sheepkid', x=1600, y=880, s=0.85, z=2),
    'mouse2': P(type='mouse', x=180, y=880, s=0.7, z=2),
}
scene('s03_square', 'square_night', 'mystery', dict(CROWD, **{
    'wolle': P(x=470, y=G, z=4), 'tray': P(x=560, y=770, z=5),
    'gustav': P(x=1020, y=700, s=0.72, z=3),
    'sunny': P(x=1780, y=930, z=3),
    'pieks': P(x=700, y=G + 40, z=6, a=0), 'tupfi': P(x=880, y=G + 40, z=6, a=0, glow=1),
}), [
    A(3.0, cam=(960, 540, 1.0), sfx='murmur', set={'frog1': P(act='nod'), 'mouse1': P(act='nod')}),
    L('wolle', 'Schaut euch das an! Ohne Sonne geht nicht mal mein Teig auf!', cam=(620, 640, 1.5),
      set={'pieks': P(a=1), 'tupfi': P(a=1), 'wolle': P(mouth='frown')}),
    A(1.1, set={'tray': P(act='wobble')}, sfx='pfft'),
    L('frog1', 'Hihihi!', set={'tray': P(act='idle'), 'frog1': P(act='laugh')}),
    L('sunny', 'Hachhh...', set={'frog1': P(act='idle'), 'sunny': P(act='sway')}, rate=1.3),
    L('gustav', 'Keine Panik! Keine Panik! Ich kräh einfach noch einmal. Diesmal ganz laut!',
      cam=(1020, 520, 1.5), set={'sunny': P(act='idle')}),
    A(1.9, set={'gustav': P(s=1.0, var='puff', tw=1.7, eyes='closed')}, sfx='inflate'),
    L('gustav', 'Kikeri... Määääääh!', set={'gustav': P(pose='crow', eyes='wide')}, fx='goat'),
    A(1.8, set={'gustav': P(s=0.72, var='', pose='stand', mouth='o'), 'pieks': P(eyes='wide'),
                'tupfi': P(eyes='wide'), 'frog1': P(eyes='wide')}, sfx='cricket', cam=(960, 540, 1.0)),
    L('sheepkid', 'Das war mein Text.', set={'sheepkid': P(mouth='frown')}, cam=(1550, 700, 1.6)),
    A(1.6, set={'frog1': P(act='laugh', eyes='happy'), 'frog2': P(act='laugh'), 'mouse1': P(act='laugh'),
                'mouse2': P(act='laugh'), 'pieks': P(act='laugh', eyes='happy', mouth='grin'), 'tupfi': P(eyes='open')},
      sfx='laugh_crowd', cam=(960, 540, 1.0)),
    L('gustav', 'Ähem. Das war nur zum Aufwärmen.', set={'gustav': P(mouth='smile', eyes='closed'), 'frog1': P(act='idle'),
      'frog2': P(act='idle'), 'mouse1': P(act='idle'), 'mouse2': P(act='idle'), 'pieks': P(act='idle', eyes='open')}),
    L('tupfi', 'Ähm, ich hab da eine Idee! Oma Mümmel hat das größte Fernrohr im ganzen Kringeltal. Vielleicht weiß sie, was los ist!',
      set={'tupfi': P(act='ears'), 'gustav': P(eyes='open')}, sfx='pling', cam=(800, 700, 1.5)),
    L('pieks', 'Kein Problem, ich hab einen Plan! Wir gehen zu Oma Mümmel!', set={'pieks': P(act='hop', mouth='grin'), 'tupfi': P(act='idle')}),
    L('tupfi', 'Pieks, das war meine Idee.', set={'tupfi': P(mouth='flat')}),
    A(0.9, set={'pieks': P(eyes='up', mouth='flat')}),
    L('pieks', 'Und es ist ein super Plan! Los!', set={'pieks': P(eyes='happy', mouth='grin', act='hop')}),
    A(1.0, set={'pieks': P(x=2300, act='walk', tw=0.9), 'tupfi': P(x=2400, act='bounce', tw=1.0)}, sfx='whoosh'),
], cam=(960, 540, 1.0))

# ---------------------------------------------------------------- SZENE 4 – Oma Mümmel
scene('s04_observatory', 'obs_ext', 'cozy', {
    'pieks': P(x=500, y=950, s=0.45, z=5, act='walk'), 'tupfi': P(x=380, y=960, s=0.45, z=5, glow=1, act='bounce'),
    'oma': P(x=1380, y=G + 20, z=4, a=0), 'funk': P(x=1180, y=760, z=7, a=0),
    'gustav': P(x=2300, y=G, s=0.85, z=6),
}, [
    A(3.0, set={'pieks': P(x=880, y=780, tw=2.8), 'tupfi': P(x=760, y=790, tw=2.8)}, sfx='surr', cam=(960, 540, 1.0)),
    A(0.3, set={'_': P(bg='obs_int'), 'pieks': P(x=560, y=G + 20, s=1, act='idle', tw=0), 'tupfi': P(x=780, y=G + 30, s=1, act='idle', tw=0),
                'oma': P(a=1, tw=0)}),
    L('oma', 'Ach, ihr Lieben! Kommt rein, kommt rein!', set={'oma': P(mouth='grin')}),
    L('tupfi', 'Oma Mümmel, warum geht die Sonne nicht auf?'),
    L('oma', 'Gleich gucken wir. Aber merkt euch: Nachts darf man durchs Fernrohr gucken. In die echte Sonne schaut man nie, nie, nie! Das tut den Augen weh.',
      set={'oma': P(pose='finger', mouth='smile')}, cam=(1350, 520, 1.6), ctw=1.5, rate=0.95),
    L('pieks', 'Lass mich mal gucken!', set={'oma': P(pose=''), 'pieks': P(x=950, act='walk')}, cam=(960, 540, 1.0)),
    A(0.4, set={'_': P(tele=1), 'pieks': P(a=0, tw=0), 'tupfi': P(a=0, tw=0), 'oma': P(x=960, y=640, s=0.16, tw=0, act='wave')}, sfx='swoosh'),
    L('pieks', 'Oma! Du bist ja geschrumpft!'),
    L('oma', 'Hihihi! Andersrum, mein Kleiner.', set={'oma': P(act='laugh')}),
    A(0.4, set={'_': P(tele=0, bg='tele_view'), 'oma': P(a=0, tw=0)}, sfx='swoosh', cam=(960, 540, 1.0)),
    A(3.0, set={'_': P(tele=1)}, sfx='zoom', cam=(980, 520, 1.45), ctw=2.8),
    L('tupfi', 'Da! Die Sonne! Sie liegt noch im Bett!'),
    L('pieks', 'Sie hat verschlafen! So eine Langschläferin!'),
    A(0.3, set={'_': P(tele=0, bg='obs_int'), 'pieks': P(a=1, x=900, act='idle', tw=0), 'tupfi': P(a=1, tw=0),
                'oma': P(a=1, x=1380, y=G + 20, s=1, act='idle', tw=0)}, cam=(960, 540, 1.0), ctw=0.01),
    L('oma', 'Hmm. Die Sonne hat noch nie verschlafen. Da stimmt was nicht.', set={'oma': P(mouth='flat')}),
    L('tupfi', 'Ähm, ich hab da was entdeckt. Gestern Abend hat die Sonne ganz traurig ausgesehen. Und sie hat sich schnell hinterm Berg versteckt.',
      set={'tupfi': P(act='ears', mouth='frown')}, rate=0.95),
    L('tupfi', 'Was glaubt ihr? Warum steht die Sonne nicht auf?', set={'tupfi': P(act='idle', mouth='smile')},
      cam=(780, 760, 2.2), ctw=0.8),
    A(3.0, set={'tupfi': P(act='nod')}),
    L('oma', 'Jemand muss auf den Gähnberg und nachsehen.', set={'tupfi': P(act='idle')}, cam=(960, 540, 1.0)),
    L('pieks', 'Kein Problem, ich hab einen Plan! Wir gehen auf den Gähnberg!', set={'pieks': P(act='hop', mouth='grin')}),
    L('tupfi', 'Okay. Diesmal war es wirklich dein Plan.', set={'tupfi': P(mouth='grin', eyes='happy')}),
    L('oma', 'Nehmt meinen Schneckenfunk mit. Dann könnt ihr mich rufen.', set={'funk': P(a=1, x=860, y=820, tw=1.0)}, sfx='pling'),
    A(1.0, set={'gustav': P(x=1680, tw=0.4, act='shake'), 'pieks': P(eyes='wide'), 'tupfi': P(eyes='wide')}, sfx='crash'),
    L('gustav', 'Ich komme mit! Ich bin der offizielle Sonnenwecker! Das ist mein Job!', set={'gustav': P(act='idle', pose='point')},
      cam=(1500, 520, 1.4)),
    A(0.8),
])

# ---------------------------------------------------------------- SZENE 5 – Am Berg, Konzert, Wuschel
ITEMS = {k: P(type=k, x=640, y=840, a=0, z=8, s=0.4) for k in ['pot', 'lid', 'spoon', 'duck', 'trumpet', 'trumpet2']}
ITEMS['trumpet2']['type'] = 'trumpet'
scene('s05_mountain', 'mountain', 'march', dict(ITEMS, **{
    'pieks': P(x=640, y=G, z=6), 'tupfi': P(x=880, y=G + 10, z=6, glow=1), 'gustav': P(x=1220, y=G, s=0.85, z=5),
    'wuschel': P(x=880, y=200, a=0, z=9, act='float', eyes='sad', mouth='frown'),
}), [
    A(2.0, cam=(960, 540, 1.0)),
    L('pieks', 'Plan Nummer eins: Das Super-Weck-Konzert!', set={'pieks': P(act='hop', mouth='grin')}),
    A(0.45, set={'pot': P(a=1, x=420, y=560, s=1, tw=0.35)}, sfx='pop'),
    A(0.45, set={'lid': P(a=1, x=600, y=470, s=1, tw=0.35)}, sfx='pop'),
    A(0.45, set={'spoon': P(a=1, x=780, y=560, s=1, tw=0.35)}, sfx='pop'),
    A(0.45, set={'duck': P(a=1, x=330, y=430, s=1, tw=0.35)}, sfx=[('pop', 0), ('squeak', 0.2)]),
    A(0.45, set={'trumpet': P(a=1, x=500, y=360, s=1, tw=0.35)}, sfx='pop'),
    A(0.6, set={'trumpet2': P(a=1, x=760, y=380, s=1, tw=0.35)}, sfx='pop'),
    L('tupfi', 'Wie passt das alles da rein?', set={'tupfi': P(eyes='wide', mouth='o')}),
    L('pieks', 'Profi-Rucksack.', set={'pieks': P(eyes='wink', mouth='grin'), 'tupfi': P(eyes='open', mouth='smile')}),
    A(1.0, set={'pot': P(x=450, y=975), 'spoon': P(x=520, y=965, rot=-30), 'lid': P(x=1010, y=975), 'trumpet': P(x=1400, y=820),
                'duck': P(x=770, y=985), 'trumpet2': P(x=1520, y=960, rot=20), 'pieks': P(eyes='open')}),
    L('pieks', 'Und ihr zu Hause macht mit! Wenn ich drei sage, ruft ihr ganz laut: Aufstehen! Eins... zwei... drei!',
      cam=(640, 700, 1.9), ctw=0.8, rate=0.95),
    L('alle', 'Aufsteheeeen!', sfx='cacophony', cam=(960, 540, 1.0), ctw=0.3,
      set={'_': P(shake=1), 'pot': P(act='shake'), 'lid': P(act='shake'), 'trumpet': P(act='shake'), 'duck': P(act='shake'), 'trumpet2': P(act='shake')}),
    A(2.2, set={'_': P(shake=0), 'pot': P(act='idle'), 'lid': P(act='idle'), 'trumpet': P(act='idle'), 'duck': P(act='idle'), 'trumpet2': P(act='idle')}),
    L('echo', 'stehen... stehen... ehen...', cam=(1200, 300, 1.4), ctw=1.2, fx='echo'),
    A(1.0, cam=(960, 540, 1.0)),
    L('gustav', 'Pah! Amateure. Lasst den Profi ran!', set={'gustav': P(pose='point')}),
    A(1.4, set={'gustav': P(s=1.05, var='puff', pose='stand', eyes='closed', tw=1.2)}, sfx='inflate'),
    L('gustav', 'Kikeri... Törööööö!', set={'gustav': P(pose='crow', eyes='wide')}, sfx=[('elephant', 0.6)], fx='crow'),
    A(1.4, set={'gustav': P(s=0.85, var='', pose='stand', mouth='o'), 'pieks': P(eyes='wide'), 'tupfi': P(eyes='wide')}, sfx='wahwah'),
    L('gustav', 'Ich hab heute irgendwie eine komische Stimme.', set={'gustav': P(mouth='frown')}),
    A(2.0, set={'wuschel': P(a=1, y=560, rain=1, tw=1.5), 'pieks': P(eyes='open'), 'tupfi': P(eyes='up')},
      sfx=[('drip', 0.2), ('drip', 0.8), ('drip', 1.4)]),
    A(1.8, sfx='pff_sad', cam=(880, 620, 1.5)),
    L('tupfi', 'Oh! Eine kleine Wolke! Hallo, du. Warum weinst du denn?', set={'tupfi': P(eyes='open')}),
    A(1.7, set={'wuschel': P(shape='sun')}, sfx='pling'),
    A(1.7, set={'wuschel': P(shape='q')}, sfx='pling'),
    L('tupfi', 'Du vermisst die Sonne auch, oder?', set={'wuschel': P(shape='cloud')}),
    A(1.5, set={'wuschel': P(act='nod', rain=2)}, sfx='pff_sad'),
    L('tupfi', 'Weißt du was? Wir gehen sie besuchen. Willst du mitkommen?', set={'wuschel': P(act='float')}),
    A(2.0, set={'wuschel': P(rain=0, sparkle=1, shape='heart', eyes='happy', mouth='smile')}, sfx=[('pling', 0), ('puffpuff', 0.6)]),
    L('pieks', 'Wie heißt du denn?', set={'wuschel': P(shape='cloud')}, cam=(960, 560, 1.2)),
    A(1.6, set={'wuschel': P(act='spin')}, sfx='swirl'),
    L('pieks', 'Wuschel! Du heißt ab jetzt Wuschel!', set={'wuschel': P(act='float'), 'pieks': P(act='hop', mouth='grin')}),
    A(1.0, set={'wuschel': P(act='nod')}, sfx='pff_yes'),
    L('tupfi', 'Dann los! Auf zur Sonne!', set={'wuschel': P(act='float'), 'tupfi': P(act='hop')}),
    A(1.4, set={'pieks': P(x=2300, act='walk', tw=1.2), 'tupfi': P(x=2400, act='bounce', tw=1.3),
                'gustav': P(x=2500, act='walk', tw=1.3), 'wuschel': P(x=2400, tw=1.3)}),
])

# ---------------------------------------------------------------- SZENE 6 – Kicherbrücke
PL = [700 + i * 75 for i in range(8)]  # x der Bretter
BY = 830
scene('s06_bridge', 'bridge', 'march', {
    'bridge': P(x=960, y=900, z=3),
    'pieks': P(x=470, y=G - 20, z=6), 'tupfi': P(x=330, y=G - 10, z=6, glow=1), 'gustav': P(x=170, y=G - 20, s=0.82, z=5),
    'wuschel': P(x=420, y=520, z=8, act='float', eyes='open'),
}, [
    A(2.0, cam=(960, 540, 1.0)),
    L('pieks', 'Eine Brücke! Kein Problem!', set={'pieks': P(mouth='grin')}),
    A(0.5, set={'pieks': P(x=PL[0], y=BY)}, ),
    L('brett', 'Hihi!', set={'bridge': P(lit=1)}, fx='note0', gap=0.1),
    A(0.8, set={'pieks': P(x=230, y=760, eyes='wide', mouth='o', act='shake'), 'bridge': P(lit=0)}, sfx='boing'),
    L('pieks', 'Die Brücke hat gelacht!', set={'pieks': P(x=430, y=G - 20, act='idle')}),
    A(0.5, set={'tupfi': P(x=PL[1], y=BY)}),
    L('brett', 'Hoho!', set={'bridge': P(lit=2)}, fx='note1', gap=0.1),
    L('tupfi', 'Sie ist kitzelig! Und jedes Brett macht einen anderen Ton!', set={'bridge': P(lit=0), 'tupfi': P(mouth='grin')}),
    L('tupfi', 'Ähm, ich hab da was entdeckt! Wenn wir richtig drübergehen, spielen wir ein Lied!', set={'tupfi': P(act='ears')}, sfx='pling'),
    L('tupfi', 'Helft ihr uns? Zählt mit! Wie viele Bretter hat die Brücke?', set={'tupfi': P(act='idle', x=430, y=G - 10)}, cam=(430, 700, 1.8)),
    A(0.6, cam=(960, 560, 1.05)),
] + sum([[
    L('chor', w, set={'pieks': P(x=PL[i], y=BY - 5, act='hop', tw=0.25), 'tupfi': P(x=PL[i] - 90, y=BY, act='hop', tw=0.25),
                     'bridge': P(lit=i + 1), '_': P(num=str(i + 1))}, fx='note%d' % i, gap=0.25)
] for i, w in enumerate(['Eins!', 'Zwei!', 'Drei!', 'Vier!', 'Fünf!', 'Sechs!', 'Sieben!', 'Acht!'])], []) + [
    A(0.6, set={'pieks': P(x=1500, y=G - 30, act='idle'), 'tupfi': P(x=1640, y=G - 20, act='idle'), 'bridge': P(lit=0), '_': P(num='')}, sfx='tada'),
    L('tupfi', 'Acht Bretter! Super gezählt!', set={'tupfi': P(mouth='grin', eyes='happy')}),
    L('gustav', 'Jetzt ich! Ganz elegant!', set={'gustav': P(pose='point'), 'tupfi': P(eyes='open')}),
    A(0.8, set={'gustav': P(x=PL[4], y=BY, pose='stand', tw=0.6), 'pieks': P(x=PL[6] + 20, y=BY, tw=0.6), 'tupfi': P(x=PL[7] + 30, y=BY, tw=0.6),
                'wuschel': P(x=1100)}, sfx='thump'),
    L('bridgelaugh', 'Hahahahaha!', set={'bridge': P(lit=9, act='wobble'), 'gustav': P(act='wobble', eyes='wide'),
                                         'pieks': P(act='wobble', eyes='happy'), 'tupfi': P(act='wobble', eyes='happy'), 'wuschel': P(act='wobble')}),
    L('gustav', 'Hört auf zu lachen!', fx='wobble'),
    A(1.4, set={'bridge': P(lit=0, act='idle'), 'gustav': P(x=1450, y=G, rot=80, act='idle'), 'pieks': P(x=1620, y=G, rot=-70, act='idle'),
                'tupfi': P(x=1760, y=G, rot=60, act='idle'), 'wuschel': P(act='float', x=1600)},
      sfx=[('plumps', 0.6), ('plumps', 0.9), ('plumps', 1.2)], tw=1.0),
    L('pieks', 'Beste Brücke der Welt!', set={'pieks': P(eyes='happy', mouth='grin')}, cam=(1600, 800, 1.5)),
    A(1.0, set={'gustav': P(rot=0), 'pieks': P(rot=0), 'tupfi': P(rot=0)}),
])

# ---------------------------------------------------------------- SZENE 7 – Gähnwald
scene('s07_forest', 'forest', 'sleepy', {
    'pieks': P(x=760, y=G, z=6), 'tupfi': P(x=960, y=G + 10, z=6, glow=1), 'gustav': P(x=1240, y=G, s=0.85, z=5),
    'wuschel': P(x=1040, y=520, z=8, act='float'), 'yflower': P(x=380, y=G + 30, z=4),
    'owl1': P(type='owl', x=300, y=420, z=2), 'owl2': P(type='owl', x=1640, y=360, z=2, flip=True),
}, [
    A(2.5, cam=(960, 540, 1.0)),
    L('tupfi', 'Oma Mümmel hat mal erzählt: Im Gähnwald ist Gähnen ansteckend.', rate=0.95),
    L('pieks', 'Ach was! Ich bin doch nicht müde!', set={'pieks': P(mouth='grin')}),
    L('yflower', 'Haaaaa-uuuuuh...', fx='yawn', cam=(450, 760, 1.6)),
    A(1.2, set={'owl1': P(mouth='yawn', eyes='closed')}, sfx='yawn_small', cam=(960, 540, 1.0)),
    A(1.1, set={'owl1': P(mouth='smile'), 'owl2': P(mouth='yawn', eyes='closed')}, sfx='yawn_small'),
    L('gustav', 'Haaaaa-uuuh... Ich nicht... ich bin hellwa... haaaa...', set={'owl2': P(mouth='smile'), 'gustav': P(eyes='sleepy')}, fx='yawn'),
    L('tupfi', 'Oh nein! Schafft ihr es, nicht zu gähnen? Wir versuchen es zusammen! Mund zu!', cam=(960, 760, 2.0)),
    A(2.6, set={'tupfi': P(mouth='tight', act='nod'), 'wuschel': P(mouth='tight')}),
    A(2.0, set={'tupfi': P(mouth='smile', act='idle'), 'wuschel': P(mouth='smile'), 'pieks': P(eyes='sleepy', act='sleep')},
      cam=(760, 740, 1.7), ctw=1.2),
    A(3.0, set={'pieks': P(eyes='closed', bubble=1, tw=2.8)}, sfx='snore'),
    A(1.8, set={'pieks': P(bubble=0, tw=0.05)}, sfx=[('pop', 0.0), ('snore', 0.3)]),
    L('tupfi', 'Pieks! Aufwachen! Wir dürfen hier nicht einschlafen!', set={'tupfi': P(x=880)}, cam=(820, 720, 1.4)),
    A(1.0, set={'tupfi': P(act='ears')}),
    L('tupfi', 'Kille-kille-kille!', set={'tupfi': P(act='laugh', x=840)}),
    L('pieks', 'Hahaha! Hör auf! Hahaha! Ich bin wach! Ich bin wach!', set={'pieks': P(eyes='happy', mouth='grin', act='laugh'),
                                                                          'tupfi': P(act='idle', mouth='grin')}),
    L('tupfi', 'Ähm, ich hab da was entdeckt! Wer lacht, der gähnt nicht!', set={'pieks': P(act='idle', eyes='open')}, sfx='pling'),
    L('pieks', 'Dann lachen wir einfach den ganzen Weg!', set={'pieks': P(act='hop')}, cam=(960, 540, 1.0)),
    A(2.6, set={'pieks': P(x=2300, act='walk', eyes='happy', tw=2.4), 'tupfi': P(x=2400, act='bounce', tw=2.5),
                'wuschel': P(x=2400, tw=2.5), 'gustav': P(x=1560, eyes='closed', act='walk', tw=2.4)}, sfx='laugh_two'),
    A(0.9, set={'gustav': P(act='shake')}, sfx='boing'),
    L('gustav', 'Ich bin wach! Wer hat das gesagt? Ich war das nicht!', set={'gustav': P(eyes='wide', act='idle')}, cam=(1560, 560, 1.5)),
    A(0.8, set={'gustav': P(x=2400, act='walk', tw=0.8)}),
])

# ---------------------------------------------------------------- SZENE 8 – Felswand, Wuschel wächst
scene('s08_wall', 'wall', 'mystery', {
    'pieks': P(x=700, y=G, z=6), 'tupfi': P(x=900, y=G + 10, z=6, glow=1), 'gustav': P(x=1150, y=G, s=0.85, z=5),
    'wuschel': P(x=960, y=560, z=8, act='float'),
}, [
    A(2.6, cam=(960, 300, 1.6)),
    L('pieks', 'Oh. Hier ist der Weg zu Ende.', cam=(960, 540, 1.0), ctw=1.5, set={'pieks': P(eyes='up')}),
    L('pieks', 'Kein Problem, ich hab einen Plan! Wir springen einfach hoch!', set={'pieks': P(eyes='open', mouth='grin')}),
    A(0.6, set={'pieks': P(var='squash')}, sfx='hop'),
    A(0.7, set={'pieks': P(var='', y=G - 50, tw=0.3)}),
    A(0.6, set={'pieks': P(y=G, tw=0.25)}, sfx='plop'),
    L('pieks', 'Fast!', set={'pieks': P(mouth='grin', eyes='happy')}),
    L('tupfi', 'Pieks, das ist kein guter Plan.', set={'pieks': P(eyes='open')}),
    A(2.6, set={'wuschel': P(x=900, y=G - 140, red=1, tw=0.8), 'tupfi': P(y=G - 4, tw=2.0)}, sfx='strain'),
    A(1.2, set={'wuschel': P(y=640, red=0, eyes='sad'), 'tupfi': P(y=G + 10, tw=0.4)}),
    L('tupfi', 'Danke, Wuschel. Du bist sehr lieb. Aber du bist noch ein bisschen klein.'),
    A(1.5, set={'wuschel': P(shape='!', eyes='open')}, sfx='pling'),
    A(1.6, set={'wuschel': P(shape='cloud', x=1620, y=560, tw=1.2)}, sfx='whoosh'),
    A(1.4, set={'wuschel': P(act='shake')}, sfx='slurp'),
    A(3.2, set={'wuschel': P(act='float', s=3.0, x=980, y=1075, tw=3.0), 'pieks': P(eyes='wide', mouth='o'),
                'tupfi': P(eyes='wide', mouth='o'), 'gustav': P(eyes='wide', mouth='o', x=1450)}, sfx='inflate_up'),
    L('gustav', 'Ach. Du. Meine. Feder.', rate=1.2),
    A(1.2, sfx='puff_big'),
    L('pieks', 'Wuschel! Du bist ja riesig!', set={'pieks': P(mouth='grin', eyes='happy', act='hop')}),
    A(1.8, set={'pieks': P(x=820, y=600, act='idle', z=9), 'tupfi': P(x=990, y=585, z=9), 'gustav': P(x=1180, y=600, z=9, s=0.75),
                'wuschel': P(z=7)}, sfx='plumps', tw=0.9),
    L('tupfi', 'Gut festhalten, alle zusammen!', set={'tupfi': P(eyes='open')}),
    A(1.4, set={'wuschel': P(y=700, tw=1.4), 'pieks': P(y=225, tw=1.4), 'tupfi': P(y=210, tw=1.4), 'gustav': P(y=225, tw=1.4)},
      sfx='whoosh'),
])

RIDE = {
    'wuschel': P(x=960, y=1075, s=3.0, z=7, act='float', eyes='happy'),
    'pieks': P(x=780, y=600, z=9, act='float'), 'tupfi': P(x=975, y=590, z=10, glow=1, act='float'),
    'gustav': P(x=1180, y=600, z=9, s=0.75, act='float'),
}
scene('s08b_flight', 'flight', 'flight', dict(RIDE, **{'sstar': P(type='shootstar', x=-200, y=200, z=4)}), [
    A(4.5, cam=(960, 540, 1.0), sfx='wind'),
    L('pieks', 'Wir fliiiegen!', set={'pieks': P(pose='cheer', mouth='grin', eyes='happy')}),
    A(1.8, set={'sstar': P(x=2300, y=120, tw=1.6)}, sfx='huii'),
    L('tupfi', 'Es ist so schön hier oben!', set={'tupfi': P(eyes='happy', mouth='grin')}),
    A(2.5, set={'pieks': P(pose='')}),
], mvol=1.0)

scene('s08c_moon', 'moonsky', 'flight', dict({k: dict(v) for k, v in RIDE.items()}, **{
    'mond': P(x=1480, y=1000, s=1.0, z=3, eyes='sleepy'),
}), [
    A(1.0, set={'wuschel': P(x=560, s=1.6, y=1000, tw=0), 'pieks': P(x=470, y=725, s=0.55, tw=0), 'tupfi': P(x=560, y=718, s=0.55, tw=0),
                'gustav': P(x=650, y=725, s=0.42, tw=0)}, cam=(960, 540, 1.0), ctw=0.01),
    L('mond', 'Ohhh... Besuch... Hallo, ihr Kleinen... Ich müsste längst im Bett sein... Ich bin sooo... müüü...', rate=0.9),
    A(2.6, set={'mond': P(eyes='closed', y=1250, rot=10, tw=2.4)}, sfx=[('snore', 0.0), ('slide', 0.6)]),
    L('tupfi', 'Opa Mond! Nicht einschlafen!', set={'tupfi': P(eyes='wide')}),
    L('mond', 'Hm?! Ich schlafe nicht! Ich ruhe nur meine Augen aus.', set={'mond': P(eyes='sleepy', y=1000, rot=0, tw=0.5)}),
    L('mond', 'Bitte, weckt die Sonne. Dann darf ich endlich schlafen. Sie ist da oben, gleich hinter der großen Wolke.', rate=0.95),
    L('pieks', 'Wird gemacht, Opa Mond!', set={'pieks': P(act='hop', mouth='grin')}),
    A(1.6, set={'mond': P(eyes='closed')}, sfx='snore'),
])

# ---------------------------------------------------------------- SZENE 9 + 10 – Schlafzimmer der Sonne
SUNROOM = {
    'sola': P(x=1260, y=1060, s=0.8, z=2, var='messy', eyes='sad', mouth='frown', cap=1, act='float'),
    'blanket': P(x=1260, y=1000, s=1.5, z=4, act='breathe'),
    'raytoe': P(x=540, y=1000, z=3, a=0),
    'pieks': P(x=380, y=G + 30, z=6), 'tupfi': P(x=560, y=G + 40, z=6), 'gustav': P(x=760, y=G + 20, s=0.82, z=6),
    'wuschel': P(x=560, y=500, z=8, act='float'), 'feather': P(x=480, y=820, z=9, a=0),
}
scene('s09_sunroom', 'sunroom', 'secret', SUNROOM, [
    A(3.4, cam=(960, 540, 1.0), sfx='breath'),
    L('tupfi', 'Da ist sie.', fx='whisper', rate=1.1),
    L('pieks', 'Die verschläft ja den ganzen Tag!', fx='whisper'),
    L('gustav', 'Jetzt bin ich dran. Profi-Arbeit.', set={'gustav': P(x=900)}, fx='whisper'),
    A(1.0, set={'gustav': P(var='puff', s=1.0, eyes='closed', tw=0.9)}, sfx='inflate'),
    L('gustav', 'Kikeri... Quaaaaaak!', set={'gustav': P(pose='crow', eyes='wide')}, fx='duck'),
    A(1.4, set={'gustav': P(var='', s=0.82, pose='stand', comb=1, mouth='o')}, sfx='flop'),
    L('gustav', 'Eine Ente?! Jetzt auch noch eine Ente?!', set={'gustav': P(mouth='frown')}),
    L('pieks', 'Plan Nummer zwei! Die Feder-Kitzel-Attacke!', set={'feather': P(a=1, x=470, y=770), 'pieks': P(mouth='grin', act='hop')}),
    L('gustav', 'He! Ist das meine?', set={'gustav': P(eyes='wide', flip=True)}),
    L('pieks', 'Nur ausgeliehen!', set={'gustav': P(flip=False, eyes='open'), 'pieks': P(eyes='wink')}),
    A(1.4, set={'raytoe': P(a=1), 'pieks': P(x=330, eyes='open'), 'feather': P(x=450, y=960)}, sfx='sparkle', cam=(520, 800, 1.6)),
    A(1.6, set={'feather': P(act='tickle')}, sfx='feather'),
    L('sola', 'Hihihi! Hör auf! Hihihi! Das kitzelt!', set={'blanket': P(act='shake'), 'raytoe': P(a=0, tw=0.3), 'feather': P(act='idle')},
      mouth='none'),
    A(1.3, set={'blanket': P(act='breathe'), 'pieks': P(eyes='wide', mouth='o'), 'tupfi': P(eyes='wide', mouth='o'),
                'gustav': P(eyes='wide', mouth='o')}, cam=(960, 540, 1.0), sfx='dun'),
    L('tupfi', 'Sie... sie ist ja wach!', fx='whisper', set={'tupfi': P(eyes='open')}),
    L('pieks', 'Super! Dann steh auf, Sonne! Alle warten auf dich!', set={'pieks': P(eyes='open', mouth='grin', act='hop')}),
    L('sola', 'Nein! Ich komme nicht raus. Nie, nie wieder!', set={'blanket': P(act='shake')}, mouth='none'),
    A(1.6, set={'blanket': P(act='breathe'), 'wuschel': P(shape='!'), 'feather': P(y=G + 20, rot=90, tw=1.0),
                'gustav': P(mouth='o'), 'pieks': P(mouth='o', eyes='wide')}, sfx='dun'),
    A(1.8, set={'tupfi': P(x=880, y=G - 10, act='walk', tw=1.6), 'wuschel': P(shape='cloud'), 'pieks': P(x=560, eyes='open', mouth='smile')}),
    L('tupfi', 'Hallo, Sonne. Ich bin Tupfi. Warum willst du nicht rauskommen?', set={'tupfi': P(act='idle')}, rate=0.92,
      cam=(1000, 700, 1.3)),
    A(1.5, sfx='sniff'),
    L('sola', 'Weil... weil ich einen Fleck bekommen habe. Mitten im Gesicht! Und jetzt werden mich alle auslachen.', mouth='none', rate=0.92),
    L('pieks', 'Einen... Fleck?', set={'pieks': P(eyes='wide')}, cam=(560, 760, 1.6)),
], auto=True)

scene('s10_reveal', 'sunroom', 'secret', dict(SUNROOM, **{
    'tupfi': P(x=880, y=G - 10, z=6), 'pieks': P(x=560, y=G + 30, z=6), 'feather': P(a=0),
    'gustav': P(x=760, y=G + 20, s=0.82, z=6, comb=1),
}), [
    L('tupfi', 'Was glaubt ihr? Wie sieht der Fleck aus? Ist er groß? Ist er klein? Ist er... grün?', cam=(880, 760, 2.2), ctw=0.01, rate=0.95),
    A(3.0, set={'wuschel': P(shape='q', x=1000, y=520)}),
    L('tupfi', 'Sonne, zeigst du ihn uns? Wir lachen nicht. Versprochen.', set={'wuschel': P(shape='cloud', x=560)}, cam=(960, 600, 1.2), rate=0.95),
    L('pg', 'Versprochen!', set={'pieks': P(act='nod'), 'gustav': P(act='nod')}),
    A(3.2, set={'pieks': P(act='idle'), 'gustav': P(act='idle'), 'blanket': P(y=1180, act='idle', tw=3.0)}, sfx='drumroll_long',
      cam=(1260, 620, 1.3), ctw=1.0),
    A(1.6, set={'gustav': P(act='nibble', eyes='wide')}, cam=(760, 760, 2.0), ctw=0.01),
    A(2.6, set={'gustav': P(act='idle'), 'blanket': P(y=1850, tw=2.0)}, sfx=[('pling', 2.3)], cam=(1260, 560, 1.25), ctw=0.01),
    L('pieks', 'Wo? Ich seh gar keinen... Ach! Der da? Der ist ja winzig klein!', cam=(960, 560, 1.0)),
    L('sola', 'Er ist riesig! Und er ist braun! Eine Sonne muss ganz und gar gelb sein!', set={'sola': P(tears=1)}, cam=(1260, 560, 1.3)),
    A(1.6, set={'pieks': P(act='laugh', mouth='grin')}, sfx=[('giggle', 0.0), ('stups', 0.9)], cam=(720, 760, 1.5)),
    A(0.5, set={'tupfi': P(x=700, tw=0.25), 'pieks': P(act='idle', mouth='flat', x=520, tw=0.3)}),
    L('pieks', 'Entschuldigung, Sonne. Ich wollte nicht lachen. Man lacht niemanden aus.', set={'tupfi': P(x=860)}, rate=0.92),
    L('sola', 'Siehst du? Es ist komisch.', cam=(1260, 560, 1.3), rate=0.95),
], trans='cut')

# ---------------------------------------------------------------- SZENE 11 – Tupfis Geheimnis
scene('s11_secret', 'sunroom', 'warm', dict(SUNROOM, **{
    'tupfi': P(x=860, y=G - 10, z=6), 'pieks': P(x=520, y=G + 30, z=6), 'feather': P(a=0), 'blanket': P(y=1450, s=1.0, z=4),
    'gustav': P(x=700, y=G + 20, s=0.82, z=6, comb=1), 'sola': P(x=1260, y=1060, s=0.8, z=2, var='messy', eyes='sad', mouth='frown', act='float'),
    'tupfisc': P(type='tupfi', var='scarves', x=960, y=1010, s=1.7, a=0, z=6),
}), [
    L('tupfi', 'Sonne... darf ich dir ein Geheimnis verraten?', set={'tupfi': P(act='ears')}, cam=(960, 620, 1.2), rate=0.92),
    L('sola', 'Ja.', set={'tupfi': P(act='idle')}),
    L('tupfi', 'Siehst du meine Tupfen? Früher hab ich mich dafür geschämt. Ich hab mich auch versteckt.', rate=0.92),
    A(0.4, set={'_': P(bg='beach', flash=1), 'tupfi': P(a=0, tw=0), 'pieks': P(a=0, tw=0), 'gustav': P(a=0, tw=0), 'sola': P(a=0, tw=0),
                'wuschel': P(a=0, tw=0), 'tupfisc': P(a=1, tw=0), 'blanket': P(a=0, tw=0)}, cam=(960, 540, 1.0), ctw=0.01, sfx='swoosh'),
    L('tupfi', 'Mitten im Sommer! Mit drei Schals!', mouth='none', set={'tupfisc': P(act='sweat')}),
    A(1.6, set={'tupfisc': P(act='shake')}),
    A(0.4, set={'_': P(bg='sunroom', flash=0), 'tupfi': P(a=1, tw=0), 'pieks': P(a=1, tw=0), 'gustav': P(a=1, tw=0), 'sola': P(a=1, tw=0),
                'wuschel': P(a=1, tw=0), 'tupfisc': P(a=0, tw=0), 'blanket': P(a=1, tw=0)}, sfx='swoosh'),
    L('sola', 'Hihi... drei Schals?', set={'sola': P(mouth='grin', eyes='happy')}, cam=(1260, 560, 1.3)),
    L('tupfi', 'Aber dann hat Pieks gesagt...', set={'sola': P(eyes='open', mouth='smile')}, cam=(960, 620, 1.2)),
    L('pieks', '...dass deine Tupfen die schönsten im ganzen Kringeltal sind!', set={'pieks': P(mouth='grin')}),
    L('pieks', 'Zählt ihr mit?', cam=(860, 760, 1.7)),
] + [
    L('chor', w, set={'tupfi': P(dot=i + 1, var='back' if i >= 5 else '', act='hop' if i in (0, 5) else 'idle'), '_': P(num=str(i + 1))},
      fx='note%d' % i, gap=0.35)
    for i, w in enumerate(['Eins!', 'Zwei!', 'Drei!', 'Vier!', 'Fünf!', 'Sechs!', 'Sieben!'])
] + [
    A(0.8, set={'tupfi': P(dot=0, var=''), '_': P(num='')}, sfx='tada', cam=(960, 620, 1.1)),
    L('gustav', 'Und schaut mich an! Mein Kamm ist schief!', set={'gustav': P(comb=1, act='hop')}, sfx=[('flop', 1.2)], cam=(700, 640, 1.5)),
    L('gustav', 'Na und? Ich bin trotzdem der beste Sonnenwecker der Welt!', set={'gustav': P(pose='point', act='idle')}),
    L('pieks', '...Meistens.', set={'pieks': P(eyes='wink', mouth='grin'), 'gustav': P(pose='')}, cam=(520, 760, 2.0), ctw=0.4),
    A(0.9, set={'pieks': P(eyes='open')}, sfx='funk', cam=(960, 620, 1.1)),
    L('oma', 'Ihr Lieben, ich hab alles gehört! Auch die echte Sonne am Himmel hat Flecken. Die heißen Sonnenflecken. Das ist ganz normal!',
      fx='radio', set={'_': P(fact=1)}, mouth='none', rate=0.95),
    L('sola', 'Echt? Sonnenflecken?', set={'_': P(fact=0), 'sola': P(eyes='wide', mouth='o')}, cam=(1260, 560, 1.3)),
    L('tupfi', 'Siehst du? Dein Fleck gehört zu dir. Er macht dich besonders.', set={'sola': P(eyes='open', mouth='smile')}, cam=(960, 620, 1.1), rate=0.92),
    A(1.6, set={'wuschel': P(shape='sundot', sparkle=1), 'sola': P(mouth='grin', eyes='happy')}, sfx='pling'),
], trans='cut')

# ---------------------------------------------------------------- SZENE 11b – Lied
SONG = [  # (Sänger, Text) – jede Zeile = ein Takt
    (None, None), (None, None),
    ('tupfi', 'Ein Tupfen hier, ein Fleck dort,'), ('tupfi', 'ein Kamm, der wackelt, na und?'),
    ('tupfi', 'Versteck dich nicht, lauf nicht fort,'), ('tupfi', 'die Welt ist bunt und kunterbunt!'),
    ('alle', 'Jeder Tupfen ist toll!'), ('alle', 'Toll, toll, toll!'),
    ('alle', 'Jeder Fleck ist wunderschön!'), ('alle', 'Schön, schön, schön!'),
    ('alle', 'Was dich anders macht,'), ('alle', 'ist das, was strahlt und lacht,'), ('alle', 'komm raus, die Welt will dich sehn!'),
    ('pieks', 'Ich hab Stacheln, die sind spitz,'), ('pieks', 'und trotzdem kuscheln wir!'),
    ('sola', 'Und lacht ihr, dann ist das kein Witz,'), ('sola', 'dann lacht ihr ja mit mir!'),
    ('alle5', 'Jeder Tupfen ist toll!'), ('alle5', 'Toll, toll, toll!'),
    ('alle5', 'Jeder Fleck ist wunderschön!'), ('alle5', 'Schön, schön, schön!'),
    ('alle5', 'Was dich anders macht,'), ('alle5', 'ist das, was strahlt und lacht,'), ('alle5', 'komm raus, die Welt will dich sehn!'),
    (None, None), (None, None),
]
scene('s11b_song', 'sunroom', 'song', dict(SUNROOM, **{
    'tupfi': P(x=860, y=G - 10, z=6, act='dance'), 'pieks': P(x=520, y=G + 30, z=6, act='dance'), 'feather': P(a=0), 'blanket': P(y=1450, s=1.0, z=4),
    'gustav': P(x=680, y=G + 20, s=0.82, z=6, comb=1, act='dance'),
    'sola': P(x=1260, y=1060, s=0.8, z=2, var='messy', eyes='happy', mouth='smile', act='float', glow=0),
    'wuschel': P(x=600, y=480, z=8, act='dance', sparkle=1, shape='heart'),
}), [dict(kind='song', bars=SONG, bpm=104)], trans='cut', auto=False, cam=(960, 560, 1.05))

# ---------------------------------------------------------------- SZENE 12 – Strubbel-Strahlen
scene('s12_comb', 'sunroom', 'morning', dict(SUNROOM, **{
    'tupfi': P(x=760, y=G - 10, z=6), 'pieks': P(x=500, y=G + 30, z=6), 'feather': P(a=0), 'blanket': P(y=1450, s=1.0, z=4, a=0),
    'gustav': P(x=330, y=G + 20, s=0.82, z=6, comb=1),
    'sola': P(x=1260, y=1060, s=0.8, z=2, var='messy', eyes='happy', mouth='grin', act='float', glow=1),
    'wuschel': P(x=600, y=480, z=8, act='float'),
}), [
    L('sola', 'Okay! Ich steh auf!', cam=(1100, 560, 1.15)),
    A(1.6, set={'sola': P(y=900, s=0.9, act='stretch', tw=1.2)}, sfx='stretch'),
    A(1.3, set={'sola': P(act='float')}, sfx=[('boing', 0.2), ('boing', 0.7)]),
    A(1.6, set={'pieks': P(act='laugh', eyes='happy', mouth='grin'), 'tupfi': P(act='laugh', eyes='happy', mouth='grin'),
                'gustav': P(act='laugh', eyes='happy')}, sfx='laugh_group'),
    L('sola', 'Oh nein! Meine Strahlen! Ich hab viel zu lange gelegen!', set={'pieks': P(act='idle', eyes='open'), 'tupfi': P(act='idle', eyes='open'),
                                                                             'gustav': P(act='idle', eyes='open'), 'sola': P(act='laugh')}),
    L('pieks', 'Kein Problem, ich hab einen Plan!', set={'pieks': P(act='hop'), 'sola': P(act='float')}, cam=(700, 640, 1.3)),
    L('tupfi', 'Oh-oh.', set={'tupfi': P(mouth='flat', eyes='up')}),
    L('pieks', 'Meine Stacheln! Die sind wie ein Kamm!', set={'pieks': P(flip=True, mouth='grin'), 'tupfi': P(eyes='open', mouth='smile')}),
    A(0.6, set={'pieks': P(var='ball', flip=False, act='roll', x=800, y=640)}, sfx='swoosh', cam=(1150, 560, 1.05)),
    A(0.8, set={'pieks': P(x=1000, y=300, tw=0.7), 'wuschel': P(x=900, y=360, sparkle=1, tw=0.8)}, sfx='brush'),
    A(0.8, set={'pieks': P(x=1350, y=220, tw=0.7), 'wuschel': P(x=1150, y=260, tw=0.8)}, sfx='brush'),
    A(0.8, set={'pieks': P(x=1650, y=420, tw=0.7), 'wuschel': P(x=1450, y=300, tw=0.8), 'sola': P(comb=0.5)}, sfx='brush'),
    A(0.8, set={'pieks': P(x=1620, y=760, tw=0.7), 'wuschel': P(x=1650, y=500, tw=0.8)}, sfx='brush'),
    A(0.8, set={'pieks': P(x=900, y=700, tw=0.7), 'wuschel': P(x=1500, y=760, tw=0.8), 'sola': P(comb=1)}, sfx='brush'),
    A(1.1, set={'pieks': P(var='', act='hop', x=560, y=G + 30), 'wuschel': P(x=640, y=480), 'sola': P(var='neat', eyes='happy')},
      sfx='bling', cam=(960, 560, 1.0)),
    L('pieks', 'Meine Stacheln sind ein Kamm! Wer hätte das gedacht!', set={'pieks': P(act='idle', mouth='grin', eyes='happy')}),
    L('sola', 'Danke, Pieks. Du bist der Beste.', set={'sola': P(eyes='open'), 'pieks': P(eyes='open')}, rate=0.95),
    L('sola', 'Seid ihr bereit?'),
    L('alle', 'Bereit!', set={'pieks': P(act='hop'), 'tupfi': P(act='hop'), 'gustav': P(act='hop')}),
], trans='cut')

# ---------------------------------------------------------------- SZENE 12b – Sonnenaufgang
scene('s12b_sunrise', 'sunrise', 'sunrise', {
    'sola': P(x=960, y=1700, s=0.75, z=2, var='neat', eyes='happy', mouth='grin', act='float', glow=1, cap=0),
}, [
    A(6.5, set={'sola': P(y=820, tw=6.0), '_': P(light=1, tw=6.2)}, sfx='swell', cam=(960, 540, 1.15), ctw=6.0),
], trans='cut', auto=False, cam=(960, 600, 1.0))

scene('s12c_valley', 'square_day', 'sunrise', dict(CROWD, **{
    'sunny': P(x=1780, y=930, z=3, var='down'), 'wolle': P(x=470, y=G, z=4), 'tray': P(x=560, y=770, z=5),
    'flowers': P(x=960, y=1000, z=6),
    'sola': P(x=1500, y=420, s=0.3, z=0, var='neat', eyes='happy', mouth='grin', cap=0, act='float', glow=1),
}), [
    A(1.8, set={'flowers': P(var='open')}, sfx=[('pop', 0.2), ('pop', 0.5), ('pop', 0.8), ('pop', 1.1)]),
    L('sunny', 'Juhuuu!', set={'sunny': P(var='', act='hop')}, cam=(1700, 700, 1.5), rate=1.0),
    L('wolle', 'Mein Teig! Er geht auf! Er geht auf!', set={'tray': P(var='risen'), 'wolle': P(mouth='grin', eyes='happy', act='hop')},
      cam=(560, 650, 1.5), sfx='inflate'),
    A(2.4, set={k: P(act='bounce', eyes='happy') for k in CROWD}, sfx='cheer', cam=(960, 540, 1.0)),
], trans='cut', auto=False)

scene('s12d_moonbed', 'daysky', 'sunrise', {
    'mond': P(x=960, y=900, s=0.75, z=3, eyes='sleepy'), 'pillow': P(x=960, y=990, z=4),
}, [
    L('mond', 'Endlich... Gute Nacht, Kinder...', rate=0.9),
    A(1.8, set={'mond': P(eyes='closed', rot=15)}, sfx='snore'),
], trans='cut', auto=False, mvol=0.6)

scene('s12e_crow', 'sunroom_day', 'sunrise', {
    'gustav': P(x=960, y=G, s=1.0, z=5, comb=1), 'pieks': P(x=560, y=G + 20, z=6, eyes='happy', mouth='grin'),
    'tupfi': P(x=1360, y=G + 20, z=6, eyes='happy', mouth='grin'), 'wuschel': P(x=1500, y=450, z=8, act='float'),
    'clapstar': P(type='star', x=1300, y=360, z=7, s=0.6, act='clap'),
    'sola': P(x=330, y=380, s=0.35, z=1, var='neat', eyes='happy', mouth='grin', cap=0, act='float', glow=1),
}, [
    A(1.0),
    L('gustav', 'Kikerikiiiiiiiii!', set={'gustav': P(pose='crow', eyes='closed')}, fx='opera', cam=(960, 520, 1.3)),
    A(1.3, set={'gustav': P(pose='stand', eyes='open')}, sfx='applause_small'),
    A(1.2, set={'gustav': P(eyes='up')}),
    L('gustav', '...Pünktlich, oder?', set={'gustav': P(eyes='open', mouth='smile')}),
    L('alle', 'Ganz knapp, Gustav!', set={'pieks': P(act='laugh'), 'tupfi': P(act='laugh')}, sfx=[('laugh_group', 0.9)]),
    A(1.4),
], trans='cut', mvol=0.7)

# ---------------------------------------------------------------- SZENE 13 – Sonnenfest
scene('s13_fest', 'festival', 'polka', dict(CROWD, **{
    'frog1': P(type='frog', x=700, y=G, s=0.9, z=4),
    'wolle': P(x=500, y=G, z=4), 'pieks': P(x=1100, y=G + 20, z=6), 'tupfi': P(x=1300, y=G + 30, z=6),
    'gustav': P(x=1620, y=G, s=0.82, z=5), 'wuschel': P(x=1200, y=480, z=8, act='float'),
    'sola': P(x=1650, y=300, s=0.32, z=0, var='neat', eyes='happy', mouth='grin', cap=0, act='float', glow=1),
}), [
    A(3.0, cam=(960, 540, 1.0)),
    L('wolle', 'So! Jetzt bist du ein Sonnenfleck-Frosch!', set={'wolle': P(mouth='grin')}, sfx=[('tupf', 1.4)], cam=(600, 700, 1.5)),
    L('frog1', 'Quaaak!', set={'frog1': P(dot=1, act='hop', mouth='grin')}, fx='duck'),
    L('gustav', 'He! Das ist jetzt mein Text!', set={'gustav': P(eyes='wide', act='shake')}, cam=(1300, 600, 1.2)),
    A(1.4, set={'gustav': P(act='idle', eyes='open'), 'pieks': P(act='laugh', eyes='happy'), 'tupfi': P(act='laugh', eyes='happy')},
      sfx='laugh_group', cam=(960, 540, 1.0)),
    L('sola', 'Danke, Tupfi! Danke, Pieks! Danke, Gustav! Danke, Wuschel!', set={'pieks': P(act='idle', eyes='open'), 'tupfi': P(act='idle', eyes='open')},
      cam=(1500, 400, 1.3)),
    L('pieks', 'Siehst du, Tupfi? Mein Plan hat funktioniert!', set={'pieks': P(mouth='grin')}, cam=(1200, 720, 1.6)),
    L('tupfi', 'Welcher Plan? Das Konzert? Das Hochspringen? Die Feder?', set={'tupfi': P(mouth='grin', act='ears')}),
    A(1.8, set={'pieks': P(eyes='up', mouth='flat'), 'tupfi': P(act='idle')}),
    L('pieks', 'Ähm... der Plan... dass wir es zusammen machen!', set={'pieks': P(eyes='happy', mouth='grin')}),
    L('tupfi', 'Das ist der beste Plan von allen.', set={'tupfi': P(eyes='happy', mouth='smile')}, rate=0.92),
    A(0.8, set={'pieks': P(x=1160), 'tupfi': P(x=1250)}),
    L('pieks', 'Vorsicht, Stacheln!', set={'pieks': P(mouth='o', eyes='wide')}),
    L('tupfi', 'Weiß ich doch.', set={'pieks': P(mouth='grin', eyes='happy'), 'tupfi': P(x=1225, eyes='closed')}),
    A(2.6, set={'wuschel': P(rainbow=1, x=1200, y=440)}, sfx='sparkle', cam=(1200, 620, 1.3), ctw=1.5),
], mvol=0.9)

# ---------------------------------------------------------------- SZENE 14 – Abend und Schluckauf
scene('s14_evening', 'evening', 'evening', {
    'sola': P(x=1400, y=700, s=0.3, z=1, var='neat', eyes='happy', mouth='grin', cap=0, glow=1),
    'mond': P(x=600, y=1500, s=0.6, z=1, eyes='open', mouth='grin'),
    'pieks': P(x=900, y=1010, s=0.6, z=6), 'tupfi': P(x=1020, y=1015, s=0.6, z=6, glow=1),
    'st1': P(type='star', x=520, y=420, s=0.35, z=3, a=0), 'st2': P(type='star', x=560, y=440, s=0.35, z=3, a=0),
    'st3': P(type='star', x=600, y=430, s=0.35, z=3, a=0),
}, [
    A(1.8, set={'sola': P(y=900, tw=1.6), '_': P(light=1, tw=1.8)}),
    A(0.8, set={'sola': P(eyes='wink')}, sfx='pling'),
    A(1.8, set={'sola': P(y=1200, tw=1.2), 'mond': P(y=760, tw=1.6)}),
    L('mond', 'Sooo! Meine Nachtschicht beginnt. Ich bin ganz ausgeschlafen und... Hicks!', set={'mond': P(act='stretch')},
      sfx=[('hiccup_boing', -0.3)], cam=(700, 600, 1.4)),
    A(0.9, set={'st1': P(a=1, x=1500, y=200, tw=0.8), 'mond': P(act='hic', eyes='wide')}),
    L('mond', 'Oh nein... Hicks! Ich hab... Hicks! Schluckauf!', set={'st2': P(a=1, x=200, y=150, tw=1.8)},
      sfx=[('hiccup_boing', 1.0)]),
    A(1.6, set={'st3': P(a=1, x=1800, y=380, tw=1.2), 'mond': P(act='hic')}, sfx='boing', cam=(960, 540, 1.0)),
    A(1.0, set={'pieks': P(eyes='up'), 'tupfi': P(eyes='up')}, cam=(960, 800, 1.8), ctw=0.8),
    L('pieks', 'Kein Problem,', set={'pieks': P(eyes='open', mouth='grin')}),
    L('tupfi', 'wir haben einen Plan!', set={'tupfi': P(eyes='happy', mouth='grin', act='hop')}),
    L('erz', 'Können Pieks und Tupfi Opa Mond helfen? Das erfahrt ihr in der nächsten Folge: Der Mond hat Schluckauf!',
      set={'_': P(next=1)}, cam=(960, 540, 1.0), ctw=1.0),
    A(1.2),
], trans='fade', auto=False)

# ---------------------------------------------------------------- ENDCARD
scene('s15_endcard', 'endcard', 'endcard', {
    'pieks': P(x=760, y=G + 30, z=6, act='wave'), 'tupfi': P(x=960, y=G + 40, z=6, act='bounce'),
    'gustav': P(x=1180, y=G + 20, s=0.75, z=5, act='bow'), 'wuschel': P(x=960, y=560, z=8, act='float', sparkle=1),
}, [
    L('chor', 'Tschüss! Und denkt dran...', set={'pieks': P(mouth='grin'), 'tupfi': P(mouth='grin')}),
    L('alle', 'Jeder Tupfen ist toll!', set={'pieks': P(act='hop'), 'tupfi': P(act='hop'), 'gustav': P(act='hop')}),
    A(1.2, set={'wuschel': P(shape='heart')}, sfx='puffpuff'),
    dict(kind='fill', total=20.0),
], auto=False)
