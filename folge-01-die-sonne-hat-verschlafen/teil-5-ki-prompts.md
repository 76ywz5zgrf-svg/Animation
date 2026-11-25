# TEIL 5 – KI-Bild- und Animationsprompts

Die Prompts sind **auf Englisch**, weil Bild- und Video-KIs Englisch am genauesten umsetzen. Alle Figurenbeschreibungen sind **wortgleich** aus den Design-Locks in Teil 2 abgeleitet. Bitte beim Kopieren **nichts an den Figurenbeschreibungen ändern**, denn genau das hält die Figuren über alle Szenen hinweg gleich.

---

## 0. Arbeitsablauf für perfekte Charakterkonsistenz

1. **Zuerst Charakterblätter erstellen** (Abschnitt 2). Für jede Figur ein Blatt mit Vorder-, Seiten- und Rückansicht plus Gesichtsausdrücken. Das beste Ergebnis auswählen, das ist ab jetzt die **Referenz**.
2. **Referenzbild bei jedem Prompt mitgeben.** Nutze die Referenzfunktion deines Tools (z. B. Charakter- oder Omni-Referenz bei Midjourney, Referenzbilder bzw. „Elements“ in Kling, Runway, Pika, Hailuo oder Ideogram). Mit Referenz plus wortgleicher Beschreibung bleiben die Figuren stabil.
3. **Immer zuerst ein Standbild (Keyframe) erzeugen, dann animieren** (Image-to-Video). So entstehen keine neuen Gesichter oder Kleidungsstücke in der Bewegung.
4. **Stilblock und Negativ-Prompt nie weglassen** (Abschnitt 1).
5. **Pro Clip 5 bis 10 Sekunden.** Längere Einstellungen aus Teil 4 werden aus mehreren Clips geschnitten.
6. **Seitenverhältnis immer 16:9.** Gleiche Seed-Nummer für alle Bilder einer Szene, wenn dein Tool das unterstützt.
7. **Qualitätskontrolle pro Bild:** Hat Tupfi genau 7 rosa Tupfen und die gelbe Spange links? Hat Pieks blaue Stiefel und den gelben Rucksack? Hat Gustav 3 Kammzacken und den Wecker? Sitzt Solas Fleck auf ihrer rechten Wange (für uns links)? Wenn nicht, neu erzeugen.
8. **Lippenbewegung:** Den Dialog zuerst vertonen (z. B. mit ElevenLabs und den Stimmbeschreibungen aus Teil 2), danach Lip-Sync-Funktion des Video-Tools oder ein eigenes Lip-Sync-Tool nutzen.

---

## 1. Bausteine (immer mitkopieren)

### STYLE (an jeden Bild-Prompt anhängen)
```
high-end 3D animated feature film style, soft rounded shapes, cute stylized proportions, big expressive eyes, soft plush fur with subsurface scattering, soft global illumination, cinematic lighting, rich saturated pastel color palette, gentle depth of field, highly detailed, clean and polished, warm and friendly, child-friendly, 16:9 widescreen
```

### NEGATIVE PROMPT (wo das Tool es erlaubt)
```
scary, creepy, horror, menacing, sharp teeth, angry eyes, realistic animal anatomy, uncanny, dark harsh shadows on faces, weapons, blood, injury, extra limbs, extra fingers, deformed hands, distorted face, inconsistent character design, changed colors, changed clothing, missing accessories, text, letters, watermark, logo, signature, blurry, low quality, noisy, flicker
```

### Figuren-Beschreibungen (CHARACTER LOCKS)
| Kürzel | Text zum Einfügen |
|---|---|
| **PIEKS** | `Pieks, a small cute round baby hedgehog, honey-brown soft fluffy face and belly, soft rounded spikes with a gradient from chocolate brown at the base to bright orange at the tips, a thick spiky quiff pointing forward on top of his head, big emerald-green eyes with two white highlights, tiny shiny black button nose, bright blue rubber boots, small mustard-yellow backpack with a red lightning-bolt patch` |
| **TUPFI** | `Tupfi, a round fluffy melon-sized creature shaped almost like a perfect ball, soft plush turquoise fur with exactly seven round pink polka dots (one on the left side of her forehead, one on her right cheek, one on her belly, one on each side, two on her back), two small round mouse-like ears with pink insides, a yellow five-petal flower hair clip on her left ear, very big violet eyes with long lashes, small heart-shaped mouth, short little arms, tiny round feet, carrying a small star-shaped lantern glowing warm yellow` |
| **GUSTAV** | `Gustav, a plump cartoon rooster with snow-white feathers and a fluffy round chest, bright red comb with exactly three rounded bumps, orange beak, orange feet, big amber eyes with bushy white eyebrows, a small brass alarm clock hanging on a green ribbon around his neck` |
| **WUSCHEL** | `Wuschel, a tiny pillow-sized baby cloud, fluffy white with soft lavender shading underneath, two round glossy black button eyes, rosy pink cheeks, no visible mouth` |
| **OMA** | `Oma Mümmel, a kind old light-grey grandmother rabbit with long slightly drooping ears, huge round gold-rimmed glasses, purple knitted cardigan with big wooden buttons over a light-blue nightgown with tiny yellow stars` |
| **SOLA** | `Sola, a giant round friendly sun character with a glowing golden-yellow face, soft orange cheeks, big amber eyes with long lashes, sun rays shaped like soft flowing golden curls around her face, pink nightcap with a yellow pom-pom` |
| **SOLA_FLECK** | `a small round chocolate-brown spot on her right cheek (on the viewer's left side), small compared to her face` |
| **MOND** | `Opa Mond, a big silver-blue crescent moon with a kind old grandpa face, heavy half-closed sleepy eyelids, fluffy white mustache, dark-blue nightcap with a yellow star-shaped pom-pom` |
| **WOLLE** | `Frau Wolle, a round cream-white sheep baker with curly wool, pink apron with a small pretzel pattern, white baker's hat` |

### Orte (LOCATION LOCKS)
| Kürzel | Text zum Einfügen |
|---|---|
| **KRINGELTAL** | `Kringeltal, a cozy fantasy village in a green valley with round rolling hills, spiral-shaped paths, round little houses with mushroom-shaped roofs in pastel mint, peach, sky-blue and lemon-yellow, round windows, small chimneys, a village square with a snail-shaped fountain and a small bell tower, a tall gentle mountain called Gähnberg in the background with a spiral path to its peak above the clouds` |
| **STERNWARTE** | `a giant red mushroom with white dots used as an observatory on a small hill, a round dome on top with a shiny brass telescope, cozy interior with round bookshelves, star maps and teacups` |
| **BRÜCKE** | `a short safe wooden footbridge with handrails over a shallow sparkling stream, exactly eight planks in rainbow colors (red, orange, yellow, green, turquoise, blue, purple, pink), a wooden sign with a smiling face` |
| **GÄHNWALD** | `a magical forest of purple-blue trees with drooping leaves shaped like sleeping caps, floating green fireflies, small fluffy sleepy owls on branches, soft bioluminescent glow` |
| **WOLKENBETT** | `on the top of the mountain above all clouds, a giant round bed made of clouds with a huge fluffy pillow and a thick fluffy pink-golden blanket, warm golden light glowing out from under the blanket edges, a small wooden sign hanging on the bedpost, a small closed treasure chest decorated with stars half hidden in the cloud mist beside the bed` |

---

## 2. Charakterblätter (zuerst erstellen!)

**Pieks**
```
Character turnaround sheet of [PIEKS], front view, side view, back view and three facial expressions (excited, surprised, laughing), neutral light-grey studio background, even soft lighting, [STYLE]
```

**Tupfi**
```
Character turnaround sheet of [TUPFI], front view, side view, back view showing the two pink dots on her back, three facial expressions (curious, shy, giggling), neutral light-grey studio background, even soft lighting, [STYLE]
```

**Gustav**
```
Character turnaround sheet of [GUSTAV], front view, side view, back view and three expressions (proud chest puffed out, shocked with huge eyes, embarrassed), neutral light-grey studio background, [STYLE]
```

**Wuschel**
```
Character sheet of [WUSCHEL], five variations: neutral, sad with tiny raindrops falling from below, happy with sparkles, shaped like a question mark, shaped like a heart, all with the same eyes and cheeks, neutral light-grey background, [STYLE]
```

**Sola**
```
Character sheet of [SOLA], two versions side by side: left version shy and peeking with messy tangled curly rays, right version happy and radiant with neatly combed shiny curly rays, both with [SOLA_FLECK], soft sky-blue background, [STYLE]
```

**Opa Mond, Oma Mümmel, Frau Wolle**
```
Character sheet of [MOND], front view, sleepy expression and yawning expression, dark-blue starry background, [STYLE]
```
```
Character turnaround sheet of [OMA], front, side and back view, warm smiling expression and laughing expression, neutral light-grey background, [STYLE]
```
```
Character turnaround sheet of [WOLLE], front and side view, worried expression and happy expression, neutral light-grey background, [STYLE]
```

**Gruppen-Größenvergleich** (wichtig für richtige Proportionen)
```
Size comparison lineup on a meadow: [PIEKS], [TUPFI] slightly smaller than Pieks, [GUSTAV] about twice the height of Pieks, [WUSCHEL] floating at Tupfi's head height, [OMA] taller than Gustav, all standing side by side and smiling at the viewer, daylight, [STYLE]
```

---

## 3. Szenen-Prompts

> **So benutzt du die Prompts:** Ersetze `[PIEKS]`, `[STYLE]` usw. durch die Texte aus Abschnitt 1. Bei den Animationsprompts gibst du das passende Keyframe-Bild als Startbild mit.

### SZENE 0 – Cold Open
**Bild 0A – Gustav auf dem Turm**
```
Night scene over [KRINGELTAL], deep indigo sky full of twinkling stars, warm glowing lanterns in round windows, on top of the small bell tower stands [GUSTAV] in a proud heroic pose with his chest puffed out and one wing pointing dramatically towards the dark horizon, low angle hero shot, cool moonlight rim light, magical calm atmosphere, [STYLE]
```
**Animation 0A**
```
Image-to-video, 8 seconds. The brass alarm clock on Gustav's neck rings and shakes, he startles, his feathers puff up, he slaps the clock quiet, puffs his chest and crows with his beak wide open while pointing to the horizon. Stars twinkle softly. Slow push-in camera. Keep the character design exactly as in the reference image.
```
**Bild 0B – Schock-Gesicht**
```
Close-up of [GUSTAV] turning his head towards the camera with comically huge shocked eyes and open beak, dark blue night background with stars, cartoon exaggerated surprise expression, soft moonlight, [STYLE]
```
**Animation 0B**
```
Image-to-video, 4 seconds. Gustav slowly turns his head to the camera, his eyes stretch big with surprise in a squash-and-stretch cartoon way, his three-bump red comb trembles. Quick gentle push-in. Keep the character design exactly as in the reference image.
```

### SZENE 1 – Intro
**Bild 1A – Logo-Bild**
```
Bright sunny day in [KRINGELTAL], [PIEKS] and [TUPFI] jumping happily in the air in the center, [GUSTAV] and [WUSCHEL] flying in from the sides, colorful confetti and sparkles, clear empty space in the upper center for a logo, joyful energetic composition, [STYLE]
```
**Animation 1A**
```
Image-to-video, 8 seconds. Pieks rolls into frame as a bouncing ball along a curly path, Tupfi bounces after him like a soft ball, both jump into the air together and freeze in a happy pose, confetti bursts. Dynamic tracking camera. Keep all character designs exactly as in the reference image.
```

### SZENE 2 – Pieks wacht im Dunkeln auf
**Bild 2A – Das Wurzelzimmer**
```
Cozy round bedroom inside the roots of an apple tree at night, dim blue moonlight through a round window with stars, a small bed with a patchwork blanket, an apple-shaped alarm clock on a nightstand, [PIEKS] curled up asleep as a little spiky ball on the bed, soft warm details, [STYLE]
```
**Animation 2A**
```
Image-to-video, 8 seconds. The apple-shaped alarm clock rings and wobbles, Pieks pops awake and bounces around the room as a rolled-up ball like a rubber ball: bed, wall, wardrobe, ceiling, then lands on his feet with arms raised. Wide camera with smooth whip pans following him. Keep the character design exactly as in the reference image.
```
**Bild 2B – Anzieh-Chaos**
```
[PIEKS] standing proudly in a dim bluish bedroom with one blue rubber boot on his head like a hat, one foot stuck in a flowerpot, his mustard-yellow backpack worn backwards on his belly, confident goofy smile, funny cartoon composition, [STYLE]
```
**Bild 2C – Tupfi am Fenster**
```
Outside view of a round window at night, [TUPFI] peeking in, her star-shaped lantern casting warm yellow light into the dark room, gentle curious expression, cozy contrast between cool night and warm lantern light, [STYLE]
```
**Animation 2C**
```
Image-to-video, 6 seconds. Tupfi knocks gently on the round window, holds up her glowing star lantern and giggles with her paw in front of her mouth, her ears wiggle. Static camera. Keep the character design exactly as in the reference image.
```

### SZENE 3 – Aufregung auf dem Dorfplatz
**Bild 3A – Dorfplatz bei Nacht**
```
The village square of [KRINGELTAL] at night with the snail-shaped fountain, many glowing lanterns, cute villagers in pajamas (frogs with sleeping caps, squirrels holding pillows, mice in bathrobes) looking confused at the dark sky, flowers around the fountain closed tightly, a big sunflower with a sad face looking around, high crane angle, warm and cool lighting, [STYLE]
```
**Bild 3B – Frau Wolles platter Teig**
```
[WOLLE] holding a baking tray with a completely flat sad dough, worried funny expression, standing in front of a round bakery with a warm lit window, night, lanterns, [STYLE]
```
**Bild 3C – Gustav als Ballon**
```
[GUSTAV] standing on the rim of a snail-shaped fountain, inflated with air like a round balloon, cheeks puffed, eyes squeezed, comically huge, villagers in pajamas watching from below, night lanterns, low angle, [STYLE]
```
**Animation 3C**
```
Image-to-video, 6 seconds. Gustav inflates bigger and bigger like a balloon, then opens his beak wide in a big call; afterwards he deflates and looks embarrassed, coughing into his wing while the villagers stare. Static medium shot. Keep the character design exactly as in the reference image.
```

### SZENE 4 – Oma Mümmels Fernrohr
**Bild 4A – Die Pilz-Sternwarte**
```
[STERNWARTE] at night on a small hill above [KRINGELTAL], the dome opening and the brass telescope pointing to the starry sky, [PIEKS] and [TUPFI] walking up the curly path holding the glowing star lantern, magical cozy atmosphere, [STYLE]
```
**Bild 4B – Oma erklärt**
```
Cozy observatory interior, [OMA] sitting next to the big brass telescope, raising one finger and looking directly at the viewer with a kind smile, [PIEKS] and [TUPFI] listening, warm lamp light, teacups and star maps, [STYLE]
```
**Animation 4B**
```
Image-to-video, 7 seconds. Oma Mümmel raises her finger and speaks warmly towards the camera, nodding gently, her glasses glint. Slow push-in. Pieks and Tupfi nod in the background. Keep all character designs exactly as in the reference image.
```
**Bild 4C – Blick durchs Fernrohr**
```
View through a telescope with a round black vignette: the peak of a tall mountain above the clouds at night, on it a giant round cloud bed with a thick fluffy pink-golden blanket with a big round bump under it, warm golden light glowing out from the edges of the blanket, stars around, mysterious and magical, [STYLE]
```
**Animation 4C**
```
Image-to-video, 5 seconds. Slow telescope zoom towards the cloud bed, the golden glow under the blanket pulses gently like slow breathing. Keep the design exactly as in the reference image.
```

### SZENE 5 – Das Super-Weck-Konzert und Wuschel
**Bild 5A – Zauber-Rucksack**
```
At the foot of a tall gentle mountain with a spiral path at night, [PIEKS] pulling a cooking pot, a pan lid, a wooden spoon, a yellow rubber duck and two shiny trumpets out of his small backpack, the objects floating comically, [TUPFI] staring amazed, [GUSTAV] holding a trumpet, a golden glow on the mountain peak far above, [STYLE]
```
**Animation 5A**
```
Image-to-video, 7 seconds. Pieks pulls one object after another out of his small backpack with a pop, more than could possibly fit, Tupfi's eyes grow wide, Gustav catches a trumpet. Medium shot, static camera. Keep all character designs exactly as in the reference image.
```
**Bild 5B – Die weinende Wolke**
```
[TUPFI] looking up with a gentle surprised face as tiny raindrops fall on her head, above her floats [WUSCHEL] looking sad with tiny raindrops falling from underneath him, night on a mountain path, soft lantern light, tender emotional moment, [STYLE]
```
**Animation 5B**
```
Image-to-video, 8 seconds. Wuschel sniffles and drizzles tiny raindrops, then changes shape into a small sun and then into a question mark, then stops raining, sparkles and forms a heart shape. Tupfi smiles warmly. Keep all character designs exactly as in the reference image.
```

### SZENE 6 – Die Kicherbrücke
**Bild 6A – Brücke**
```
[BRÜCKE] at night with glowing fireflies, [PIEKS] and [TUPFI] hopping across, each plank they touch glows in its own rainbow color, [GUSTAV] waiting at the start, [WUSCHEL] floating above, playful musical atmosphere, side view, [STYLE]
```
**Animation 6A**
```
Image-to-video, 10 seconds. Side tracking shot: Pieks and Tupfi hop plank by plank across the bridge, each plank lights up in its color with a little bounce as if giggling. Smooth camera moving parallel to the bridge. Keep all character designs exactly as in the reference image.
```
**Animation 6B – Wackelpudding**
```
Image-to-video, 6 seconds, start frame Bild 6A. Gustav steps heavily on the middle plank, the whole bridge wobbles like jelly, all characters wobble along comically, Wuschel wobbles in the air too, then everyone tumbles softly into thick green moss on the other side, laughing. Keep all character designs exactly as in the reference image.
```

### SZENE 7 – Der Gähnwald
**Bild 7A – Gähnwald**
```
[GÄHNWALD], [PIEKS], [TUPFI] and [GUSTAV] walking on a mossy path, a cute flower yawning widely next to the path, owls yawning, Gustav yawning hugely, dreamy purple-blue light with green fireflies, [STYLE]
```
**Bild 7B – Schnarchblase**
```
[PIEKS] fallen asleep standing up in a purple-blue magical forest, eyes closed, a big shiny round sleep bubble like a soap bubble growing at his nose, [TUPFI] next to him with a determined face ready to tickle him, fireflies around, cute and funny, [STYLE]
```
**Animation 7B**
```
Image-to-video, 8 seconds. Pieks sways while sleeping standing up, the sleep bubble grows and pops softly, he keeps snoring; Tupfi tickles his belly and he wakes up laughing. Medium two-shot, static camera. Keep all character designs exactly as in the reference image.
```

### SZENE 8 – Wuschel wird groß und Opa Mond
**Bild 8A – Ende des Weges**
```
A smooth shiny rock wall rising straight up into the clouds at night, flat safe grassy ground in front of it, a small waterfall with sparkling mist on the side, [PIEKS], [TUPFI], [GUSTAV] and [WUSCHEL] looking up at the wall, golden glow far above in the clouds, [STYLE]
```
**Animation 8A – Wuschel wächst**
```
Image-to-video, 8 seconds. Wuschel flies into the sparkling waterfall mist, sips it in and grows bigger and bigger until he is as big as a bus, fluffy and glowing softly, keeping the same face with black button eyes and pink cheeks. Pieks, Tupfi and Gustav stare up with open mouths. Camera pulls back to reveal his size. Keep all character designs exactly as in the reference image.
```
**Bild 8B – Wolkenflug**
```
[PIEKS], [TUPFI] and [GUSTAV] sitting safely snuggled into the fluffy top of a giant bus-sized version of [WUSCHEL], all holding on, flying through a magical starry sky above the clouds, a shooting star passing by, the tiny village with glowing lanterns far below, joyful faces, epic wide shot, [STYLE]
```
**Animation 8B**
```
Image-to-video, 10 seconds. The giant cloud rises up smoothly through a layer of clouds into a sparkling starry sky, stars twinkle and wave, a shooting star zooms by, Pieks spreads his arms happily, Tupfi smiles. Smooth rising crane camera. Keep all character designs exactly as in the reference image.
```
**Bild 8C – Opa Mond**
```
[MOND] huge in the starry night sky, yawning sleepily, in front of him tiny [PIEKS], [TUPFI] and [GUSTAV] sitting on the giant cloud [WUSCHEL], twinkling stars around, cozy funny mood, big scale contrast, [STYLE]
```
**Animation 8C**
```
Image-to-video, 8 seconds. Opa Mond yawns, his eyelids close, he starts snoring and slowly slides down the sky, then wakes up with a jolt and slides back up, blinking. Stars around him wobble in surprise. Keep all character designs exactly as in the reference image.
```

### SZENE 9 – Im Schlafzimmer der Sonne
**Bild 9A – Das Wolkenbett**
```
[WOLKENBETT], [PIEKS], [TUPFI], [GUSTAV] and pillow-sized [WUSCHEL] tiptoeing towards the giant bed, a small golden sun ray peeking out from under the blanket like a little toe, warm rosy and golden light, magical quiet mood, [STYLE]
```
**Bild 9B – Feder-Kitzeln**
```
Close-up: [PIEKS] gently tickling a small curly golden sun ray that peeks out from under a fluffy pink-golden blanket using a long white feather, mischievous grin, [GUSTAV] behind him looking at his own tail feathers in surprise, warm golden light, [STYLE]
```
**Animation 9B**
```
Image-to-video, 6 seconds. Pieks tickles the golden ray with the feather, the ray wiggles and quickly pulls back under the blanket, the blanket shakes as if giggling. Everyone freezes in surprise. Keep all character designs exactly as in the reference image.
```

### SZENE 10 – Cliffhanger und Sonnenfleck
**Bild 10A – Fragezeichen**
```
Close-up of [TUPFI] looking directly at the viewer with a curious whispering expression, one paw near her mouth, behind her [WUSCHEL] shaped like a big question mark, warm golden glow from a blanket in the background, [STYLE]
```
**Bild 10B – Die Enthüllung**
```
Close-up of [SOLA] peeking out shyly from under a fluffy pink-golden cloud blanket, big watery amber eyes, [SOLA_FLECK], her curly rays messy, soft warm glow, emotional gentle moment, [STYLE]
```
**Animation 10B**
```
Image-to-video, 8 seconds. Very slow reveal: the fluffy blanket slides down, first the pink nightcap appears, then the shy watery eyes, then the whole golden face with the small brown spot on her cheek. Slow tilt down. Keep the character design exactly as in the reference image, the brown spot stays on her right cheek.
```

### SZENE 11 – Tupfis Geheimnis und das Lied
**Bild 11A – Rückblende**
```
Soft colored-pencil illustration style flashback: a smaller version of [TUPFI] on a sunny lake beach wrapped in three scarves, two hats and a sweater, only her violet eyes visible, a funny sweat drop, other cute animals happily swimming in the background, warm summer colors, gentle humorous mood, 16:9
```
**Bild 11B – Tupfen zählen**
```
[TUPFI] turning around proudly to show her seven pink polka dots, each dot glowing softly pink, [PIEKS] pointing and counting happily, [SOLA] watching with a small hopeful smile and [SOLA_FLECK], golden cloud bedroom background, [STYLE]
```
**Bild 11C – Lied**
```
Joyful musical scene in the sky: [PIEKS], [TUPFI], [GUSTAV] and [WUSCHEL] dancing on a big cloud bed, cute stars dancing around them, [SOLA] singing happily and glowing brighter with [SOLA_FLECK], sparkles and little heart shapes in the air, warm pink and golden light, [STYLE]
```
**Animation 11C**
```
Image-to-video, 10 seconds. Characters dance in rhythm, clapping their hands, stars bounce to the beat, Wuschel changes into a heart and then into a little sun with a dot, Sola sways and glows brighter and warmer. Gentle circling camera. Keep all character designs exactly as in the reference image.
```

### SZENE 12 – Strubbel-Strahlen und Sonnenaufgang
**Bild 12A – Strubbel-Strahlen**
```
[SOLA] sitting up in her cloud bed and stretching, her curly golden rays extremely messy like bed hair, one ray tied in a knot, one curled like a spring, laughing happily with [SOLA_FLECK], [PIEKS], [TUPFI] and [GUSTAV] laughing with her, bright morning glow, [STYLE]
```
**Animation 12A – Pieks kämmt**
```
Image-to-video, 8 seconds. Pieks rolls into a spiky ball and rolls gently back and forth through Sola's messy rays like a comb, every ray he touches becomes smooth, shiny and golden; small Wuschel polishes them after him with sparkles. Keep all character designs exactly as in the reference image.
```
**Bild 12B – Sonnenaufgang**
```
Epic wide shot: [SOLA] rising majestically above the clouds and the mountain Gähnberg, her smooth shiny curly rays spreading golden light across the sky, the sky turning from purple to pink to orange to gold, beautiful god rays falling onto [KRINGELTAL] below, flowers opening, tiny cheering villagers, breathtaking joyful moment, [STYLE]
```
**Animation 12B**
```
Image-to-video, 10 seconds. Sola rises slowly, a wave of warm light sweeps over the sky and the valley, colors bloom, then the camera dives down like a drone into the village where flowers pop open and villagers throw their sleeping caps in the air. Keep the character design exactly as in the reference image.
```
**Bild 12C – Der Teig geht auf**
```
[WOLLE] in her cozy bakery laughing with joy as a giant fluffy dough rises like a balloon out of the bowl, warm golden sunlight streaming through the round window, [STYLE]
```
**Bild 12D – Gustavs Opernton**
```
[GUSTAV] standing proudly on top of a giant fluffy cloud, crowing with his beak wide open like an opera singer, eyes closed, wings spread, bright golden morning sunlight behind him, a tiny star clapping, [PIEKS] and [TUPFI] smiling next to him, [STYLE]
```

### SZENE 13 – Das Sonnenfest
**Bild 13A – Fest**
```
Bright sunny festival on the village square of [KRINGELTAL], colorful bunting flags, a banner without letters, villagers with a small painted brown dot on their cheek, [WOLLE] painting a brown dot on the cheek of a small happy frog with a brush, fluffy bread rolls on tables, [SOLA] shining happily in the sky with [SOLA_FLECK], [STYLE]
```
**Bild 13B – Umarmung**
```
[PIEKS] and [TUPFI] hugging warmly while sitting on the rim of the snail-shaped fountain, happy closed eyes, [WUSCHEL] floating above them raining a tiny rainbow, sunny village square background, heartwarming moment, [STYLE]
```

### SZENE 14 – Teaser und Endcard
**Bild 14A – Schluckauf-Mond**
```
Evening sky turning dark blue, [MOND] with a surprised face hiccuping, little stars bouncing away from him across the sky like rubber balls, small [PIEKS] and [TUPFI] standing on a hill below looking up and then at each other, cozy funny mood, [STYLE]
```
**Animation 14A**
```
Image-to-video, 6 seconds. Opa Mond hiccups, with each hiccup a little star pops off and bounces across the sky. Pieks and Tupfi look up, then at each other with a knowing smile. Keep all character designs exactly as in the reference image.
```
**Bild 14B – Endcard**
```
Sunny meadow at golden hour, [PIEKS], [TUPFI], [GUSTAV] and [WUSCHEL] standing together in the lower center and waving at the viewer, large clean empty areas on the left and right side for video thumbnails, soft blurred background of [KRINGELTAL], [STYLE]
```
**Animation 14B**
```
Image-to-video, 10 seconds, seamless loop. All characters wave happily, Wuschel bounces up and down, Tupfi's ears wiggle, Gustav bows. Static camera. Keep all character designs exactly as in the reference image.
```
