import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

export function useNotificationPreferences() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_preferences')
      .select('reminders_enabled, preferred_time, return_enabled, circles_enabled')
      .eq('user_id', userId)
      .single();

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
    async (time: string) => {
      if (!userId) return;

      await supabase
        .from('notification_preferences')
        .update({ preferred_time: time, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      setPreferences((prev) => ({ ...prev, preferredTime: time }));

      if (preferences.remindersEnabled) {
        await scheduleDailyReminder(time, { returnNotes: preferences.returnEnabled });
      }
    },
    [userId, preferences.remindersEnabled, preferences.returnEnabled],
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
        await scheduleDailyReminder(preferences.preferredTime, {
          returnNotes: preferences.returnEnabled,
        });
      } else {
        await cancelDailyReminder();
      }
    },
    [userId, preferences.preferredTime, preferences.returnEnabled],
  );

  const setReturnEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;

      await supabase
        .from('notification_preferences')
        .update({ return_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      setPreferences((prev) => ({ ...prev, returnEnabled: enabled }));

      if (preferences.remindersEnabled && preferences.preferredTime) {
        await scheduleDailyReminder(preferences.preferredTime, { returnNotes: enabled });
      }
    },
    [userId, preferences.remindersEnabled, preferences.preferredTime],
  );

  const setCirclesEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;

      await supabase
        .from('notification_preferences')
        .update({ circles_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      setPreferences((prev) => ({ ...prev, circlesEnabled: enabled }));
      if (enabled) await registerPushToken(userId);
    },
    [userId],
  );

  return {
    ...preferences,
    loading,
    updatePreferredTime,
    setRemindersEnabled,
    setReturnEnabled,
    setCirclesEnabled,
  };
}
