import { useEffect } from 'react';
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
import { LoadingScreen } from '@/components';
import { AuthProvider, useAuth } from '@/features/auth';
import { useProfile } from '@/features/onboarding';
import { configureNotificationHandler, useNotificationScheduler } from '@/features/notifications';
import { ThemeProvider } from '@/theme';
import { I18nProvider } from '@/i18n';

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
  const [fontsLoaded] = useFonts({
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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nProvider>
        <ThemeProvider>
          <YouVersionProvider appKey={youVersionAppKey} theme="system" auth={youVersionAuthConfig}>
            <YouVersionDataProvider appKey={youVersionAppKey ?? ''}>
              <AuthProvider>
                <StatusBar style="dark" />
                <RootNavigation />
              </AuthProvider>
            </YouVersionDataProvider>
          </YouVersionProvider>
        </ThemeProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
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

  if (inAuthGroup) {
    return '/(tabs)';
  }

  if (!onboardingCompleted) {
    return inOnboardingGroup ? null : '/(onboarding)';
  }

  if (inOnboardingGroup || inAuthCallback || inNovaSenha) {
    return '/(tabs)';
  }

  return null;
}

function RootNavigation() {
  const { session, loading: authLoading, isPasswordRecovery } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const segments = useSegments();

  useNotificationScheduler();

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

  return <Slot />;
}
