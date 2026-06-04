/**
 * Mirrorbite v0 — Design tokens
 *
 * Mirrors HTML prototype tokens at:
 *   generated/research/mirrorbite/day2-buildup/prototype/index.html
 *
 * Single source: keep CSS vars and these tokens in lockstep.
 */

export const colors = {
  // Brand
  teal700: '#1C6A5E',
  teal600: '#2A9A8A',
  teal500: '#3DB8A8',
  teal400: '#6FD0C2',
  teal200: '#BFE8E0',
  teal100: '#E0F4F0',
  teal50:  '#F2FAF9',

  // Status
  amber700: '#8C5800',
  amber600: '#C98318',
  amber500: '#F0A830',
  amber200: '#F8D78C',
  amber100: '#FFF1D6',
  amber50:  '#FFF8E8',
  red600:   '#C75A55',
  red500:   '#E07670',
  red100:   '#FFE3E0',
  green500: '#4CAF50',

  // Neutrals (light)
  ink900: '#0D0D0F',
  ink800: '#1C1C1E',
  ink700: '#3C3C3E',
  ink600: '#4A4D54',
  ink500: '#6B6F76',
  ink400: '#8E92A0',
  ink300: '#B5B7BD',
  ink200: '#D2D4D8',
  ink100: '#EBEBEB',
  ink50:  '#F4F5F7',
  canvas: '#FFFFFF',
  page:   '#F4F5F7',
} as const;

export const radii = {
  '2xl': 28,
  xl: 20,
  lg: 16,
  md: 12,
  sm: 8,
  pill: 999,
} as const;

export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 28,
  s8: 32,
  s10: 40,
  s12: 48,
  s16: 64,
} as const;

export const typography = {
  // SF Pro (system default on iOS), Inter fallback
  display: undefined as undefined, // use system
  text: undefined as undefined,    // use system

  titleXL:   { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, lineHeight: 32 } as const,
  titleLg:   { fontSize: 22, fontWeight: '600', letterSpacing: -0.45, lineHeight: 26 } as const,
  titleMd:   { fontSize: 18, fontWeight: '500', letterSpacing: -0.25, lineHeight: 22 } as const,
  body:      { fontSize: 16, fontWeight: '400', letterSpacing: -0.2, lineHeight: 22 } as const,
  bodyMed:   { fontSize: 15, fontWeight: '500', letterSpacing: -0.2, lineHeight: 20 } as const,
  sub:       { fontSize: 15, fontWeight: '400', letterSpacing: -0.2, lineHeight: 20, color: colors.ink500 } as const,
  caption:   { fontSize: 14, fontWeight: '400', letterSpacing: -0.15, lineHeight: 19 } as const,
  small:     { fontSize: 12, fontWeight: '400', letterSpacing: -0.05, lineHeight: 16 } as const,
  eyebrow:   { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' as const } as const,
} as const;

export const shadows = {
  none: { shadowOpacity: 0, elevation: 0 },
  card: {
    shadowColor: '#0D0D0F',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardElevated: {
    shadowColor: '#0D0D0F',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ctaGlow: {
    shadowColor: '#3DB8A8',
    shadowOpacity: 0.42,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Reveal axis color helpers — used in components/AxesBars */
export const axisStatusColor = {
  good:    colors.teal600,
  caution: colors.amber600,
  low:     colors.red600,
} as const;

export const axisBarColor = {
  good:    [colors.teal400, colors.teal500] as const,
  caution: [colors.amber500, colors.amber600] as const,
  low:     [colors.red500, colors.red600] as const,
};

export type Axis = 'protein' | 'carb_balance' | 'fiber' | 'fat';
export type AxisLevel = 'good' | 'caution' | 'low';
