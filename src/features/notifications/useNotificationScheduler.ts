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
