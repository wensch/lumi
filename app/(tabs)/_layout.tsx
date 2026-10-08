import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';
import { useTranslation } from '@/i18n';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="biblia" options={{ title: t('tabs.bible') }} />
      <Tabs.Screen name="lumi" options={{ title: t('tabs.lumi') }} />
      <Tabs.Screen name="circulos" options={{ title: t('tabs.circles') }} />
      <Tabs.Screen name="perfil" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
