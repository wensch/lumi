import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import {
  cancelDailyReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
} from './scheduleDailyReminder';

/**
 * Sincroniza o agendamento de notificações locais com
 * notification_preferences sempre que o app abre com sessão ativa.
 * Roda no layout raiz — sem UI própria.
 *
 * Limitação conhecida: os identificadores de notificação são globais por
 * dispositivo (não por usuário). Uma troca de conta muito rápida (logout
 * seguido de login com outra conta antes do primeiro efeito terminar)
 * pode, em tese, deixar o lembrete agendado com o horário do usuário
 * anterior até o próximo reload do app. Não mitigado aqui por ser um
 * cenário raro (exige duas contas no mesmo dispositivo) — revisitar se
 * o produto passar a suportar múltiplos perfis por device.
 */
export function useNotificationScheduler() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('reminders_enabled, preferred_time')
        .eq('user_id', session.user.id)
        .single();

      if (cancelled || !prefs) return;

      if (!prefs.reminders_enabled || !prefs.preferred_time) {
        await cancelDailyReminder();
        return;
      }

      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;

      await scheduleDailyReminder(prefs.preferred_time);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);
}
