export type PlanStatus = 'none' | 'active' | 'paused' | 'done';

export type PlanSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string | null;
  days: number;
  status: PlanStatus;
  last_day_done: number;
};

export type PlanDayState = 'done' | 'next' | 'locked';

export type PlanDay = {
  day: number;
  title: string;
  passage_reference: string | null;
  state: PlanDayState;
};

export type PlanDetail = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  days: number;
  status: PlanStatus;
  last_day_done: number;
  /** Já concluiu um dia deste plano hoje (um dia do plano por dia do calendário). */
  done_today: boolean;
  items: PlanDay[];
};

/** O plano ativo e o devocional do próximo dia. */
export type ActivePlan = {
  plan_id: string;
  title: string;
  icon: string | null;
  days: number;
  last_day_done: number;
  next_day: number;
  content_id: string;
  done_today: boolean;
};
