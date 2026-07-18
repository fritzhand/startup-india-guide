// Fonts inlined as base64 data URIs (see scripts/fetch-fonts.mjs) and injected
// as a stylesheet at module load. Because the glyphs are embedded (no network,
// no internal-server fetch) they are available immediately and headless renders
// never hang on font loading. `font-display: block` avoids a fallback flash.
import {FONT_FACE_CSS, FONT_SPECS} from './fonts-face';

if (typeof document !== 'undefined' && !document.getElementById('inline-fonts')) {
  const style = document.createElement('style');
  style.id = 'inline-fonts';
  style.textContent = FONT_FACE_CSS;
  document.head.appendChild(style);
  // Kick off decoding immediately (fire-and-forget; we never block the render).
  if (document.fonts) {
    FONT_SPECS.forEach((f) => {
      try {
        document.fonts.load(`${f.weight} 32px "${f.family}"`);
      } catch {
        /* ignore */
      }
    });
  }
}

export const displayFont =
  '"Bricolage Grotesque", "Inter", system-ui, sans-serif';
export const bodyFont = '"Inter", system-ui, -apple-system, sans-serif';
export const monoFont = '"JetBrains Mono", ui-monospace, Menlo, monospace';
