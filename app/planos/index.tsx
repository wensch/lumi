import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, FadeIn, Screen, ScreenHeader, Skeleton } from '@/components';
import { usePlans, type PlanSummary } from '@/features/plans';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function PlanosScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { plans, loading, error, refetch } = usePlans();

  return (
    <Screen>
      <ScreenHeader title={t('plans.title')} onBackPress={() => router.back()} />
      <Text style={[theme.typography.caption, styles.muted]}>{t('plans.intro')}</Text>

      {loading ? (
        <>
          <Skeleton height={120} radius={theme.radius.lg} />
          <Skeleton height={120} radius={theme.radius.lg} />
          <Skeleton height={120} radius={theme.radius.lg} />
        </>
      ) : error ? (
        <Card style={styles.centeredCard}>
          <Text style={[theme.typography.body, styles.centeredText]}>{t('plans.errorLoad')}</Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : plans.length === 0 ? (
        <Text style={theme.typography.body}>{t('plans.empty')}</Text>
      ) : (
        plans.map((plan, index) => (
          <FadeIn key={plan.id} delay={Math.min(index, 6) * 50} rise={8}>
            <PlanCard plan={plan} theme={theme} />
          </FadeIn>
        ))
      )}
    </Screen>
  );
}

function PlanCard({ plan, theme }: { plan: PlanSummary; theme: Theme }) {
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const statusLabel =
    plan.status === 'active'
      ? t('plans.statusActive')
      : plan.status === 'paused'
        ? t('plans.statusPaused')
        : plan.status === 'done'
          ? t('plans.statusDone')
          : null;
  const progress = plan.days > 0 ? Math.min(plan.last_day_done / plan.days, 1) : 0;

  return (
    <Pressable
      onPress={() => router.push(`/planos/${plan.id}`)}
      accessibilityRole="button"
      accessibilityLabel={plan.title}
    >
      <Card style={[styles.card, plan.status === 'active' && styles.cardActive]}>
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{plan.icon ?? '📖'}</Text>
          <View style={styles.cardTitleBox}>
            <Text style={theme.typography.bodyStrong}>{plan.title}</Text>
            <Text style={[theme.typography.caption, styles.muted]}>
              {t('plans.daysCount', { count: plan.days })}
              {statusLabel ? ` · ${statusLabel}` : ''}
            </Text>
          </View>
        </View>
        <Text style={[theme.typography.body, styles.description]}>{plan.description}</Text>
        {plan.status === 'active' || plan.status === 'paused' ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={[theme.typography.caption, styles.muted]}>
              {t('plans.dayProgress', { done: plan.last_day_done, total: plan.days })}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    muted: {
      color: theme.colors.muted,
    },
    centeredCard: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    centeredText: {
      textAlign: 'center',
    },
    card: {
      gap: theme.spacing.sm,
    },
    cardActive: {
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
    description: {
      color: theme.colors.ink,
    },
    progressBlock: {
      gap: 4,
    },
    progressTrack: {
      height: 14,
      borderRadius: 7,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.green,
    },
  });
