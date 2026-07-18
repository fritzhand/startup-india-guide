import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Backdrop, useLayout, useReveal, useSceneFade} from '../components';
import {COLORS, FINDER_QUESTIONS} from '../theme';
import {displayFont, bodyFont, monoFont} from '../fonts';
import {sceneDuration} from '../timeline';

const MATCHES = [
  'NIDHI-EIR',
  'BIG',
  'PRAYAS 2.0',
  'SISFS',
  'iDEX SPARK',
  'CGSS',
  'GENESIS',
  'ADITI',
];

export const FinderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {fs, portrait} = useLayout();
  const cardW = portrait ? 960 : 1120;
  const fade = useSceneFade(sceneDuration('finder'));
  const heading = useReveal(2, 22);

  const perQ = 34;
  const qIndex = Math.min(
    FINDER_QUESTIONS.length - 1,
    Math.max(0, Math.floor((frame - 16) / perQ)),
  );
  const qStart = 16 + qIndex * perQ;
  const qEnter = spring({frame: frame - qStart, fps, config: {damping: 190, mass: 0.6}});

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop glow={COLORS.blue} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div
          style={{
            ...heading,
            fontFamily: displayFont,
            color: COLORS.heroText,
            fontWeight: 700,
            fontSize: fs(54, 44),
            marginBottom: 44,
            textAlign: 'center',
            maxWidth: portrait ? 900 : undefined,
          }}
        >
          Answer <span style={{color: COLORS.blueSoft}}>5 questions</span>, get your shortlist
        </div>

        {/* Question card */}
        <div
          style={{
            width: cardW,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 24,
            padding: portrait ? '36px 40px' : '40px 48px',
            boxShadow: '0 30px 70px -34px rgba(0,0,0,0.85)',
          }}
        >
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 18,
              letterSpacing: 3,
              color: COLORS.blueSoft,
              marginBottom: 18,
            }}
          >
            QUESTION {qIndex + 1} / {FINDER_QUESTIONS.length}
          </div>
          <div
            key={qIndex}
            style={{
              fontFamily: displayFont,
              fontWeight: 700,
              fontSize: fs(46, 40),
              lineHeight: 1.15,
              color: COLORS.heroText,
              minHeight: portrait ? 140 : 108,
              opacity: interpolate(qEnter, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(qEnter, [0, 1], [18, 0])}px)`,
            }}
          >
            {FINDER_QUESTIONS[qIndex]}
          </div>

          <div style={{display: 'flex', gap: 20, marginTop: 30}}>
            {[
              {label: 'Yes', color: COLORS.saffron},
              {label: 'No', color: COLORS.green},
            ].map((b, i) => (
              <div
                key={b.label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '20px 0',
                  borderRadius: 16,
                  fontFamily: displayFont,
                  fontWeight: 700,
                  fontSize: 28,
                  color: '#fff',
                  background: b.color,
                  opacity: interpolate(qEnter, [0, 1], [0.2, 1]),
                  transform: `scale(${interpolate(
                    qEnter,
                    [0, 1],
                    [0.9, 1 + (i === qIndex % 2 ? 0.02 : 0)],
                  )})`,
                  boxShadow: `0 14px 30px -12px ${b.color}aa`,
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Accumulating matches */}
        <div style={{marginTop: 40, textAlign: 'center', width: cardW}}>
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: 20,
              color: COLORS.heroMuted,
              marginBottom: 18,
            }}
          >
            Your matches
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center'}}>
            {MATCHES.map((m, k) => {
              const appear = 48 + k * 17;
              const cs = spring({frame: frame - appear, fps, config: {damping: 160, mass: 0.5}});
              return (
                <div
                  key={m}
                  style={{
                    fontFamily: monoFont,
                    fontWeight: 600,
                    fontSize: 22,
                    color: COLORS.heroText,
                    background: 'rgba(36,86,166,0.30)',
                    border: `1px solid ${COLORS.blueSoft}66`,
                    padding: '12px 22px',
                    borderRadius: 999,
                    opacity: interpolate(cs, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(cs, [0, 1], [16, 0])}px) scale(${interpolate(
                      cs,
                      [0, 1],
                      [0.8, 1],
                    )})`,
                  }}
                >
                  {m}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
