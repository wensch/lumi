import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getCurrentLanguage, type LanguageCode } from '@/i18n';

const MAIN_PREFIX = 'lumi-reminder-main-';
const ALTERNATE_PREFIX = 'lumi-reminder-alt-';
// Identificadores da versão antiga (um lembrete diário fixo): cancelados junto, para não duplicar.
const LEGACY_IDS = ['lumi-daily-reminder', 'lumi-alternate-reminder'];
const ALTERNATE_DELAY_HOURS = 4;

type ReminderCopy = { title: string; body: string };

/**
 * Textos dos lembretes, um por dia da semana (índice 0 = domingo), para o
 * lembrete não repetir a mesma frase todo dia. Voz do Lumi: bem-humorada e
 * acolhedora, sem culpa (briefing §14), nunca falando como autoridade
 * espiritual. O lembrete alternativo (4h depois) é sempre mais leve.
 */
const REMINDER_COPY: Record<LanguageCode, { main: ReminderCopy[]; alternate: ReminderCopy[] }> = {
  pt: {
    main: [
      {
        title: 'Domingo com o Lumi 🐑',
        body: 'Que tal começar a semana com um momento tranquilo? Leva só uns minutinhos.',
      },
      {
        title: 'Segunda-feira, novo começo',
        body: 'A semana começou. Um devocional curtinho agora e o resto do dia segue mais leve.',
      },
      {
        title: 'Terça é dia de constância',
        body: 'Um momento hoje e a sequência segue de pé. 🔥',
      },
      {
        title: 'Metade da semana, Lumi no ar',
        body: 'Pausa pro fôlego: um versículo, uma reflexão e pronto. Sem pressa, só constância.',
      },
      {
        title: 'Quinta-feira, bora?',
        body: 'Aquele minutinho de calma que o dia pede está esperando por você.',
      },
      {
        title: 'Sextou — com direito a devocional',
        body: 'Feche a semana do jeito bom: um momento com a Palavra antes do fim de semana.',
      },
      {
        title: 'Sábado sem correria',
        body: 'Com calma e sem cobrança: que tal um momento só seu hoje?',
      },
    ],
    alternate: [
      {
        title: 'Passando só pra avisar 🐑',
        body: 'O dia ainda não acabou. Um momento rapidinho, se der vontade.',
      },
      {
        title: 'Sem pressão',
        body: 'Se hoje apertou, um minutinho já conta. O Lumi espera.',
      },
      {
        title: 'O Lumi guardou o seu lugar',
        body: 'Quando quiser, é só abrir. Leva pouquinho tempo.',
      },
      {
        title: 'Ainda dá tempo hoje',
        body: 'Um momento agora mantém a sequência viva. 🔥',
      },
      {
        title: 'Um versículo antes de terminar o dia?',
        body: 'Leva menos tempo que um café. Se quiser, o Lumi te espera.',
      },
      {
        title: 'Antes de desligar do dia',
        body: 'Que tal um respiro com o Lumi? Sem culpa, só convite.',
      },
      {
        title: 'Se hoje foi corrido',
        body: 'O Lumi espera. Quando der, um momento tranquilo faz bem.',
      },
    ],
  },
  en: {
    main: [
      {
        title: 'Sunday with Lumi 🐑',
        body: 'How about starting the week with a calm moment? It only takes a few minutes.',
      },
      {
        title: 'Monday, fresh start',
        body: 'The week just began. A short devotional now and the rest of the day goes lighter.',
      },
      {
        title: 'Tuesday is for consistency',
        body: 'One moment today and your streak stays alive. 🔥',
      },
      {
        title: 'Midweek, Lumi checking in',
        body: 'A breather: one verse, one reflection, done. No rush, just consistency.',
      },
      {
        title: 'Thursday, ready?',
        body: 'The little pause your day is asking for is waiting for you.',
      },
      {
        title: "It's Friday — devotional included",
        body: 'Close the week the good way: a moment with the Word before the weekend.',
      },
      {
        title: 'Saturday, no rush',
        body: 'Calm and no pressure: how about a moment just for you today?',
      },
    ],
    alternate: [
      {
        title: 'Just dropping by 🐑',
        body: "The day isn't over yet. A quick moment, if you feel like it.",
      },
      {
        title: 'No pressure',
        body: 'If today got busy, one minute still counts. Lumi will wait.',
      },
      {
        title: 'Lumi saved your spot',
        body: "Whenever you're ready, just open the app. It takes a little while.",
      },
      {
        title: "There's still time today",
        body: 'One moment now keeps your streak alive. 🔥',
      },
      {
        title: 'A verse before the day ends?',
        body: "Takes less time than a coffee. Lumi's here if you want.",
      },
      {
        title: 'Before you wind down',
        body: 'How about a breather with Lumi? No guilt, just an invitation.',
      },
      {
        title: 'If today was a rush',
        body: 'Lumi will wait. Whenever you can, a calm moment does you good.',
      },
    ],
  },
};

/** Todos os identificadores que o app já agendou (semana toda, dois lembretes por dia + legado). */
function allReminderIds(): string[] {
  const ids = [...LEGACY_IDS];
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    ids.push(`${MAIN_PREFIX}${weekday}`, `${ALTERNATE_PREFIX}${weekday}`);
  }
  return ids;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Agenda o lembrete principal (no horário escolhido) e o alternativo
 * (ALTERNATE_DELAY_HOURS depois) para cada dia da semana, cada um com um
 * texto diferente no idioma ativo. Os gatilhos são semanais e se repetem
 * sozinhos. Cancela agendamentos anteriores antes, para não duplicar.
 */
export async function scheduleDailyReminder(preferredTime: string) {
  await cancelDailyReminder();

  const [hourStr, minuteStr] = preferredTime.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return;

  const copy = REMINDER_COPY[getCurrentLanguage()];
  const alternateHourRaw = hour + ALTERNATE_DELAY_HOURS;
  const alternateHour = alternateHourRaw % 24;
  const alternateWrapsDay = alternateHourRaw >= 24;

  // weekday: 1 = domingo ... 7 = sábado (WeeklyTriggerInput do expo-notifications).
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const index = weekday - 1;

    await Notifications.scheduleNotificationAsync({
      identifier: `${MAIN_PREFIX}${weekday}`,
      content: copy.main[index],
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });

    // Passando da meia-noite, o lembrete alternativo cai no dia seguinte.
    const alternateWeekday = alternateWrapsDay ? (weekday % 7) + 1 : weekday;
    await Notifications.scheduleNotificationAsync({
      identifier: `${ALTERNATE_PREFIX}${weekday}`,
      content: copy.alternate[index],
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: alternateWeekday,
        hour: alternateHour,
        minute,
      },
    });
  }
}

export async function cancelDailyReminder() {
  await Promise.all(
    allReminderIds().map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
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
