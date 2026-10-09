/**
 * Espelha o catálogo de conquistas do banco (supabase/seed-achievements.sql e a migration 00017). Evita uma query extra só para
 * traduzir o code retornado por complete_devotional_session em texto. O
 * título vem de i18n (achievements.<code>); aqui fica só o ícone.
 */
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_moment: '🌱',
  streak_3_days: '✨',
  streak_7_days: '🔥',
  moments_10: '📖',
  streak_14_days: '🌟',
  first_reflection: '✍️',
  streak_30_days: '🏆',
  comeback: '🌈',
  first_circle: '🤝',
  first_cheer: '💛',
  moments_50: '📚',
  streak_50_days: '🏅',
  streak_100_days: '👑',
  moments_100: '🕊️',
};

export function isKnownAchievement(code: string): boolean {
  return code in ACHIEVEMENT_ICONS;
}
