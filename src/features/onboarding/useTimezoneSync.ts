import { useEffect } from 'react';
import * as Localization from 'expo-localization';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

/**
 * Envia o fuso do aparelho para profiles.timezone (o servidor usa esse fuso para decidir a
 * virada do dia na sequência/XP). Roda uma vez por abertura do app com sessão. Falhas são
 * ignoradas: se a migration 00013 ainda não foi aplicada, a função não existe e nada muda.
 */
export function useTimezoneSync() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    const timeZone = Localization.getCalendars()[0]?.timeZone;
    if (!timeZone) return;
    supabase.rpc('set_user_timezone', { p_timezone: timeZone }).then(
      () => {},
      () => {},
    );
  }, [userId]);
}
