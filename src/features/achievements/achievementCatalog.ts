/**
 * Espelha supabase/seed-achievements.sql — catálogo fixo do MVP (briefing
 * §6: "primeiro momento, 7 dias, 30 dias"). Evita uma query extra só para
 * traduzir o code retornado por complete_devotional_session em texto.
 */
export const ACHIEVEMENT_LABELS: Record<string, { title: string; icon: string }> = {
  first_moment: { title: 'Primeiro momento', icon: '🌱' },
  streak_7_days: { title: '7 dias seguidos', icon: '🔥' },
  streak_30_days: { title: '30 dias seguidos', icon: '🏆' },
};
