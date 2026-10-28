import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LoadingScreen } from '@/components';
import { normalizeInviteCode } from '@/features/circles';
import { savePendingChallengeInvite } from '@/features/challenges';

/**
 * Destino do link de convite de um desafio (lumi://desafio-convite?codigo=XXXX). Guarda o código e leva à
 * aba Jornada, que abre a lista de desafios já com o convite. Se a pessoa ainda não está logada, o
 * RootNavigation a manda para o login e o código espera guardado.
 */
export default function DesafioConviteScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = normalizeInviteCode(codigo);
      if (code) await savePendingChallengeInvite(code);
      if (!cancelled) router.replace('/(tabs)/jornada');
    })();
    return () => {
      cancelled = true;
    };
  }, [codigo]);

  return <LoadingScreen />;
}
