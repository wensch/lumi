import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/features/metrics';
import type { ActiveEvent, ActivePlan, NewPlan, PlanDetail, PlanSummary } from './types';

async function call<T>(
  run: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const { data, error } = await run();
    if (error) return { data: null, error: error.message ?? 'unknown' };
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: 'unknown' };
  }
}

export const plansApi = {
  list: () => call<PlanSummary[]>(() => supabase.rpc('list_reading_plans')),
  detail: (planId: string) =>
    call<PlanDetail>(() => supabase.rpc('reading_plan_detail', { p_plan_id: planId })),
  events: () => call<ActiveEvent[]>(() => supabase.rpc('active_events')),
  active: () => call<ActivePlan | null>(() => supabase.rpc('active_reading_plan')),
  start: async (planId: string) => {
    const result = await call<null>(() =>
      supabase.rpc('start_reading_plan', { p_plan_id: planId }),
    );
    if (result.error === null) trackEvent('plan_started');
    return result;
  },
  /** Cria um plano próprio e já começa. Devolve o id do plano. */
  createCustom: (plan: NewPlan) =>
    call<string>(() =>
      supabase.rpc('create_custom_plan', {
        p_title: plan.title,
        p_description: plan.description,
        p_icon: plan.icon,
        p_external_url: plan.externalUrl,
        p_days: plan.days,
        p_start: true,
      }),
    ),
  archiveCustom: (planId: string) =>
    call<null>(() => supabase.rpc('archive_custom_plan', { p_plan_id: planId })),
  pause: (planId: string) =>
    call<null>(() => supabase.rpc('pause_reading_plan', { p_plan_id: planId })),
};
