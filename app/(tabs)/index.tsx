import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, StreakBadge, XPBadge } from '@/components';
import { lumiGreeting, useHomeData } from '@/features/home';
import { LumiMascot } from '@/features/lumi';
import { ShareStreakButton } from '@/features/share';
import { colors, spacing, typography } from '@/theme';

export default function HojeScreen() {
  const { currentStreak, longestStreak, totalXp, daysSinceLastCompleted, loading } = useHomeData();

  if (loading) {
    return (
      <Screen centered>
        <Text style={typography.body}>Carregando…</Text>
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

      <Card style={styles.heroCard}>
        <LumiMascot mood={greeting.mood} size={168} />
        <Text style={[typography.heading, styles.heroTitle]}>{greeting.title}</Text>
        <Text style={[typography.body, styles.heroSubtitle]}>{greeting.subtitle}</Text>
      </Card>

      {longestStreak > currentStreak ? (
        <Text style={styles.recordHint}>
          Seu recorde é de {longestStreak} {longestStreak === 1 ? 'dia' : 'dias'} — já rolou antes,
          rola de novo.
        </Text>
      ) : null}

      <Button
        label={completedToday ? 'Fazer mais um devocional' : 'Começar meu devocional'}
        variant={completedToday ? 'ghost' : 'primary'}
        onPress={() => router.push('/devocional')}
      />

      {currentStreak > 0 ? <ShareStreakButton streak={currentStreak} totalXp={totalXp} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroSubtitle: {
    color: colors.ink,
    textAlign: 'center',
    opacity: 0.8,
  },
  recordHint: {
    ...typography.caption,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
  },
});
