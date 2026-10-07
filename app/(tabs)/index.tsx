import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, FadeIn, Screen, Skeleton, StreakBadge, XPBadge } from '@/components';
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
  const { currentStreak, longestStreak, totalXp, daysSinceLastCompleted, week, loading } =
    useHomeData();

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

  const greeting = lumiGreeting(daysSinceLastCompleted, t);
  const completedToday = daysSinceLastCompleted === 0;

  return (
    <Screen>
      <UpdateBanner />

      <View style={styles.header}>
        <StreakBadge days={currentStreak} />
        <XPBadge xp={totalXp} />
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

      <FadeIn delay={60} rise={18}>
        <View style={styles.mascotArea}>
          <View style={styles.mascotBackdrop} />
          <LumiMascot mood={greeting.mood} size={290} />
        </View>
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
          </Card>
          <Button label={t('home.startDevotional')} onPress={() => router.push('/devocional')} />
        </>
      )}

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
  return (
    <View style={styles.weekDay}>
      <View
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
      <Text style={styles.weekDayLabel}>{letter}</Text>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
