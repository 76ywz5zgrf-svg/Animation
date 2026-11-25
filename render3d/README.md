# 3D-Kurzvideo „Pieks & Tupfi“ im Comic-Look

Hochkant-Kurzvideo (1080×1920, ca. 71 s) mit echten 3D-Modellen, gerendert mit Blender/Cycles:
Toon-Shading, schwarze Comic-Konturen (Freestyle), Comic-Lautwörter und Punkteraster in der Nachbearbeitung,
animiert „on twos“ (12 Bilder/s, wie in Comic-Animationsfilmen).

| Datei | Inhalt |
|---|---|
| `audio_short.py` | Ton und Ablauf (nutzt Stimmen, Geräusche und Musik aus `../render/audio.py`) |
| `scene3d.py` | Baut Figuren, Welt, Licht, Animation und Kameras in Blender und rendert die Bilder |
| `post3d.py` | Comic-Lautwörter, Raster, Abschlusskarte, Zusammenschnitt mit Ton |

## Ausführen
```bash
python3 -m venv ../render3d_venv && ../render3d_venv/bin/pip install bpy==5.2.5
python3 audio_short.py
../render3d_venv/bin/python scene3d.py test 5 30 60     # Testbilder
for i in 0 1 2; do ../render3d_venv/bin/python scene3d.py render $i 3 2 & done; wait
python3 post3d.py                                       # -> ../render/out/pieks-und-tupfi-3d-kurzvideo.mp4
```
