import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen } from '@/components';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

/** Tempo até assumir que o link não vai gerar sessão (expirado, já usado, aberto sem token). */
const GIVE_UP_AFTER_MS = 8000;

/**
 * Alvo do deep link de confirmação/magic link do Supabase
 * (lumi://auth/callback ou, na web, /auth/callback). O processamento real
 * do token acontece em useAuthDeepLink (chamado dentro de AuthProvider) —
 * esta tela só precisa existir como rota válida enquanto isso, já que
 * RootNavigation redireciona assim que a sessão é detectada. Se isso não
 * acontecer a tempo, oferece voltar ao login em vez de ficar em "Entrando…".
 */
export default function AuthCallbackScreen() {
  const { typography } = useTheme();
  const { t } = useTranslation();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), GIVE_UP_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen scroll={false} centered>
      <Text style={[typography.body, { textAlign: 'center' }]}>
        {gaveUp ? t('auth.callbackFailed') : t('common.signingIn')}
      </Text>
      {gaveUp ? (
        <Button label={t('auth.backToLogin')} onPress={() => router.replace('/(auth)')} />
      ) : null}
    </Screen>
  );
}
