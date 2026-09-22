/**
 * Tipografia Lumi — Nunito, decisão final (briefing §9.4 deixava em aberto
 * entre Nunito/Poppins; confirmado Nunito após o protótipo visual da Fase 0).
 */
export const fontFamily = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  title: { fontFamily: fontFamily.extraBold, fontSize: fontSize.xxl, lineHeight: 40 },
  heading: { fontFamily: fontFamily.bold, fontSize: fontSize.xl, lineHeight: 30 },
  subheading: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, lineHeight: 26 },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: fontSize.md, lineHeight: 22 },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: 18 },
  label: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, lineHeight: 16 },
} as const;
