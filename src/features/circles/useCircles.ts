import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { circlesApi } from './api';
import { useRequestOrder } from '@/lib/useRequestOrder';
import type { CircleSummary } from './types';

/** Meus círculos. Recarrega toda vez que a aba volta ao foco (entrar/sair mudam a lista). */
export function useCircles() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const order = useRequestOrder();

  const load = useCallback(async () => {
    const ticket = order.next();
    const result = await circlesApi.list();
    if (!order.isLatest(ticket)) return;
    if (result.error) {
      setError(true);
    } else {
      setError(false);
      setCircles(result.data);
    }
    setLoading(false);
  }, [order]);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setCircles([]);
      setLoading(false);
      return;
    }
    load();
  }, [userId, load]);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId, load]),
  );

  return { circles, loading, error: error && circles.length === 0, refetch: load };
}
