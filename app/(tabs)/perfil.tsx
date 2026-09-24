import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenContainer } from '@/components';
import { useAuth } from '@/features/auth';
import { useProfileHistory } from '@/features/profile';
import { ShareStreakButton } from '@/features/share';
import { spacing, typography } from '@/theme';

export default function PerfilScreen() {
  const { session, signOut } = useAuth();
  const {
    currentStreak,
    longestStreak,
    totalXp,
    recentSessions,
    allAchievements,
    unlockedAchievementIds,
  } = useProfileHistory();

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={typography.title}>Perfil</Text>

        <Card style={styles.streaksRow}>
          <View style={styles.streakStat}>
            <Text style={typography.title}>{currentStreak}</Text>
            <Text style={typography.caption}>sequência atual</Text>
          </View>
          <View style={styles.streakStat}>
            <Text style={typography.title}>{longestStreak}</Text>
            <Text style={typography.caption}>maior sequência</Text>
          </View>
        </Card>

        {currentStreak > 0 ? <ShareStreakButton streak={currentStreak} totalXp={totalXp} /> : null}

        <Text style={typography.subheading}>Conquistas</Text>
        <Card style={styles.achievementsGrid}>
          {allAchievements.map((achievement) => {
            const unlocked = unlockedAchievementIds.has(achievement.id);
            return (
              <View
                key={achievement.id}
                style={[styles.achievementItem, !unlocked && styles.achievementLocked]}
              >
                <Text style={styles.achievementIcon}>{unlocked ? achievement.icon : '🔒'}</Text>
                <Text style={styles.achievementLabel}>{achievement.title}</Text>
              </View>
            );
          })}
        </Card>

        <Text style={typography.subheading}>Histórico recente</Text>
        <Card style={styles.historyCard}>
          {recentSessions.length === 0 ? (
            <Text style={typography.body}>Seus momentos concluídos aparecem aqui.</Text>
          ) : (
            recentSessions.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={typography.body}>{entry.content_title ?? 'Momento devocional'}</Text>
                <Text style={typography.caption}>
                  {new Date(entry.completed_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.accountCard}>
          <Text style={typography.caption}>Conectado como {session?.user.email}</Text>
          <Button variant="ghost" label="Sair" onPress={signOut} />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  streaksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  achievementItem: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 88,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  historyCard: {
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountCard: {
    gap: spacing.sm,
  },
});
