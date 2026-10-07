/**
 * Espelha supabase/seed-achievements.sql — catálogo fixo do MVP (briefing
 * §6: "primeiro momento, 7 dias, 30 dias"). Evita uma query extra só para
 * traduzir o code retornado por complete_devotional_session em texto. O
 * título vem de i18n (achievements.<code>); aqui fica só o ícone.
 */
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_moment: '🌱',
  streak_7_days: '🔥',
  streak_30_days: '🏆',
};

export function isKnownAchievement(code: string): boolean {
  return code in ACHIEVEMENT_ICONS;
}
