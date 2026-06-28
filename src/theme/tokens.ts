// Design tokens for the warm editorial "Flattened Portfolio Analyst" look.
// Mirrors the Claude Design source (FlattenedPortfolio.dc.html).

export const colors = {
  // Surfaces
  pageBg: '#e7e5df',
  surface: '#ffffff',
  surfaceMuted: '#fbfaf7',
  headerBg: '#faf8f4',
  panelBg: '#fbfaf7',
  tailBg: '#f7f4ef',

  // Borders
  border: '#e9e2d6',
  borderSoft: '#f0ece4',
  borderTable: '#e6e6e1',
  borderRow: '#f3f2ee',
  inputBorder: '#ddd6c8',

  // Ink
  ink: '#1d1d18',
  inkStrong: '#22221d',
  inkBody: '#52524a',
  inkMuted: '#7a7a6f',
  inkFaint: '#9a9a8e',
  inkPlaceholder: '#b8b3a6',

  // Accents
  accent: '#b5673c', // terracotta
  accentDeep: '#7a5536',
  accentInk: '#9c6b4f',
  danger: '#a8514a',
  warn: '#c79a4e',
  warnInk: '#8a6a3e',
  neutralDot: '#a59a86',

  // CTA
  ctaDark: '#1d1d18',
} as const;

export const fonts = {
  serif: "'Spectral', Georgia, serif",
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

// Categorical palette for the concentration bar / segments.
export const segmentColors = [
  '#b5673c',
  '#c98a4b',
  '#d8a960',
  '#7d8f6e',
  '#6f8aa3',
  '#8a6b86',
  '#9c6b4f',
  '#d2ccbf',
] as const;

export const GITHUB_URL =
  'https://github.com/louislepper/flattened-portfolio-analyst';

// Diagonal hatch used for the "still resolving" / undisclosed band.
export const resolvingHatch =
  'repeating-linear-gradient(135deg,#e0d8c9,#e0d8c9 6px,#eee7da 6px,#eee7da 12px)';

export const resolvingRowHatch =
  'repeating-linear-gradient(135deg,#fbf7f1,#fbf7f1 11px,#f6f0e6 11px,#f6f0e6 22px)';
