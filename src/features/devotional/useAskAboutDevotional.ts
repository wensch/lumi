import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { translate } from '@/i18n';

/**
 * Pergunta sobre o texto bíblico/devocional do dia, respondida por IA
 * ancorada só no conteúdo editorial aprovado daquela sessão (nunca a IA
 * "soltando" um versículo ou doutrina por conta própria — §11.3). Roda
 * inteiramente no backend via Edge Function ask-about-devotional.
 */
export function useAskAboutDevotional(devotionalSessionId: string | null) {
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || !devotionalSessionId) return;

      setAsking(true);
      setError(null);
      setAnswer(null);

      const { data, error: fnError } = await supabase.functions.invoke<{
        answer?: string;
        error?: string;
      }>('ask-about-devotional', {
        body: { question: trimmed, devotional_session_id: devotionalSessionId },
      });

      setAsking(false);

      if (fnError || !data?.answer) {
        setError(data?.error ?? translate('errors.askFailed'));
        return;
      }

      setAnswer(data.answer);
    },
    [devotionalSessionId],
  );

  const reset = useCallback(() => {
    setAnswer(null);
    setError(null);
  }, []);

  return { ask, reset, asking, answer, error };
}
