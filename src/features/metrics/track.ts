import { supabase } from '@/lib/supabase';
import { toLocalDateKey } from '@/lib/dates';

/**
 * Eventos de uso (briefing §16): só o nome e o dia, nunca texto, reflexão ou pedido de oração.
 * A lista é a mesma da função `track_event` no banco; um nome fora dela é recusado pelo servidor.
 */
export type MetricEvent =
  | 'app_open'
  | 'devotional_started'
  | 'devotional_completed'
  | 'plan_started'
  | 'challenge_started'
  | 'circle_joined'
  | 'notification_opened';

// Cada evento vai uma vez por dia e por aparelho: o banco também ignora repetições do mesmo dia.
const sentToday = new Set<string>();

/**
 * Registra o evento sem esperar a resposta e sem nunca afetar a tela: falha de rede só deixa de contar.
 * Quem não tem sessão não envia (o banco ignoraria de qualquer forma).
 */
export function trackEvent(name: MetricEvent): void {
  const key = `${name}:${toLocalDateKey(new Date())}`;
  if (sentToday.has(key)) return;
  sentToday.add(key);
  supabase.rpc('track_event', { p_name: name }).then(
    ({ error }) => {
      // Se falhou, tenta de novo numa próxima vez no mesmo dia.
      if (error) sentToday.delete(key);
    },
    () => sentToday.delete(key),
  );
}
