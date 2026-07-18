import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Backdrop, useLayout, useReveal, useSceneFade} from '../components';
import {COLORS, LIFECYCLE} from '../theme';
import {displayFont, bodyFont, monoFont} from '../fonts';
import {sceneDuration} from '../timeline';

// blend saffron -> green across the journey, returning a #rrggbb hex so alpha
// suffixes like `${tone}bb` stay valid CSS
const lerpHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const Bubble: React.FC<{i: number; on: number; pop: number; tone: string; size: number}> = ({
  i,
  on,
  pop,
  tone,
  size,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: `radial-gradient(circle at 35% 30%, ${tone}, ${tone}bb)`,
      border: '3px solid rgba(255,255,255,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: displayFont,
      fontWeight: 800,
      fontSize: size * 0.42,
      color: '#fff',
      transform: `scale(${interpolate(pop, [0, 1], [0.3, 1])})`,
      opacity: on,
      boxShadow: `0 0 34px ${tone}${on > 0.5 ? '99' : '00'}`,
      flexShrink: 0,
    }}
  >
    {i + 1}
  </div>
);

export const LifecycleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {fs, portrait} = useLayout();
  const fade = useSceneFade(sceneDuration('lifecycle'));
  const heading = useReveal(2, 22);

  const n = LIFECYCLE.length;
  const lineP = interpolate(frame, [26, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headingEl = (
    <div
      style={{
        ...heading,
        fontFamily: displayFont,
        color: COLORS.heroText,
        fontWeight: 700,
        fontSize: fs(54, 46),
        marginBottom: portrait ? 70 : 90,
        textAlign: 'center',
      }}
    >
      A path for <span style={{color: COLORS.saffronSoft}}>every stage</span> of the journey
    </div>
  );

  const footer = (
    <div
      style={{
        marginTop: portrait ? 64 : 96,
        fontFamily: monoFont,
        fontSize: fs(18, 15),
        letterSpacing: 2,
        color: COLORS.heroFaint,
        textAlign: 'center',
        opacity: interpolate(frame, [120, 150], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      }}
    >
      ideation → prototype → seed → growth → market access
    </div>
  );

  // ----- vertical pipeline (9:16) -----
  if (portrait) {
    const trackH = 1180;
    const gap = trackH / (n - 1);
    const bubbleSize = 108;
    const railX = 120; // rail centre x within the (centred) track container
    return (
      <AbsoluteFill style={{opacity: fade}}>
        <Backdrop glow={COLORS.saffron} />
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
          {headingEl}
          <div style={{position: 'relative', width: 820, height: trackH}}>
            <div
              style={{
                position: 'absolute',
                left: railX - 3,
                top: 0,
                width: 6,
                height: '100%',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.12)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: railX - 3,
                top: 0,
                width: 6,
                height: `${lineP * 100}%`,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${COLORS.saffron}, ${COLORS.green})`,
                boxShadow: `0 0 22px ${COLORS.saffron}88`,
              }}
            />
            {LIFECYCLE.map((stage, i) => {
              const tone = lerpHex(COLORS.saffron, COLORS.green, i / (n - 1));
              const delay = 30 + i * 20;
              const pop = spring({frame: frame - delay, fps, config: {damping: 170, mass: 0.6}});
              const on = interpolate(pop, [0, 1], [0, 1]);
              return (
                <div
                  key={stage.title}
                  style={{
                    position: 'absolute',
                    left: railX,
                    top: i * gap,
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 30,
                  }}
                >
                  <div style={{marginLeft: -bubbleSize / 2, flexShrink: 0}}>
                    <Bubble i={i} on={on} pop={pop} tone={tone} size={bubbleSize} />
                  </div>
                  <div style={{transform: `translateX(${interpolate(pop, [0, 1], [20, 0])}px)`, opacity: on}}>
                    <div style={{fontFamily: displayFont, fontWeight: 700, fontSize: 42, color: COLORS.heroText}}>
                      {stage.title}
                    </div>
                    <div style={{fontFamily: bodyFont, fontSize: 25, color: COLORS.heroFaint, marginTop: 4}}>
                      {stage.hint}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {footer}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // ----- horizontal pipeline (16:9) -----
  const trackW = 1500;
  const gap = trackW / (n - 1);
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop glow={COLORS.saffron} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        {headingEl}
        <div style={{position: 'relative', width: trackW, height: 220}}>
          <div
            style={{
              position: 'absolute',
              top: 46,
              left: 0,
              width: '100%',
              height: 6,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 46,
              left: 0,
              width: `${lineP * 100}%`,
              height: 6,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${COLORS.saffron}, ${COLORS.green})`,
              boxShadow: `0 0 22px ${COLORS.saffron}88`,
            }}
          />
          {LIFECYCLE.map((stage, i) => {
            const tone = lerpHex(COLORS.saffron, COLORS.green, i / (n - 1));
            const delay = 30 + i * 20;
            const pop = spring({frame: frame - delay, fps, config: {damping: 170, mass: 0.6}});
            const on = interpolate(pop, [0, 1], [0, 1]);
            return (
              <div
                key={stage.title}
                style={{
                  position: 'absolute',
                  left: i * gap,
                  top: 0,
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  width: 240,
                }}
              >
                <div style={{margin: '0 auto', width: 96}}>
                  <Bubble i={i} on={on} pop={pop} tone={tone} size={96} />
                </div>
                <div
                  style={{
                    marginTop: 22,
                    fontFamily: displayFont,
                    fontWeight: 700,
                    fontSize: 27,
                    color: COLORS.heroText,
                    opacity: on,
                    transform: `translateY(${interpolate(pop, [0, 1], [12, 0])}px)`,
                  }}
                >
                  {stage.title}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: bodyFont,
                    fontSize: 17,
                    lineHeight: 1.3,
                    color: COLORS.heroFaint,
                    opacity: on,
                  }}
                >
                  {stage.hint}
                </div>
              </div>
            );
          })}
        </div>
        {footer}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
