import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop, Tricolor, useHeadFade, useLayout, useReveal} from '../components';
import {Aurora, GlowOrb, ParticleField} from '../kit/backgrounds';
import {KineticHeadline} from '../kit/type';
import {COLORS} from '../theme';
import {displayFont, bodyFont, monoFont} from '../fonts';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {fs, portrait} = useLayout();
  const fade = useHeadFade(14); // fade up from black at the very start only

  const kicker = useReveal(6, 14);
  const sub = useReveal(48);

  // gentle push-in on the whole composition
  const zoom = spring({frame, fps, config: {damping: 200, mass: 1.4}});
  const scale = interpolate(zoom, [0, 1], [1.06, 1]);

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop glow={COLORS.blue} />
      <Aurora colors={[COLORS.blue, COLORS.saffron, COLORS.green, COLORS.blueSoft]} opacity={0.42} />
      <GlowOrb x="30%" y="34%" size={620} color={COLORS.blue} />
      <GlowOrb x="72%" y="64%" size={520} color={COLORS.saffron} delay={40} />
      <ParticleField count={42} color={COLORS.heroMuted} />

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

          <KineticHeadline
            words={[{text: 'Startup', color: COLORS.heroText}, {text: 'Schemes', color: COLORS.heroText}]}
            fontFamily={displayFont}
            fontSize={fs(132, 100)}
            baseDelay={8}
            stagger={5}
            letterSpacing="-0.03em"
          />
          <KineticHeadline
            words={[{text: 'Playbook', gradient: [COLORS.saffronSoft, COLORS.saffron]}]}
            fontFamily={displayFont}
            fontSize={fs(132, 100)}
            baseDelay={22}
            letterSpacing="-0.03em"
            style={{marginTop: 4}}
          />

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
