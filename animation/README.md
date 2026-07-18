# Startup Schemes Playbook — promo animation

A ~35-second [Remotion](https://remotion.dev) film that introduces the
[Startup Schemes Playbook](https://fritzhand.github.io/startup-india-guide/):
the Government of India's 107-page playbook, rebuilt as a searchable guide.

Everything — picture **and** the soundtrack — is generated from code. No stock
footage, no licensed music.

Ships in two aspect ratios from the **same** scenes, which reflow by orientation:

- `StartupIndiaGuide` — **16:9** 1920×1080 (YouTube, site hero)
- `StartupIndiaGuideVertical` — **9:16** 1080×1920 (Reels, Shorts, Stories)

## What's in it

Six scenes, cut to a shared timeline (`src/timeline.js`) so the music lands on
the same frames as the picture:

1. **Intro** — brand reveal, tricolour accent
2. **Problem → solution** — the 107-page PDF becomes a searchable site
3. **Stats** — the numbers count up (69 schemes, 35+ ministries, 224 incubators,
   323 state schemes, 6 support types, 5 stages)
4. **Lifecycle** — ideation → prototype → seed → growth → market access
5. **Finder** — the playbook's 5-question decision tree
6. **Outro** — call to action + URL

The palette is sampled from the same PDF the site uses (navy / saffron / green),
matching `site/tokens.css`.

## The soundtrack

`scripts/make-audio.mjs` synthesises the whole track procedurally — a **126 BPM
techno / dance** groove: four-on-the-floor kick, backbeat clap, closed + open
hats, an offbeat synth bass and a plucky arp lead over a sidechained pad, plus
SFX (riser + whoosh into each drop, count-up ticks, an impact boom). Everything
is scheduled against `src/timeline.js`, so the drops land on the scene cuts. It
writes `public/soundtrack.wav` (Remotion plays it directly; if a full ffmpeg is
present it is shrunk to MP3).

## Develop

```bash
npm install
npm run audio     # (re)generate public/soundtrack.wav
npm run studio           # open Remotion Studio to preview/scrub
npm run render           # 16:9  -> out/startup-india-guide.mp4 (1920×1080, 30fps)
npm run render:vertical  # 9:16  -> out/startup-india-guide-vertical.mp4 (1080×1920)
```

## Numbers

The headline figures come straight from the repo's `data/*.json` and were
verified against the site build at authoring time.
