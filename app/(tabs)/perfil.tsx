import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, FadeIn, Screen, ScreenHeader, Section, Skeleton } from '@/components';
import { isKnownAchievement } from '@/features/achievements';
import { useProfileHistory } from '@/features/profile';
import { ShareStreakButton } from '@/features/share';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function PerfilScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language } = useTranslation();
  const {
    currentStreak,
    longestStreak,
    totalXp,
    recentSessions,
    allAchievements,
    unlockedAchievementIds,
    loading,
  } = useProfileHistory();

  return (
    <Screen>
      <ScreenHeader
        title={t('tabs.profile')}
        onSettingsPress={() => router.push('/configuracoes')}
      />

      {loading ? (
        <PerfilSkeleton />
      ) : (
        <>
          <FadeIn>
            <View style={styles.streaksRow}>
              <Card style={[styles.streakCard, styles.streakCardHighlight]}>
                <Text style={theme.typography.display}>{currentStreak}</Text>
                <Text style={styles.streakLabel}>{t('profile.currentStreak')}</Text>
              </Card>
              <Card style={styles.streakCard}>
                <Text style={theme.typography.display}>{longestStreak}</Text>
                <Text style={styles.streakLabel}>{t('profile.longestStreak')}</Text>
              </Card>
            </View>
          </FadeIn>
          {currentStreak > 0 ? (
            <ShareStreakButton streak={currentStreak} totalXp={totalXp} />
          ) : null}

          <FadeIn delay={80}>
            <Section label={t('profile.achievements')} pillLabel>
              <View style={styles.achievementsGrid}>
                {allAchievements.map((achievement) => {
                  const unlocked = unlockedAchievementIds.has(achievement.id);
                  const known = isKnownAchievement(achievement.code);
                  const title = known ? t(`achievements.${achievement.code}`) : achievement.title;
                  return (
                    <Pressable
                      key={achievement.id}
                      accessibilityRole="button"
                      accessibilityLabel={title}
                      onPress={() =>
                        Alert.alert(
                          `${unlocked ? achievement.icon : '🔒'} ${title}`,
                          `${t(unlocked ? 'achievementTap.unlocked' : 'achievementTap.locked')}\n${
                            known
                              ? t(`achievementHints.${achievement.code}`)
                              : achievement.description
                          }`,
                        )
                      }
                      style={styles.achievementItem}
                    >
                      <View
                        style={[styles.achievementCircle, !unlocked && styles.achievementLocked]}
                      >
                        <Text style={styles.achievementIcon}>
                          {unlocked ? achievement.icon : '🔒'}
                        </Text>
                      </View>
                      <Text style={styles.achievementLabel}>{title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          </FadeIn>
          <FadeIn delay={160}>
            <Section label={t('profile.recentHistory')} pillLabel>
              {recentSessions.length === 0 ? (
                <Text style={theme.typography.body}>{t('profile.noHistoryYet')}</Text>
              ) : (
                <View style={styles.historyList}>
                  {recentSessions.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onPress={() => router.push('/historico')}
                      accessibilityRole="button"
                      style={styles.historyRow}
                    >
                      <Text style={[theme.typography.bodyStrong, styles.historyTitle]}>
                        {entry.has_reflection ? '📝 ' : ''}
                        {entry.content_title ?? t('profile.defaultDevotionalName')}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(entry.completed_at).toLocaleDateString(
                          language === 'en' ? 'en-US' : 'pt-BR',
                        )}
                      </Text>
                    </Pressable>
                  ))}
                  <Button
                    label={t('profile.viewAllHistory')}
                    variant="ghost"
                    onPress={() => router.push('/historico')}
                  />
                </View>
              )}
            </Section>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

function PerfilSkeleton() {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <>
      <View style={styles.streaksRow}>
        <Skeleton height={96} radius={theme.radius.lg} style={styles.skeletonFlex} />
        <Skeleton height={96} radius={theme.radius.lg} style={styles.skeletonFlex} />
      </View>
      <Skeleton width={130} height={26} radius={13} />
      <View style={styles.achievementsGrid}>
        {Array.from({ length: 8 }, (_, index) => (
          <View key={index} style={styles.achievementItem}>
            <Skeleton width={64} height={64} radius={32} />
            <Skeleton width={56} height={10} />
          </View>
        ))}
      </View>
      <Skeleton width={150} height={26} radius={13} />
      <View style={styles.historyList}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} height={18} />
        ))}
      </View>
    </>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    skeletonFlex: {
      flex: 1,
    },
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
    historyTitle: {
      flex: 1,
    },
    historyDate: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
  });
