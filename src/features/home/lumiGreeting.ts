import type { LumiMoodVariant } from '@/features/lumi';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

/**
 * Falas do Lumi na tela Hoje, variando pelo estado de streak. O texto vive
 * em i18n (home.greeting.*); aqui só se decide qual fala e qual humor.
 * Revisado contra o checklist da skill lumi-brand-guardrails:
 *   - Sem culpa/vergonha; sempre com rota de retorno.
 *   - Provoca o comportamento, nunca a identidade/espiritualidade.
 *   - Ausência longa usa a referência do briefing §8.4 (Jesus no deserto),
 *     sem transformar isso em comparação ou cobrança.
 *
 * Nota: streaks.current_streak só é recalculado quando o usuário conclui
 * um novo momento — por isso o estado "quebrou" é decidido só por
 * daysSinceLastCompleted (dias desde a última conclusão), não por
 * currentStreak, que fica com o valor antigo até a próxima conclusão.
 */
export function lumiGreeting(daysSinceLastCompleted: number | null, t: Translate) {
  const mood: LumiMoodVariant = (() => {
    if (daysSinceLastCompleted === null || daysSinceLastCompleted === 1) return 'waiting';
    if (daysSinceLastCompleted === 0) return 'happy';
    return 'missing_you';
  })();

  if (daysSinceLastCompleted === null) {
    return {
      mood,
      title: t('home.greeting.firstTitle'),
      subtitle: t('home.greeting.firstSubtitle'),
    };
  }

  if (daysSinceLastCompleted === 0) {
    return {
      mood,
      title: t('home.greeting.todayTitle'),
      subtitle: t('home.greeting.todaySubtitle'),
    };
  }

  if (daysSinceLastCompleted === 1) {
    return {
      mood,
      title: t('home.greeting.yesterdayTitle'),
      subtitle: t('home.greeting.yesterdaySubtitle'),
    };
  }

  if (daysSinceLastCompleted >= 7) {
    return {
      mood,
      title: t('home.greeting.longAbsenceTitle'),
      subtitle: t('home.greeting.longAbsenceSubtitle', { days: daysSinceLastCompleted }),
    };
  }

  return {
    mood,
    title: t('home.greeting.brokenTitle'),
    subtitle: t('home.greeting.brokenSubtitle'),
  };
}
