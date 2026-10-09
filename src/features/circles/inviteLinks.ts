import { Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Página que recebe o link de convite (site/entrar, publicada em gh-pages). Ela abre o app com
 * lumi://entrar?codigo=XXXX, ou leva ao download se o app não estiver instalado.
 */
export const INVITE_PAGE = 'https://wensch.github.io/lumi/entrar/';

const PENDING_INVITE_KEY = 'lumi.pendingInvite';
const INVITE_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export function buildInviteLink(code: string): string {
  return `${INVITE_PAGE}?c=${encodeURIComponent(code)}`;
}

/** Código válido em maiúsculas, ou null (qualquer outra coisa vinda de um link é descartada). */
export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

/** Guarda o código de um link até a pessoa estar logada e ver a aba Círculos. */
export async function savePendingInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
  } catch {
    // Sem armazenamento: a pessoa ainda pode digitar o código.
  }
}

export async function takePendingInvite(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (stored) await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    return normalizeInviteCode(stored);
  } catch {
    return null;
  }
}

/** Abre o WhatsApp com a mensagem pronta. Retorna false se não conseguiu abrir. */
export async function shareViaWhatsApp(message: string): Promise<boolean> {
  try {
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    return true;
  } catch {
    return false;
  }
}

/** Abre o Telegram com o link e o texto. Retorna false se não conseguiu abrir. */
export async function shareViaTelegram(link: string, text: string): Promise<boolean> {
  try {
    await Linking.openURL(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
    );
    return true;
  } catch {
    return false;
  }
}

export async function copyInviteLink(link: string): Promise<void> {
  await Clipboard.setStringAsync(link);
}

/** Menu nativo de compartilhamento (SMS, e-mail, outros apps). */
export async function shareViaSystem(message: string): Promise<void> {
  try {
    await Share.share({ message });
  } catch {
    // Usuário fechou o menu ou o aparelho não suporta.
  }
}
