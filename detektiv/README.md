# Detektiv-Rätsel (Museum)

Hochkant-Video (1080x1920, 24 fps): Im Museum verschwindet bei Stromausfall der goldene Pokal,
drei Verdächtige sagen aus – einer lügt. Fertiges Video: `ausgabe/Detektiv_Raetsel_Museum.mp4`.

## Neu bauen

    npm install
    python3 make_audio.py <ordner-mit-piper-stimmen>   # Stimmen, Musik, Zeitplan -> build/
    node render.mjs frames                             # Einzelbilder -> build/frames/
    ffmpeg -framerate 24 -i build/frames/f_%05d.jpg -i build/audio.wav -c:v libx264 -crf 17 \
      -pix_fmt yuv420p -c:a aac -shortest ausgabe/Detektiv_Raetsel_Museum.mp4

Benötigt `pip install piper-tts numpy`, Playwright mit Chromium und die Piper-Stimmen
`de_DE-thorsten-high`, `karlsson-low`, `kerstin-low`, `pavoque-low` (rhasspy/piper-voices).

Eigene Sprechzeilen (z. B. von ElevenLabs) als `voice_override/<id>.mp3` ablegen
(IDs stehen in `make_audio.py`, z. B. `hook1`, `s3q`); das Video passt sich deren Länge an.
