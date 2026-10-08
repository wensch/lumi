import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

export type JournalEntry = {
  id: string;
  completedAt: string;
  title: string | null;
  passageReference: string | null;
  reflection: string | null;
};

const PAGE_SIZE = 60;

/**
 * Momentos concluídos com a reflexão que a pessoa escreveu em cada um (briefing §15.6: dado
 * sensível, só do dono, com direito de apagar). A reflexão é apagada por uma função do banco; o
 * momento continua valendo para a sequência.
 */
export function useJournal() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchEntries = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('devotional_sessions')
      .select('id, completed_at, reflection_text, content:content_id (title, passage_reference)')
      .eq('user_id', id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (fetchError) {
      setError(true);
    } else {
      setError(false);
      setEntries(
        (data ?? []).map((row) => {
          const content = row.content as unknown as {
            title: string;
            passage_reference: string | null;
          } | null;
          return {
            id: row.id,
            completedAt: row.completed_at as string,
            title: content?.title ?? null,
            passageReference: content?.passage_reference ?? null,
            reflection: row.reflection_text?.trim() ? row.reflection_text : null,
          };
        }),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setEntries([]);
      setLoading(false);
      return;
    }
    fetchEntries(userId);
  }, [userId, fetchEntries]);

  const refetch = useCallback(async () => {
    if (userId) await fetchEntries(userId);
  }, [userId, fetchEntries]);

  /** Apaga só o texto da reflexão. Devolve false se o servidor recusar. */
  const clearReflection = useCallback(async (sessionId: string) => {
    const { error: rpcError } = await supabase.rpc('clear_session_reflection', {
      p_session_id: sessionId,
    });
    if (rpcError) return false;
    setEntries((current) =>
      current.map((entry) => (entry.id === sessionId ? { ...entry, reflection: null } : entry)),
    );
    return true;
  }, []);

  return { entries, loading, error, refetch, clearReflection };
}
