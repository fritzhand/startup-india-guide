// Atmospheric background components — pure CSS/transform + @remotion/noise, so
// they render deterministically in headless Chromium (no WebGL, no assets).
// Adapted from the creativly reference kit to the playbook's navy/saffron/green.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {COLORS} from '../theme';

// Slow "aurora" of heavily-blurred radial-gradient blobs orbiting on Lissajous
// paths. Reads as soft moving light, not shapes. Cheap and premium.
export const Aurora: React.FC<{
  colors?: string[];
  speed?: number;
  opacity?: number;
  blur?: number;
}> = ({
  colors = [COLORS.blue, COLORS.saffron, COLORS.green, COLORS.blueSoft],
  speed = 0.35,
  opacity = 0.4,
  blur = 90,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame / fps) * speed;
  const fadeIn = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{opacity: opacity * fadeIn, overflow: 'hidden'}}>
      {colors.map((color, i) => {
        const angle = t + (i * Math.PI * 2) / colors.length;
        const x = 50 + Math.sin(angle) * 26 + Math.cos(angle * 0.7 + i) * 10;
        const y = 50 + Math.cos(angle * 0.8) * 22 + Math.sin(angle * 1.3 + i * 2) * 8;
        const sx = 1 + Math.sin(t * 0.5 + i * 1.5) * 0.3;
        const sy = 1 + Math.cos(t * 0.7 + i) * 0.2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: '62%',
              height: '62%',
              background: `radial-gradient(circle, ${color}66 0%, ${color}22 32%, transparent 70%)`,
              transform: `translate(-50%, -50%) scaleX(${sx}) scaleY(${sy})`,
              filter: `blur(${blur}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// A single pulsing, blurred orb of light. Place several for depth.
export const GlowOrb: React.FC<{
  x: string | number;
  y: string | number;
  size: number;
  color: string;
  delay?: number;
  pulseSpeed?: number;
  maxOpacity?: number;
}> = ({x, y, size, color, delay = 0, pulseSpeed = 0.03, maxOpacity = 0.6}) => {
  const frame = useCurrentFrame();
  const scale = 0.85 + 0.18 * Math.sin((frame + delay) * pulseSpeed);
  const opacity = interpolate(frame, [0, 30], [0, maxOpacity], {extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: typeof x === 'number' ? x - size / 2 : x,
        top: typeof y === 'number' ? y - size / 2 : y,
        width: size,
        height: size,
        marginLeft: typeof x === 'string' ? -size / 2 : 0,
        marginTop: typeof y === 'string' ? -size / 2 : 0,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}55 0%, ${color}18 42%, transparent 70%)`,
        transform: `scale(${scale})`,
        opacity,
        filter: 'blur(45px)',
        pointerEvents: 'none',
      }}
    />
  );
};

// Seeded, deterministic floating particles. Positions scale to the CURRENT
// composition size, so the same component works in 16:9 and 9:16.
const srand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const ParticleField: React.FC<{
  count?: number;
  color?: string;
  fadeInSeconds?: number;
}> = ({count = 55, color = COLORS.heroMuted, fadeInSeconds = 1.2}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const globalOpacity = interpolate(frame, [0, fadeInSeconds * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const particles = React.useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        x: srand(i * 7 + 1) * width,
        y: srand(i * 13 + 3) * height,
        size: srand(i * 3 + 5) * 3 + 1,
        speed: srand(i * 11 + 7) * 0.5 + 0.2,
        opacity: srand(i * 17 + 9) * 0.4 + 0.12,
        delay: srand(i * 23 + 11) * 60,
      })),
    [count, width, height],
  );
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {particles.map((p, i) => {
        const drift = noise2D('px', (frame + p.delay) * 0.006 * p.speed, i) * 34;
        const floatY = noise2D('py', i, (frame + p.delay) * 0.006 * p.speed) * 26;
        const pulse = 0.5 + 0.5 * Math.sin((frame + p.delay) * 0.05);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x + drift,
              top: p.y + floatY,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: p.opacity * pulse * globalOpacity,
              filter: p.size > 2.5 ? 'blur(1px)' : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Expanding concentric rings — good for "signal" / data moments.
export const PulseRings: React.FC<{
  count?: number;
  color?: string;
  maxSize?: number;
  speed?: number;
  strokeWidth?: number;
  x?: string;
  y?: string;
}> = ({
  count = 4,
  color = 'rgba(77,130,214,0.5)',
  maxSize = 900,
  speed = 0.8,
  strokeWidth = 2,
  x = '50%',
  y = '50%',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cycle = fps / speed;
  return (
    <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const offset = (i / count) * cycle;
        const progress = ((frame + offset) % cycle) / cycle;
        const size = interpolate(progress, [0, 1], [0, maxSize]);
        const opacity = interpolate(progress, [0, 0.2, 1], [0, 0.7, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `${strokeWidth}px solid ${color}`,
              transform: 'translate(-50%, -50%)',
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Clean light "product sheet" backdrop with a faint brand glow at the top, so
// the light scenes (problem, finder) read as physical screens against the dark
// hero flow. Pair with dark ink text.
export const LightBackdrop: React.FC<{glow?: string}> = ({glow = COLORS.saffron}) => (
  <AbsoluteFill style={{background: 'linear-gradient(160deg, #fbfcfe 0%, #eef1f6 70%, #e7ebf2 100%)'}}>
    <AbsoluteFill
      style={{background: `radial-gradient(58% 42% at 50% 6%, ${glow}16 0%, transparent 62%)`}}
    />
  </AbsoluteFill>
);

// Perspective grid that scrolls toward the horizon, masked to a soft pool of
// light with a vignette. The classic "tech" floor.
export const PerspectiveGrid: React.FC<{
  color?: string;
  velocity?: number;
  opacity?: number;
  cell?: number;
}> = ({color = 'rgba(120,150,200,0.30)', velocity = 22, opacity = 0.5, cell = 90}) => {
  const frame = useCurrentFrame();
  const offset = (frame * velocity * 0.05) % cell;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          opacity,
          backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          transform: `translateY(${offset}px) perspective(1000px) rotateX(62deg) scale(2.2)`,
          transformOrigin: '50% 0%',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 78%)',
        }}
      />
    </AbsoluteFill>
  );
};
