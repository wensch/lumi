import { router } from 'expo-router';

/** Voltar; se a tela foi aberta direto (link, notificação) e não há histórico, vai para a aba Hoje. */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
