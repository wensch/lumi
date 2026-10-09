/**
 * `dateString` (streaks.last_completed_date) é calculado no backend a
 * partir do timezone salvo em profiles.timezone (ver
 * complete_devotional_session). Aqui comparamos com a data local do
 * dispositivo sem conversão — assume que o timezone do device é o mesmo
 * salvo no profile. Pode divergir por até 1 dia para quem viaja de fuso
 * com frequência; aceitável para o MVP.
 */
/**
 * streaks.current_streak só é recalculado quando o usuário conclui um novo
 * momento, então fica com o valor antigo depois que a sequência quebra. A
 * sequência exibida é a "viva": vale se o último momento foi hoje ou ontem
 * (ainda dá para continuar hoje); com uma Folga guardada, também vale se faltou
 * exatamente um dia (a Folga cobre ao voltar); passado disso, é 0.
 */
export function activeStreak(
  storedStreak: number,
  daysSinceLastCompleted: number | null,
  freezes = 0,
): number {
  if (daysSinceLastCompleted === null) return 0;
  if (daysSinceLastCompleted <= 1) return storedStreak;
  if (daysSinceLastCompleted === 2 && freezes > 0) return storedStreak;
  return 0;
}

export function calculateDaysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  const last = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - last.getTime();
  // Nunca negativo: a data do servidor pode estar "à frente" do relógio do aparelho.
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/** Chave de data (AAAA-MM-DD) no fuso LOCAL do aparelho — toISOString() usaria UTC e viraria o dia às 21h no Brasil. */
export function toLocalDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Meia-noite local de hoje (ou da data dada), como Date. */
export function startOfLocalDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}
