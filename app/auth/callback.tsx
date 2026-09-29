import { Text } from 'react-native';
import { Screen } from '@/components';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

/**
 * Alvo do deep link de confirmação/magic link do Supabase
 * (lumi://auth/callback ou, na web, /auth/callback). O processamento real
 * do token acontece em useAuthDeepLink (chamado dentro de AuthProvider) —
 * esta tela só precisa existir como rota válida enquanto isso, já que
 * RootNavigation redireciona assim que a sessão é detectada.
 */
export default function AuthCallbackScreen() {
  const { typography } = useTheme();
  const { t } = useTranslation();
  return (
    <Screen scroll={false} centered>
      <Text style={typography.body}>{t('common.signingIn')}</Text>
    </Screen>
  );
}
