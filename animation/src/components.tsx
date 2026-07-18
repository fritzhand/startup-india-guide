import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  random,
} from 'remotion';
import {COLORS, HERO_BG} from './theme';

// Full-frame navy hero backdrop with a slow drifting glow + vignette. Cheap to
// render (a couple of gradients), gives the flat scenes some depth.
export const Backdrop: React.FC<{glow?: string}> = ({glow = COLORS.blue}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = frame / durationInFrames;
  const gx = 30 + 40 * (0.5 + 0.5 * Math.sin(p * Math.PI * 2));
  const gy = 30 + 25 * (0.5 + 0.5 * Math.cos(p * Math.PI * 2));
  return (
    <AbsoluteFill style={{background: HERO_BG}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 60% at ${gx}% ${gy}%, ${glow}55 0%, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(6,12,24,0.55) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

// A tricolour accent — saffron / white / green — that draws in from the left.
// A quiet nod to the flag without being kitsch.
export const Tricolor: React.FC<{
  width?: number;
  height?: number;
  startFrame?: number;
  vertical?: boolean;
}> = ({width = 220, height = 8, startFrame = 0, vertical = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const grow = spring({
    frame: frame - startFrame,
    fps,
    config: {damping: 200, mass: 0.6},
  });
  const bars = [COLORS.saffron, '#ffffff', COLORS.green];
  const len = (vertical ? height : width) * grow;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        borderRadius: 999,
        overflow: 'hidden',
        width: vertical ? height : len,
        height: vertical ? len : height,
        boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
      }}
    >
      {bars.map((c) => (
        <div key={c} style={{flex: 1, background: c}} />
      ))}
    </div>
  );
};

// Small utility: a spring-driven fade + rise, staggered by `delay` frames.
export const useReveal = (delay = 0, distance = 26) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200, mass: 0.7},
  });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [distance, 0])}px)`,
  };
};

// Scene-level fade: eases the scene in over the first frames and out over the
// last, so sequential cuts feel like soft crossfades under the audio whoosh.
export const useSceneFade = (
  durationInFrames: number,
  inFrames = 12,
  outFrames = 11,
) => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [0, inFrames, durationInFrames - outFrames, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
};

// A field of faint drifting particles — subtle motion behind hero content.
export const Particles: React.FC<{count?: number; color?: string}> = ({
  count = 26,
  color = 'rgba(180,200,230,0.5)',
}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill>
      {new Array(count).fill(0).map((_, i) => {
        const x = random(`x${i}`) * width;
        const baseY = random(`y${i}`) * height;
        const size = 1.5 + random(`s${i}`) * 3.5;
        const speed = 0.2 + random(`sp${i}`) * 0.8;
        const drift = ((frame * speed) % (height + 60)) - 30;
        const y = (baseY + drift) % (height + 60);
        const tw =
          0.25 + 0.75 * (0.5 + 0.5 * Math.sin((frame / durationInFrames) * 20 + i));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: 999,
              background: color,
              opacity: tw * 0.6,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
