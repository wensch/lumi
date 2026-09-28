import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="biblia" options={{ title: 'Bíblia' }} />
      <Tabs.Screen name="lumi" options={{ title: 'Lumi' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
