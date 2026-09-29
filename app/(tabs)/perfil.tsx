import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Screen, ScreenHeader, Section } from '@/components';
import { useProfileHistory } from '@/features/profile';
import { ShareStreakButton } from '@/features/share';
import { useTheme, type Theme } from '@/theme';

export default function PerfilScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
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
      <ScreenHeader title="Perfil" onSettingsPress={() => router.push('/configuracoes')} />

      <View style={styles.streaksRow}>
        <Card style={[styles.streakCard, styles.streakCardHighlight]}>
          <Text style={theme.typography.display}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>sequência atual</Text>
        </Card>
        <Card style={styles.streakCard}>
          <Text style={theme.typography.display}>{longestStreak}</Text>
          <Text style={styles.streakLabel}>maior sequência</Text>
        </Card>
      </View>

      {currentStreak > 0 ? <ShareStreakButton streak={currentStreak} totalXp={totalXp} /> : null}

      <Section label="Conquistas" pillLabel>
        <View style={styles.achievementsGrid}>
          {allAchievements.map((achievement) => {
            const unlocked = unlockedAchievementIds.has(achievement.id);
            return (
              <View key={achievement.id} style={styles.achievementItem}>
                <View style={[styles.achievementCircle, !unlocked && styles.achievementLocked]}>
                  <Text style={styles.achievementIcon}>{unlocked ? achievement.icon : '🔒'}</Text>
                </View>
                <Text style={styles.achievementLabel}>{achievement.title}</Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Section label="Histórico recente" pillLabel>
        {recentSessions.length === 0 ? (
          <Text style={theme.typography.body}>Seus devocionais concluídos aparecem aqui.</Text>
        ) : (
          <View style={styles.historyList}>
            {recentSessions.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={theme.typography.bodyStrong}>
                  {entry.content_title ?? 'Devocional'}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(entry.completed_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    streaksRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    streakCard: {
      flex: 1,
      alignItems: 'flex-start',
    },
    streakCardHighlight: {
      backgroundColor: theme.colors.yellow,
    },
    streakLabel: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
    achievementsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    achievementItem: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      width: 84,
    },
    achievementCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.yellow,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    achievementLocked: {
      backgroundColor: 'transparent',
      borderStyle: 'dashed',
      borderColor: theme.colors.muted,
    },
    achievementIcon: {
      fontSize: 28,
    },
    achievementLabel: {
      ...theme.typography.caption,
      textAlign: 'center',
    },
    historyList: {
      gap: theme.spacing.sm,
    },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
    },
    historyDate: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
  });
