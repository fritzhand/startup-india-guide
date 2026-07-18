// Procedural soundtrack for the Startup Schemes Playbook film.
//
// No third-party samples: a warm D-major pad progression, a sub bass, a bell
// arpeggio carrying the melody, plus SFX (whoosh transitions, count-up ticks,
// an impact boom) all scheduled against the SAME scene timeline the video uses
// (../src/timeline.js), so picture and sound land on the same frames.
//
// Renders a 16-bit stereo WAV, then encodes it to a small MP3 with ffmpeg.

import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TOTAL_FRAMES, FPS, startSeconds} from '../src/timeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public');
const WAV_PATH = resolve(OUT_DIR, 'soundtrack.wav');
const MP3_PATH = resolve(OUT_DIR, 'soundtrack.mp3');

const SR = 44100;
const DURATION = TOTAL_FRAMES / FPS; // seconds, exactly matches the video
const N = Math.ceil(DURATION * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

const TAU = Math.PI * 2;

// Deterministic noise so the render is reproducible.
let seed = 0x1a2b3c4d;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
};

// ---- notes -----------------------------------------------------------------
const NOTE = {
  D2: 73.42, G2: 98.0, A2: 110.0, B2: 123.47, D3: 146.83, E3: 164.81,
  Fs3: 185.0, G3: 196.0, A3: 220.0, B3: 246.94, Cs4: 277.18, D4: 293.66,
  E4: 329.63, Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88, Cs5: 554.37,
  D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880.0,
};

// pad voicings + bass root + a bell scale (ascending) per chord
const CHORDS = {
  D: {pad: [NOTE.D3, NOTE.Fs3, NOTE.A3, NOTE.D4], bass: NOTE.D2, bells: [NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.D5, NOTE.Fs5]},
  A: {pad: [NOTE.A3, NOTE.Cs4, NOTE.E4, NOTE.A4], bass: NOTE.A2, bells: [NOTE.E4, NOTE.A4, NOTE.Cs5, NOTE.E5, NOTE.A5]},
  Bm: {pad: [NOTE.B3, NOTE.D4, NOTE.Fs4, NOTE.B4], bass: NOTE.B2, bells: [NOTE.D4, NOTE.Fs4, NOTE.B4, NOTE.D5, NOTE.Fs5]},
  G: {pad: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], bass: NOTE.G2, bells: [NOTE.D4, NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G4]},
};

// Chord schedule — arranged to follow the emotional arc of the scenes.
const PROG = [
  {t: 0.0, chord: 'D'},   // intro — home, warm
  {t: 4.8, chord: 'Bm'},  // problem — a little tension
  {t: 9.4, chord: 'G'},   // stats — lift
  {t: 12.0, chord: 'D'},
  {t: 14.8, chord: 'A'},  // stats — building
  {t: 17.6, chord: 'A'},  // lifecycle
  {t: 20.6, chord: 'Bm'},
  {t: 23.6, chord: 'G'},  // finder
  {t: 27.1, chord: 'D'},
  {t: 30.6, chord: 'A'},  // outro — build
  {t: 32.4, chord: 'D'},  // resolve home
];

const add = (buf, i, v) => {
  if (i >= 0 && i < N) buf[i] += v;
};

// ---- pad + bass ------------------------------------------------------------
// Each segment fades in/out so neighbouring chords crossfade cleanly.
for (let s = 0; s < PROG.length; s++) {
  const seg = PROG[s];
  const c = CHORDS[seg.chord];
  const t0 = seg.t;
  const t1 = s + 1 < PROG.length ? PROG[s + 1].t : DURATION;
  const segDur = t1 - t0;
  const fade = Math.min(0.6, segDur / 2);
  const i0 = Math.floor(t0 * SR);
  const i1 = Math.min(N, Math.ceil((t1 + fade) * SR));

  for (let i = i0; i < i1; i++) {
    const t = i / SR;
    const local = t - t0;
    // crossfading envelope
    let env = 1;
    if (local < fade) env = local / fade;
    else if (t > t1 - fade) env = Math.max(0, (t1 + fade - t) / (2 * fade));
    if (env <= 0) continue;
    // slow breathing tremolo
    const trem = 0.85 + 0.15 * Math.sin(TAU * 0.12 * t);

    // pad: detuned stereo, soft harmonics
    let padL = 0;
    let padR = 0;
    for (const f of c.pad) {
      const a = TAU * f * t;
      const aDetune = TAU * f * 1.004 * t;
      const voice =
        Math.sin(a) + 0.22 * Math.sin(2 * a) + 0.1 * Math.sin(3 * a);
      const voiceD =
        Math.sin(aDetune) + 0.22 * Math.sin(2 * aDetune);
      padL += voice;
      padR += voiceD;
    }
    padL /= c.pad.length;
    padR /= c.pad.length;
    const padGain = 0.14 * env * trem;
    add(L, i, padL * padGain);
    add(R, i, padR * padGain);

    // sub bass: root, one octave down, with 2nd harmonic
    const bf = c.bass;
    const ab = TAU * bf * t;
    const bass = (Math.sin(ab) + 0.3 * Math.sin(2 * ab)) * 0.16 * env;
    add(L, i, bass);
    add(R, i, bass);
  }
}

// ---- bell arpeggio (the melody) --------------------------------------------
// Eighth notes at ~100 BPM. Amplitude ducks under the intro, opens up for the
// stats/outro. Alternating pan for width.
const chordAt = (t) => {
  let cur = PROG[0];
  for (const p of PROG) if (p.t <= t + 1e-6) cur = p;
  return CHORDS[cur.chord];
};
const STEP = 0.3; // seconds per bell
let step = 0;
for (let t = 1.2; t < DURATION - 1.0; t += STEP, step++) {
  const c = chordAt(t);
  const bells = c.bells;
  // a gently rising/falling contour rather than a straight run
  const contour = [0, 1, 2, 3, 4, 3, 2, 1];
  const idx = contour[step % contour.length] % bells.length;
  const f = bells[idx];
  // dynamics: quieter in intro, brighter during stats + outro
  let vel = 0.5;
  if (t >= startSeconds('stats') && t < startSeconds('lifecycle')) vel = 0.8;
  if (t >= startSeconds('outro')) vel = 0.9;
  const accent = step % 4 === 0 ? 1.15 : 0.9;
  const amp = 0.15 * vel * accent;
  const pan = step % 2 === 0 ? -0.4 : 0.4; // -1 left .. +1 right
  const gL = amp * (1 - Math.max(0, pan));
  const gR = amp * (1 + Math.min(0, pan));
  const dur = 0.9;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const decay = Math.exp(-lt / 0.28);
    const a = TAU * f * (i / SR);
    const tone =
      (Math.sin(a) + 0.5 * Math.sin(2 * a) + 0.25 * Math.sin(3 * a)) * decay;
    add(L, i, tone * gL);
    add(R, i, tone * gR);
  }
}

// ---- SFX helpers -----------------------------------------------------------
const whoosh = (center, gain = 0.22) => {
  // band-limited noise that opens then closes — a soft transition swoosh
  const dur = 0.85;
  const t0 = center - 0.45;
  const i0 = Math.floor(t0 * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  let lp = 0;
  for (let i = Math.max(0, i0); i < i1; i++) {
    const lt = (i - i0) / SR;
    const p = lt / dur; // 0..1
    const env = Math.sin(Math.PI * p) ** 1.5; // rise and fall
    // sweep the lowpass cutoff up then down for a "swish"
    const cutoff = 0.03 + 0.25 * Math.sin(Math.PI * p);
    lp += cutoff * (rand() - lp);
    add(L, i, lp * env * gain);
    add(R, i, lp * env * gain * 0.92);
  }
};

const tick = (t, freq = 1650, gain = 0.09) => {
  const dur = 0.06;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const decay = Math.exp(-lt / 0.012);
    const v = Math.sin(TAU * freq * (i / SR)) * decay * gain;
    add(L, i, v);
    add(R, i, v);
  }
};

const boom = (t, freq = 55, gain = 0.3) => {
  const dur = 1.4;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const decay = Math.exp(-lt / 0.5);
    // slight downward pitch drop for a cinematic hit
    const f = freq * (1 + 0.4 * Math.exp(-lt / 0.15));
    const v = Math.sin(TAU * f * lt) * decay * gain;
    add(L, i, v);
    add(R, i, v);
  }
};

// transitions between scenes
['problem', 'stats', 'lifecycle', 'finder', 'outro'].forEach((name) =>
  whoosh(startSeconds(name)),
);

// count-up ticks across the stats scene
const statsStart = startSeconds('stats');
const statsEnd = startSeconds('lifecycle');
for (let t = statsStart + 0.25; t < statsEnd - 0.3; t += 0.42) {
  tick(t);
}

// cinematic impact into the outro, then a resolving bell flourish
boom(startSeconds('outro'));
const flourish = [NOTE.D5, NOTE.Fs5, NOTE.A5];
flourish.forEach((f, k) => {
  const t = startSeconds('outro') + 1.9 + k * 0.16;
  const dur = 1.2;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const decay = Math.exp(-lt / 0.4);
    const a = TAU * f * (i / SR);
    const tone = (Math.sin(a) + 0.4 * Math.sin(2 * a)) * decay * 0.16;
    add(L, i, tone);
    add(R, i, tone);
  }
});

// ---- master: normalise, gentle soft-clip, global fades ---------------------
let peak = 0;
for (let i = 0; i < N; i++) {
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = peak > 0 ? 0.92 / peak : 1;
const fadeIn = 0.4 * SR;
const fadeOut = 1.2 * SR;
for (let i = 0; i < N; i++) {
  let gain = norm;
  if (i < fadeIn) gain *= i / fadeIn;
  if (i > N - fadeOut) gain *= Math.max(0, (N - i) / fadeOut);
  // tanh soft clip keeps peaks musical
  L[i] = Math.tanh(L[i] * gain * 1.05);
  R[i] = Math.tanh(R[i] * gain * 1.05);
}

// ---- write WAV (16-bit PCM stereo) -----------------------------------------
const bytesPerSample = 2;
const dataSize = N * 2 * bytesPerSample;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(2, 22); // stereo
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2 * bytesPerSample, 28);
buf.writeUInt16LE(2 * bytesPerSample, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);
let off = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), off);
  off += 2;
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), off);
  off += 2;
}
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, {recursive: true});
writeFileSync(WAV_PATH, buf);
console.log(`WAV written: ${WAV_PATH} (${(buf.length / 1e6).toFixed(2)} MB, ${DURATION.toFixed(2)}s)`);

// ---- optionally encode to MP3 ----------------------------------------------
// Remotion decodes WAV natively (Chromium) and muxes audio with its own
// compositor, so an MP3 is a nice-to-have, not a requirement. If a fully
// featured ffmpeg with an MP3 encoder is on PATH we shrink the asset; otherwise
// we keep the WAV. (The Playwright ffmpeg in this image is --disable-everything
// and can't do it, which is fine — the video references SOUNDTRACK below.)
const hasMp3Encoder = (bin) => {
  try {
    const out = execFileSync(bin, ['-hide_banner', '-encoders'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return /libmp3lame|\bmp3\b/.test(out);
  } catch {
    return false;
  }
};
const candidates = [process.env.FFMPEG_PATH, 'ffmpeg'].filter(Boolean);
const capable = candidates.find((c) => hasMp3Encoder(c));
let chosen = 'soundtrack.wav';
if (capable) {
  execFileSync(
    capable,
    ['-y', '-i', WAV_PATH, '-codec:a', 'libmp3lame', '-qscale:a', '3', MP3_PATH],
    {stdio: 'inherit'},
  );
  rmSync(WAV_PATH, {force: true});
  chosen = 'soundtrack.mp3';
  console.log(`MP3 written: ${MP3_PATH}`);
} else {
  console.log('No MP3-capable ffmpeg found — keeping WAV (Remotion plays it directly).');
}

// Record which asset the video should load, so src stays in sync with reality.
writeFileSync(
  resolve(__dirname, '..', 'src', 'audio-file.ts'),
  `// Generated by scripts/make-audio.mjs — do not edit.\nexport const SOUNDTRACK = '${chosen}';\n`,
);
