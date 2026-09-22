import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type CompletedSession = {
  id: string;
  completed_at: string;
  content_title: string | null;
};

type ProfileHistory = {
  currentStreak: number;
  longestStreak: number;
  recentSessions: CompletedSession[];
  allAchievements: Achievement[];
  unlockedAchievementIds: Set<string>;
};

const EMPTY_HISTORY: ProfileHistory = {
  currentStreak: 0,
  longestStreak: 0,
  recentSessions: [],
  allAchievements: [],
  unlockedAchievementIds: new Set(),
};

export function useProfileHistory() {
  const { session } = useAuth();
  const [history, setHistory] = useState<ProfileHistory>(EMPTY_HISTORY);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (userId: string) => {
    setLoading(true);

    const [streakResult, sessionsResult, achievementsResult, userAchievementsResult] =
      await Promise.all([
        supabase
          .from('streaks')
          .select('current_streak, longest_streak')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('devotional_sessions')
          .select('id, completed_at, content:content_id (title)')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(10),
        supabase.from('achievements').select('*').order('sort_order'),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
      ]);

    setHistory({
      currentStreak: streakResult.data?.current_streak ?? 0,
      longestStreak: streakResult.data?.longest_streak ?? 0,
      recentSessions: (sessionsResult.data ?? []).map((row) => ({
        id: row.id,
        completed_at: row.completed_at as string,
        content_title: (row.content as unknown as { title: string } | null)?.title ?? null,
      })),
      allAchievements: achievementsResult.data ?? [],
      unlockedAchievementIds: new Set(
        (userAchievementsResult.data ?? []).map((row) => row.achievement_id),
      ),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setHistory(EMPTY_HISTORY);
      setLoading(false);
      return;
    }
    fetchHistory(session.user.id);
  }, [session, fetchHistory]);

  return { ...history, loading };
}
