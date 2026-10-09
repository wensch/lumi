import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { registerPushToken, syncPushLanguage } from './pushToken';

/**
 * Mantém o push dos círculos em dia: registra o aparelho (se a pessoa quer os avisos e a permissão
 * já foi dada), guarda o idioma e abre o círculo quando ela toca no aviso. Roda no layout raiz.
 */
export function usePushSetup() {
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
  useEffect(() => {
    if (!userId || !responseId || typeof circleId !== 'string' || !circleId) return;
    router.push(`/circulo/${circleId}`);
  }, [userId, responseId, circleId]);
}
