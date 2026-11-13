import { supabase } from '@/lib/supabase';
import { takePendingInvite } from '@/features/circles';
import { takePendingChallengeInvite } from '@/features/challenges';

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
  // Convites ainda não abertos ficariam para a próxima conta deste aparelho.
  await Promise.all([takePendingInvite(), takePendingChallengeInvite()]).catch(() => {});
  return 'ok';
}
