/**
 * Redesign "Recorte" — contornos firmes, sombras duras (offset, sem
 * blur), cores pastel. Três paletas trocáveis em runtime (ThemeProvider),
 * cada uma com sua própria fonte de identidade.
 */

export type PaletteName = 'recorte' | 'trilha' | 'aurora';

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
    fontFamily: 'baloo',
  },
};

export const DEFAULT_PALETTE: PaletteName = 'recorte';
