import { supabase } from '@/lib/supabase';
import type { Challenge, CircleChallengeState } from './types';

/** Códigos de erro das funções do banco (migration 00020); o app os traduz. */
export type ChallengeErrorCode =
  'too_many_active' | 'already_active' | 'not_member' | 'not_found' | 'unknown';

const KNOWN: ChallengeErrorCode[] = [
  'too_many_active',
  'already_active',
  'not_member',
  'not_found',
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
  start: (challengeId: string) =>
    call<null>(() => supabase.rpc('start_challenge', { p_challenge_id: challengeId })),
  abandon: (challengeId: string) =>
    call<null>(() => supabase.rpc('abandon_challenge', { p_challenge_id: challengeId })),
  circleState: (circleId: string) =>
    call<CircleChallengeState>(() =>
      supabase.rpc('circle_challenge_state', { p_circle_id: circleId }),
    ),
  startCircle: (circleId: string, challengeId: string) =>
    call<null>(() =>
      supabase.rpc('start_circle_challenge', {
        p_circle_id: circleId,
        p_challenge_id: challengeId,
      }),
    ),
  stopCircle: (circleId: string) =>
    call<null>(() => supabase.rpc('stop_circle_challenge', { p_circle_id: circleId })),
};
