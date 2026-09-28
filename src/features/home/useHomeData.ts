import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LumiMood } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { calculateDaysSince } from '@/lib/dates';

/** Um dia da faixa da semana exibida na tela Hoje — domingo a sábado, hoje incluso. */
export type WeekDay = {
  date: string;
  /** Domingo=0 ... Sábado=6 */
  weekday: number;
  completed: boolean;
  isToday: boolean;
};

type HomeData = {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  lumiMood: LumiMood;
  /** Dias desde a última conclusão, ou null se nunca completou nenhuma. 0 = hoje. */
  daysSinceLastCompleted: number | null;
  /** Últimos 7 dias (domingo a sábado da semana atual) com marcação de conclusão. */
  week: WeekDay[];
};

function buildEmptyWeek(): WeekDay[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      date: date.toISOString().slice(0, 10),
      weekday: i,
      completed: false,
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

const DEFAULT_HOME_DATA: HomeData = {
  currentStreak: 0,
  longestStreak: 0,
  totalXp: 0,
  lumiMood: 'normal',
  daysSinceLastCompleted: null,
  week: buildEmptyWeek(),
};

export function useHomeData() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<HomeData>(DEFAULT_HOME_DATA);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = useCallback(async (userId: string) => {
    setLoading(true);

    const emptyWeek = buildEmptyWeek();
    const weekStart = emptyWeek[0].date;

    const [streakResult, xpResult, lumiResult, weekSessionsResult] = await Promise.all([
      supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_completed_date')
        .eq('user_id', userId)
        .single(),
      supabase.from('xp_totals').select('total_xp').eq('user_id', userId).maybeSingle(),
      supabase.from('lumi_state').select('mood').eq('user_id', userId).single(),
      supabase
        .from('devotional_sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .gte('completed_at', `${weekStart}T00:00:00`),
    ]);

    const completedDates = new Set(
      (weekSessionsResult.data ?? []).map((row) => (row.completed_at as string).slice(0, 10)),
    );
    const week = emptyWeek.map((day) => ({ ...day, completed: completedDates.has(day.date) }));

    setData({
      currentStreak: streakResult.data?.current_streak ?? 0,
      longestStreak: streakResult.data?.longest_streak ?? 0,
      totalXp: xpResult.data?.total_xp ?? 0,
      lumiMood: lumiResult.data?.mood ?? 'normal',
      daysSinceLastCompleted: calculateDaysSince(streakResult.data?.last_completed_date ?? null),
      week,
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
