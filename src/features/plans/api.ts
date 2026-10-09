import { supabase } from '@/lib/supabase';
import type { ActivePlan, PlanDetail, PlanSummary } from './types';

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
  active: () => call<ActivePlan | null>(() => supabase.rpc('active_reading_plan')),
  start: (planId: string) =>
    call<null>(() => supabase.rpc('start_reading_plan', { p_plan_id: planId })),
  pause: (planId: string) =>
    call<null>(() => supabase.rpc('pause_reading_plan', { p_plan_id: planId })),
};
