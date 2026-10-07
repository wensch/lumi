import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Card, FadeIn, Screen, ScreenHeader, Skeleton } from '@/components';
import { lumiGreeting, useHomeData } from '@/features/home';
import { getJourney, JOURNEY_MILESTONES, LumiMascot, type JourneyMilestone } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function LumiScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { currentStreak, longestStreak, daysSinceLastCompleted, loading } = useHomeData();

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title={t('tabs.lumi')} />
        <Skeleton height={330} radius={theme.radius.lg} />
        <Skeleton height={110} radius={theme.radius.lg} />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} height={64} radius={theme.radius.md} />
        ))}
      </Screen>
    );
  }

  const greeting = lumiGreeting(daysSinceLastCompleted, t);
  const journey = getJourney(currentStreak, longestStreak);

  return (
    <Screen>
      <ScreenHeader title={t('tabs.lumi')} />

      <FadeIn>
        <Card style={styles.mascotCard}>
          <LumiMascot mood={greeting.mood} size={230} />
          <Text style={[theme.typography.heading, styles.centeredText]}>{greeting.title}</Text>
          <Text style={[theme.typography.body, styles.mutedText, styles.centeredText]}>
            {greeting.subtitle}
          </Text>
        </Card>
      </FadeIn>

      <FadeIn delay={80}>
        <Card style={styles.nextCard}>
          <Text style={styles.kicker}>{t('lumi.nextMilestone')}</Text>
          {journey.next === null ? (
            <Text style={theme.typography.bodyStrong}>{t('lumi.allReached')}</Text>
          ) : (
            <>
              <View style={styles.nextHeader}>
                <Text style={theme.typography.heading}>
                  {t(`lumi.milestones.d${journey.next}.title`)}
                </Text>
                <Text style={[theme.typography.bodyStrong, styles.mutedText]}>
                  {t('lumi.daysToGo', { count: journey.daysToNext })}
                </Text>
              </View>
              <ProgressBar progress={journey.progress} theme={theme} />
              <Text style={[theme.typography.caption, styles.mutedText]}>
                {t(`lumi.milestones.d${journey.next}.reward`)}
              </Text>
            </>
          )}
        </Card>
      </FadeIn>

      <Text style={styles.sectionTitle}>{t('lumi.milestonesTitle')}</Text>

      <View style={styles.milestoneList}>
        {JOURNEY_MILESTONES.map((days, index) => (
          <FadeIn key={days} delay={140 + index * 50} rise={8}>
            <MilestoneRow
              days={days}
              unlocked={journey.reached.includes(days)}
              title={t(`lumi.milestones.d${days}.title`)}
              reward={t(`lumi.milestones.d${days}.reward`)}
              theme={theme}
            />
          </FadeIn>
        ))}
      </View>

      <Text style={[theme.typography.caption, styles.mutedText, styles.centeredText]}>
        {t('lumi.keepsForever')}
      </Text>
      <Text style={[theme.typography.caption, styles.mutedText, styles.centeredText]}>
        {t('lumi.itemsSoon')}
      </Text>
    </Screen>
  );
}

function ProgressBar({ progress, theme }: { progress: number; theme: Theme }) {
  const styles = getStyles(theme);
  const [fill] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Largura em % não suporta driver nativo; a barra é pequena, o custo é desprezível.
    const animation = Animated.timing(fill, {
      toValue: progress,
      duration: 650,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, progress]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

function MilestoneRow({
  days,
  unlocked,
  title,
  reward,
  theme,
}: {
  days: JourneyMilestone;
  unlocked: boolean;
  title: string;
  reward: string;
  theme: Theme;
}) {
  const styles = getStyles(theme);
  return (
    <Card padding="compact" style={[styles.milestoneRow, !unlocked && styles.milestoneLocked]}>
      <View style={[styles.milestoneBadge, unlocked && styles.milestoneBadgeUnlocked]}>
        <Text style={styles.milestoneBadgeText}>{unlocked ? '✓' : days}</Text>
      </View>
      <View style={styles.milestoneText}>
        <Text style={theme.typography.bodyStrong}>{title}</Text>
        <Text style={[theme.typography.caption, styles.mutedText]}>{reward}</Text>
      </View>
      {unlocked ? null : <Text style={styles.lockIcon}>🔒</Text>}
    </Card>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    mascotCard: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.lg,
    },
    centeredText: {
      textAlign: 'center',
    },
    mutedText: {
      color: theme.colors.muted,
    },
    nextCard: {
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.yellow,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    nextHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    progressTrack: {
      height: 18,
      borderRadius: theme.radius.pill,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.green,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.ink,
      marginTop: theme.spacing.xs,
    },
    milestoneList: {
      gap: theme.spacing.sm,
    },
    milestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    milestoneLocked: {
      backgroundColor: 'transparent',
      borderStyle: 'dashed',
      borderColor: theme.colors.muted,
      shadowOpacity: 0,
      elevation: 0,
    },
    milestoneBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    milestoneBadgeUnlocked: {
      backgroundColor: theme.colors.green,
    },
    milestoneBadgeText: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
    milestoneText: {
      flex: 1,
    },
    lockIcon: {
      fontSize: 18,
    },
  });
