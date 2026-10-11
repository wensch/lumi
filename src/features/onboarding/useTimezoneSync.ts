import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Localization from 'expo-localization';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

/**
 * Envia o fuso do aparelho para profiles.timezone (o servidor usa esse fuso para decidir a
 * virada do dia na sequência/XP). Roda ao abrir o app com sessão e, se a pessoa viajou com o app em
 * segundo plano, ao voltar a ele com o fuso diferente. Falhas são ignoradas.
 */
export function useTimezoneSync() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      lastSent.current = null;
      return;
    }

    const send = () => {
      const timeZone = Localization.getCalendars()[0]?.timeZone;
      if (!timeZone || timeZone === lastSent.current) return;
      lastSent.current = timeZone;
      supabase.rpc('set_user_timezone', { p_timezone: timeZone }).then(
        ({ error }) => {
          // Não gravou: tenta de novo na próxima vez.
          if (error) lastSent.current = null;
        },
        () => {
          lastSent.current = null;
        },
      );
    };

    send();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') send();
    });
    return () => subscription.remove();
  }, [userId]);
}
