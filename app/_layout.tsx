import { useEffect } from 'react';
import { Redirect, Slot, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { YouVersionProvider } from '@youversion/platform-react-native-expo-ui';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { AuthProvider, useAuth } from '@/features/auth';
import { useProfile } from '@/features/onboarding';
import { configureNotificationHandler, useNotificationScheduler } from '@/features/notifications';

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
      <YouVersionProvider appKey={youVersionAppKey} theme="system" auth={youVersionAuthConfig}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigation />
        </AuthProvider>
      </YouVersionProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigation() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const segments = useSegments();

  useNotificationScheduler();

  if (authLoading || (session && profileLoading)) {
    return null;
  }

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';

  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)" />;
  }

  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  if (session && !profile?.onboarding_completed_at && !inOnboardingGroup) {
    return <Redirect href="/(onboarding)" />;
  }

  if (session && profile?.onboarding_completed_at && inOnboardingGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
