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
  /** Só quem começou o desafio ou o criador do círculo pode pará-lo. */
  can_stop: boolean;
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
  // Em dias de calendário (local): termina hoje = 0, amanhã = 1.
  const end = new Date(endsAt);
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((endDay - today) / (24 * 60 * 60 * 1000)));
}
