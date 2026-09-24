/**
 * `dateString` (streaks.last_completed_date) é calculado no backend a
 * partir do timezone salvo em profiles.timezone (ver
 * complete_devotional_session). Aqui comparamos com a data local do
 * dispositivo sem conversão — assume que o timezone do device é o mesmo
 * salvo no profile. Pode divergir por até 1 dia para quem viaja de fuso
 * com frequência; aceitável para o MVP.
 */
export function calculateDaysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  const last = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - last.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
