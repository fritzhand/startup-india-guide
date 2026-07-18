// Palette sampled from the playbook PDF (navy title banners, saffron/green
// decision-tree branches, blue hyperlink accents) — identical to the site's
// tokens.css so the film feels like the product.

export const COLORS = {
  navy: '#1f3864',
  navyDeep: '#14263f',
  navyFloor: '#0f1d31',
  saffron: '#e2621b',
  saffronSoft: '#f0873f',
  green: '#359a4c',
  greenSoft: '#4bb865',
  blue: '#2456a6',
  blueSoft: '#4d82d6',

  // Ink on the dark hero.
  heroText: '#f4f7fc',
  heroMuted: '#b9c6dd',
  heroFaint: '#7f92b4',

  // Card surfaces used in the "product" moments.
  surface: '#ffffff',
  surfaceAlt: '#f5f6f8',
  cardBorder: 'rgba(255,255,255,0.10)',
  ink: '#182234',
  inkMuted: '#4a566b',
} as const;

// The hero gradient, matching --hero-bg in tokens.css.
export const HERO_BG = `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyDeep} 60%, ${COLORS.navyFloor} 100%)`;

export const FONT_DISPLAY =
  '"Bricolage Grotesque", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_BODY =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const FONT_MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// The headline numbers, straight from data/*.json (verified at build time).
export const STATS = [
  {value: 69, suffix: '', label: 'Central schemes,\ndocumented in full', tone: COLORS.saffron},
  {value: 35, suffix: '+', label: 'Ministries,\ndepartments & PSUs', tone: COLORS.blueSoft},
  {value: 224, suffix: '', label: 'Incubators mapped\nnationwide', tone: COLORS.greenSoft},
  {value: 323, suffix: '', label: 'State & UT schemes\nacross 36 states', tone: COLORS.saffronSoft},
  {value: 6, suffix: '', label: 'Types of\nsupport', tone: COLORS.blueSoft},
  {value: 5, suffix: '', label: 'Lifecycle stages\ncovered', tone: COLORS.greenSoft},
] as const;

// The five lifecycle stages (data/lifecycle.json), trimmed to headline labels.
export const LIFECYCLE = [
  {title: 'Ideation', hint: 'an idea, no product yet'},
  {title: 'Prototype', hint: 'building a proof of concept'},
  {title: 'Seed', hint: 'entering the market'},
  {title: 'Growth', hint: 'scaling the pilot'},
  {title: 'Market Access', hint: 'buyers, IP & exports'},
] as const;

// The finder's five questions (data/decision-tree.json), shortened for screen.
export const FINDER_QUESTIONS = [
  'Student or aspiring founder — not yet registered?',
  'What is your current startup stage?',
  'Which kind of support do you need?',
  'Which sector are you building in?',
  'Do you need lab, IP or market access?',
] as const;
