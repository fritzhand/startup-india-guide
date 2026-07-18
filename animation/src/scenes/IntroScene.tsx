import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop, Particles, Tricolor, useLayout, useReveal, useSceneFade} from '../components';
import {COLORS} from '../theme';
import {displayFont, bodyFont, monoFont} from '../fonts';
import {sceneDuration} from '../timeline';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {fs, portrait} = useLayout();
  const fade = useSceneFade(sceneDuration('intro'));

  const kicker = useReveal(6, 14);
  const line1 = useReveal(16, 34);
  const line2 = useReveal(26, 34);
  const sub = useReveal(44);

  // gentle push-in on the whole composition
  const zoom = spring({frame, fps, config: {damping: 200, mass: 1.4}});
  const scale = interpolate(zoom, [0, 1], [1.06, 1]);

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop glow={COLORS.blue} />
      <Particles />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scale})`,
        }}
      >
        <div style={{textAlign: 'center', maxWidth: portrait ? 960 : 1400, padding: 40}}>
          <div
            style={{
              ...kicker,
              fontFamily: monoFont,
              letterSpacing: portrait ? 4 : 6,
              fontSize: fs(22, 18),
              fontWeight: 600,
              color: COLORS.heroFaint,
              textTransform: 'uppercase',
              marginBottom: 30,
            }}
          >
            {portrait ? 'Government of India · 2026' : 'Government of India · June 2026 Playbook'}
          </div>

          <h1
            style={{
              fontFamily: displayFont,
              color: COLORS.heroText,
              fontWeight: 800,
              lineHeight: 1.02,
              fontSize: fs(132, 100),
              margin: 0,
              letterSpacing: -3,
            }}
          >
            <div style={line1}>Startup Schemes</div>
            <div style={{...line2, color: COLORS.saffronSoft}}>Playbook</div>
          </h1>

          <div style={{display: 'flex', justifyContent: 'center', margin: '38px 0 30px'}}>
            <Tricolor width={portrait ? 260 : 320} height={10} startFrame={30} />
          </div>

          <p
            style={{
              ...sub,
              fontFamily: bodyFont,
              color: COLORS.heroMuted,
              fontSize: fs(34, 29),
              lineHeight: 1.4,
              margin: 0,
              fontWeight: 400,
            }}
          >
            Every central government scheme for Indian startups —
            {portrait ? ' ' : <br />}
            one searchable, comparable, verified guide.
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
