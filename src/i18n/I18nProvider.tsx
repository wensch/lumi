import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import { pt } from './locales/pt';
import { en } from './locales/en';
import type { TranslateOptions, Scope } from 'i18n-js';

export type LanguageCode = 'pt' | 'en';

const STORAGE_KEY = 'lumi.language';
const DEFAULT_LANGUAGE: LanguageCode = 'pt';

const i18n = new I18n({ pt, en });
i18n.enableFallback = true;
i18n.defaultLocale = DEFAULT_LANGUAGE;

function detectDeviceLanguage(): LanguageCode {
  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  return deviceLocale === 'en' ? 'en' : 'pt';
}

/** Traduz fora de componentes/hooks reativos (ex.: mensagens de erro em callbacks). */
export function translate(scope: Scope, options?: TranslateOptions): string {
  return i18n.t(scope, options) as string;
}

/** Idioma ativo, para código fora de componentes (ex.: texto das notificações locais). */
export function getCurrentLanguage(): LanguageCode {
  return i18n.locale === 'en' ? 'en' : 'pt';
}

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (scope: Scope, options?: TranslateOptions) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const initial = stored === 'pt' || stored === 'en' ? stored : detectDeviceLanguage();
      i18n.locale = initial;
      setLanguageState(initial);
    });
  }, []);

  const setLanguage = useCallback((newLanguage: LanguageCode) => {
    i18n.locale = newLanguage;
    setLanguageState(newLanguage);
    AsyncStorage.setItem(STORAGE_KEY, newLanguage);
  }, []);

  const t = useCallback(
    (scope: Scope, options?: TranslateOptions) => i18n.t(scope, options) as string,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- precisa recalcular quando o locale muda, mesmo sem "language" ser lido diretamente no corpo
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation deve ser usado dentro de um I18nProvider');
  }
  return context;
}
