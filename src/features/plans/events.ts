/** Dias inteiros (de calendário, no fuso do aparelho) até uma data 'AAAA-MM-DD'; 0 = hoje, nunca negativo. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const [year, month, day] = date.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((target - today) / (24 * 60 * 60 * 1000)));
}
