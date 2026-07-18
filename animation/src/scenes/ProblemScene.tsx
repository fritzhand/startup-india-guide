import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Backdrop, useReveal, useSceneFade} from '../components';
import {COLORS} from '../theme';
import {displayFont, bodyFont, monoFont} from '../fonts';
import {sceneDuration} from '../timeline';

const PdfStack: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 6, fps, config: {damping: 200, mass: 0.8}});
  const count = Math.round(interpolate(frame, [10, 46], [1, 107], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  return (
    <div style={{position: 'relative', width: 300, height: 380}}>
      {[3, 2, 1, 0].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: i * 14,
            top: i * 12,
            width: 260,
            height: 340,
            borderRadius: 14,
            background: '#fbfcfe',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 20px 50px -18px rgba(0,0,0,0.6)',
            transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
            opacity: interpolate(s, [0, 1], [0, i === 0 ? 1 : 0.55]),
          }}
        >
          {i === 0 && (
            <>
              <div
                style={{
                  height: 62,
                  background: COLORS.navy,
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  color: '#fff',
                  fontFamily: displayFont,
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                Scheme Playbook
              </div>
              <div style={{padding: 20}}>
                {[0.9, 0.7, 0.8, 0.5, 0.85, 0.6, 0.75].map((w, k) => (
                  <div
                    key={k}
                    style={{
                      height: 12,
                      borderRadius: 6,
                      marginBottom: 14,
                      width: `${w * 100}%`,
                      background: k === 0 ? COLORS.saffron : '#dfe3ea',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          right: -10,
          bottom: -14,
          background: COLORS.saffron,
          color: '#fff',
          fontFamily: monoFont,
          fontWeight: 700,
          fontSize: 26,
          padding: '10px 18px',
          borderRadius: 12,
          boxShadow: '0 10px 24px -8px rgba(0,0,0,0.6)',
        }}
      >
        {count} pages
      </div>
    </div>
  );
};

const BrowserMock: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 40, fps, config: {damping: 160, mass: 0.7}});
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const rows = ['SISFS · Seed Fund', 'FFS · Fund of Funds', 'CGSS · Credit Guarantee', 'iDEX · Defence'];
  return (
    <div
      style={{
        width: 560,
        borderRadius: 18,
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 30px 70px -24px rgba(0,0,0,0.7)',
        transform: `scale(${scale})`,
        opacity: interpolate(s, [0, 1], [0, 1]),
      }}
    >
      <div
        style={{
          height: 52,
          background: '#eef0f3',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
        }}
      >
        {[COLORS.saffron, '#f4c024', COLORS.green].map((c) => (
          <div key={c} style={{width: 13, height: 13, borderRadius: 999, background: c}} />
        ))}
        <div
          style={{
            marginLeft: 14,
            flex: 1,
            height: 26,
            borderRadius: 999,
            background: '#fff',
            border: '1px solid #dfe3ea',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontFamily: bodyFont,
            fontSize: 15,
            color: '#8a94a6',
          }}
        >
          ⌘K · Search 69 schemes…
        </div>
      </div>
      <div style={{padding: 22}}>
        {rows.map((r, k) => {
          const rs = interpolate(frame, [54 + k * 6, 66 + k * 6], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={r}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                marginBottom: 10,
                borderRadius: 12,
                background: COLORS.surfaceAlt,
                border: '1px solid #e4e7ec',
                opacity: rs,
                transform: `translateX(${interpolate(rs, [0, 1], [24, 0])}px)`,
              }}
            >
              <div style={{width: 10, height: 10, borderRadius: 999, background: COLORS.green}} />
              <div style={{fontFamily: bodyFont, fontWeight: 600, color: COLORS.ink, fontSize: 18}}>
                {r}
              </div>
              <div
                style={{
                  marginLeft: 'auto',
                  fontFamily: monoFont,
                  fontSize: 13,
                  color: '#fff',
                  background: COLORS.blue,
                  padding: '3px 10px',
                  borderRadius: 999,
                }}
              >
                grant
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(sceneDuration('problem'));
  const heading = useReveal(2, 20);
  const arrow = interpolate(frame, [30, 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop glow={COLORS.saffron} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div
          style={{
            ...heading,
            fontFamily: displayFont,
            color: COLORS.heroText,
            fontWeight: 700,
            fontSize: 52,
            marginBottom: 54,
            textAlign: 'center',
          }}
        >
          One 107-page PDF, <span style={{color: COLORS.saffronSoft}}>rebuilt to actually use</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
          <PdfStack />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: arrow,
              transform: `translateX(${interpolate(arrow, [0, 1], [-16, 0])}px)`,
            }}
          >
            <div style={{fontSize: 64, color: COLORS.heroMuted, lineHeight: 1}}>→</div>
            <div style={{fontFamily: monoFont, color: COLORS.heroFaint, fontSize: 15, marginTop: 8}}>
              extract · verify
            </div>
          </div>
          <BrowserMock />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
