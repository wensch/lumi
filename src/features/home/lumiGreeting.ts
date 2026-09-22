/**
 * Falas do Lumi na tela Hoje, variando pelo estado de streak.
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
export function lumiGreeting(daysSinceLastCompleted: number | null) {
  if (daysSinceLastCompleted === null) {
    return {
      title: 'Oi! Eu sou o Lumi.',
      subtitle: 'Seu primeiro momento está esperando. Bora começar?',
    };
  }

  if (daysSinceLastCompleted === 0) {
    return {
      title: 'Você já veio hoje!',
      subtitle: 'Quer registrar mais alguma coisa ou só voltar amanhã. Sem pressa.',
    };
  }

  if (daysSinceLastCompleted === 1) {
    return {
      title: 'Bora hoje?',
      subtitle: 'Seu momento de hoje ainda não começou. Bora?',
    };
  }

  if (daysSinceLastCompleted >= 7) {
    return {
      title: 'Que bom te ver de novo.',
      subtitle:
        'Jesus ficou 40 dias no deserto. Você está há ' +
        `${daysSinceLastCompleted} dias sem aparecer… não vamos transformar isso em competição.`,
    };
  }

  return {
    title: 'Ih, quebrou a sequência.',
    subtitle: 'Sem estresse — a proposta é constância, não perfeição. Bora recomeçar?',
  };
}
