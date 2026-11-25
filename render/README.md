# Renderer für „Pieks & Tupfi – Folge 1“

Erzeugt das komplette Video als 2D-Zeichentrick direkt aus Code: Figuren und Hintergründe werden gezeichnet, Stimmen per Piper-TTS erzeugt, Musik und Geräusche synthetisiert.

| Datei | Inhalt |
|---|---|
| `story.py` | Die Folge als Daten: Szenen, Dialoge, Bewegungen, Kamera, Geräusche |
| `audio.py` | Stimmen, Geräusche, Musik, Mischung → `build/master.wav`, `build/timeline.json`, `out/untertitel.srt` |
| `draw.py` | Figuren, Requisiten, Hintergründe |
| `render.py` | Setzt alles Bild für Bild zusammen → `out/pieks-und-tupfi-folge-01.mp4` |

## Ausführen
```bash
pip install piper-tts scipy pillow numpy        # ffmpeg mit rubberband wird benötigt
# Stimmen nach render/voices/ laden (de_DE: thorsten-medium, kerstin-low, eva_k-x_low, ramona-low,
# karlsson-low, thorsten_emotional-medium) von huggingface.co/rhasspy/piper-voices
# Schrift: Fredoka nach render/fonts/Fredoka.ttf (Google Fonts, OFL)
python3 audio.py
python3 render.py preview 12 80 300      # Standbilder zum Prüfen
python3 render.py video                  # komplettes Video (1920x1080, 25 fps)
```
