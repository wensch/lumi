import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { takePendingInvite } from '@/features/circles';
import { takePendingChallengeInvite } from '@/features/challenges';

const DELETED_NOTICE_KEY = 'lumi.accountDeleted';

/** Lê (e apaga) o recado 'conta excluída' deixado por deleteAccount; true uma vez só. */
export async function consumeAccountDeletedNotice(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DELETED_NOTICE_KEY);
    if (value) await AsyncStorage.removeItem(DELETED_NOTICE_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

/**
 * Exclui a conta de quem está logado (função de servidor delete-account) e encerra a sessão neste aparelho.
 * Devolve 'ok' ou 'error' (sem rede, função indisponível...); em 'error' nada foi apagado ou a sessão continua.
 */
export async function deleteAccount(): Promise<'ok' | 'error'> {
  try {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { confirm: true },
    });
    if (error) return 'error';
  } catch {
    return 'error';
  }
  // A conta já não existe no servidor: sai só deste aparelho (o encerramento global falharia).
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  // A tela de entrada mostra uma frase de confirmação na próxima vez que abrir.
  await AsyncStorage.setItem(DELETED_NOTICE_KEY, '1').catch(() => {});
  // Convites ainda não abertos ficariam para a próxima conta deste aparelho.
  await Promise.all([takePendingInvite(), takePendingChallengeInvite()]).catch(() => {});
  return 'ok';
}
