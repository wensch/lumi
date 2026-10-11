export type ChallengeState = 'available' | 'active';

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string | null;
  target: number;
  window_days: number;
  state: ChallengeState;
  progress: number;
  ends_at: string | null;
  /** Como terminou a última vez (para "Concluído 🎉" ou "tente de novo"). */
  last_status: 'completed' | 'expired' | null;
  completed_count: number;
};

export type CircleChallengeActive = {
  id: string;
  challenge_id: string;
  title: string;
  description: string;
  icon: string | null;
  /** Meta TOTAL do círculo (soma de todas as pessoas); nunca por pessoa. */
  target: number;
  progress: number;
  ends_at: string;
};

export type CircleChallengeOption = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  window_days: number;
  target: number;
};

export type CircleChallengeState = {
  active: CircleChallengeActive | null;
  last_status: 'completed' | 'expired' | null;
  completed_count: number;
  available: CircleChallengeOption[];
};

/** Dias que faltam até `endsAt` (0 = termina hoje, nunca negativo). */
export function daysLeft(endsAt: string | null, now: Date = new Date()): number {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}
