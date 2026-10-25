import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { plansApi } from './api';
import { useRequestOrder } from '@/lib/useRequestOrder';
import { useTranslation } from '@/i18n';
import { loadTranslations, localizeText, type Translations } from '@/lib/contentTranslations';
import type { ActiveEvent, ActivePlan, PlanDetail, PlanSummary } from './types';

/** Plano com título e descrição no idioma da pessoa (e os dias, pelo conteúdo de cada dia). */
function localizePlan<T extends PlanSummary | PlanDetail>(plan: T, tr: Translations): T {
  const local = localizeText(plan, tr.plans);
  if (!('items' in plan)) return local;
  return {
    ...local,
    items: plan.items.map((item) => {
      const day = tr.content.get(item.content_id);
      return day ? { ...item, title: day.title } : item;
    }),
  } as T;
}

/** Lista de planos com o progresso de cada um; recarrega ao voltar para a tela. */
export function usePlans() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const order = useRequestOrder();
  const { language } = useTranslation();

  const load = useCallback(async () => {
    const ticket = order.next();
    const [result, tr] = await Promise.all([plansApi.list(), loadTranslations(language)]);
    if (!order.isLatest(ticket)) return;
    if (result.error !== null) {
      setError(true);
    } else {
      setError(false);
      setPlans(result.data.map((plan) => localizeText(plan, tr.plans)));
    }
    setLoading(false);
  }, [order, language]);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId, load]),
  );

  return { plans, loading, error: error && plans.length === 0, refetch: load };
}

/** Um plano com os dias; recarrega ao voltar (concluir um dia muda o estado). */
export function usePlan(planId: string | undefined) {
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const order = useRequestOrder();
  const { language } = useTranslation();

  const load = useCallback(async () => {
    if (!planId) return;
    const ticket = order.next();
    const [result, tr] = await Promise.all([plansApi.detail(planId), loadTranslations(language)]);
    if (!order.isLatest(ticket)) return;
    if (result.error !== null) {
      setError(true);
    } else {
      setError(false);
      setPlan(localizePlan(result.data, tr));
    }
    setLoading(false);
  }, [planId, order, language]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { plan, loading, error: error && !plan, refetch: load };
}

/** O plano ativo (para o cartão da tela Hoje). Nulo se não há plano ativo. */
export function useActivePlan() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [active, setActive] = useState<ActivePlan | null>(null);

  const { language } = useTranslation();

  const load = useCallback(async () => {
    const [result, tr] = await Promise.all([plansApi.active(), loadTranslations(language)]);
    // Sem rede: mantém o que já tinha em vez de esconder o cartão.
    if (result.error === null) {
      setActive(result.data ? localizeText(result.data, tr.plans, 'plan_id') : null);
    }
  }, [language]);

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

/**
 * Eventos do calendário cristão em andamento ou chegando (Advento, Natal, Páscoa), com o progresso da
 * pessoa. Sem rede, mantém o que já tinha.
 */
export function useActiveEvents() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [events, setEvents] = useState<ActiveEvent[]>([]);

  const { language } = useTranslation();

  const load = useCallback(async () => {
    const [result, tr] = await Promise.all([plansApi.events(), loadTranslations(language)]);
    if (result.error === null) {
      setEvents(result.data.map((event) => localizeText(event, tr.plans, 'plan_id')));
    }
  }, [language]);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setEvents([]);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId, load]),
  );

  return { events, refetch: load };
}
