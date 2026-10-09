import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, FadeIn, Screen, ScreenHeader, Skeleton } from '@/components';
import {
  formatPassageReference,
  plansApi,
  usePlan,
  usePlans,
  type PlanDay,
} from '@/features/plans';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function PlanoScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plan, loading, error, refetch } = usePlan(id);
  const { plans } = usePlans();
  const [working, setWorking] = useState(false);

  /** Roda a ação no servidor e recarrega; falha mostra um aviso simples. */
  const run = async (action: () => Promise<{ error: string | null }>) => {
    setWorking(true);
    const result = await action();
    setWorking(false);
    if (result.error !== null) {
      Alert.alert(t('plans.errorLoad'));
      return false;
    }
    await refetch();
    return true;
  };

  const startPlan = async () => {
    if (!plan) return;
    const otherActive = plans.find((item) => item.status === 'active' && item.id !== plan.id);
    const go = () => run(() => plansApi.start(plan.id));
    if (otherActive) {
      Alert.alert(t('plans.switchTitle'), `${otherActive.title}\n${t('plans.switchBody')}`, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('plans.switchAction'), onPress: () => void go() },
      ]);
      return;
    }
    await go();
  };

  const progress = plan && plan.days > 0 ? Math.min(plan.last_day_done / plan.days, 1) : 0;

  return (
    <Screen>
      <ScreenHeader title={plan?.title ?? t('plans.title')} onBackPress={() => router.back()} />

      {loading ? (
        <>
          <Skeleton height={110} radius={theme.radius.lg} />
          <Skeleton height={64} radius={theme.radius.md} />
          <Skeleton height={64} radius={theme.radius.md} />
        </>
      ) : error || !plan ? (
        <Card style={styles.centeredCard}>
          <Text style={[theme.typography.body, styles.centeredText]}>{t('plans.errorLoad')}</Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : (
        <>
          <FadeIn>
            <Card style={styles.headerCard}>
              <Text style={styles.icon}>{plan.icon ?? '📖'}</Text>
              <Text style={[theme.typography.body, styles.centeredText]}>{plan.description}</Text>
              {plan.status === 'active' || plan.status === 'paused' || plan.status === 'done' ? (
                <View style={styles.progressBlock}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
                    />
                  </View>
                  <Text style={[theme.typography.caption, styles.centeredText]}>
                    {t('plans.dayProgress', { done: plan.last_day_done, total: plan.days })}
                  </Text>
                </View>
              ) : null}
            </Card>
          </FadeIn>

          {plan.status === 'active' ? (
            plan.done_today ? (
              <Text style={[theme.typography.bodyStrong, styles.centeredText]}>
                {t('plans.comeBackTomorrow')}
              </Text>
            ) : (
              <Button
                label={t('plans.continueToday', { day: plan.last_day_done + 1 })}
                onPress={() => router.push('/devocional')}
              />
            )
          ) : plan.status === 'paused' ? (
            <>
              <Button label={t('plans.resume')} onPress={startPlan} disabled={working} />
              <Text style={[theme.typography.caption, styles.mutedCentered]}>
                {t('plans.pausedHint')}
              </Text>
            </>
          ) : plan.status === 'done' ? (
            <>
              <Text style={[theme.typography.bodyStrong, styles.centeredText]}>
                {t('plans.doneHint')}
              </Text>
              <Button
                label={t('plans.restart')}
                variant="secondary"
                onPress={startPlan}
                disabled={working}
              />
            </>
          ) : (
            <>
              <Button label={t('plans.start')} onPress={startPlan} disabled={working} />
              <Text style={[theme.typography.caption, styles.mutedCentered]}>
                {t('plans.onePerDay')}
              </Text>
            </>
          )}

          <View style={styles.dayList}>
            {plan.items.map((item, index) => (
              <FadeIn key={item.day} delay={Math.min(index, 8) * 40} rise={6}>
                <DayRow item={item} language={language} theme={theme} />
              </FadeIn>
            ))}
          </View>

          {plan.status === 'active' ? (
            <Button
              label={t('plans.pause')}
              variant="tertiary"
              onPress={() => run(() => plansApi.pause(plan.id))}
              disabled={working}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function DayRow({ item, language, theme }: { item: PlanDay; language: 'pt' | 'en'; theme: Theme }) {
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const locked = item.state === 'locked';
  return (
    <Card
      padding="compact"
      style={[
        styles.dayRow,
        item.state === 'next' && styles.dayRowNext,
        locked && styles.dayLocked,
      ]}
    >
      <View style={[styles.dayBadge, item.state === 'done' && styles.dayBadgeDone]}>
        <Text style={styles.dayBadgeText}>
          {item.state === 'done' ? '✓' : locked ? '🔒' : item.day}
        </Text>
      </View>
      <View style={styles.dayText}>
        <Text style={theme.typography.bodyStrong}>
          {locked
            ? t('plans.dayLabel', { day: item.day })
            : `${t('plans.dayLabel', { day: item.day })} · ${item.title}`}
        </Text>
        <Text style={[theme.typography.caption, styles.muted]}>
          {locked
            ? t('plans.lockedHint')
            : formatPassageReference(item.passage_reference, language)}
        </Text>
      </View>
    </Card>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    muted: {
      color: theme.colors.muted,
    },
    mutedCentered: {
      color: theme.colors.muted,
      textAlign: 'center',
    },
    centeredCard: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    centeredText: {
      textAlign: 'center',
      color: theme.colors.ink,
    },
    headerCard: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    icon: {
      fontSize: 44,
    },
    progressBlock: {
      alignSelf: 'stretch',
      gap: 4,
    },
    progressTrack: {
      height: 16,
      borderRadius: 8,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.green,
    },
    dayList: {
      gap: theme.spacing.sm,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    dayRowNext: {
      backgroundColor: theme.colors.yellow,
    },
    dayLocked: {
      opacity: 0.6,
    },
    dayBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBadgeDone: {
      backgroundColor: theme.colors.green,
    },
    dayBadgeText: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
    dayText: {
      flex: 1,
      gap: 2,
    },
  });
