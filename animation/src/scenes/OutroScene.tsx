import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Backdrop, Particles, Tricolor, useReveal, useSceneFade} from '../components';
import {COLORS} from '../theme';
import {displayFont, bodyFont, monoFont} from '../fonts';
import {sceneDuration} from '../timeline';

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useSceneFade(sceneDuration('outro'), 10, 16);

  const title = spring({frame, fps, config: {damping: 160, mass: 0.9}});
  const url = useReveal(30);
  const badge = useReveal(46, 16);

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop glow={COLORS.saffron} />
      <Particles count={34} color="rgba(240,135,63,0.5)" />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{marginBottom: 40}}>
          <Tricolor width={360} height={11} startFrame={4} />
        </div>

        <h1
          style={{
            fontFamily: displayFont,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.05,
            textAlign: 'center',
            color: COLORS.heroText,
            margin: 0,
            letterSpacing: -2,
            opacity: interpolate(title, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(title, [0, 1], [30, 0])}px) scale(${interpolate(
              title,
              [0, 1],
              [0.92, 1],
            )})`,
          }}
        >
          Find what you're eligible for
          <br />
          <span style={{color: COLORS.saffronSoft}}>in minutes, not weeks.</span>
        </h1>

        <div
          style={{
            ...url,
            marginTop: 52,
            fontFamily: monoFont,
            fontWeight: 600,
            fontSize: 34,
            color: '#fff',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.25)',
            padding: '18px 40px',
            borderRadius: 999,
          }}
        >
          fritzhand.github.io/startup-india-guide
        </div>

        <div
          style={{
            ...badge,
            marginTop: 30,
            display: 'flex',
            gap: 28,
            fontFamily: bodyFont,
            fontSize: 22,
            color: COLORS.heroFaint,
          }}
        >
          <span>69 central schemes</span>
          <span>·</span>
          <span>323 state schemes</span>
          <span>·</span>
          <span>Free & open source</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
