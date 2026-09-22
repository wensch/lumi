/**
 * Paleta Lumi v0.1 (hipótese) — docs/lumi-briefing.md §9.3
 * Fonte de verdade: skill lumi-design-tokens. Revisar após protótipo visual.
 */
export const colors = {
  greenPrimary: '#4CAF72',
  greenDark: '#245C42',
  cream: '#FAF9F4',
  yellow: '#FFC857',
  blue: '#5B8DEF',
  ink: '#202124',
  white: '#FFFFFF',
} as const;

export const semanticColors = {
  background: colors.cream,
  surface: colors.white,
  textPrimary: colors.ink,
  textInverse: colors.white,
  textAccent: colors.greenDark,
  cta: colors.greenPrimary,
  info: colors.blue,
  celebration: colors.yellow,
} as const;

export type ColorToken = keyof typeof colors;
