import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, Slot, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { YouVersionProvider } from '@youversion/platform-react-native-expo-ui';
import { YouVersionProvider as YouVersionDataProvider } from '@youversion/platform-react-hooks';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { Button, LoadingScreen, Screen } from '@/components';
import { AuthProvider, useAuth } from '@/features/auth';
import { ProfileProvider, useProfile, useTimezoneSync } from '@/features/onboarding';
import { configureNotificationHandler, useNotificationScheduler } from '@/features/notifications';
import { ThemeProvider, useTheme } from '@/theme';
import { I18nProvider, useTranslation } from '@/i18n';

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

const youVersionAppKey = process.env.EXPO_PUBLIC_YOUVERSION_APP_KEY;

// Redirect URI precisa estar registrado no console da YouVersion Platform
// (platform.youversion.com) para o fluxo de login (useYVAuth) funcionar.
const youVersionAuthConfig = {
  redirectUri: 'lumi://callback',
  scopes: ['profile', 'email'] as const,
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  // Se uma fonte falhar, o app abre mesmo assim (fonte do sistema) em vez de ficar na splash.
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nProvider>
        <ThemeProvider>
          <YouVersionProvider appKey={youVersionAppKey} theme="system" auth={youVersionAuthConfig}>
            <YouVersionDataProvider appKey={youVersionAppKey ?? ''}>
              <AuthProvider>
                <ProfileProvider>
                  <ThemedStatusBar />
                  <RootNavigation />
                </ProfileProvider>
              </AuthProvider>
            </YouVersionDataProvider>
          </YouVersionProvider>
        </ThemeProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}

/** Ícones da barra de status claros no tema escuro, escuros nos temas claros. */
function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.palette.isDark ? 'light' : 'dark'} />;
}

/**
 * Calcula a rota alvo (ou null se a rota atual já está correta) a partir
 * do estado de auth/onboarding. Mantido como função pura fora do
 * componente para o useEffect abaixo poder decidir "não faço nada" sem
 * precisar comparar segments/JSX — evita re-disparar router.replace para
 * a mesma rota em cada render, que foi a causa raiz de um "Maximum update
 * depth exceeded" visto tanto na web quanto no Android.
 */
function resolveTargetRoute({
  session,
  isPasswordRecovery,
  onboardingCompleted,
  segments,
}: {
  session: unknown;
  isPasswordRecovery: boolean;
  onboardingCompleted: boolean;
  segments: string[];
}): string | null {
  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';
  // Rota real (não grupo) /auth/callback: alvo do deep link de confirmação/
  // magic link/recuperação de senha do Supabase.
  const inAuthCallback = segments[0] === 'auth';
  const inNovaSenha = segments[0] === 'nova-senha';

  if (session && isPasswordRecovery) {
    return inNovaSenha ? null : '/nova-senha';
  }

  if (!session) {
    return inAuthGroup || inAuthCallback ? null : '/(auth)';
  }

  // Logado: o onboarding vem antes de qualquer outra tela (inclusive depois do login),
  // para não encadear dois redirecionamentos seguidos (/(tabs) e depois /(onboarding)).
  if (!onboardingCompleted) {
    return inOnboardingGroup ? null : '/(onboarding)';
  }

  if (inAuthGroup || inOnboardingGroup || inAuthCallback || inNovaSenha) {
    return '/(tabs)';
  }

  return null;
}

function RootNavigation() {
  const { session, loading: authLoading, isPasswordRecovery } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refetch } = useProfile();
  const segments = useSegments();

  useNotificationScheduler();
  useTimezoneSync();

  const ready = !authLoading && !(session && profileLoading);

  useEffect(() => {
    if (!ready) return;

    const target = resolveTargetRoute({
      session,
      isPasswordRecovery,
      onboardingCompleted: !!profile?.onboarding_completed_at,
      segments,
    });

    if (target) {
      router.replace(target);
    }
    // segments é um array novo a cada render; usamos seu conteúdo via join
    // para não disparar o efeito por causa só da referência ter mudado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session, isPasswordRecovery, profile?.onboarding_completed_at, segments.join('/')]);

  if (!ready) {
    return <LoadingScreen />;
  }

  // Sem conseguir ler o perfil (ex.: offline), não dá para saber se o onboarding já foi
  // feito — melhor pedir para tentar de novo do que mandar o usuário refazê-lo.
  if (session && !profile && profileError) {
    return <ProfileLoadError onRetry={refetch} />;
  }

  return <Slot />;
}

function ProfileLoadError({ onRetry }: { onRetry: () => Promise<void> }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  return (
    <Screen centered>
      <Text style={styles.errorTitle}>{t('errors.profileLoad')}</Text>
      <Button
        label={retrying ? t('common.loading') : t('common.retry')}
        disabled={retrying}
        onPress={async () => {
          setRetrying(true);
          await onRetry();
          setRetrying(false);
        }}
      />
      <Button label={t('common.signOut')} variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    textAlign: 'center',
  },
});
