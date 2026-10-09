import { supabase } from '@/lib/supabase';
import type { CircleDetail, CircleEventsResult, CircleSummary, PrayerRequest } from './types';

/** Códigos de erro que as funções do banco levantam (migration 00015); o app os traduz. */
export type CircleErrorCode =
  | 'not_authenticated'
  | 'invalid_name'
  | 'invalid_code'
  | 'invalid_body'
  | 'circle_full'
  | 'too_many_circles'
  | 'too_many_attempts'
  | 'rate_limited'
  | 'not_member'
  | 'not_found'
  | 'forbidden'
  | 'unknown';

const KNOWN_CODES: CircleErrorCode[] = [
  'not_authenticated',
  'invalid_name',
  'invalid_code',
  'invalid_body',
  'circle_full',
  'too_many_circles',
  'too_many_attempts',
  'rate_limited',
  'not_member',
  'not_found',
  'forbidden',
];

export function circleErrorCode(error: { message?: string } | null | undefined): CircleErrorCode {
  const message = error?.message ?? '';
  return KNOWN_CODES.find((code) => message.includes(code)) ?? 'unknown';
}

type Result<T> = { data: T; error: null } | { data: null; error: CircleErrorCode };

async function call<T>(
  run: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<Result<T>> {
  try {
    const { data, error } = await run();
    if (error) return { data: null, error: circleErrorCode(error) };
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: 'unknown' };
  }
}

/**
 * Pede à edge function que envie o push dos avisos que acabei de gerar (torcida, oração...).
 * Sem esperar e sem falhar: o aviso já está salvo e aparece dentro do app de qualquer jeito.
 */
function notifyCircleEvents() {
  Promise.resolve(supabase.functions.invoke('notify-circle-events')).catch(() => {});
}

/** Depois de uma ação que gera aviso, dispara o push se ela deu certo. */
async function callAndNotify<T>(
  run: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<Result<T>> {
  const result = await call<T>(run);
  if (!result.error) notifyCircleEvents();
  return result;
}

export const circlesApi = {
  list: () => call<CircleSummary[]>(() => supabase.rpc('my_circles')),
  detail: (circleId: string) =>
    call<CircleDetail>(() => supabase.rpc('circle_detail', { p_circle_id: circleId })),
  create: (name: string) =>
    call<{ id: string; invite_code: string }>(() =>
      supabase.rpc('create_circle', { p_name: name }),
    ),
  /** Devolve o id do círculo, ou nulo quando o código não existe. */
  join: (code: string) => call<string | null>(() => supabase.rpc('join_circle', { p_code: code })),
  leave: (circleId: string) =>
    call<null>(() => supabase.rpc('leave_circle', { p_circle_id: circleId })),
  removeMember: (circleId: string, userId: string) =>
    call<null>(() =>
      supabase.rpc('remove_circle_member', { p_circle_id: circleId, p_user_id: userId }),
    ),
  cheer: (circleId: string, toUser: string) =>
    callAndNotify<null>(() =>
      supabase.rpc('cheer_circle_member', { p_circle_id: circleId, p_to_user: toUser }),
    ),
  prayers: (circleId: string) =>
    call<PrayerRequest[]>(() => supabase.rpc('list_prayer_requests', { p_circle_id: circleId })),
  createPrayer: (circleId: string, body: string) =>
    callAndNotify<string>(() =>
      supabase.rpc('create_prayer_request', { p_circle_id: circleId, p_body: body }),
    ),
  pray: (requestId: string) =>
    callAndNotify<null>(() => supabase.rpc('pray_for_request', { p_request_id: requestId })),
  resolvePrayer: (requestId: string) =>
    callAndNotify<null>(() => supabase.rpc('resolve_prayer_request', { p_request_id: requestId })),
  deletePrayer: (requestId: string) =>
    call<null>(() => supabase.rpc('delete_prayer_request', { p_request_id: requestId })),
  events: (limit = 30) =>
    call<CircleEventsResult>(() => supabase.rpc('my_circle_events', { p_limit: limit })),
  markEventsRead: () => call<null>(() => supabase.rpc('mark_circle_events_read')),
  report: (circleId: string, requestId: string | null, userId: string | null, reason: string) =>
    call<null>(() =>
      supabase.rpc('report_circle_content', {
        p_circle_id: circleId,
        p_request_id: requestId,
        p_reported_user_id: userId,
        p_reason: reason,
      }),
    ),
};
