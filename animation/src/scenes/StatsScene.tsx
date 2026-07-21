import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import {fitText} from '@remotion/layout-utils';
import {Backdrop, useLayout, useReveal} from '../components';
import {Aurora, ParticleField, PerspectiveGrid} from '../kit/backgrounds';
import {GradientText} from '../kit/type';
import {GlassCard} from '../kit/surfaces';
import {COLORS, STATS} from '../theme';
import {displayFont, bodyFont} from '../fonts';

const StatCard: React.FC<{
  stat: (typeof STATS)[number];
  index: number;
  numberFont: number;
}> = ({stat, index, numberFont}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const delay = 22 + index * 12;
  const enter = spring({frame: frame - delay, fps, config: {damping: 180, mass: 0.7}});
  const countP = interpolate(frame, [delay, delay + 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const value = Math.round(stat.value * countP);

  return (
    <GlassCard
      tint="rgba(255,255,255,0.05)"
      border="rgba(255,255,255,0.10)"
      glow={`${stat.tone}55`}
      style={{
        position: 'relative',
        padding: '38px 40px',
        overflow: 'hidden',
        opacity: interpolate(enter, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(
          enter,
          [0, 1],
          [0.92, 1],
        )})`,
      }}
    >
      <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: stat.tone}} />
      <div
        style={{
          fontFamily: displayFont,
          fontWeight: 800,
          fontSize: numberFont,
          lineHeight: 1,
          color: stat.tone,
          letterSpacing: -2,
        }}
      >
        {value}
        <span style={{fontSize: numberFont * 0.6}}>{stat.suffix}</span>
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
    </GlassCard>
  );
};

export const StatsScene: React.FC = () => {
  const {fs, portrait} = useLayout();
  const heading = useReveal(2, 22);

  const cardW = portrait ? 460 : 400;
  // fitText: find the size at which the WIDEST number fills the card, then use
  // it for all six so they share one optical size and never overflow the 1080
  // vertical frame. Called during render so the inlined font is available.
  const numberFont = React.useMemo(() => {
    const inner = cardW - 80;
    const sizes = STATS.map(
      (s) =>
        fitText({
          text: `${s.value}${s.suffix}`,
          withinWidth: inner,
          fontFamily: displayFont,
          fontWeight: 800,
        }).fontSize,
    );
    return Math.min(104, ...sizes);
  }, [cardW]);

  return (
    <AbsoluteFill>
      <Backdrop glow={COLORS.green} />
      <Aurora colors={[COLORS.green, COLORS.blue, COLORS.greenSoft]} opacity={0.34} />
      <PerspectiveGrid color="rgba(120,150,200,0.22)" opacity={0.4} />
      <ParticleField count={34} color={COLORS.greenSoft} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div
          style={{
            ...heading,
            fontFamily: displayFont,
            color: COLORS.heroText,
            fontWeight: 700,
            fontSize: fs(54, 46),
            marginBottom: portrait ? 40 : 48,
            textAlign: 'center',
          }}
        >
          The whole landscape, <GradientText from={COLORS.greenSoft} to={COLORS.blueSoft}>counted</GradientText>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: portrait ? `repeat(2, ${cardW}px)` : `repeat(3, ${cardW}px)`,
            gap: portrait ? 22 : 26,
          }}
        >
          {STATS.map((s, i) => (
            <StatCard key={s.label} stat={s} index={i} numberFont={numberFont} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
