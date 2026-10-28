import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { challengesApi } from './api';

/**
 * Desafios que a pessoa já concluiu (slug dos exemplos e 'custom'), para liberar os itens do Lumi que
 * eles dão. Recarrega ao voltar para a tela; sem rede, mantém o que já tinha em vez de trancar os itens.
 */
export function useChallengeRewards(): ReadonlySet<string> {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [earned, setEarned] = useState<ReadonlySet<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      challengesApi.rewards().then((result) => {
        if (!cancelled && result.error === null) setEarned(new Set(result.data));
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  return earned;
}
