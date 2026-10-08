import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { circlesApi, type CircleErrorCode } from './api';
import type { CircleDetail, PrayerRequest } from './types';

/** Um círculo: membros, apoio do dia e pedidos de oração. */
export function useCircle(circleId: string | undefined) {
  const [detail, setDetail] = useState<CircleDetail | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CircleErrorCode | null>(null);

  const load = useCallback(async () => {
    if (!circleId) return;
    const [detailResult, prayersResult] = await Promise.all([
      circlesApi.detail(circleId),
      circlesApi.prayers(circleId),
    ]);
    if (detailResult.error) {
      setError(detailResult.error);
    } else {
      setError(null);
      setDetail(detailResult.data);
      if (!prayersResult.error) setPrayers(prayersResult.data);
    }
    setLoading(false);
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { detail, prayers, loading, error, refetch: load };
}
