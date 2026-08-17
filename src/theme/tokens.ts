/**
 * CRTQ — design tokens
 * Ported 1:1 from the design system (`_ds/.../colors_and_type.css`).
 * Vintage travel-sticker aesthetic: warm cream paper, sun-yellow + vermillion
 * inks, thick black printed outlines, hard "stamp" offset shadows.
 */

export const C = {
  // Sun — the sticker's background yellow
  sun50: '#FFF7D6',
  sun100: '#FFEFA8',
  sun200: '#FDE678',
  sun300: '#FBD94A',
  sun400: '#F6C90E', // primary yellow
  sun500: '#E3B200',
  sun600: '#B8900A',
  sun700: '#8A6C0B',
  sun800: '#5A470A',

  // Vermillion — the sticker's printed red-orange ink
  ink50: '#FFE9DC',
  ink100: '#FFC9A8',
  ink200: '#FB9C67',
  ink300: '#F07436',
  ink400: '#D8501A', // primary vermillion
  ink500: '#B53A0F',
  ink600: '#8C2B0A',
  ink700: '#5E1D07',
  ink800: '#3A1104',

  // Paper — cream backgrounds, off-white stock
  paper0: '#FFFDF5',
  paper50: '#FBF5E5', // default page bg
  paper100: '#F4EACC',
  paper200: '#E9DCAA',
  paper300: '#D6C07A',

  // Ink / text neutrals — warm, never pure black
  inkBlack: '#2A1A06', // body text; all borders
  inkDeep: '#1B1004', // headlines
  inkMuted: '#6B5230',
  inkSoft: '#8F7543',

  // Secondary stamp accents
  stampGreen: '#2F6F4E',
  stampBlue: '#1E5A7A',
  stampPink: '#D85C8C',

  // Light foregrounds used on the stamp colors (from the prototype)
  greenFg: '#E9F3EA',
  pinkFg: '#FBE5ED',
  blueFg: '#E2F0F7',
} as const;

/** Maps the prototype's `var(--token)` strings to concrete hex. */
const VARS: Record<string, string> = {
  '--sun-50': C.sun50,
  '--sun-100': C.sun100,
  '--sun-200': C.sun200,
  '--sun-300': C.sun300,
  '--sun-400': C.sun400,
  '--sun-500': C.sun500,
  '--sun-600': C.sun600,
  '--sun-700': C.sun700,
  '--sun-800': C.sun800,
  '--ink-50': C.ink50,
  '--ink-100': C.ink100,
  '--ink-200': C.ink200,
  '--ink-300': C.ink300,
  '--ink-400': C.ink400,
  '--ink-500': C.ink500,
  '--ink-600': C.ink600,
  '--ink-700': C.ink700,
  '--ink-800': C.ink800,
  '--paper-0': C.paper0,
  '--paper-50': C.paper50,
  '--paper-100': C.paper100,
  '--paper-200': C.paper200,
  '--paper-300': C.paper300,
  '--ink-black': C.inkBlack,
  '--ink-deep': C.inkDeep,
  '--ink-muted': C.inkMuted,
  '--ink-soft': C.inkSoft,
  '--stamp-green': C.stampGreen,
  '--stamp-blue': C.stampBlue,
  '--stamp-pink': C.stampPink,
};

/**
 * Resolve a color that may be a raw hex, a `var(--token)` reference (as used
 * verbatim in the ported sample data), or already-resolved. Also handles the
 * light stamp foregrounds (`#E9F3EA` etc.) which pass through untouched.
 */
export function col(value: string | undefined | null): string {
  if (!value) return C.inkBlack;
  const v = value.trim();
  const m = v.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (m) return VARS[m[1]] ?? C.inkBlack;
  return v;
}

/** 4px base spacing scale. */
export const S = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 24,
  s6: 32,
  s7: 48,
  s8: 64,
  s9: 96,
  s10: 128,
} as const;

export const R = {
  none: 0,
  sm: 2,
  md: 6,
  lg: 12,
  xl: 20,
  pill: 999,
  stamp: 9999, // 50% via large radius on square boxes
} as const;

/** Hard "stamp" offset shadow — the signature. Rendered as an offset layer. */
export const STICKER = {
  sm: { dx: 2, dy: 3, color: 'rgba(42,26,6,0.9)' },
  lg: { dx: 4, dy: 6, color: 'rgba(42,26,6,0.85)' },
} as const;

export const MOTION = {
  fast: 120,
  med: 220,
  slow: 420,
} as const;
