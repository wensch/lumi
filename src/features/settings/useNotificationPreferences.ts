import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateDaysSince } from '@/lib/dates';
import { useAuth } from '@/features/auth';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  registerPushToken,
} from '@/features/notifications';

type Preferences = {
  remindersEnabled: boolean;
  preferredTime: string | null;
  returnEnabled: boolean;
  circlesEnabled: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  remindersEnabled: true,
  preferredTime: null,
  returnEnabled: true,
  circlesEnabled: true,
};

/** Grava um campo das preferências; false se o servidor recusou (sem rede, sessão inválida). */
async function savePreference(userId: string, patch: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from('notification_preferences')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  return !error;
}

/** Já concluiu o momento de hoje? Quem concluiu não recebe os lembretes de hoje (igual ao agendador do app). */
async function hasCompletedToday(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('streaks')
    .select('last_completed_date')
    .eq('user_id', userId)
    .maybeSingle();
  return calculateDaysSince(data?.last_completed_date ?? null) === 0;
}

export function useNotificationPreferences() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  // Não conseguiu ler do servidor: o que aparece na tela é o padrão, não o que a pessoa escolheu.
  const [loadFailed, setLoadFailed] = useState(false);

  const fetchPreferences = useCallback(async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('reminders_enabled, preferred_time, return_enabled, circles_enabled')
      .eq('user_id', userId)
      .single();

    if (error) {
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    setLoadFailed(false);
    setPreferences({
      remindersEnabled: data?.reminders_enabled ?? true,
      preferredTime: data?.preferred_time ?? null,
      returnEnabled: data?.return_enabled ?? true,
      circlesEnabled: data?.circles_enabled ?? true,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      return;
    }
    fetchPreferences(userId);
  }, [userId, fetchPreferences]);

  const updatePreferredTime = useCallback(
    async (time: string): Promise<boolean> => {
      if (!userId) return false;
      // Só muda a tela e o agendamento se o servidor guardou: senão a próxima abertura reverteria tudo.
      if (!(await savePreference(userId, { preferred_time: time }))) return false;

      setPreferences((prev) => ({ ...prev, preferredTime: time }));

      if (preferences.remindersEnabled) {
        await scheduleDailyReminder(time, {
          returnNotes: preferences.returnEnabled,
          skipToday: await hasCompletedToday(userId),
        });
      }
      return true;
    },
    [userId, preferences.remindersEnabled, preferences.returnEnabled],
  );

  const setRemindersEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!userId) return false;
      if (!(await savePreference(userId, { reminders_enabled: enabled }))) return false;

      setPreferences((prev) => ({ ...prev, remindersEnabled: enabled }));

      if (enabled && preferences.preferredTime) {
        await scheduleDailyReminder(preferences.preferredTime, {
          returnNotes: preferences.returnEnabled,
          skipToday: await hasCompletedToday(userId),
        });
      } else {
        await cancelDailyReminder();
      }
      return true;
    },
    [userId, preferences.preferredTime, preferences.returnEnabled],
  );

  const setReturnEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!userId) return false;
      if (!(await savePreference(userId, { return_enabled: enabled }))) return false;

      setPreferences((prev) => ({ ...prev, returnEnabled: enabled }));

      if (preferences.remindersEnabled && preferences.preferredTime) {
        await scheduleDailyReminder(preferences.preferredTime, {
          returnNotes: enabled,
          skipToday: await hasCompletedToday(userId),
        });
      }
      return true;
    },
    [userId, preferences.remindersEnabled, preferences.preferredTime],
  );

  const setCirclesEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!userId) return false;
      if (!(await savePreference(userId, { circles_enabled: enabled }))) return false;

      setPreferences((prev) => ({ ...prev, circlesEnabled: enabled }));
      if (enabled) await registerPushToken(userId);
      return true;
    },
    [userId],
  );

  const refetch = useCallback(async () => {
    if (userId) await fetchPreferences(userId);
  }, [userId, fetchPreferences]);

  return {
    ...preferences,
    loading,
    loadFailed,
    refetch,
    updatePreferredTime,
    setRemindersEnabled,
    setReturnEnabled,
    setCirclesEnabled,
  };
}
