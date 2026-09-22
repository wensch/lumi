import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LumiMood } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

type HomeData = {
  currentStreak: number;
  totalXp: number;
  lumiMood: LumiMood;
  /** Dias desde a última conclusão, ou null se nunca completou nenhuma. 0 = hoje. */
  daysSinceLastCompleted: number | null;
};

const DEFAULT_HOME_DATA: HomeData = {
  currentStreak: 0,
  totalXp: 0,
  lumiMood: 'normal',
  daysSinceLastCompleted: null,
};

/**
 * `dateString` (streaks.last_completed_date) é calculado no backend a
 * partir do timezone salvo em profiles.timezone (ver
 * complete_devotional_session). Aqui comparamos com a data local do
 * dispositivo sem conversão — assume que o timezone do device é o mesmo
 * salvo no profile. Pode divergir por até 1 dia para quem viaja de fuso
 * com frequência; aceitável para o MVP.
 */
function calculateDaysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  const last = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - last.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function useHomeData() {
  const { session } = useAuth();
  const [data, setData] = useState<HomeData>(DEFAULT_HOME_DATA);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = useCallback(async (userId: string) => {
    setLoading(true);

    const [streakResult, xpResult, lumiResult] = await Promise.all([
      supabase
        .from('streaks')
        .select('current_streak, last_completed_date')
        .eq('user_id', userId)
        .single(),
      supabase.from('xp_totals').select('total_xp').eq('user_id', userId).maybeSingle(),
      supabase.from('lumi_state').select('mood').eq('user_id', userId).single(),
    ]);

    setData({
      currentStreak: streakResult.data?.current_streak ?? 0,
      totalXp: xpResult.data?.total_xp ?? 0,
      lumiMood: lumiResult.data?.mood ?? 'normal',
      daysSinceLastCompleted: calculateDaysSince(streakResult.data?.last_completed_date ?? null),
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
