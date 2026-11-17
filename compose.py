"""Composite rendered levels into the final video: face-count title,
satisfying synthesized audio, outro. Usage: python3 compose.py RENDER_DIR OUT.mp4"""
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
LEVELS = [2, 4, 8, 16, 32, 64, 128]
FPS = 30
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
W, H = 720, 1280
OUTRO = 45
SR = 48000

work = os.path.join(SRC, "comp")
os.makedirs(work, exist_ok=True)
font_big = ImageFont.truetype(FONT, 78)
font_small = ImageFont.truetype(FONT, 30)


def ease(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def title(img, faces, t):
    """Draw '<faces> FACES' with a pop-in scale + count-up on level start."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shown = int(round(faces * ease(t / 0.5))) if t < 0.5 else faces
    text = f"{shown:,}".replace(",", ".")
    tw = d.textlength(text, font=font_big)
    sub = "FACES"
    sw = d.textlength(sub, font=font_small)
    y = 120
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text(((W - tw) / 2, y + 4), text, font=font_big, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    d.text(((W - tw) / 2, y), text, font=font_big, fill=(255, 236, 200, 255))
    d.text(((W - sw) / 2 + 3, y + 96), sub, font=font_small, fill=(255, 236, 200, 200),
           spacing=8)
    s = 0.7 + 0.3 * ease(t / 0.35) + 0.06 * np.sin(min(t, 0.6) / 0.6 * np.pi)
    a = ease(t / 0.2)
    comb = Image.alpha_composite(shadow, layer)
    if abs(s - 1) > 1e-3:
        cw, ch = int(W * s), int(H * s)
        cx, cy = W / 2, y + 60
        comb = comb.resize((cw, ch), Image.BICUBIC)
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        canvas.paste(comb, (int(cx - cx * s), int(cy - cy * s)))
        comb = canvas
    if a < 1:
        comb.putalpha(comb.getchannel("A").point(lambda v: int(v * a)))
    img.alpha_composite(comb)
    return img


frames = []
for k in LEVELS:
    d = os.path.join(SRC, f"lvl_{k:03d}")
    fs = sorted(f for f in os.listdir(d) if f.endswith(".png"))
    frames.append((k, [os.path.join(d, f) for f in fs]))

idx = 0
level_starts = []
for li, (k, fs) in enumerate(frames):
    level_starts.append(idx)
    for i, f in enumerate(fs):
        img = Image.open(f).convert("RGBA")
        if img.size != (W, H):
            img = img.resize((W, H), Image.LANCZOS)
        img = title(img, k * k, i / FPS)
        # quick white flash transition at level start
        if i < 4 and li > 0:
            fl = Image.new("RGBA", (W, H), (255, 245, 230, int(110 * (1 - i / 4))))
            img.alpha_composite(fl)
        img.convert("RGB").save(os.path.join(work, f"{idx:05d}.png"))
        idx += 1

# outro: hold last frame, fade to dark with "16.384 FACES ✓"
last = Image.open(os.path.join(work, f"{idx - 1:05d}.png")).convert("RGBA")
for i in range(OUTRO):
    t = i / OUTRO
    img = last.copy()
    img.alpha_composite(Image.new("RGBA", (W, H), (12, 10, 9, int(200 * ease(t * 1.5)))))
    d = ImageDraw.Draw(img)
    msg = "Welche war am besten?"
    mw = d.textlength(msg, font=font_small)
    d.text(((W - mw) / 2, H / 2 - 20), msg, font=font_small,
           fill=(255, 236, 200, int(255 * ease((t - 0.2) * 2))))
    img.convert("RGB").save(os.path.join(work, f"{idx:05d}.png"))
    idx += 1
total = idx

# ---------- audio ----------
dur = total / FPS + 0.5
n = int(dur * SR)
rng = np.random.default_rng(7)
audio = np.zeros((n, 2))
t_all = np.arange(n) / SR

# warm ambient pad (A minor-ish), slow swell
for f0, amp in ((110, 0.05), (164.81, 0.035), (220, 0.03), (261.63, 0.02), (329.63, 0.015)):
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t_all + f0)
    audio[:, 0] += amp * lfo * np.sin(2 * np.pi * f0 * t_all)
    audio[:, 1] += amp * lfo * np.sin(2 * np.pi * (f0 * 1.003) * t_all)


def add(sig, at, pan=0.0):
    s0 = int(at * SR)
    e = min(n, s0 + len(sig))
    audio[s0:e, 0] += sig[: e - s0] * (1 - pan) * 0.9
    audio[s0:e, 1] += sig[: e - s0] * (1 + pan) * 0.9


def whoosh(length=0.7):
    m = int(length * SR)
    noise = rng.standard_normal(m)
    # simple low-pass by cumulative smoothing
    k = 40
    noise = np.convolve(noise, np.ones(k) / k, mode="same")
    env = np.sin(np.linspace(0, np.pi, m)) ** 2
    return noise * env * 0.25


def chime(freq, length=2.2, amp=0.22):
    m = int(length * SR)
    tt = np.arange(m) / SR
    env = np.exp(-tt * 2.6) * (1 - np.exp(-tt * 400))
    sig = (np.sin(2 * np.pi * freq * tt) + 0.45 * np.sin(2 * np.pi * freq * 2.76 * tt) * np.exp(-tt * 3)
           + 0.25 * np.sin(2 * np.pi * freq * 5.4 * tt) * np.exp(-tt * 6))
    return sig * env * amp


def rustle(density, length=2.5):
    """Metallic sparkle: many tiny pings, density scales with face count."""
    m = int(length * SR)
    out = np.zeros(m)
    count = int(8 + density)
    for _ in range(count):
        p = int(rng.uniform(0, 0.6) ** 1.8 * m)
        f = rng.uniform(2500, 7000)
        ln = int(0.08 * SR)
        tt = np.arange(ln) / SR
        ping = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 60) * rng.uniform(0.01, 0.04)
        e = min(m, p + ln)
        out[p:e] += ping[: e - p]
    return out


notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33]
for li, start in enumerate(level_starts):
    t0 = start / FPS
    add(whoosh(), t0 + 0.05)
    impact = t0 + {64: 1.4, 128: 2.5}.get(LEVELS[li], 0.6)  # sheet reaches the sphere
    add(chime(notes[li]), impact, pan=-0.2)
    add(chime(notes[li] * 1.5, amp=0.08), impact + 0.03, pan=0.3)
    add(rustle(min(140, LEVELS[li] * 1.2)), impact, pan=0.1)
add(chime(523.25 / 2, length=3.0, amp=0.25), level_starts[-1] / FPS + 4.5)

fade = int(1.0 * SR)
audio[-fade:] *= np.linspace(1, 0, fade)[:, None]
audio[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
audio /= max(1e-6, np.abs(audio).max()) / 0.85
wav = os.path.join(SRC, "audio.wav")
with wave.open(wav, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((audio * 32767).astype("<i2").tobytes())

subprocess.run([
    "ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", os.path.join(work, "%05d.png"),
    "-i", wav, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow",
    "-vf", "scale=1080:1920:flags=lanczos", "-c:a", "aac", "-b:a", "192k", "-shortest",
    "-movflags", "+faststart", OUT,
], check=True)
print("done", total, "frames", total / FPS, "s")
