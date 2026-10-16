import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, FadeIn, ProgressBar, Screen, ScreenHeader, Skeleton } from '@/components';
import { daysLeft, useChallenges, type Challenge } from '@/features/challenges';
import { useActivePlan } from '@/features/plans';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

/** No máximo isto de desafios em andamento na aba (a pessoa pode ter até 3). */
const MAX_ACTIVE_CHALLENGES = 3;

/** Aba "Jornada": o plano de leitura em andamento e os desafios, com atalhos para criar os seus. */
export default function JornadaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { active: activePlan } = useActivePlan();
  const { challenges, loading, error, refetch } = useChallenges();

  const activeChallenges = challenges
    .filter((challenge) => challenge.state === 'active')
    .slice(0, MAX_ACTIVE_CHALLENGES);

  return (
    <Screen>
      <ScreenHeader title={t('tabs.journey')} />
      <Text style={[theme.typography.caption, styles.muted]}>{t('journey.intro')}</Text>

      <Text style={styles.sectionTitle}>{t('journey.planTitle')}</Text>
      <FadeIn>
        {activePlan ? (
          <Card style={styles.activeCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.icon}>{activePlan.icon ?? '📖'}</Text>
              <View style={styles.cardTitleBox}>
                <Text style={theme.typography.bodyStrong}>{activePlan.title}</Text>
                <Text style={[theme.typography.caption, styles.muted]}>
                  {t('plans.dayProgress', {
                    done: activePlan.last_day_done,
                    total: activePlan.days,
                  })}
                </Text>
              </View>
            </View>
            <ProgressBar
              progress={activePlan.days > 0 ? activePlan.last_day_done / activePlan.days : 0}
              accessibilityLabel={t('plans.dayProgress', {
                done: activePlan.last_day_done,
                total: activePlan.days,
              })}
            />
            {activePlan.done_today ? (
              <Text style={[theme.typography.bodyStrong, styles.centeredText]}>
                {t('plans.comeBackTomorrow')}
              </Text>
            ) : (
              <Button
                label={t('plans.continueToday', { day: activePlan.next_day })}
                onPress={() => router.push('/devocional')}
              />
            )}
            <Button
              label={t('journey.seePlan')}
              variant="tertiary"
              onPress={() => router.push(`/planos/${activePlan.plan_id}`)}
            />
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={theme.typography.body}>{t('journey.planInvite')}</Text>
            <Button label={t('journey.choosePlan')} onPress={() => router.push('/planos')} />
          </Card>
        )}
      </FadeIn>
      <View style={styles.actions}>
        {activePlan ? (
          <View style={styles.action}>
            <Button
              label={t('journey.seeAllPlans')}
              variant="secondary"
              onPress={() => router.push('/planos')}
            />
          </View>
        ) : null}
        <View style={styles.action}>
          <Button
            label={t('journey.createPlan')}
            variant="secondary"
            onPress={() => router.push('/planos/novo')}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('journey.challengesTitle')}</Text>
      {loading ? (
        <Skeleton height={110} radius={theme.radius.lg} />
      ) : error ? (
        <Card style={styles.card}>
          <Text style={[theme.typography.body, styles.centeredText]}>{t('journey.errorLoad')}</Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : activeChallenges.length > 0 ? (
        activeChallenges.map((challenge, index) => (
          <FadeIn key={challenge.id} delay={index * 50} rise={8}>
            <ChallengeSummary challenge={challenge} theme={theme} />
          </FadeIn>
        ))
      ) : (
        <Card style={styles.card}>
          <Text style={theme.typography.body}>{t('journey.challengesInvite')}</Text>
        </Card>
      )}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            label={t('journey.seeChallenges')}
            variant="secondary"
            onPress={() => router.push('/desafios')}
          />
        </View>
        <View style={styles.action}>
          <Button
            label={t('journey.createChallenge')}
            variant="secondary"
            onPress={() => router.push('/desafios?novo=1')}
          />
        </View>
      </View>
    </Screen>
  );
}

function ChallengeSummary({ challenge, theme }: { challenge: Challenge; theme: Theme }) {
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const progress = challenge.target > 0 ? challenge.progress / challenge.target : 0;
  const left = daysLeft(challenge.ends_at);
  const progressText = t('challenges.progress', {
    done: challenge.progress,
    total: challenge.target,
  });

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{challenge.icon ?? '🎯'}</Text>
        <View style={styles.cardTitleBox}>
          <Text style={theme.typography.bodyStrong}>{challenge.title}</Text>
          <Text style={[theme.typography.caption, styles.muted]}>
            {progressText} ·{' '}
            {left === 0
              ? t('challenges.endsToday')
              : left === 1
                ? t('challenges.endsTomorrow')
                : t('challenges.endsInDays', { count: left })}
          </Text>
        </View>
      </View>
      <ProgressBar progress={progress} accessibilityLabel={progressText} />
    </Card>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    muted: {
      color: theme.colors.muted,
    },
    centeredText: {
      textAlign: 'center',
      color: theme.colors.ink,
    },
    sectionTitle: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    card: {
      gap: theme.spacing.sm,
    },
    activeCard: {
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.yellow,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    cardTitleBox: {
      flex: 1,
      gap: 2,
    },
    icon: {
      fontSize: 34,
    },
    actions: {
      gap: theme.spacing.sm,
    },
    action: {
      alignSelf: 'stretch',
    },
  });
