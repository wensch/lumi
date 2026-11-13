import { Linking } from 'react-native';
import type { LanguageCode } from '@/i18n';

/** Páginas da política de privacidade (site/privacidade e site/privacy, publicadas em gh-pages). */
const PRIVACY_URLS: Record<LanguageCode, string> = {
  pt: 'https://wensch.github.io/lumi/privacidade/',
  en: 'https://wensch.github.io/lumi/privacy/',
};

export function privacyPolicyUrl(language: LanguageCode): string {
  return PRIVACY_URLS[language] ?? PRIVACY_URLS.pt;
}

/** Abre a política no navegador; devolve false se o aparelho não conseguiu abrir o link. */
export async function openPrivacyPolicy(language: LanguageCode): Promise<boolean> {
  try {
    await Linking.openURL(privacyPolicyUrl(language));
    return true;
  } catch {
    return false;
  }
}
