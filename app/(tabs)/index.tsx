import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, FadeIn, Screen, Skeleton, StreakBadge, XPBadge } from '@/components';
import { daysUntil, useActiveEvents, useActivePlan } from '@/features/plans';
import { lumiGreeting, useHomeData, type WeekDay } from '@/features/home';
import { LumiMascot } from '@/features/lumi';
import { ShareStreakButton } from '@/features/share';
import { UpdateBanner } from '@/features/updates';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

/** Domingo=0 ... Sábado=6 — chave da letra em home.weekdays.* */
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export default function HojeScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const {
    currentStreak,
    longestStreak,
    totalXp,
    freezes,
    daysSinceLastCompleted,
    week,
    loading,
    error,
    refetch,
  } = useHomeData();

  const { active: activePlan } = useActivePlan();
  const { events } = useActiveEvents();

  if (loading) {
    return (
      <Screen>
        <View style={styles.header}>
          <Skeleton width={96} height={40} radius={20} />
          <Skeleton width={96} height={40} radius={20} />
        </View>
        <View style={styles.weekRow}>
          {Array.from({ length: 7 }, (_, index) => (
            <View key={index} style={styles.weekDay}>
              <Skeleton width={36} height={36} radius={18} />
              <Skeleton width={12} height={10} />
            </View>
          ))}
        </View>
        <View style={styles.mascotArea}>
          <Skeleton width={230} height={230} radius={115} />
        </View>
        <Skeleton height={96} radius={theme.radius.lg} />
        <Skeleton height={54} radius={18} />
      </Screen>
    );
  }

  // Evento do calendário (Advento, Natal, Páscoa): convida só quem ainda não começou (ou pausou). Quem
  // está fazendo o plano do evento já o vê no cartão do plano ativo; quem concluiu não é incomodado.
  const eventCard =
    events.find((item) => item.status === 'none' || item.status === 'paused') ?? null;
  const eventStartsIn = eventCard?.state === 'soon' ? daysUntil(eventCard.starts_on) : 0;

  const greeting = lumiGreeting(daysSinceLastCompleted, t);
  const completedToday = daysSinceLastCompleted === 0;
  // Fala de "atrasado" (briefing §8.4): quase meia-noite e o momento de hoje ainda não aconteceu.
  // Faltou exatamente um dia e há Folga guardada: a sequência continua se vier hoje.
  const freezeCoversYesterday = !completedToday && daysSinceLastCompleted === 2 && freezes > 0;
  const isVeryLate = !completedToday && new Date().getHours() >= 23;

  return (
    <Screen>
      <UpdateBanner />

      {error ? (
        <Card style={styles.messageCard}>
          <Text style={[theme.typography.body, styles.messageSubtitle]}>
            {t('errors.connection')}
          </Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : null}

      <View style={styles.header}>
        <StreakBadge days={currentStreak} />
        <XPBadge xp={totalXp} />
        <Pressable
          onPress={() => router.push('/lumi')}
          accessibilityRole="button"
          accessibilityLabel={t('journey.openLumi')}
          style={styles.lumiChip}
        >
          <Ionicons name="paw" size={18} color={theme.colors.ink} />
          <Text style={styles.lumiChipText} maxFontSizeMultiplier={1.3}>
            {t('lumi.title')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {week.map((day) => (
          <WeekDayCircle
            key={day.date}
            day={day}
            letter={t(`home.weekdays.${WEEKDAY_KEYS[day.weekday]}`)}
            theme={theme}
          />
        ))}
      </View>

      {freezes > 0 ? (
        <Text style={styles.freezeHint}>
          {freezes === 1 ? t('home.freezeOne') : t('home.freezeMany', { count: freezes })}
        </Text>
      ) : null}

      <FadeIn delay={60} rise={18}>
        <Pressable
          onPress={() => router.push('/lumi')}
          accessibilityRole="button"
          accessibilityLabel={t('journey.openLumi')}
        >
          <View style={styles.mascotArea}>
            <View style={styles.mascotBackdrop} />
            <LumiMascot mood={isVeryLate ? 'sleepy' : greeting.mood} size={290} />
          </View>
        </Pressable>
      </FadeIn>

      {completedToday ? (
        <>
          <Card style={styles.messageCard}>
            <Text style={[theme.typography.heading, styles.centeredText]}>
              {t('home.alreadyCameToday')}
            </Text>
            <Text style={[theme.typography.body, styles.messageSubtitle]}>
              {t('home.alreadyCameSubtitle')}
            </Text>
          </Card>
          <Text style={[theme.typography.caption, styles.messageSubtitle]}>
            {t('home.speedrun')}
          </Text>
          <Button
            label={t('home.anotherDevotional')}
            variant="ghost"
            onPress={() => router.push('/devocional')}
          />
          {currentStreak > 0 ? (
            <ShareStreakButton streak={currentStreak} totalXp={totalXp} />
          ) : null}
        </>
      ) : (
        <>
          <Card style={styles.messageCard}>
            <Text style={styles.devotionalKicker}>{t('home.devotionalOfTheDay')}</Text>
            <Text style={theme.typography.heading}>{greeting.title}</Text>
            {freezeCoversYesterday || isVeryLate || greeting.subtitle ? (
              <Text style={[theme.typography.body, styles.messageSubtitle]}>
                {freezeCoversYesterday
                  ? t('home.freezeCovers')
                  : isVeryLate
                    ? t('home.veryLate')
                    : greeting.subtitle}
              </Text>
            ) : null}
          </Card>
          <Button label={t('home.startDevotional')} onPress={() => router.push('/devocional')} />
        </>
      )}

      {eventCard ? (
        <FadeIn>
          <Pressable
            onPress={() => router.push(`/planos/${eventCard.plan_id}`)}
            accessibilityRole="button"
            accessibilityLabel={eventCard.title}
          >
            <Card style={styles.eventCard}>
              <Text style={styles.eventKicker}>
                {eventCard.state === 'soon' ? t('events.kickerSoon') : t('events.kickerNow')} ·{' '}
                {t(`events.${eventCard.slug}`)}
              </Text>
              <Text style={theme.typography.bodyStrong}>
                {eventCard.icon ?? '✨'} {eventCard.title}
              </Text>
              <Text style={[theme.typography.caption, styles.messageSubtitle]}>
                {eventCard.state === 'soon'
                  ? eventStartsIn <= 1
                    ? t('events.startsTomorrow')
                    : t('events.startsIn', { count: eventStartsIn })
                  : eventCard.status === 'paused'
                    ? t('events.resumeCard')
                    : eventCard.description}
              </Text>
              <Text style={styles.eventLink}>{t('events.view')} →</Text>
            </Card>
          </Pressable>
        </FadeIn>
      ) : null}

      {activePlan ? (
        <Pressable
          onPress={() => router.push(`/planos/${activePlan.plan_id}`)}
          accessibilityRole="button"
          accessibilityLabel={activePlan.title}
        >
          <Card style={styles.planCard}>
            <Text style={styles.devotionalKicker}>{t('plans.todayCardKicker')}</Text>
            <Text style={theme.typography.bodyStrong}>
              {activePlan.icon ?? '📖'} {activePlan.title}
            </Text>
            <Text style={[theme.typography.caption, styles.messageSubtitle]}>
              {activePlan.done_today
                ? t('plans.todayCardDone', { day: activePlan.last_day_done })
                : t('plans.todayCardDay', { day: activePlan.next_day, total: activePlan.days })}
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {longestStreak > currentStreak ? (
        <Text style={styles.recordHint}>
          {t('home.recordHint', {
            record: `${longestStreak} ${t(longestStreak === 1 ? 'home.day' : 'home.days')}`,
          })}
        </Text>
      ) : null}
    </Screen>
  );
}

function WeekDayCircle({ day, letter, theme }: { day: WeekDay; letter: string; theme: Theme }) {
  const styles = getStyles(theme);
  const { t } = useTranslation();
  return (
    <View style={styles.weekDay}>
      <View
        accessible
        accessibilityLabel={`${letter} ${Number(day.date.slice(8, 10))}${day.completed ? `, ${t('home.weekDone')}` : ''}`}
        style={[
          styles.weekDayCircle,
          day.completed && styles.weekDayCircleCompleted,
          day.isToday && !day.completed && styles.weekDayCircleToday,
        ]}
      >
        <Text style={day.completed ? styles.weekDayCheck : styles.weekDayNumber}>
          {day.completed ? '✓' : Number(day.date.slice(8, 10))}
        </Text>
      </View>
      <Text style={styles.weekDayLabel} maxFontSizeMultiplier={1.2}>
        {letter}
      </Text>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    lumiChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.pink,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      minHeight: 40,
      paddingHorizontal: 12,
      ...theme.shadow.chip,
    },
    lumiChipText: {
      ...theme.typography.bodyStrong,
    },
    freezeHint: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      opacity: 0.75,
      textAlign: 'center',
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    weekDay: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
    },
    weekDayCircle: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 999,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDayCircleCompleted: {
      backgroundColor: theme.colors.green,
    },
    weekDayCircleToday: {
      backgroundColor: theme.colors.yellow,
    },
    weekDayCheck: {
      fontSize: 15,
      color: theme.colors.ink,
    },
    weekDayNumber: {
      ...theme.typography.bodyStrong,
      fontSize: 15,
      color: theme.colors.ink,
    },
    weekDayLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    mascotArea: {
      height: 270,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    mascotBackdrop: {
      position: 'absolute',
      bottom: 6,
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: theme.colors.yellow,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
    },
    messageCard: {
      gap: 6,
    },
    centeredText: {
      textAlign: 'center',
    },
    messageSubtitle: {
      color: theme.colors.ink,
      textAlign: 'center',
    },
    planCard: {
      gap: 2,
    },
    eventCard: {
      gap: 4,
      backgroundColor: theme.colors.yellow,
    },
    eventKicker: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    eventLink: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
      marginTop: 2,
    },
    devotionalKicker: {
      ...theme.typography.bodyStrong,
      color: theme.colors.muted,
    },
    recordHint: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: 'center',
    },
  });
