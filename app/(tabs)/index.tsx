import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, StreakBadge, XPBadge } from '@/components';
import { lumiGreeting, useHomeData, type WeekDay } from '@/features/home';
import { LumiMascot } from '@/features/lumi';
import { ShareStreakButton } from '@/features/share';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function HojeScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { currentStreak, longestStreak, totalXp, daysSinceLastCompleted, week, loading } =
    useHomeData();

  if (loading) {
    return (
      <Screen centered>
        <Text style={theme.typography.body}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  const greeting = lumiGreeting(daysSinceLastCompleted);
  const completedToday = daysSinceLastCompleted === 0;

  return (
    <Screen>
      <View style={styles.header}>
        <StreakBadge days={currentStreak} />
        <XPBadge xp={totalXp} />
      </View>

      <View style={styles.weekRow}>
        {week.map((day, index) => (
          <WeekDayCircle key={day.date} day={day} letter={WEEKDAY_LETTERS[index]} theme={theme} />
        ))}
      </View>

      <View style={styles.mascotArea}>
        <View style={styles.mascotBackdrop} />
        <LumiMascot mood={greeting.mood} size={290} />
      </View>

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
        {day.completed ? <Text style={styles.weekDayCheck}>✓</Text> : null}
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
