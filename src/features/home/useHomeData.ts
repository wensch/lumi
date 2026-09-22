import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LumiMood } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

type HomeData = {
  currentStreak: number;
  totalXp: number;
  lumiMood: LumiMood;
};

const DEFAULT_HOME_DATA: HomeData = {
  currentStreak: 0,
  totalXp: 0,
  lumiMood: 'normal',
};

export function useHomeData() {
  const { session } = useAuth();
  const [data, setData] = useState<HomeData>(DEFAULT_HOME_DATA);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = useCallback(async (userId: string) => {
    setLoading(true);

    const [streakResult, xpResult, lumiResult] = await Promise.all([
      supabase.from('streaks').select('current_streak').eq('user_id', userId).single(),
      supabase.from('xp_totals').select('total_xp').eq('user_id', userId).maybeSingle(),
      supabase.from('lumi_state').select('mood').eq('user_id', userId).single(),
    ]);

    setData({
      currentStreak: streakResult.data?.current_streak ?? 0,
      totalXp: xpResult.data?.total_xp ?? 0,
      lumiMood: lumiResult.data?.mood ?? 'normal',
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setData(DEFAULT_HOME_DATA);
      setLoading(false);
      return;
    }
    fetchHomeData(session.user.id);
  }, [session, fetchHomeData]);

  const refetch = useCallback(async () => {
    if (!session) return;
    await fetchHomeData(session.user.id);
  }, [session, fetchHomeData]);

  return { ...data, loading, refetch };
}
