import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeInviteCode } from '@/features/circles';

/**
 * Página que recebe o link de convite de um desafio (site/desafio, publicada em gh-pages). Ela abre o
 * app com lumi://desafio-convite?codigo=XXXX, ou leva ao download se o app não estiver instalado.
 */
export const CHALLENGE_INVITE_PAGE = 'https://wensch.github.io/lumi/desafio/';

const PENDING_KEY = 'lumi.pendingChallengeInvite';

export function buildChallengeInviteLink(code: string): string {
  return `${CHALLENGE_INVITE_PAGE}?c=${encodeURIComponent(code)}`;
}

/** Guarda o código de um link até a pessoa estar logada e poder ver o convite. */
export async function savePendingChallengeInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, code);
  } catch {
    // Sem armazenamento: a pessoa ainda pode digitar o código.
  }
}

export async function takePendingChallengeInvite(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_KEY);
    if (stored) await AsyncStorage.removeItem(PENDING_KEY);
    return normalizeInviteCode(stored);
  } catch {
    return null;
  }
}

/**
 * Se um link de convite de desafio ficou guardado (a pessoa abriu o link antes de entrar no app), abre
 * a lista de desafios já com o convite. Use nas telas em que a pessoa cai depois do login.
 */
export function usePendingChallengeInvite() {
  useFocusEffect(
    useCallback(() => {
      takePendingChallengeInvite().then((code) => {
        if (code) router.push({ pathname: '/desafios', params: { convite: code } });
      });
    }, []),
  );
}
