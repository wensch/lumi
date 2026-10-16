import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { registerPushToken, syncPushLanguage } from './pushToken';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mantém o push dos círculos em dia: registra o aparelho (se a pessoa quer os avisos e a permissão
 * já foi dada), guarda o idioma e abre o círculo quando ela toca no aviso. Roda no layout raiz.
 */
/**
 * `navigationReady`: o navegador já está na tela (o app só monta as rotas depois de ler a sessão e o perfil).
 * Um toque numa notificação com o app fechado só pode navegar a partir daí; antes seria descartado.
 */
export function usePushSetup(navigationReady: boolean) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { language } = useTranslation();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const sync = async () => {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('circles_enabled')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      await syncPushLanguage(userId);
      if (prefs?.circles_enabled !== false) await registerPushToken(userId);
    };

    sync().catch(() => {});
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync().catch(() => {});
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId, language]);

  // Toque num aviso (app aberto, em segundo plano ou fechado) leva ao círculo.
  const lastResponse = Notifications.useLastNotificationResponse();
  const responseId = lastResponse?.notification.request.identifier ?? null;
  const circleId = lastResponse?.notification.request.content.data?.circleId;
  // Cada toque abre o círculo uma vez só: sair e entrar de novo na conta não repete a navegação.
  const handledResponse = useRef<string | null>(null);
  useEffect(() => {
    if (!navigationReady || !userId || !responseId || handledResponse.current === responseId)
      return;
    // O id vem do payload da notificação e vai para a rota: só aceita um UUID.
    if (typeof circleId !== 'string' || !UUID_PATTERN.test(circleId)) return;
    handledResponse.current = responseId;
    router.push(`/circulo/${circleId}`);
  }, [navigationReady, userId, responseId, circleId]);
}
