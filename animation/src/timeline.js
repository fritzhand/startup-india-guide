// Single source of truth for timing, shared by the video (React) and the
// procedural soundtrack generator (scripts/make-audio.mjs) so picture and
// sound stay locked together. Frames are at FPS; seconds are derived.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
// 9:16 vertical (Reels / Shorts / Stories)
export const V_WIDTH = 1080;
export const V_HEIGHT = 1920;

// Ordered scenes. durationInFrames drives both the <Series> and the music.
export const SCENES = [
  {name: 'intro', durationInFrames: 144}, // 4.80s  brand reveal
  {name: 'problem', durationInFrames: 138}, // 4.60s  107-page PDF -> site
  {name: 'stats', durationInFrames: 246}, // 8.20s  the numbers count up
  {name: 'lifecycle', durationInFrames: 180}, // 6.00s  ideation -> market access
  {name: 'finder', durationInFrames: 210}, // 7.00s  5-question decision tree
  {name: 'outro', durationInFrames: 132}, // 4.40s  call to action
];

export const TOTAL_FRAMES = SCENES.reduce(
  (sum, s) => sum + s.durationInFrames,
  0,
); // 1050 = 35.0s

// Cumulative start frame for each scene, keyed by name.
export const SCENE_START = SCENES.reduce(
  (acc, s) => {
    acc.map[s.name] = acc.cursor;
    acc.cursor += s.durationInFrames;
    return acc;
  },
  {map: {}, cursor: 0},
).map;

export const startFrame = (name) => SCENE_START[name];
export const startSeconds = (name) => SCENE_START[name] / FPS;
export const sceneDuration = (name) =>
  SCENES.find((s) => s.name === name).durationInFrames;
