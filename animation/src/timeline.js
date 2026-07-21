// Single source of truth for timing, shared by the video (React) and the
// procedural soundtrack generator (scripts/make-audio.mjs) so picture and
// sound stay locked together. Frames are at FPS; seconds are derived.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
// 9:16 vertical (Reels / Shorts / Stories)
export const V_WIDTH = 1080;
export const V_HEIGHT = 1920;

// Scenes are sequenced with <TransitionSeries>, so neighbouring scenes OVERLAP
// by a transition. Each authored duration below is the *raw* Sequence length;
// the composition total is Σ(scene) − Σ(transition).
//
// These raw durations are the original per-scene lengths PADDED by half of each
// adjacent transition, so that every transition's MIDPOINT (the visual
// cross-over) lands on the exact frame where the soundtrack already places its
// whoosh / drop / boom. That lets us keep public/soundtrack.wav byte-for-byte.
// See TRANSITIONS + AUDIO_CUES below and the derivation in make-audio.mjs.
export const SCENES = [
  {name: 'intro', durationInFrames: 152}, //  144 + 16/2
  {name: 'problem', durationInFrames: 155}, //  138 + 16/2 + 18/2
  {name: 'stats', durationInFrames: 264}, //  246 + 18/2 + 18/2
  {name: 'lifecycle', durationInFrames: 198}, //  180 + 18/2 + 18/2
  {name: 'finder', durationInFrames: 229}, //  210 + 18/2 + 20/2
  {name: 'outro', durationInFrames: 142}, //  132 + 20/2
];

// Transition (overlap) length between scene i and i+1, in frames. Σ = 90.
export const TRANSITIONS = [16, 18, 18, 18, 20];

const SUM_SCENES = SCENES.reduce((s, x) => s + x.durationInFrames, 0); // 1140
const SUM_TRANSITIONS = TRANSITIONS.reduce((a, b) => a + b, 0); // 90
export const TOTAL_FRAMES = SUM_SCENES - SUM_TRANSITIONS; // 1050 = 35.0s

export const sceneDuration = (name) =>
  SCENES.find((s) => s.name === name).durationInFrames;

// ── Audio cues ──────────────────────────────────────────────────────────────
// The soundtrack's transition SFX / drops / boom are pinned to these frames,
// which equal the ORIGINAL (pre-padding) cumulative scene starts AND — by the
// half-overlap padding above — the transition midpoints in the final timeline.
// The audio script (make-audio.mjs) reads cueSeconds() so its source of truth
// is named and independent of the padded SCENES array (prevents desync drift).
export const AUDIO_CUES = {
  problem: 144,
  stats: 282,
  lifecycle: 528,
  finder: 708,
  outro: 918,
};
export const cueSeconds = (name) => AUDIO_CUES[name] / FPS;
