import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getCurrentLanguage, translate, type LanguageCode } from '@/i18n';
import { toLocalDateKey } from '@/lib/dates';

const MAIN_PREFIX = 'lumi-main-';
const ALTERNATE_PREFIX = 'lumi-alt-';
const RETURN_PREFIX = 'lumi-return-';
const ALTERNATE_DELAY_HOURS = 4;
const REMINDER_CHANNEL_ID = 'lembretes';
const MAX_ALTERNATE_HOUR = 22;
/**
 * Dias SEM abrir o app em que o Lumi manda um recado de retorno. Depois do último, silêncio até a
 * pessoa voltar: lembrar todo dia de quem sumiu viraria cobrança (briefing §4, "retorno fácil").
 */
const RETURN_OFFSETS = [2, 5, 10] as const;

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

const RETURN_COPY: Record<LanguageCode, ReminderCopy[]> = {
  pt: [
    {
      title: 'O Lumi sentiu sua falta 🐑',
      body: 'Dois dias passaram, e tudo bem. Um momento rapidinho e a gente recomeça juntos.',
    },
    {
      title: 'Sem pressão, a porta está aberta',
      body: 'Faz alguns dias. O que você já conquistou continua com você. Quando quiser, é só abrir.',
    },
    {
      title: 'Passando só para deixar um oi',
      body: 'Sem cobrança nenhuma. Quando fizer sentido para você, o Lumi estará por aqui. 🐑',
    },
  ],
  en: [
    {
      title: 'Lumi missed you 🐑',
      body: "Two days went by, and that's okay. A quick moment and we start again together.",
    },
    {
      title: 'No pressure, the door is open',
      body: "It's been a few days. What you've earned stays with you. Whenever you like, just open the app.",
    },
    {
      title: 'Just dropping by to say hi',
      body: 'No guilt at all. Whenever it feels right, Lumi will be here. 🐑',
    },
  ],
};

/**
 * Canal de notificação do Android (nome visível em Ajustes > Notificações). Precisa existir
 * antes de pedir a permissão no Android 13+ e de agendar; sem ele o sistema cria um canal
 * genérico "Miscellaneous".
 */
async function ensureReminderChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: translate('notifications.channelName'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Só consulta — nunca abre o diálogo do sistema (usado ao abrir o app). */
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureReminderChannel();
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export type PlannedReminder = { identifier: string; date: Date; content: ReminderCopy };

/**
 * Calcula os lembretes a partir de `now` (função pura, testável):
 *  - hoje e amanhã: o lembrete principal no horário escolhido e o alternativo (mais leve, 4h depois,
 *    nunca depois das 22h), cada um com um texto diferente por dia da semana;
 *  - 2, 5 e 10 dias à frente: recado de retorno, que só chega se a pessoa não abrir o app antes
 *    (abrir reagenda tudo e o recado nunca dispara).
 * Passado o último, nada mais é planejado até o app ser aberto de novo. `skipToday` é para quem já
 * concluiu o momento de hoje. Horário que já passou (ou está a segundos de passar) fica de fora.
 */
export function planReminders(
  now: Date,
  hour: number,
  minute: number,
  language: LanguageCode,
  options: { skipToday?: boolean } = {},
): PlannedReminder[] {
  const copy = REMINDER_COPY[language];
  const returns = RETURN_COPY[language];
  const alternateHour = Math.min(hour + ALTERNATE_DELAY_HOURS, MAX_ALTERNATE_HOUR);
  const hasAlternate = hour < MAX_ALTERNATE_HOUR;
  const planned: PlannedReminder[] = [];

  const dayAt = (offset: number, atHour: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, atHour, minute, 0, 0);
  const add = (identifier: string, date: Date, content: ReminderCopy) => {
    if (date.getTime() > now.getTime() + 30_000) planned.push({ identifier, date, content });
  };

  for (const offset of [0, 1]) {
    if (offset === 0 && options.skipToday) continue;
    const main = dayAt(offset, hour);
    const weekday = main.getDay(); // 0 = domingo
    const key = toLocalDateKey(main);
    add(`${MAIN_PREFIX}${key}`, main, copy.main[weekday]);
    if (hasAlternate) {
      add(`${ALTERNATE_PREFIX}${key}`, dayAt(offset, alternateHour), copy.alternate[weekday]);
    }
  }

  for (const [index, offset] of RETURN_OFFSETS.entries()) {
    add(`${RETURN_PREFIX}${offset}`, dayAt(offset, hour), returns[index]);
  }

  return planned;
}

/** Agenda no sistema o que `planReminders` calculou, substituindo qualquer agendamento anterior. */
export async function scheduleDailyReminder(
  preferredTime: string,
  options: { skipToday?: boolean } = {},
) {
  await cancelDailyReminder();

  const [hourStr, minuteStr] = preferredTime.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return;

  await ensureReminderChannel();

  for (const reminder of planReminders(new Date(), hour, minute, getCurrentLanguage(), options)) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: reminder.content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.date,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

/**
 * Depois de concluir o devocional, os lembretes de HOJE ("ainda dá tempo…") não fazem mais sentido.
 * Cancela só os de hoje; o resto continua agendado.
 */
export async function cancelTodaysReminders() {
  const key = toLocalDateKey(new Date());
  await Promise.all(
    [`${MAIN_PREFIX}${key}`, `${ALTERNATE_PREFIX}${key}`].map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
}

/** O app só agenda lembretes próprios, então limpar tudo também apaga os agendamentos das versões antigas. */
export async function cancelDailyReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
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
