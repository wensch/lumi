import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_REMINDER_ID = 'lumi-daily-reminder';
const ALTERNATE_REMINDER_ID = 'lumi-alternate-reminder';
const ALTERNATE_DELAY_HOURS = 4;

/**
 * Copy revisada contra o checklist da skill lumi-brand-guardrails:
 *   - Persistente e contextual, sem culpa religiosa (briefing §14).
 *   - Lembrete alternativo é mais leve, nunca soa como cobrança.
 */
const DAILY_MESSAGES = [
  'Seu momento com o Lumi está esperando. 🐑',
  'Hora do seu momento diário — não precisa ser longo, só constante.',
  'Bora? Alguns minutos são suficientes pra hoje.',
];

const ALTERNATE_MESSAGES = [
  'Ainda dá tempo hoje, se quiser.',
  'Passando pra lembrar — sem pressa, só um lembrete.',
];

function pickRandom(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Agenda o lembrete diário (horário fixo, repete todo dia) e o lembrete
 * alternativo (ALTERNATE_DELAY_HOURS depois do horário principal, também
 * diário). Cancela agendamentos anteriores antes, para não duplicar.
 */
export async function scheduleDailyReminder(preferredTime: string) {
  await cancelDailyReminder();

  const [hourStr, minuteStr] = preferredTime.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return;

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Lumi',
      body: pickRandom(DAILY_MESSAGES),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  const alternateHour = (hour + ALTERNATE_DELAY_HOURS) % 24;

  await Notifications.scheduleNotificationAsync({
    identifier: ALTERNATE_REMINDER_ID,
    content: {
      title: 'Lumi',
      body: pickRandom(ALTERNATE_MESSAGES),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: alternateHour,
      minute,
    },
  });
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(ALTERNATE_REMINDER_ID).catch(() => {});
}

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: Platform.OS === 'ios',
      shouldSetBadge: false,
    }),
  });
}
