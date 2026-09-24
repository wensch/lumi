import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

type PrayerEntry = Database['public']['Tables']['prayer_entries']['Row'];

export function usePrayer() {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
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
        setError(insertError?.message ?? 'Não foi possível salvar sua oração.');
        return null;
      }

      return data as PrayerEntry;
    },
    [session],
  );

  const generateWithAI = useCallback(
    async (personalText: string, devotionalSessionId?: string) => {
      const trimmed = personalText.trim();
      if (!trimmed) return null;

      setGenerating(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke<{
        prayer?: PrayerEntry;
        error?: string;
      }>('generate-prayer', {
        body: {
          personal_text: trimmed,
          devotional_session_id: devotionalSessionId,
        },
      });

      setGenerating(false);

      if (fnError || !data?.prayer) {
        setError(data?.error ?? 'Não foi possível gerar a oração agora.');
        return null;
      }

      return data.prayer;
    },
    [],
  );

  return { saveManual, generateWithAI, saving, generating, error };
}
