import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { translate } from '@/i18n';

type PrayerEntry = Database['public']['Tables']['prayer_entries']['Row'];

export function usePrayer() {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveManual = useCallback(
    async (bodyText: string, devotionalSessionId?: string) => {
      const trimmed = bodyText.trim();
      if (!trimmed || !session) return null;

      setSaving(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('prayer_entries')
        .insert({
          user_id: session.user.id,
          source: 'user_written',
          body: trimmed,
          devotional_session_id: devotionalSessionId ?? null,
        })
        .select('*')
        .single();

      setSaving(false);

      if (insertError || !data) {
        setError(translate('errors.prayerSave'));
        return null;
      }

      return data as PrayerEntry;
    },
    [session],
  );

  return { saveManual, saving, error };
}
