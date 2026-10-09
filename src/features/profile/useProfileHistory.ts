import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { activeStreak, calculateDaysSince } from '@/lib/dates';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type CompletedSession = {
  id: string;
  completed_at: string;
  content_title: string | null;
  has_reflection: boolean;
};

type ProfileHistory = {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  recentSessions: CompletedSession[];
  allAchievements: Achievement[];
  unlockedAchievementIds: Set<string>;
};

const EMPTY_HISTORY: ProfileHistory = {
  currentStreak: 0,
  longestStreak: 0,
  totalXp: 0,
  recentSessions: [],
  allAchievements: [],
  unlockedAchievementIds: new Set(),
};

export function useProfileHistory() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [history, setHistory] = useState<ProfileHistory>(EMPTY_HISTORY);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (userId: string) => {
    setLoading(true);

    const [streakResult, xpResult, sessionsResult, achievementsResult, userAchievementsResult] =
      await Promise.all([
        supabase
          .from('streaks')
          .select('current_streak, longest_streak, last_completed_date, freezes')
          .eq('user_id', userId)
          .single(),
        supabase.from('xp_totals').select('total_xp').eq('user_id', userId).maybeSingle(),
        supabase
          .from('devotional_sessions')
          .select('id, completed_at, reflection_text, content:content_id (title)')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(10),
        supabase.from('achievements').select('*').order('sort_order'),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
      ]);

    setHistory({
      currentStreak: activeStreak(
        streakResult.data?.current_streak ?? 0,
        calculateDaysSince(streakResult.data?.last_completed_date ?? null),
        streakResult.data?.freezes ?? 0,
      ),
      longestStreak: streakResult.data?.longest_streak ?? 0,
      totalXp: xpResult.data?.total_xp ?? 0,
      recentSessions: (sessionsResult.data ?? []).map((row) => ({
        id: row.id,
        completed_at: row.completed_at as string,
        content_title: (row.content as unknown as { title: string } | null)?.title ?? null,
        has_reflection: !!row.reflection_text?.trim(),
      })),
      allAchievements: achievementsResult.data ?? [],
      unlockedAchievementIds: new Set(
        (userAchievementsResult.data ?? []).map((row) => row.achievement_id),
      ),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setHistory(EMPTY_HISTORY);
      setLoading(false);
      return;
    }
    fetchHistory(userId);
    // session muda de referência a cada onAuthStateChange (TOKEN_REFRESHED
    // incluso) — usar userId em vez de session evita refetch espúrio.
  }, [userId, fetchHistory]);

  return { ...history, loading };
}
