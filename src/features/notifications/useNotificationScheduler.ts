import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { calculateDaysSince } from '@/lib/dates';
import { useTranslation } from '@/i18n';
import {
  cancelDailyReminder,
  cancelTodaysAlternateReminder,
  hasNotificationPermission,
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
  const userId = session?.user.id ?? null;
  // O texto das notificações segue o idioma; reagenda quando o usuário troca.
  const { language } = useTranslation();

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('reminders_enabled, preferred_time')
        .eq('user_id', userId)
        .single();

      if (cancelled || !prefs) return;

      if (!prefs.reminders_enabled || !prefs.preferred_time) {
        await cancelDailyReminder();
        return;
      }

      // Só consulta: pedir permissão a cada abertura incomodaria quem já negou.
      const granted = await hasNotificationPermission();
      if (!granted || cancelled) return;

      await scheduleDailyReminder(prefs.preferred_time);

      // Quem já concluiu hoje não precisa do lembrete alternativo de hoje.
      const { data: streak } = await supabase
        .from('streaks')
        .select('last_completed_date')
        .eq('user_id', userId)
        .maybeSingle();
      if (!cancelled && calculateDaysSince(streak?.last_completed_date ?? null) === 0) {
        await cancelTodaysAlternateReminder();
      }
    })();

    return () => {
      cancelled = true;
    };
    // session muda de referência a cada onAuthStateChange (TOKEN_REFRESHED
    // incluso) — usar userId evita reagendar a notificação sem necessidade.
  }, [userId, language]);
}
