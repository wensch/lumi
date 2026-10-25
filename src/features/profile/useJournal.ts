import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/i18n';
import { loadTranslations, type Translations } from '@/lib/contentTranslations';

export type JournalEntry = {
  id: string;
  completedAt: string;
  title: string | null;
  passageReference: string | null;
  reflection: string | null;
  /** Conteúdo do momento (para trocar o título pela tradução). */
  contentId: string | null;
};

const PAGE_SIZE = 40;

type JournalRow = {
  id: string;
  completed_at: string | null;
  reflection_text: string | null;
  content_id: string | null;
  content: unknown;
};

function toEntry(row: JournalRow): JournalEntry {
  const content = row.content as {
    title: string;
    passage_reference: string | null;
  } | null;
  return {
    id: row.id,
    completedAt: row.completed_at as string,
    title: content?.title ?? null,
    passageReference: content?.passage_reference ?? null,
    reflection: row.reflection_text?.trim() ? row.reflection_text : null,
    contentId: row.content_id,
  };
}

function translateTitles(entries: JournalEntry[], tr: Translations): JournalEntry[] {
  return entries.map((entry) => {
    const translated = entry.contentId ? tr.content.get(entry.contentId) : undefined;
    return translated ? { ...entry, title: translated.title } : entry;
  });
}

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
  // Há mais entradas antigas para buscar (a página veio cheia).
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Pessoa atual e trava síncrona: resposta atrasada de outra conta é descartada, e toque duplo não busca 2x.
  const activeUserId = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  const { language } = useTranslation();

  const fetchEntries = useCallback(
    async (id: string) => {
      setLoading(true);
      const [{ data, error: fetchError }, tr] = await Promise.all([
        supabase
          .from('devotional_sessions')
          .select(
            'id, completed_at, reflection_text, content_id, content:content_id (title, passage_reference)',
          )
          .eq('user_id', id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(PAGE_SIZE),
        loadTranslations(language),
      ]);

      if (activeUserId.current !== id) return;
      if (fetchError) {
        setError(true);
      } else {
        setError(false);
        setEntries(translateTitles((data ?? []).map(toEntry), tr));
        setHasMore((data ?? []).length === PAGE_SIZE);
      }
      setLoading(false);
    },
    [language],
  );

  useEffect(() => {
    activeUserId.current = userId;
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setEntries([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    fetchEntries(userId);
  }, [userId, fetchEntries]);

  const refetch = useCallback(async () => {
    if (userId) await fetchEntries(userId);
  }, [userId, fetchEntries]);

  /** Busca a próxima página de momentos mais antigos. Devolve false se o servidor falhar. */
  const loadMore = useCallback(async () => {
    const id = userId;
    const last = entries[entries.length - 1];
    if (!id || !last || !hasMore || loadingMoreRef.current) return true;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const [{ data, error: moreError }, tr] = await Promise.all([
      supabase
        .from('devotional_sessions')
        .select(
          'id, completed_at, reflection_text, content_id, content:content_id (title, passage_reference)',
        )
        .eq('user_id', id)
        .not('completed_at', 'is', null)
        .lt('completed_at', last.completedAt)
        .order('completed_at', { ascending: false })
        .limit(PAGE_SIZE),
      loadTranslations(language),
    ]);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (activeUserId.current !== id) return true;
    if (moreError) return false;
    const rows = data ?? [];
    setEntries((current) => {
      const known = new Set(current.map((entry) => entry.id));
      return [
        ...current,
        ...translateTitles(rows.map(toEntry), tr).filter((entry) => !known.has(entry.id)),
      ];
    });
    setHasMore(rows.length === PAGE_SIZE);
    return true;
  }, [userId, entries, hasMore, language]);

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

  return { entries, loading, error, hasMore, loadingMore, loadMore, refetch, clearReflection };
}
