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

## How it's built (advanced patterns)

The scenes are sequenced with **`@remotion/transitions`** — real overlapping
transitions, not hard cuts:

| Between | Transition |
| --- | --- |
| intro → problem | `fade` (dark → light dissolve) |
| problem → stats | `slide` from-bottom (numbers drop in) |
| stats → lifecycle | `wipe` from-left |
| lifecycle → finder | `iris` (focus opens onto the tool) |
| finder → outro | `clockWipe` (radial sweep into the CTA) |

A deliberate **light / dark rhythm** runs through it — the two "product" scenes
(problem, finder) are light screens that punctuate the dark hero flow, and each
flip is carried by a transition. A small, offline-safe **component kit** in
`src/kit/` does the heavy lifting:

- `backgrounds.tsx` — `Aurora` (orbiting blurred gradient blobs), `ParticleField`,
  `PulseRings`, `PerspectiveGrid`, `GlowOrb`, `LightBackdrop` (all pure CSS +
  `@remotion/noise`, no WebGL)
- `type.tsx` — `KineticHeadline` (word spring-stagger with noise jitter),
  `GradientText`, `WordHighlight` (highlighter sweep), `CharacterReveal`
- `surfaces.tsx` — `GlassCard`, `BrowserChrome`, `Connector` (animated SVG edge
  via `@remotion/paths` `evolvePath`)

Stat numbers are sized with **`@remotion/layout-utils` `fitText`** so `323` and
`35+` share one optical size and never overflow the 1080-wide vertical frame.

Everything renders **fully offline / headless**: only the pure-DOM transition
presentations are used (no WebGL shader transitions, no light-leak assets), and
fonts are base64-inlined (`src/fonts.ts`) with no `delayRender`, so the render
never hangs waiting on a network font.

### Keeping audio in sync with overlapping transitions

Because a `TransitionSeries` transition *overlaps* its two scenes, the timeline
shortens and scene starts move earlier. To keep the procedural soundtrack
locked to the picture, each scene's raw duration in `timeline.js` is **padded by
half of each adjacent transition**, so every transition's *midpoint* (the visual
cross-over) lands on the exact frame where the soundtrack already places its
whoosh / drop / boom (`AUDIO_CUES` = 144, 282, 528, 708, 918). Net composition
stays **1050 frames / 35.0s**, and `public/soundtrack.wav` is reused untouched.

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
