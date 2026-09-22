import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

type Content = Database['public']['Tables']['content']['Row'];
type DevotionalSession = Database['public']['Tables']['devotional_sessions']['Row'];

type DevotionalState = {
  content: Content | null;
  session: DevotionalSession | null;
};

const EMPTY_STATE: DevotionalState = { content: null, session: null };

export function useDevotional() {
  const { session: authSession } = useAuth();
  const [state, setState] = useState<DevotionalState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    const { data: content } = await supabase
      .from('content')
      .select('*')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!content) {
      setState(EMPTY_STATE);
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: existingSession } = await supabase
      .from('devotional_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', content.id)
      .gte('started_at', `${today}T00:00:00`)
      .is('completed_at', null)
      .maybeSingle();

    if (existingSession) {
      setState({ content, session: existingSession });
      setLoading(false);
      return;
    }

    const { data: newSession, error: insertError } = await supabase
      .from('devotional_sessions')
      .insert({ user_id: userId, content_id: content.id })
      .select('*')
      .single();

    if (insertError || !newSession) {
      setError(insertError?.message ?? 'Não foi possível iniciar o momento devocional.');
      setState({ content, session: null });
      setLoading(false);
      return;
    }

    setState({ content, session: newSession });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setState(EMPTY_STATE);
      setLoading(false);
      return;
    }
    start(authSession.user.id);
  }, [authSession, start]);

  const complete = useCallback(
    async (reflectionText?: string) => {
      if (!state.session) return null;

      setCompleting(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('complete_devotional_session', {
        p_session_id: state.session.id,
        p_reflection_text: reflectionText ?? null,
      });

      setCompleting(false);

      if (rpcError || !data?.[0]) {
        setError(rpcError?.message ?? 'Não foi possível concluir o momento.');
        return null;
      }

      return data[0];
    },
    [state.session],
  );

  return { ...state, loading, completing, error, complete };
}
