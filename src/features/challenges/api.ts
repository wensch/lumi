import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/features/metrics';
import type { Challenge, CircleChallengeState, NewChallenge } from './types';

/** Códigos de erro das funções do banco (migration 00020); o app os traduz. */
export type ChallengeErrorCode =
  | 'too_many_active'
  | 'already_active'
  | 'not_member'
  | 'not_found'
  | 'forbidden'
  | 'invalid_input'
  | 'too_many_created'
  | 'unknown';

const KNOWN: ChallengeErrorCode[] = [
  'too_many_active',
  'already_active',
  'not_member',
  'not_found',
  'forbidden',
  'invalid_input',
  'too_many_created',
];

function errorCode(error: { message?: string } | null | undefined): ChallengeErrorCode {
  const message = error?.message ?? '';
  return KNOWN.find((code) => message.includes(code)) ?? 'unknown';
}

type Result<T> = { data: T; error: null } | { data: null; error: ChallengeErrorCode };

async function call<T>(
  run: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<Result<T>> {
  try {
    const { data, error } = await run();
    if (error) return { data: null, error: errorCode(error) };
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: 'unknown' };
  }
}

export const challengesApi = {
  list: () => call<Challenge[]>(() => supabase.rpc('list_challenges')),
  /** Desafios já concluídos (slug dos exemplos e 'custom'): liberam itens do Lumi. */
  rewards: () => call<string[]>(() => supabase.rpc('my_challenge_rewards')),
  start: async (challengeId: string) => {
    const result = await call<null>(() =>
      supabase.rpc('start_challenge', { p_challenge_id: challengeId }),
    );
    if (result.error === null) trackEvent('challenge_started');
    return result;
  },
  abandon: (challengeId: string) =>
    call<null>(() => supabase.rpc('abandon_challenge', { p_challenge_id: challengeId })),
  circleState: (circleId: string) =>
    call<CircleChallengeState>(() =>
      supabase.rpc('circle_challenge_state', { p_circle_id: circleId }),
    ),
  startCircle: async (circleId: string, challengeId: string) => {
    const result = await call<null>(() =>
      supabase.rpc('start_circle_challenge', {
        p_circle_id: circleId,
        p_challenge_id: challengeId,
      }),
    );
    if (result.error === null) trackEvent('challenge_started');
    return result;
  },
  /** Cria um desafio próprio e já começa (pessoal, ou do círculo quando `circleId` vem). */
  createCustom: (input: NewChallenge, circleId: string | null) =>
    call<string>(() =>
      supabase.rpc('create_custom_challenge', {
        p_scope: circleId ? 'circle' : 'personal',
        p_circle_id: circleId,
        p_title: input.title,
        p_description: input.description,
        p_icon: input.icon,
        p_metric: input.metric,
        p_target: input.target,
        p_window_days: input.windowDays,
      }),
    ),
  archiveCustom: (challengeId: string) =>
    call<null>(() => supabase.rpc('archive_custom_challenge', { p_challenge_id: challengeId })),
  stopCircle: (circleId: string) =>
    call<null>(() => supabase.rpc('stop_circle_challenge', { p_circle_id: circleId })),
};
