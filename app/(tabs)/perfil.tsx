import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Screen, Section } from '@/components';
import { useAuth } from '@/features/auth';
import { useProfileHistory } from '@/features/profile';
import { ShareStreakButton } from '@/features/share';
import { colors, spacing, typography } from '@/theme';

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
    <Screen>
      <Text style={typography.title}>Perfil</Text>

      <Card style={styles.streaksRow}>
        <View style={styles.streakStat}>
          <Text style={typography.title}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>sequência atual</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakStat}>
          <Text style={typography.title}>{longestStreak}</Text>
          <Text style={styles.streakLabel}>maior sequência</Text>
        </View>
      </Card>

      {currentStreak > 0 ? <ShareStreakButton streak={currentStreak} totalXp={totalXp} /> : null}

      <Section label="Conquistas">
        <View style={styles.achievementsGrid}>
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
        </View>
      </Section>

      <Section label="Histórico recente">
        {recentSessions.length === 0 ? (
          <Text style={typography.body}>Seus devocionais concluídos aparecem aqui.</Text>
        ) : (
          <View style={styles.historyList}>
            {recentSessions.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={typography.body}>{entry.content_title ?? 'Devocional'}</Text>
                <Text style={typography.caption}>
                  {new Date(entry.completed_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Card style={styles.accountCard}>
        <Text style={typography.caption}>Conectado como {session?.user.email}</Text>
        <Button variant="tertiary" label="Sair" onPress={signOut} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  streaksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakStat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#EDEBE3',
  },
  streakLabel: {
    ...typography.caption,
    color: colors.ink,
    opacity: 0.7,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  achievementItem: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 84,
  },
  achievementLocked: {
    opacity: 0.4,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  historyList: {
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountCard: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
});
