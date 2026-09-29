import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { scheduleDailyReminder, cancelDailyReminder } from '@/features/notifications';

type Preferences = {
  remindersEnabled: boolean;
  preferredTime: string | null;
};

const DEFAULT_PREFERENCES: Preferences = {
  remindersEnabled: true,
  preferredTime: null,
};

export function useNotificationPreferences() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_preferences')
      .select('reminders_enabled, preferred_time')
      .eq('user_id', userId)
      .single();

    setPreferences({
      remindersEnabled: data?.reminders_enabled ?? true,
      preferredTime: data?.preferred_time ?? null,
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
    async (time: string) => {
      if (!userId) return;

      await supabase
        .from('notification_preferences')
        .update({ preferred_time: time, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      setPreferences((prev) => ({ ...prev, preferredTime: time }));

      if (preferences.remindersEnabled) {
        await scheduleDailyReminder(time);
      }
    },
    [userId, preferences.remindersEnabled],
  );

  const setRemindersEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;

      await supabase
        .from('notification_preferences')
        .update({ reminders_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      setPreferences((prev) => ({ ...prev, remindersEnabled: enabled }));

      if (enabled && preferences.preferredTime) {
        await scheduleDailyReminder(preferences.preferredTime);
      } else {
        await cancelDailyReminder();
      }
    },
    [userId, preferences.preferredTime],
  );

  return { ...preferences, loading, updatePreferredTime, setRemindersEnabled };
}
