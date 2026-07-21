// Kinetic typography kit — frame-driven, no CSS transitions. Adapted from the
// creativly reference (word/char spring-stagger, gradient clip, highlight sweep).
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';

type SpringConfig = {damping?: number; stiffness?: number; mass?: number};

// Word-by-word reveal: each word springs up from below with a scale + blur pop
// and a touch of organic noise jitter for life. Great for big headlines.
export const KineticHeadline: React.FC<{
  words: {text: string; color?: string; gradient?: [string, string]}[];
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  baseDelay?: number;
  stagger?: number;
  lineHeight?: number;
  letterSpacing?: string;
  justify?: React.CSSProperties['justifyContent'];
  noiseIntensity?: number;
  style?: React.CSSProperties;
}> = ({
  words,
  fontFamily,
  fontSize,
  fontWeight = 800,
  baseDelay = 0,
  stagger = 4,
  lineHeight = 1.02,
  letterSpacing = '-0.02em',
  justify = 'center',
  noiseIntensity = 2.5,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: justify,
        gap: '0 0.28em',
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing,
        ...style,
      }}
    >
      {words.map((word, i) => {
        const d = baseDelay + i * stagger;
        const spr = spring({frame: Math.max(0, frame - d), fps, config: {damping: 16, stiffness: 100, mass: 0.5}});
        const scale = interpolate(spr, [0, 1], [0.4, 1]);
        const blur = interpolate(spr, [0, 1], [10, 0]);
        const y = interpolate(spr, [0, 1], [40, 0]);
        const nx = noise2D(`kx${i}`, frame * 0.01, i * 5) * noiseIntensity;
        const ny = noise2D(`ky${i}`, i * 5, frame * 0.01) * noiseIntensity;
        const grad = word.gradient
          ? {
              background: `linear-gradient(120deg, ${word.gradient[0]}, ${word.gradient[1]})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }
          : {color: word.color};
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translate(${nx}px, ${y + ny}px) scale(${scale})`,
              opacity: spr,
              filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
              whiteSpace: 'nowrap',
              ...grad,
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

// Static gradient-clipped text (no per-word animation) — an accent word inside
// a larger heading. Animate the parent's opacity/transform if you want motion.
export const GradientText: React.FC<{
  children: React.ReactNode;
  from: string;
  to: string;
  style?: React.CSSProperties;
}> = ({children, from, to, style}) => (
  <span
    style={{
      background: `linear-gradient(120deg, ${from}, ${to})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

// A highlighter sweep that wipes in behind a word (scaleX from the left with a
// slight skew). Reveal a keyword on cue.
export const WordHighlight: React.FC<{
  children: React.ReactNode;
  color: string;
  delay?: number;
  skew?: number;
  radius?: number;
  style?: React.CSSProperties;
}> = ({children, color, delay = 0, skew = -8, radius = 6, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {damping: 14, stiffness: 180, mass: 0.5},
  });
  return (
    <span style={{position: 'relative', display: 'inline-block', ...style}}>
      <span
        style={{
          position: 'absolute',
          left: -8,
          right: -8,
          top: '0.08em',
          bottom: '0.08em',
          background: color,
          borderRadius: radius,
          zIndex: -1,
          transform: `scaleX(${progress}) skewX(${skew}deg)`,
          transformOrigin: 'left center',
          opacity: 0.92,
        }}
      />
      <span style={{position: 'relative', zIndex: 1}}>{children}</span>
    </span>
  );
};

// Per-character staggered reveal (up + fade, optional blur).
export const CharacterReveal: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  offsetY?: number;
  blur?: boolean;
  springConfig?: SpringConfig;
  style?: React.CSSProperties;
}> = ({text, delay = 0, stagger = 1, offsetY = 26, blur = false, springConfig, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <span style={{display: 'inline-block', ...style}}>
      {text.split('').map((ch, i) => {
        const spr = spring({
          frame: Math.max(0, frame - (delay + i * stagger)),
          fps,
          config: springConfig ?? {damping: 12, stiffness: 100, mass: 0.4},
        });
        const y = offsetY * (1 - spr);
        const b = blur ? 8 * (1 - spr) : 0;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${y}px)`,
              opacity: spr,
              filter: b > 0.1 ? `blur(${b}px)` : undefined,
              whiteSpace: ch === ' ' ? 'pre' : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};
