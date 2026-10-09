import { Tabs } from 'expo-router';
import { CircleEventsProvider, useCircleEvents } from '@/features/circles';
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';
import { useTranslation } from '@/i18n';

function TabsNavigator() {
  const { t } = useTranslation();
  // Avisos novos dos círculos aparecem como selo na aba.
  const { unread } = useCircleEvents();

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="biblia" options={{ title: t('tabs.bible') }} />
      <Tabs.Screen name="lumi" options={{ title: t('tabs.lumi') }} />
      <Tabs.Screen
        name="circulos"
        options={{ title: t('tabs.circles'), tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="perfil" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <CircleEventsProvider>
      <TabsNavigator />
    </CircleEventsProvider>
  );
}
