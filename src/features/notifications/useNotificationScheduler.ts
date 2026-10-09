import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { calculateDaysSince } from '@/lib/dates';
import { useTranslation } from '@/i18n';
import {
  cancelDailyReminder,
  hasNotificationPermission,
  scheduleDailyReminder,
} from './scheduleDailyReminder';

/** Evita reagendar em sequência (abrir o app dispara "ativo" mais de uma vez em alguns aparelhos). */
const MIN_SECONDS_BETWEEN_SYNCS = 30;

/**
 * Sincroniza o agendamento de notificações locais com notification_preferences sempre que o app
 * abre ou volta do segundo plano com sessão ativa. Cada sincronização refaz a agenda a partir de
 * agora (ver scheduleDailyReminder), e é isso que faz os recados de "retorno" só chegarem para
 * quem realmente ficou dias sem abrir. Roda no layout raiz — sem UI própria.
 */
export function useNotificationScheduler() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  // O texto das notificações segue o idioma; reagenda quando o usuário troca.
  const { language } = useTranslation();

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let lastSync = 0;

    const sync = async () => {
      if (Date.now() - lastSync < MIN_SECONDS_BETWEEN_SYNCS * 1000) return;
      lastSync = Date.now();

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('reminders_enabled, preferred_time, return_enabled')
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

      // Quem já concluiu hoje não precisa dos lembretes de hoje.
      const { data: streak } = await supabase
        .from('streaks')
        .select('last_completed_date')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      const completedToday = calculateDaysSince(streak?.last_completed_date ?? null) === 0;

      await scheduleDailyReminder(prefs.preferred_time, {
        skipToday: completedToday,
        returnNotes: prefs.return_enabled,
      });
    };

    sync().catch(() => {});
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync().catch(() => {});
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
    // session muda de referência a cada onAuthStateChange (TOKEN_REFRESHED incluso) — usar userId
    // evita reagendar sem necessidade.
  }, [userId, language]);
}
