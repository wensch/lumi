import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { calculateDaysSince } from '@/lib/dates';
import { translate } from '@/i18n';
import { selectDailyContent } from './selectDailyContent';

type Content = Database['public']['Tables']['content']['Row'];
type DevotionalSession = Database['public']['Tables']['devotional_sessions']['Row'];

type DevotionalState = {
  content: Content | null;
  session: DevotionalSession | null;
  /**
   * true se, ao abrir a tela, o usuário já tinha ficado 2+ dias sem
   * completar um devocional — usado para diferenciar "retorno após
   * quebra" de "dia normal" na tela de resultado (feedback do agente de
   * teste diário, relatório de 24/09: comemorar mais o retorno).
   */
  isReturningFromBreak: boolean;
};

const EMPTY_STATE: DevotionalState = { content: null, session: null, isReturningFromBreak: false };

export function useDevotional() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id ?? null;
  const [state, setState] = useState<DevotionalState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    const [{ data: allContent }, { data: streak }] = await Promise.all([
      supabase.from('content').select('*').not('published_at', 'is', null),
      supabase.from('streaks').select('last_completed_date').eq('user_id', userId).single(),
    ]);

    const isReturningFromBreak =
      (calculateDaysSince(streak?.last_completed_date ?? null) ?? 0) >= 2;

    const content = selectDailyContent(allContent ?? []);

    if (!content) {
      setState({ ...EMPTY_STATE, isReturningFromBreak });
      setLoading(false);
      return;
    }

    // Filtra por usuário + data (não por content_id): se o conteúdo do dia
    // mudar entre uma abertura e outra da tela, ainda reaproveita a sessão
    // aberta em vez de criar uma nova e deixar a anterior órfã sem
    // completed_at.
    const today = new Date().toISOString().slice(0, 10);
    const { data: existingSession } = await supabase
      .from('devotional_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', `${today}T00:00:00`)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      setState({ content, session: existingSession, isReturningFromBreak });
      setLoading(false);
      return;
    }

    const { data: newSession, error: insertError } = await supabase
      .from('devotional_sessions')
      .insert({ user_id: userId, content_id: content.id })
      .select('*')
      .single();

    if (insertError || !newSession) {
      setError(translate('errors.devotionalStart'));
      setState({ content, session: null, isReturningFromBreak });
      setLoading(false);
      return;
    }

    setState({ content, session: newSession, isReturningFromBreak });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setState(EMPTY_STATE);
      setLoading(false);
      return;
    }
    start(userId);
    // authSession muda de referência a cada onAuthStateChange (inclui
    // TOKEN_REFRESHED silencioso) — sem usar userId, isso reiniciava o
    // devocional (perdendo reflexão em andamento e podendo criar sessão
    // duplicada) toda vez que o token era renovado em background.
  }, [userId, start]);

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
        setError(translate('errors.devotionalComplete'));
        return null;
      }

      return data[0];
    },
    [state.session],
  );

  return { ...state, loading, completing, error, complete };
}
