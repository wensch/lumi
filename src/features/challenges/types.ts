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
  /** Criado pela própria pessoa (e não um dos exemplos). */
  custom?: boolean;
  /** Criado por outra pessoa e aceito por convite. */
  invited?: boolean;
  /** Quantas pessoas fazem este desafio junto (contando você); 0 ou 1 = só você. */
  group_size?: number;
};

/** O que se vê de um convite antes de aceitar. */
export type ChallengeInvitePreview = {
  challenge_id: string;
  title: string;
  description: string;
  icon: string | null;
  target: number;
  window_days: number;
  inviter_name: string;
  /** Quantas pessoas já estão no grupo (contando quem convidou). */
  people: number;
  joined: boolean;
  already_active: boolean;
};

/** Uma pessoa do grupo do desafio: só nome e andamento. */
export type ChallengeGroupMember = {
  name: string;
  is_me: boolean;
  status: 'active' | 'completed' | 'expired' | 'abandoned' | 'none';
  progress: number;
  target: number;
};

/** O que um desafio próprio mede (as mesmas medidas automáticas dos exemplos). */
export type ChallengeMetric = 'moments_days' | 'reflections' | 'cheers' | 'prayers';

export const CHALLENGE_METRICS: ChallengeMetric[] = [
  'moments_days',
  'reflections',
  'prayers',
  'cheers',
];

export const CHALLENGE_WINDOWS = [3, 7, 14, 30] as const;
export const CHALLENGE_ICONS = ['🎯', '📖', '🙏', '✍️', '💛', '🌱', '🔥', '⭐'] as const;
export const CHALLENGE_TITLE_MAX_LENGTH = 40;

export type NewChallenge = {
  title: string;
  /** Frase curta do que é preciso fazer (ex.: "Escrever 3 reflexões em até 7 dias."). */
  description: string;
  icon: string;
  metric: ChallengeMetric;
  /** Meta por pessoa. */
  target: number;
  windowDays: number;
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
  custom?: boolean;
  can_archive?: boolean;
};

export type CircleChallengeState = {
  active: CircleChallengeActive | null;
  last_status: 'completed' | 'expired' | null;
  completed_count: number;
  /** Pessoas no círculo (a meta do círculo é a meta por pessoa vezes isto). */
  members?: number;
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
