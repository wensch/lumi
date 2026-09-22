import { useEffect } from 'react';
import { Redirect, Slot, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { AuthProvider, useAuth } from '@/features/auth';

SplashScreen.preventAutoHideAsync();

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
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigation />
    </AuthProvider>
  );
}

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return null;
  }

  const inAuthGroup = segments[0] === '(auth)';

  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)" />;
  }

  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
