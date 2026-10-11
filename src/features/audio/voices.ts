import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { VoiceQuality, type Voice } from 'expo-speech';
import type { LanguageCode } from '@/i18n';

/** Idiomas das vozes por idioma do app. A região exata vem primeiro; as demais variantes são aceitas. */
const VOICE_LANGUAGE: Record<LanguageCode, { exact: string; prefix: string }> = {
  pt: { exact: 'pt-BR', prefix: 'pt' },
  en: { exact: 'en-US', prefix: 'en' },
};

const STORAGE_PREFIX = 'lumi.voice.';

/** Vozes "de rede" do Google (identificador com "network") são as neurais: bem mais naturais. */
export function isNetworkVoice(voice: Voice): boolean {
  return /network/i.test(voice.identifier);
}

function normalizeLanguage(language: string): string {
  return language.replace('_', '-').toLowerCase();
}

/** Quanto maior, melhor: qualidade avançada e vozes neurais primeiro; a região certa à frente. */
function score(voice: Voice, language: LanguageCode): number {
  const { exact } = VOICE_LANGUAGE[language];
  let value = 0;
  if (normalizeLanguage(voice.language) === normalizeLanguage(exact)) value += 100;
  if (voice.quality === VoiceQuality.Enhanced) value += 20;
  if (isNetworkVoice(voice)) value += 10;
  return value;
}

/** Vozes instaladas no aparelho para o idioma, da mais natural para a menos. */
export async function listVoices(language: LanguageCode): Promise<Voice[]> {
  const { prefix } = VOICE_LANGUAGE[language];
  const all = await Speech.getAvailableVoicesAsync().catch(() => [] as Voice[]);
  return all
    .filter((voice) => normalizeLanguage(voice.language).startsWith(prefix))
    .sort((a, b) => score(b, language) - score(a, language) || a.name.localeCompare(b.name));
}

export async function getSavedVoice(language: LanguageCode): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_PREFIX + language);
  } catch {
    return null;
  }
}

/** `null` volta ao automático (a melhor voz instalada). */
export async function saveVoice(language: LanguageCode, identifier: string | null): Promise<void> {
  try {
    if (identifier) await AsyncStorage.setItem(STORAGE_PREFIX + language, identifier);
    else await AsyncStorage.removeItem(STORAGE_PREFIX + language);
  } catch {
    // Sem armazenamento: a escolha vale só até fechar o app.
  }
}

/**
 * A voz usada na leitura: a escolhida pela pessoa (se ainda estiver instalada) ou a melhor disponível.
 * Devolve `undefined` quando o aparelho não lista vozes: aí vale a voz padrão do sistema.
 */
export async function resolveVoice(language: LanguageCode): Promise<string | undefined> {
  const [voices, saved] = await Promise.all([listVoices(language), getSavedVoice(language)]);
  if (saved && voices.some((voice) => voice.identifier === saved)) return saved;
  return voices[0]?.identifier;
}
