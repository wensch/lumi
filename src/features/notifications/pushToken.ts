import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getCurrentLanguage, translate } from '@/i18n';
import { hasNotificationPermission } from './scheduleDailyReminder';

/** Canal dos avisos dos círculos; o servidor manda o push com este id. */
export const CIRCLES_CHANNEL_ID = 'circulos';
const TOKEN_KEY = 'lumi.pushToken';

async function ensureCirclesChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CIRCLES_CHANNEL_ID, {
    name: translate('notifications.circlesChannelName'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Registra o aparelho para receber os avisos dos círculos (push via FCM). Só no Android por
 * enquanto, e só com a permissão já concedida. Sem o google-services.json no build (ver
 * docs/push-setup.md) o Firebase não existe no app e isto só não faz nada.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!(await hasNotificationPermission())) return;

  try {
    await ensureCirclesChannel();
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (typeof token !== 'string' || token.length < 20) return;

    // Evita chamar o servidor a cada abertura quando nada mudou.
    const marker = `${userId}:${token}`;
    if ((await AsyncStorage.getItem(TOKEN_KEY)) === marker) return;

    const { error } = await supabase.rpc('register_device_token', {
      p_token: token,
      p_platform: 'android',
    });
    if (!error) await AsyncStorage.setItem(TOKEN_KEY, marker);
  } catch {
    // Firebase ausente no build, sem rede ou serviços do Google indisponíveis: sem push, o resto segue.
  }
}

/** Ao sair da conta, este aparelho deixa de receber os avisos dela. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const marker = await AsyncStorage.getItem(TOKEN_KEY);
    if (!marker) return;
    const token = marker.slice(marker.indexOf(':') + 1);
    await supabase.rpc('deactivate_device_token', { p_token: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Melhor esforço.
  }
}

/** Guarda o idioma da pessoa no servidor para o push chegar no mesmo idioma do app. */
export async function syncPushLanguage(userId: string): Promise<void> {
  await supabase
    .from('notification_preferences')
    .update({ language: getCurrentLanguage() })
    .eq('user_id', userId);
}
