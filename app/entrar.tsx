import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LoadingScreen } from '@/components';
import { normalizeInviteCode, savePendingInvite } from '@/features/circles';

/**
 * Destino do link de convite (lumi://entrar?codigo=XXXX). Guarda o código e leva à aba Círculos,
 * onde o formulário "Entrar com código" já aparece preenchido. Se a pessoa ainda não está logada,
 * o RootNavigation a manda para o login e o código espera guardado.
 */
export default function EntrarScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = normalizeInviteCode(codigo);
      if (code) await savePendingInvite(code);
      if (!cancelled) router.replace('/(tabs)/circulos');
    })();
    return () => {
      cancelled = true;
    };
  }, [codigo]);

  return <LoadingScreen />;
}
