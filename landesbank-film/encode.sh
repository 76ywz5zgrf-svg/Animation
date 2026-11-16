#!/bin/bash
# Baut beide Videos aus build/frames + Audio + Untertiteln
set -e
cd "$(dirname "$0")"
VF="scale=1080:1920:flags=lanczos,vignette=PI/5,noise=alls=6:allf=t"
ffmpeg -v error -y -framerate 30 -i build/frames/%05d.jpg -i build/audio_full.wav \
  -vf "$VF,ass=build/subs.ass" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "output/Ebene-3_mit_Stimmen.mp4"
ffmpeg -v error -y -framerate 30 -i build/frames/%05d.jpg -i build/audio_novoice.wav \
  -vf "$VF,ass=build/titles_only.ass" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "output/Ebene-3_ohne_Stimmen.mp4"
cp build/audio_voices_only.wav output/ 2>/dev/null || true
ls -la output
