import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { challengesApi } from './api';
import { useRequestOrder } from '@/lib/useRequestOrder';
import { useTranslation } from '@/i18n';
import { loadTranslations, localizeText } from '@/lib/contentTranslations';
import type { Challenge, CircleChallengeState } from './types';

/** Desafios pessoais com o progresso; recarrega ao voltar para a tela. */
export function useChallenges() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const order = useRequestOrder();
  const { language } = useTranslation();

  const load = useCallback(async () => {
    const ticket = order.next();
    const [result, tr] = await Promise.all([challengesApi.list(), loadTranslations(language)]);
    if (!order.isLatest(ticket)) return;
    if (result.error !== null) {
      setError(true);
    } else {
      setError(false);
      setChallenges(result.data.map((challenge) => localizeText(challenge, tr.challenges)));
    }
    setLoading(false);
  }, [order, language]);

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

  const { language } = useTranslation();

  const load = useCallback(async () => {
    if (!circleId) return;
    const [result, tr] = await Promise.all([
      challengesApi.circleState(circleId),
      loadTranslations(language),
    ]);
    // Sem rede: mantém o que já tinha.
    if (result.error === null) {
      const data = result.data;
      setState({
        ...data,
        active: data.active ? localizeText(data.active, tr.challenges, 'challenge_id') : null,
        available: data.available.map((option) => localizeText(option, tr.challenges)),
      });
    }
  }, [circleId, language]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { state, refetch: load };
}
