import type { Database } from '@/lib/supabase';

type Content = Database['public']['Tables']['content']['Row'];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diffMs = date.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Rotação determinística por dia do calendário: todos os usuários veem o
 * mesmo devocional no mesmo dia (índice = dia do ano % total publicados),
 * ordenados sempre pela mesma chave (id) para o índice ser estável mesmo
 * se a ordem de busca mudar. Evita repetir sempre "o mais recente" quando
 * o catálogo cresce — feedback real do agente de teste diário
 * (relatórios de 23/09 e 24/09 apontaram repetição de conteúdo).
 */
export function selectDailyContent(allContent: Content[], date: Date = new Date()): Content | null {
  if (allContent.length === 0) return null;

  const sorted = [...allContent].sort((a, b) => a.id.localeCompare(b.id));
  const index = dayOfYear(date) % sorted.length;
  return sorted[index];
}
