# Lügenstadt – Kurzvideo (9:16)

In dieser Stadt wächst jeder so groß, wie oft er lügt. Leo (Zahl 0) entlarvt den
„kleinen, ehrlichen“ Bürgermeister, der seine echte Zahl (99) unter einem Hut mit
falschem „0“-Schild versteckt und alle anderen seine Schrumpf-Aufgaben machen lässt.

- `luegenstadt.mp4` – fertiges Video (720×1280, 30 fps, ~58 s, mit Ton)
- `voice/` – Sprachclips. Erzähler: Microsoft Florian (Multilingual), Tim/Bürgermeister: Microsoft Edge TTS, Leo: ElevenLabs („Knurps“, aufgeregt)
- `timeline.py` – baut `render/timeline.json` (Wort-Timings, Story-Events) und den Audio-Mix (Stimmen, Effekte, Musik)
- `render/scene.js` – die komplette 3D-Szene (three.js): Stadt, Figuren, Kamera-Shots, Untertitel
- `render/render.js` – rendert headless mit Playwright und kodiert mit ffmpeg

Neu rendern:

```bash
cd luegenstadt/render && npm i three@0.160.0 && cd ..
python3 timeline.py            # Audio + Timeline
cd render && node render.js full luegenstadt.mp4
node render.js preview 12 40   # einzelne Vorschaubilder (Sekunden)
```
