import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

/**
 * Códigos das conquistas que a pessoa já ganhou (ex.: 'event_advento'). Serve para liberar itens do
 * Lumi que vêm de conquistas (os de evento). Recarrega ao voltar para a tela; sem rede, mantém o que
 * já tinha em vez de trancar os itens.
 */
export function useAchievementCodes(): ReadonlySet<string> {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [codes, setCodes] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async (id: string) => {
    const [all, mine] = await Promise.all([
      supabase.from('achievements').select('id, code'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', id),
    ]);
    if (all.error || mine.error) return;
    const unlocked = new Set((mine.data ?? []).map((row) => row.achievement_id));
    setCodes(
      new Set((all.data ?? []).filter((row) => unlocked.has(row.id)).map((row) => row.code)),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) void load(userId);
    }, [userId, load]),
  );

  return codes;
}
