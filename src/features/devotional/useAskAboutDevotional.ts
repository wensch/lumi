import { useCallback, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getCurrentLanguage, translate } from '@/i18n';

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
        code?: string;
      }>('ask-about-devotional', {
        body: {
          question: trimmed,
          devotional_session_id: devotionalSessionId,
          language: getCurrentLanguage(),
        },
      });

      setAsking(false);

      if (fnError || !data?.answer) {
        // Em respostas não-2xx o invoke devolve só o erro; a mensagem do backend
        // (ex.: "muitos pedidos agora") vem no corpo da resposta.
        let body: { error?: string; code?: string } | undefined = data ?? undefined;
        if (!body && fnError instanceof FunctionsHttpError) {
          body = await fnError.context.json().catch(() => undefined);
        }
        // Os códigos têm texto traduzido no app; a mensagem crua do servidor é só português.
        const byCode: Record<string, string> = {
          daily_limit: translate('errors.askDailyLimit'),
          busy: translate('errors.askBusy'),
        };
        setError((body?.code && byCode[body.code]) || translate('errors.askFailed'));
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
