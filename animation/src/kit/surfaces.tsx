// Surface + connector kit: glass-morphism cards, browser chrome, and animated
// SVG strokes drawn with @remotion/paths evolvePath (offline, pure SVG).
import React from 'react';
import {evolvePath} from '@remotion/paths';
import {COLORS} from '../theme';

// Frosted-glass card. Over an Aurora/particle background this reads as a real
// product surface. backdrop-filter works in headless Chromium.
export const GlassCard: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  tint?: string;
  border?: string;
  radius?: number;
  glow?: string;
}> = ({children, style, tint = 'rgba(20,26,40,0.55)', border = 'rgba(255,255,255,0.14)', radius = 22, glow}) => (
  <div
    style={{
      background: tint,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      border: `1px solid ${border}`,
      borderRadius: radius,
      boxShadow: glow
        ? `0 30px 70px -30px rgba(0,0,0,0.75), 0 0 60px -20px ${glow}`
        : '0 30px 70px -30px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
      ...style,
    }}
  >
    {children}
  </div>
);

// macOS-style browser window frame with traffic lights + address bar.
export const BrowserChrome: React.FC<{
  children?: React.ReactNode;
  url?: string;
  width?: number | string;
  active?: boolean;
  fontFamily?: string;
  style?: React.CSSProperties;
}> = ({children, url, width = '100%', active = true, fontFamily, style}) => (
  <div
    style={{
      width,
      borderRadius: 18,
      overflow: 'hidden',
      background: '#ffffff',
      border: `1px solid ${active ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.06)'}`,
      boxShadow: active
        ? '0 40px 90px -30px rgba(10,20,40,0.55), 0 10px 30px -12px rgba(10,20,40,0.35)'
        : '0 20px 50px -20px rgba(10,20,40,0.4)',
      ...style,
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
        borderBottom: '1px solid #e4e7ec',
      }}
    >
      {['#ff5f56', '#febc2e', '#27c93f'].map((c) => (
        <div key={c} style={{width: 13, height: 13, borderRadius: 999, background: c}} />
      ))}
      {url !== undefined && (
        <div
          style={{
            marginLeft: 14,
            flex: 1,
            height: 28,
            borderRadius: 999,
            background: '#fff',
            border: '1px solid #dfe3ea',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontFamily,
            fontSize: 15,
            color: '#8a94a6',
          }}
        >
          {url}
        </div>
      )}
    </div>
    <div>{children}</div>
  </div>
);

// A cubic-bezier connector between two points, drawn on with evolvePath and an
// optional glow + travelling dot. Renders its own absolutely-positioned SVG
// sized to (w, h); pass coordinates in that canvas space.
export const Connector: React.FC<{
  w: number;
  h: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number; // 0..1 draw-on
  color?: string;
  glowColor?: string;
  strokeWidth?: number;
  vertical?: boolean; // curve control axis
  dot?: boolean;
  style?: React.CSSProperties;
}> = ({
  w,
  h,
  x1,
  y1,
  x2,
  y2,
  progress,
  color = COLORS.blueSoft,
  glowColor,
  strokeWidth = 3,
  vertical = false,
  dot = true,
  style,
}) => {
  const c1 = vertical ? {x: x1, y: (y1 + y2) / 2} : {x: (x1 + x2) / 2, y: y1};
  const c2 = vertical ? {x: x2, y: (y1 + y2) / 2} : {x: (x1 + x2) / 2, y: y2};
  const d = `M ${x1} ${y1} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${x2} ${y2}`;
  const p = Math.min(1, Math.max(0, progress));
  const evolved = evolvePath(p, d);

  // point on the cubic at parameter p, for the travelling dot
  const u = 1 - p;
  const bx = u * u * u * x1 + 3 * u * u * p * c1.x + 3 * u * p * p * c2.x + p * p * p * x2;
  const by = u * u * u * y1 + 3 * u * u * p * c1.y + 3 * u * p * p * c2.y + p * p * p * y2;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}
    >
      <path
        d={d}
        fill="none"
        stroke={glowColor ?? color}
        strokeWidth={strokeWidth + 8}
        strokeDasharray={evolved.strokeDasharray}
        strokeDashoffset={evolved.strokeDashoffset}
        strokeLinecap="round"
        opacity={0.18}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={evolved.strokeDasharray}
        strokeDashoffset={evolved.strokeDashoffset}
        strokeLinecap="round"
      />
      {dot && p > 0.02 && p < 0.99 && (
        <circle cx={bx} cy={by} r={strokeWidth + 3} fill="#fff" opacity={0.9} />
      )}
    </svg>
  );
};
