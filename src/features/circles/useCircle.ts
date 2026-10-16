import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { circlesApi, type CircleErrorCode } from './api';
import { useRequestOrder } from '@/lib/useRequestOrder';
import type { CircleDetail, PrayerRequest } from './types';

/** Um círculo: membros, apoio do dia e pedidos de oração. */
export function useCircle(circleId: string | undefined) {
  const [detail, setDetail] = useState<CircleDetail | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CircleErrorCode | null>(null);
  const order = useRequestOrder();

  const load = useCallback(async () => {
    if (!circleId) return;
    const ticket = order.next();
    const [detailResult, prayersResult] = await Promise.all([
      circlesApi.detail(circleId),
      circlesApi.prayers(circleId),
    ]);
    if (!order.isLatest(ticket)) return;
    if (detailResult.error) {
      setError(detailResult.error);
    } else {
      setError(null);
      setDetail(detailResult.data);
      if (!prayersResult.error) setPrayers(prayersResult.data);
    }
    setLoading(false);
  }, [circleId, order]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Sem internet ao voltar à tela: mantém o que já estava carregado em vez de trocar por uma tela de erro.
  return { detail, prayers, loading, error: detail ? null : error, refetch: load };
}
