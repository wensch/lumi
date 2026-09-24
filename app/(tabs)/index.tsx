import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, ScreenContainer, StreakBadge, XPBadge } from '@/components';
import { lumiGreeting, useHomeData } from '@/features/home';
import { LumiMascot } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

export default function HojeScreen() {
  const { currentStreak, longestStreak, totalXp, daysSinceLastCompleted, loading } = useHomeData();

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <Text style={typography.body}>Carregando…</Text>
      </ScreenContainer>
    );
  }

  const greeting = lumiGreeting(daysSinceLastCompleted);
  const completedToday = daysSinceLastCompleted === 0;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <StreakBadge days={currentStreak} />
        <XPBadge xp={totalXp} />
      </View>

      {longestStreak > currentStreak ? (
        <Text style={styles.recordHint}>
          Seu recorde é de {longestStreak} {longestStreak === 1 ? 'dia' : 'dias'} — já rolou antes,
          rola de novo.
        </Text>
      ) : null}

      <Card style={styles.heroCard}>
        <LumiMascot mood={greeting.mood} size={140} />
        <Text style={typography.heading}>{greeting.title}</Text>
        <Text style={[typography.body, styles.subtitle]}>{greeting.subtitle}</Text>
      </Card>

      <Button
        label={completedToday ? 'Fazer mais um devocional' : 'Começar meu devocional'}
        variant={completedToday ? 'ghost' : 'primary'}
        onPress={() => router.push('/devocional')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.ink,
    textAlign: 'center',
  },
  recordHint: {
    ...typography.caption,
    color: colors.ink,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
