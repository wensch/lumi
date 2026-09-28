import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LumiMood } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { calculateDaysSince } from '@/lib/dates';

type HomeData = {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  lumiMood: LumiMood;
  /** Dias desde a última conclusão, ou null se nunca completou nenhuma. 0 = hoje. */
  daysSinceLastCompleted: number | null;
};

const DEFAULT_HOME_DATA: HomeData = {
  currentStreak: 0,
  longestStreak: 0,
  totalXp: 0,
  lumiMood: 'normal',
  daysSinceLastCompleted: null,
};

export function useHomeData() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<HomeData>(DEFAULT_HOME_DATA);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = useCallback(async (userId: string) => {
    setLoading(true);

    const [streakResult, xpResult, lumiResult] = await Promise.all([
      supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_completed_date')
        .eq('user_id', userId)
        .single(),
      supabase.from('xp_totals').select('total_xp').eq('user_id', userId).maybeSingle(),
      supabase.from('lumi_state').select('mood').eq('user_id', userId).single(),
    ]);

    setData({
      currentStreak: streakResult.data?.current_streak ?? 0,
      longestStreak: streakResult.data?.longest_streak ?? 0,
      totalXp: xpResult.data?.total_xp ?? 0,
      lumiMood: lumiResult.data?.mood ?? 'normal',
      daysSinceLastCompleted: calculateDaysSince(streakResult.data?.last_completed_date ?? null),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setData(DEFAULT_HOME_DATA);
      setLoading(false);
      return;
    }
    fetchHomeData(userId);
    // session muda de referência a cada onAuthStateChange (TOKEN_REFRESHED
    // incluso) — usar userId em vez de session evita refetch/loading:true
    // espúrio nesses casos.
  }, [userId, fetchHomeData]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    await fetchHomeData(userId);
  }, [userId, fetchHomeData]);

  return { ...data, loading, refetch };
}
