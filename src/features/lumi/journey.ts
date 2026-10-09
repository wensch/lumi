/**
 * Marcos de evolução do Lumi (briefing §8.7). Evolução representa
 * constância, não espiritualidade: o que foi desbloqueado nunca se perde
 * quando a sequência quebra (briefing §4, "retorno fácil").
 */
export const JOURNEY_MILESTONES = [7, 14, 21, 30, 50, 100, 200, 365] as const;

export type JourneyMilestone = (typeof JOURNEY_MILESTONES)[number];

export type Journey = {
  /** Marcos já desbloqueados (pela maior sequência já alcançada). */
  reached: JourneyMilestone[];
  /** Próximo marco ainda não desbloqueado, ou null se todos foram. */
  next: JourneyMilestone | null;
  /** Dias que faltam na sequência atual para chegar em `next` (0 se não houver). */
  daysToNext: number;
  /** Progresso da sequência atual até `next`, de 0 a 1 (1 se não houver próximo). */
  progress: number;
};

export function getJourney(currentStreak: number, longestStreak: number): Journey {
  const best = Math.max(currentStreak, longestStreak);
  const reached = JOURNEY_MILESTONES.filter((days) => best >= days);
  const next = JOURNEY_MILESTONES.find((days) => best < days) ?? null;

  if (next === null) {
    return { reached, next, daysToNext: 0, progress: 1 };
  }

  const current = Math.min(Math.max(currentStreak, 0), next);
  return {
    reached,
    next,
    daysToNext: next - current,
    progress: current / next,
  };
}
