import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { challengesApi } from './api';
import { useRequestOrder } from '@/lib/useRequestOrder';
import type { Challenge, CircleChallengeState } from './types';

/** Desafios pessoais com o progresso; recarrega ao voltar para a tela. */
export function useChallenges() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const order = useRequestOrder();

  const load = useCallback(async () => {
    const ticket = order.next();
    const result = await challengesApi.list();
    if (!order.isLatest(ticket)) return;
    if (result.error !== null) {
      setError(true);
    } else {
      setError(false);
      setChallenges(result.data);
    }
    setLoading(false);
  }, [order]);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId, load]),
  );

  return { challenges, loading, error: error && challenges.length === 0, refetch: load };
}

/** O desafio coletivo de um círculo (meta somada, sem nomes). */
export function useCircleChallenge(circleId: string | undefined) {
  const [state, setState] = useState<CircleChallengeState | null>(null);

  const load = useCallback(async () => {
    if (!circleId) return;
    const result = await challengesApi.circleState(circleId);
    // Sem rede: mantém o que já tinha.
    if (result.error === null) setState(result.data);
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { state, refetch: load };
}
