import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {useLayout, useReveal} from '../components';
import {LightBackdrop} from '../kit/backgrounds';
import {BrowserChrome} from '../kit/surfaces';
import {WordHighlight} from '../kit/type';
import {COLORS} from '../theme';
import {displayFont, bodyFont, monoFont} from '../fonts';

const PdfStack: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 6, fps, config: {damping: 200, mass: 0.8}});
  const count = Math.round(
    interpolate(frame, [10, 46], [1, 107], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
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
            background: '#ffffff',
            border: '1px solid rgba(15,30,60,0.08)',
            boxShadow: '0 26px 60px -22px rgba(15,30,60,0.45)',
            transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
            opacity: interpolate(s, [0, 1], [0, i === 0 ? 1 : 0.5]),
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
          boxShadow: '0 12px 26px -8px rgba(226,98,27,0.6)',
        }}
      >
        {count} pages
      </div>
    </div>
  );
};

const SiteMock: React.FC<{fontMono: string}> = ({fontMono}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 40, fps, config: {damping: 160, mass: 0.7}});
  const rows = ['SISFS · Seed Fund', 'FFS · Fund of Funds', 'CGSS · Credit Guarantee', 'iDEX · Defence'];
  return (
    <div
      style={{
        width: 560,
        transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`,
        opacity: interpolate(s, [0, 1], [0, 1]),
      }}
    >
      <BrowserChrome url="⌘K · Search 69 schemes…" fontFamily={bodyFont}>
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
                <div style={{fontFamily: bodyFont, fontWeight: 600, color: COLORS.ink, fontSize: 18}}>{r}</div>
                <div
                  style={{
                    marginLeft: 'auto',
                    fontFamily: fontMono,
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
      </BrowserChrome>
    </div>
  );
};

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fs, portrait} = useLayout();
  const heading = useReveal(2, 20);
  const arrow = interpolate(frame, [30, 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <LightBackdrop glow={COLORS.saffron} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div
          style={{
            ...heading,
            fontFamily: displayFont,
            color: COLORS.ink,
            fontWeight: 700,
            fontSize: fs(52, 44),
            marginBottom: portrait ? 44 : 58,
            textAlign: 'center',
            maxWidth: portrait ? 900 : undefined,
            lineHeight: 1.15,
          }}
        >
          One 107-page PDF,{' '}
          <WordHighlight color={COLORS.saffron} delay={26} style={{color: '#fff'}}>
            rebuilt to actually use
          </WordHighlight>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: portrait ? 22 : 40,
            flexDirection: portrait ? 'column' : 'row',
          }}
        >
          <PdfStack />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: arrow,
              transform: portrait
                ? `translateY(${interpolate(arrow, [0, 1], [-16, 0])}px)`
                : `translateX(${interpolate(arrow, [0, 1], [-16, 0])}px)`,
            }}
          >
            <div style={{fontSize: 64, color: COLORS.inkMuted, lineHeight: 1}}>{portrait ? '↓' : '→'}</div>
            <div style={{fontFamily: monoFont, color: COLORS.inkMuted, fontSize: 15, marginTop: 8}}>
              extract · verify
            </div>
          </div>
          <SiteMock fontMono={monoFont} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
