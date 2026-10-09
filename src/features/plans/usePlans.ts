import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { plansApi } from './api';
import type { ActivePlan, PlanDetail, PlanSummary } from './types';

/** Lista de planos com o progresso de cada um; recarrega ao voltar para a tela. */
export function usePlans() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const result = await plansApi.list();
    if (result.error !== null) {
      setError(true);
    } else {
      setError(false);
      setPlans(result.data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId, load]),
  );

  return { plans, loading, error, refetch: load };
}

/** Um plano com os dias; recarrega ao voltar (concluir um dia muda o estado). */
export function usePlan(planId: string | undefined) {
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!planId) return;
    const result = await plansApi.detail(planId);
    if (result.error !== null) {
      setError(true);
    } else {
      setError(false);
      setPlan(result.data);
    }
    setLoading(false);
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { plan, loading, error, refetch: load };
}

/** O plano ativo (para o cartão da tela Hoje). Nulo se não há plano ativo. */
export function useActivePlan() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [active, setActive] = useState<ActivePlan | null>(null);

  const load = useCallback(async () => {
    const result = await plansApi.active();
    // Sem rede: mantém o que já tinha em vez de esconder o cartão.
    if (result.error === null) setActive(result.data);
  }, []);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setActive(null);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId, load]),
  );

  return { active, refetch: load };
}
