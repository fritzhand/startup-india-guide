// Procedural soundtrack for the Startup Schemes Playbook film — techno / dance.
//
// No third-party samples: a 126 BPM four-on-the-floor kit (kick, clap, closed +
// open hats), an offbeat synth bass, a warm sidechained pad, a plucky arp lead,
// plus SFX (riser + whoosh transitions, count-up ticks, an impact boom). Drums
// run continuously like a DJ set; the arrangement (filter/energy) is keyed to
// the SAME scene timeline the video uses (../src/timeline.js) so drops land on
// the scene cuts.
//
// Renders a 16-bit stereo WAV, then encodes to MP3 if a capable ffmpeg exists.

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

// tempo
const BPM = 126;
const BEAT = 60 / BPM; // 0.4762s
const EIGHTH = BEAT / 2;
const SIXTEENTH = BEAT / 4;

// Deterministic noise so the render is reproducible.
let seed = 0x1a2b3c4d;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
};

const add = (buf, i, v) => {
  if (i >= 0 && i < N) buf[i] += v;
};
const addLR = (i, v, pan = 0) => {
  add(L, i, v * (1 - Math.max(0, pan)));
  add(R, i, v * (1 + Math.min(0, pan)));
};

// ---- notes -----------------------------------------------------------------
const NOTE = {
  D1: 36.71, A1: 55.0, B1: 61.74, G1: 49.0,
  D2: 73.42, G2: 98.0, A2: 110.0, B2: 123.47,
  D3: 146.83, E3: 164.81, Fs3: 185.0, G3: 196.0, A3: 220.0, B3: 246.94,
  Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.0, A4: 440.0,
  B4: 493.88, Cs5: 554.37, D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880.0,
};

const CHORDS = {
  D: {pad: [NOTE.D3, NOTE.Fs3, NOTE.A3], bass: NOTE.D2, sub: NOTE.D1, arp: [NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.D5]},
  A: {pad: [NOTE.A3, NOTE.Cs4, NOTE.E4], bass: NOTE.A1, sub: NOTE.A1, arp: [NOTE.E4, NOTE.A4, NOTE.Cs5, NOTE.E5]},
  Bm: {pad: [NOTE.B3, NOTE.D4, NOTE.Fs4], bass: NOTE.B1, sub: NOTE.B1, arp: [NOTE.Fs4, NOTE.B4, NOTE.D5, NOTE.Fs5]},
  G: {pad: [NOTE.G3, NOTE.B3, NOTE.D4], bass: NOTE.G1, sub: NOTE.G1, arp: [NOTE.D4, NOTE.G4, NOTE.B4, NOTE.D5]},
};

// Chord schedule — follows the emotional arc of the scenes.
const PROG = [
  {t: 0.0, chord: 'D'},
  {t: 4.8, chord: 'Bm'},
  {t: 9.4, chord: 'G'},
  {t: 12.0, chord: 'D'},
  {t: 14.8, chord: 'A'},
  {t: 17.6, chord: 'A'},
  {t: 20.6, chord: 'Bm'},
  {t: 23.6, chord: 'G'},
  {t: 27.1, chord: 'D'},
  {t: 30.6, chord: 'A'},
  {t: 32.4, chord: 'D'},
];
const chordAt = (t) => {
  let cur = PROG[0];
  for (const p of PROG) if (p.t <= t + 1e-6) cur = p;
  return CHORDS[cur.chord];
};

// ---- energy / arrangement --------------------------------------------------
// Drums fade in over the intro, drop to full at the first scene cut, then run.
// A brief "beat-out" the beat before the outro boom makes the drop hit harder.
const outroT = startSeconds('outro');
const energyAt = (t) => {
  let e = Math.min(1, Math.max(0, (t - 1.0) / 3.2)); // intro build
  if (t >= 4.6 && t < 4.8) e = 0.0; // tiny gap before the first drop
  if (t >= outroT - BEAT * 1.5 && t < outroT + 0.05) e = 0.0; // beat-out into boom
  return e;
};

// Sidechain pump: pad/sub duck hard on each kick and recover across the beat.
const duckAt = (t, energy) => {
  const ph = (t % BEAT) / BEAT;
  const base = 0.32 + 0.68 * Math.min(1, ph / 0.42);
  return 1 - energy * (1 - base);
};

// ---- pad + sub (sidechained bed) -------------------------------------------
for (let s = 0; s < PROG.length; s++) {
  const seg = PROG[s];
  const c = CHORDS[seg.chord];
  const t0 = seg.t;
  const t1 = s + 1 < PROG.length ? PROG[s + 1].t : DURATION;
  const fade = Math.min(0.5, (t1 - t0) / 2);
  const i0 = Math.floor(t0 * SR);
  const i1 = Math.min(N, Math.ceil((t1 + fade) * SR));
  for (let i = i0; i < i1; i++) {
    const t = i / SR;
    const local = t - t0;
    let env = 1;
    if (local < fade) env = local / fade;
    else if (t > t1 - fade) env = Math.max(0, (t1 + fade - t) / (2 * fade));
    if (env <= 0) continue;
    const energy = energyAt(t);
    const duck = duckAt(t, energy);

    let pad = 0;
    let padR = 0;
    for (const f of c.pad) {
      const a = TAU * f * t;
      const aD = TAU * f * 1.005 * t;
      pad += Math.sin(a) + 0.18 * Math.sin(2 * a);
      padR += Math.sin(aD) + 0.18 * Math.sin(2 * aD);
    }
    pad /= c.pad.length;
    padR /= c.pad.length;
    const pg = 0.1 * env * duck;
    add(L, i, pad * pg);
    add(R, i, padR * pg);

    // deep sub, also ducked, gives the track weight under the kick's tail
    const sf = c.sub;
    const sub = Math.sin(TAU * sf * t) * 0.12 * env * duck;
    add(L, i, sub);
    add(R, i, sub);
  }
}

// ---- drum voices -----------------------------------------------------------
const kick = (t, gain) => {
  if (gain <= 0.001) return;
  const dur = 0.34;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const amp = Math.exp(-lt / 0.13);
    const pitch = 48 + 95 * Math.exp(-lt / 0.03); // 143Hz -> 48Hz
    const click = lt < 0.006 ? (1 - lt / 0.006) * 0.6 : 0;
    const v = (Math.sin(TAU * pitch * lt) * amp + click) * gain;
    add(L, i, v);
    add(R, i, v);
  }
};

const clap = (t, gain) => {
  if (gain <= 0.001) return;
  const dur = 0.18;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  let bp = 0;
  let prev = 0;
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    // 3 quick bursts -> clap texture
    const burst =
      (lt < 0.01 ? 1 : 0) +
      (lt > 0.012 && lt < 0.022 ? 0.9 : 0) +
      (lt > 0.024 && lt < 0.034 ? 0.8 : 0);
    const body = Math.exp(-lt / 0.05);
    const nz = rand();
    // crude bandpass (difference of one-poles) centred ~1.8kHz
    bp += 0.35 * (nz - bp);
    const hp = nz - prev;
    prev = nz;
    const v = (hp * 0.6 + bp * 0.4) * (burst + body) * 0.5 * gain;
    add(L, i, v);
    add(R, i, v * 0.95);
  }
};

const hat = (t, gain, open) => {
  if (gain <= 0.001) return;
  const dur = open ? 0.16 : 0.035;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  let prev = 0;
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const amp = Math.exp(-lt / (open ? 0.05 : 0.008));
    const nz = rand();
    const hp = nz - prev; // high-pass -> metallic
    prev = nz;
    const v = hp * amp * gain;
    add(L, i, v * 0.9);
    add(R, i, v);
  }
};

// plucky offbeat synth bass (saw-ish, lowpass decay)
const bass = (t, freq, gain) => {
  if (gain <= 0.001) return;
  const dur = EIGHTH * 0.95;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  let lp = 0;
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const env = Math.min(1, lt / 0.004) * Math.exp(-lt / 0.16);
    // saw via summed harmonics
    let saw = 0;
    for (let h = 1; h <= 6; h++) saw += Math.sin(TAU * freq * h * lt) / h;
    lp += 0.28 * (saw - lp); // lowpass for warmth
    const v = lp * env * gain;
    add(L, i, v);
    add(R, i, v);
  }
};

// plucky lead (detuned saw, short) for the arp melody
const pluck = (t, freq, gain, pan) => {
  if (gain <= 0.001) return;
  const dur = 0.42;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  let lp = 0;
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const env = Math.min(1, lt / 0.003) * Math.exp(-lt / 0.14);
    let saw = 0;
    for (let h = 1; h <= 5; h++) {
      saw += Math.sin(TAU * freq * h * lt) / h;
      saw += Math.sin(TAU * freq * 1.006 * h * lt) / h; // detune
    }
    lp += 0.4 * (saw - lp);
    addLR(i, lp * env * gain * 0.5, pan);
  }
};

// ---- schedule the groove ---------------------------------------------------
const nBeats = Math.floor(DURATION / BEAT) + 1;
let arpStep = 0;
for (let b = 0; b < nBeats; b++) {
  const t = b * BEAT;
  const energy = energyAt(t);
  const beatInBar = b % 4;

  // kick — four on the floor
  kick(t, 0.95 * (0.25 + 0.75 * energy));

  // clap/snare on the backbeat (2 and 4)
  if (beatInBar === 1 || beatInBar === 3) clap(t, 0.4 * energy);

  // hats: closed on every 8th, open on the offbeat "and"
  hat(t, 0.09 * energy, false);
  hat(t + EIGHTH, 0.16 * energy, true); // open hat offbeat = classic house
  // extra 16th closed hats once the track is going
  if (energy > 0.6) {
    hat(t + SIXTEENTH, 0.05 * energy, false);
    hat(t + SIXTEENTH * 3, 0.06 * energy, false);
  }

  // bass on the offbeats (between the kicks) — the driving pulse
  const c = chordAt(t + EIGHTH);
  bass(t + EIGHTH, c.bass, 0.5 * energy);
  if (energy > 0.7) bass(t + SIXTEENTH * 3, c.bass, 0.22 * energy);

  // pluck arp lead — 8th notes, brighter in the busy scenes
  const lead = energy > 0.45;
  if (lead) {
    for (const off of [0, EIGHTH]) {
      const cc = chordAt(t + off);
      const contour = [0, 1, 2, 3, 2, 1];
      const idx = contour[arpStep % contour.length] % cc.arp.length;
      const brighten = t >= startSeconds('stats') ? 1.0 : 0.7;
      pluck(t + off, cc.arp[idx], 0.2 * energy * brighten, arpStep % 2 ? 0.35 : -0.35);
      arpStep++;
    }
  }
}

// ---- SFX -------------------------------------------------------------------
const riser = (endT, dur = 1.6, gain = 0.16) => {
  // rising filtered noise + pitch that builds into a drop
  const t0 = endT - dur;
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(N, Math.ceil(endT * SR));
  let lp = 0;
  for (let i = i0; i < i1; i++) {
    const p = (i - i0) / (i1 - i0); // 0..1
    const env = p * p;
    const cutoff = 0.02 + 0.5 * p;
    lp += cutoff * (rand() - lp);
    const v = lp * env * gain;
    add(L, i, v);
    add(R, i, v * 0.92);
  }
};

const whoosh = (center, gain = 0.2) => {
  const dur = 0.7;
  const i0 = Math.max(0, Math.floor((center - 0.4) * SR));
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  let lp = 0;
  for (let i = i0; i < i1; i++) {
    const p = (i - i0) / (i1 - i0);
    const env = Math.sin(Math.PI * p) ** 1.5;
    const cutoff = 0.04 + 0.28 * Math.sin(Math.PI * p);
    lp += cutoff * (rand() - lp);
    add(L, i, lp * env * gain);
    add(R, i, lp * env * gain * 0.9);
  }
};

const tick = (t, freq = 1650, gain = 0.07) => {
  const dur = 0.05;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const v = Math.sin(TAU * freq * (i / SR)) * Math.exp(-lt / 0.011) * gain;
    add(L, i, v);
    add(R, i, v);
  }
};

const boom = (t, freq = 50, gain = 0.32) => {
  const dur = 1.6;
  const i0 = Math.floor(t * SR);
  const i1 = Math.min(N, i0 + Math.ceil(dur * SR));
  for (let i = i0; i < i1; i++) {
    const lt = (i - i0) / SR;
    const decay = Math.exp(-lt / 0.55);
    const f = freq * (1 + 0.4 * Math.exp(-lt / 0.15));
    const v = Math.sin(TAU * f * lt) * decay * gain;
    add(L, i, v);
    add(R, i, v);
  }
};

// risers + whooshes into each scene drop
['problem', 'stats', 'lifecycle', 'finder', 'outro'].forEach((name) => {
  const t = startSeconds(name);
  riser(t);
  whoosh(t);
});

// count-up ticks across the stats scene
const statsStart = startSeconds('stats');
const statsEnd = startSeconds('lifecycle');
for (let t = statsStart + 0.25; t < statsEnd - 0.3; t += 0.42) tick(t);

// cinematic impact into the outro + a resolving pluck flourish
boom(outroT);
const flourish = [NOTE.D5, NOTE.Fs5, NOTE.A5];
flourish.forEach((f, k) => pluck(outroT + 1.9 + k * 0.14, f, 0.2, 0));

// ---- master: normalise, soft-clip, global fades ----------------------------
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = peak > 0 ? 0.95 / peak : 1;
const fadeIn = 0.25 * SR;
const fadeOut = 1.4 * SR;
for (let i = 0; i < N; i++) {
  let g = norm;
  if (i < fadeIn) g *= i / fadeIn;
  if (i > N - fadeOut) g *= Math.max(0, (N - i) / fadeOut);
  L[i] = Math.tanh(L[i] * g * 1.1);
  R[i] = Math.tanh(R[i] * g * 1.1);
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
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
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
console.log(`WAV written: ${WAV_PATH} (${(buf.length / 1e6).toFixed(2)} MB, ${DURATION.toFixed(2)}s, ${BPM} BPM)`);

// ---- optionally encode to MP3 ----------------------------------------------
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

writeFileSync(
  resolve(__dirname, '..', 'src', 'audio-file.ts'),
  `// Generated by scripts/make-audio.mjs — do not edit.\nexport const SOUNDTRACK = '${chosen}';\n`,
);
