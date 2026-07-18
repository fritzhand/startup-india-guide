import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import {Backdrop, useReveal, useSceneFade} from '../components';
import {COLORS, STATS} from '../theme';
import {displayFont, bodyFont} from '../fonts';
import {sceneDuration} from '../timeline';

const StatCard: React.FC<{stat: (typeof STATS)[number]; index: number}> = ({
  stat,
  index,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const delay = 22 + index * 12;

  const enter = spring({
    frame: frame - delay,
    fps,
    config: {damping: 180, mass: 0.7},
  });
  const countP = interpolate(frame, [delay, delay + 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const value = Math.round(stat.value * countP);

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 22,
        padding: '38px 40px',
        overflow: 'hidden',
        opacity: interpolate(enter, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(
          enter,
          [0, 1],
          [0.92, 1],
        )})`,
        boxShadow: '0 24px 50px -30px rgba(0,0,0,0.8)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 4,
          background: stat.tone,
        }}
      />
      <div
        style={{
          fontFamily: displayFont,
          fontWeight: 800,
          fontSize: 96,
          lineHeight: 1,
          color: stat.tone,
          letterSpacing: -2,
        }}
      >
        {value}
        <span style={{fontSize: 60}}>{stat.suffix}</span>
      </div>
      <div
        style={{
          fontFamily: bodyFont,
          color: COLORS.heroMuted,
          fontSize: 24,
          marginTop: 14,
          lineHeight: 1.25,
          whiteSpace: 'pre-line',
          fontWeight: 500,
        }}
      >
        {stat.label}
      </div>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const fade = useSceneFade(sceneDuration('stats'));
  const heading = useReveal(2, 22);

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop glow={COLORS.green} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div
          style={{
            ...heading,
            fontFamily: displayFont,
            color: COLORS.heroText,
            fontWeight: 700,
            fontSize: 54,
            marginBottom: 48,
            textAlign: 'center',
          }}
        >
          The whole landscape, <span style={{color: COLORS.greenSoft}}>counted</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 400px)',
            gap: 26,
          }}
        >
          {STATS.map((s, i) => (
            <StatCard key={s.label} stat={s} index={i} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
