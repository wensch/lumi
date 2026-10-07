import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, DEFAULT_PALETTE, type Palette, type PaletteName } from './palettes';
import { spacing, radius } from './spacing';

const STORAGE_KEY = 'lumi.palette';

const FONT_WEIGHT_MAP = {
  bricolage: {
    medium: 'BricolageGrotesque_500Medium',
    bold: 'BricolageGrotesque_700Bold',
    extraBold: 'BricolageGrotesque_800ExtraBold',
  },
  nunito: {
    medium: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
  },
  baloo: {
    medium: 'Baloo2_600SemiBold',
    bold: 'Baloo2_700Bold',
    extraBold: 'Baloo2_800ExtraBold',
  },
} as const;

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  display: 40,
} as const;

/** Sombra dura (offset, sem blur) — assinatura visual do redesign "Recorte". */
function hardShadow(offset: number, color: string) {
  return {
    shadowColor: color,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: offset,
  };
}

function buildTheme(palette: Palette) {
  const weights = FONT_WEIGHT_MAP[palette.fontFamily];

  const typography = {
    display: {
      fontFamily: weights.extraBold,
      fontSize: fontSize.display,
      lineHeight: 44,
      color: palette.ink,
    },
    title: {
      fontFamily: weights.extraBold,
      fontSize: fontSize.xxl,
      lineHeight: 38,
      color: palette.ink,
    },
    heading: {
      fontFamily: weights.extraBold,
      fontSize: fontSize.xl,
      lineHeight: 30,
      color: palette.ink,
    },
    subheading: {
      fontFamily: weights.bold,
      fontSize: fontSize.lg,
      lineHeight: 26,
      color: palette.ink,
    },
    body: { fontFamily: weights.medium, fontSize: fontSize.md, lineHeight: 24, color: palette.ink },
    bodyStrong: {
      fontFamily: weights.bold,
      fontSize: fontSize.md,
      lineHeight: 24,
      color: palette.ink,
    },
    caption: {
      fontFamily: weights.medium,
      fontSize: fontSize.sm,
      lineHeight: 19,
      color: palette.ink,
    },
    label: { fontFamily: weights.bold, fontSize: fontSize.sm, lineHeight: 19, color: palette.ink },
    button: {
      fontFamily: weights.extraBold,
      fontSize: fontSize.md,
      lineHeight: 22,
      color: palette.ink,
    },
  } as const;

  return {
    palette,
    colors: palette,
    typography,
    spacing,
    radius,
    /** Sombra dura padrão de card (offset 4-5px conforme o protótipo). */
    shadow: {
      card: hardShadow(5, palette.shadow),
      button: hardShadow(4, palette.shadow),
      buttonPressed: hardShadow(1, palette.shadow),
      chip: hardShadow(3, palette.shadow),
    },
  };
}

export type Theme = ReturnType<typeof buildTheme>;

type ThemeContextValue = Theme & {
  setPaletteName: (name: PaletteName) => void;
  availablePalettes: Palette[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletteName, setPaletteNameState] = useState<PaletteName>(DEFAULT_PALETTE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored in palettes) {
        setPaletteNameState(stored as PaletteName);
      }
    });
  }, []);

  const setPaletteName = useCallback((name: PaletteName) => {
    setPaletteNameState(name);
    AsyncStorage.setItem(STORAGE_KEY, name);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = buildTheme(palettes[paletteName]);
    return {
      ...theme,
      setPaletteName,
      availablePalettes: Object.values(palettes),
    };
  }, [paletteName, setPaletteName]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
