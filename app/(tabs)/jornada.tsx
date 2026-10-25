import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, FadeIn, ProgressBar, Screen, ScreenHeader, Skeleton } from '@/components';
import { daysLeft, useChallenges, type Challenge } from '@/features/challenges';
import { useActivePlan } from '@/features/plans';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

/** No máximo isto de desafios em andamento na aba (a pessoa pode ter até 3). */
const MAX_ACTIVE_CHALLENGES = 3;

/** Aba "Jornada": duas áreas bem separadas — o plano de leitura e os desafios —, cada uma com os atalhos de criar. */
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

      <FadeIn>
        <Area
          theme={theme}
          color={theme.colors.green}
          icon="📖"
          title={t('journey.planTitle')}
          subtitle={t('journey.planSubtitle')}
        >
          {activePlan ? (
            <>
              <View style={styles.panel}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemIcon}>{activePlan.icon ?? '📖'}</Text>
                  <View style={styles.itemTitleBox}>
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
              </View>
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
              <View style={styles.actions}>
                <View style={styles.action}>
                  <Button
                    label={t('journey.seeAllPlans')}
                    variant="secondary"
                    onPress={() => router.push('/planos')}
                  />
                </View>
                <View style={styles.action}>
                  <Button
                    label={t('journey.createPlan')}
                    variant="secondary"
                    onPress={() => router.push('/planos/novo')}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={theme.typography.body}>{t('journey.planInvite')}</Text>
              <Button label={t('journey.choosePlan')} onPress={() => router.push('/planos')} />
              <Button
                label={t('journey.createPlan')}
                variant="secondary"
                onPress={() => router.push('/planos/novo')}
              />
            </>
          )}
        </Area>
      </FadeIn>

      <FadeIn delay={80}>
        <Area
          theme={theme}
          color={theme.colors.pink}
          icon="🎯"
          title={t('journey.challengesTitle')}
          subtitle={t('journey.challengesSubtitle')}
        >
          {loading ? (
            <Skeleton height={80} radius={theme.radius.md} />
          ) : error ? (
            <>
              <Text style={[theme.typography.body, styles.centeredText]}>
                {t('journey.errorLoad')}
              </Text>
              <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
            </>
          ) : activeChallenges.length > 0 ? (
            activeChallenges.map((challenge) => (
              <ChallengeSummary key={challenge.id} challenge={challenge} theme={theme} />
            ))
          ) : (
            <Text style={theme.typography.body}>{t('journey.challengesInvite')}</Text>
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
        </Area>
      </FadeIn>
    </Screen>
  );
}

/** Uma área da Jornada: faixa colorida com ícone e título no topo, conteúdo e botões embaixo. */
function Area({
  theme,
  color,
  icon,
  title,
  subtitle,
  children,
}: {
  theme: Theme;
  color: string;
  icon: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const styles = getStyles(theme);
  return (
    <Card style={styles.area}>
      <View style={[styles.areaHeader, { backgroundColor: color }]}>
        <View style={styles.areaIconCircle}>
          <Text style={styles.areaIcon}>{icon}</Text>
        </View>
        <View style={styles.areaTitleBox}>
          <Text style={theme.typography.heading} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[theme.typography.caption, styles.onColor]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.areaBody}>{children}</View>
    </Card>
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
    <View style={styles.panel}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIcon}>{challenge.icon ?? '🎯'}</Text>
        <View style={styles.itemTitleBox}>
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
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    muted: {
      color: theme.colors.muted,
    },
    // Texto secundário sobre a faixa colorida: `muted` não passa de 4,5:1 em todo fundo.
    onColor: {
      color: theme.colors.ink,
    },
    centeredText: {
      textAlign: 'center',
      color: theme.colors.ink,
    },
    area: {
      padding: 0,
      overflow: 'hidden',
    },
    areaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      borderBottomWidth: 2.5,
      borderBottomColor: theme.colors.ink,
    },
    areaIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
    },
    areaIcon: {
      fontSize: 26,
    },
    areaTitleBox: {
      flex: 1,
      gap: 2,
    },
    areaBody: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    panel: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.bg,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    itemTitleBox: {
      flex: 1,
      gap: 2,
    },
    itemIcon: {
      fontSize: 30,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    action: {
      flex: 1,
    },
  });
