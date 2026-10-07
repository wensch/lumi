/**
 * Redesign "Recorte" — contornos firmes, sombras duras (offset, sem
 * blur), cores pastel. Três paletas trocáveis em runtime (ThemeProvider),
 * cada uma com sua própria fonte de identidade.
 */

export type PaletteName = 'recorte' | 'trilha' | 'aurora' | 'noite';

export type Palette = {
  name: PaletteName;
  label: string;
  ink: string;
  bg: string;
  green: string;
  yellow: string;
  blue: string;
  pink: string;
  muted: string;
  white: string;
  /** Cor das sombras duras (offset). Nas paletas claras é a própria `ink`. */
  shadow: string;
  /** Paleta escura: muda o estilo da barra de status. */
  isDark: boolean;
  fontFamily: 'bricolage' | 'nunito' | 'baloo';
};

export const palettes: Record<PaletteName, Palette> = {
  recorte: {
    name: 'recorte',
    label: 'Recorte',
    ink: '#2A2A2E',
    bg: '#FAF6EC',
    green: '#8FDDA3',
    yellow: '#FFDF8A',
    blue: '#A9BEFF',
    pink: '#FFC1D6',
    muted: '#6B6860',
    white: '#FFFFFF',
    shadow: '#2A2A2E',
    isDark: false,
    fontFamily: 'bricolage',
  },
  trilha: {
    name: 'trilha',
    label: 'Trilha',
    ink: '#264A35',
    bg: '#F6FBF1',
    green: '#93DDA4',
    yellow: '#FFE7A0',
    blue: '#B5CEFF',
    pink: '#FFCDBE',
    muted: '#62806D',
    white: '#FFFFFF',
    shadow: '#264A35',
    isDark: false,
    fontFamily: 'nunito',
  },
  aurora: {
    name: 'aurora',
    label: 'Aurora',
    ink: '#5A3A28',
    bg: '#FFF8EE',
    green: '#FFB59C',
    yellow: '#FFE0A3',
    blue: '#CFCCFF',
    pink: '#F9C5D8',
    muted: '#8F7360',
    white: '#FFFFFF',
    shadow: '#5A3A28',
    isDark: false,
    fontFamily: 'baloo',
  },
  /**
   * Modo escuro. `ink` vira o creme (texto e contornos), `white` vira a
   * superfície dos cards e os "pastéis" viram versões profundas dos mesmos
   * tons — assim todo texto continua em `ink` com contraste alto, sem
   * precisar de uma cor de texto diferente por fundo.
   */
  noite: {
    name: 'noite',
    label: 'Noite',
    ink: '#EDE8DA',
    bg: '#17171C',
    green: '#286C49',
    yellow: '#6A44A8',
    blue: '#3A52A0',
    pink: '#8A3A5C',
    muted: '#A29E92',
    white: '#24242B',
    shadow: '#0A0A0D',
    isDark: true,
    fontFamily: 'bricolage',
  },
};

export const DEFAULT_PALETTE: PaletteName = 'recorte';
