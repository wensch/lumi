import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, Card, FadeIn, IconBadge, Screen, ScreenHeader, Skeleton } from '@/components';
import {
  challengesApi,
  ChallengeReward,
  CustomChallengeForm,
  daysLeft,
  useChallengeRewards,
  useChallenges,
  type Challenge,
  type ChallengeErrorCode,
  type NewChallenge,
} from '@/features/challenges';
import { rewardForChallenge } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import { goBackOrHome } from '@/lib/navigation';

export default function DesafiosScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { challenges, loading, error, refetch } = useChallenges();
  const rewards = useChallengeRewards();
  const [working, setWorking] = useState(false);
  // Vindo da aba Jornada (Criar meu desafio), o formulário já abre.
  const { novo } = useLocalSearchParams<{ novo?: string }>();
  // Trava síncrona contra toque duplo (o estado `working` só vale no próximo render).
  const busyRef = useRef(false);
  const [creating, setCreating] = useState(novo === '1');

  const active = challenges.filter((challenge) => challenge.state === 'active');
  const available = challenges.filter((challenge) => challenge.state === 'available');

  const run = async (action: () => Promise<{ error: ChallengeErrorCode | null }>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setWorking(true);
    const result = await action();
    setWorking(false);
    busyRef.current = false;
    if (result.error !== null) {
      Alert.alert(t(`challenges.errors.${result.error}`));
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    await refetch();
  };

  const create = async (input: NewChallenge) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setWorking(true);
    const result = await challengesApi.createCustom(input, null);
    setWorking(false);
    busyRef.current = false;
    if (result.error !== null) {
      Alert.alert(t(`challenges.errors.${result.error}`));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCreating(false);
    await refetch();
  };

  const confirmRemove = (challenge: Challenge) => {
    Alert.alert(t('challenges.removeCustomTitle'), t('challenges.removeCustomBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('challenges.removeCustom'),
        onPress: () => void run(() => challengesApi.archiveCustom(challenge.id)),
      },
    ]);
  };

  const confirmAbandon = (challenge: Challenge) => {
    Alert.alert(t('challenges.abandonTitle'), t('challenges.abandonBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('challenges.abandon'),
        style: 'destructive',
        onPress: () => void run(() => challengesApi.abandon(challenge.id)),
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title={t('challenges.title')} onBackPress={goBackOrHome} />
      <Text style={[theme.typography.caption, styles.muted]}>{t('challenges.intro')}</Text>

      {loading ? (
        <>
          <Skeleton height={130} radius={theme.radius.lg} />
          <Skeleton height={130} radius={theme.radius.lg} />
        </>
      ) : error ? (
        <Card style={styles.centeredCard}>
          <Text style={[theme.typography.body, styles.centeredText]}>
            {t('challenges.errorLoad')}
          </Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : (
        <>
          {active.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>{t('challenges.activeTitle')}</Text>
              {active.map((challenge, index) => (
                <FadeIn key={challenge.id} delay={index * 50} rise={8}>
                  <ChallengeCard
                    challenge={challenge}
                    theme={theme}
                    rewards={rewards}
                    actionLabel={t('challenges.abandon')}
                    actionVariant="tertiary"
                    onAction={() => confirmAbandon(challenge)}
                    disabled={working}
                  />
                </FadeIn>
              ))}
            </>
          ) : null}

          {creating ? (
            <Card>
              <CustomChallengeForm
                working={working}
                onSubmit={(input) => void create(input)}
                onCancel={() => setCreating(false)}
              />
            </Card>
          ) : (
            <Button
              label={t('challenges.createOwn')}
              variant="secondary"
              onPress={() => setCreating(true)}
            />
          )}

          <Text style={styles.sectionTitle}>{t('challenges.availableTitle')}</Text>
          {available.map((challenge, index) => (
            <FadeIn key={challenge.id} delay={Math.min(index, 6) * 50} rise={8}>
              <ChallengeCard
                challenge={challenge}
                theme={theme}
                rewards={rewards}
                actionLabel={t('challenges.start')}
                actionVariant="secondary"
                onAction={() => void run(() => challengesApi.start(challenge.id))}
                onRemove={challenge.custom ? () => confirmRemove(challenge) : undefined}
                disabled={working}
              />
            </FadeIn>
          ))}
        </>
      )}
    </Screen>
  );
}

function ChallengeCard({
  challenge,
  theme,
  rewards,
  actionLabel,
  actionVariant,
  onAction,
  onRemove,
  disabled,
}: {
  challenge: Challenge;
  theme: Theme;
  /** Desafios já concluídos (liberam os itens do Lumi). */
  rewards: ReadonlySet<string>;
  actionLabel: string;
  actionVariant: 'secondary' | 'tertiary';
  onAction: () => void;
  onRemove?: () => void;
  disabled: boolean;
}) {
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const isActive = challenge.state === 'active';
  const progress = challenge.target > 0 ? Math.min(challenge.progress / challenge.target, 1) : 0;
  const left = daysLeft(challenge.ends_at);
  const reward = rewardForChallenge(challenge);

  return (
    <Card style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <IconBadge name={challenge.icon} fallback="🎯" />
        <View style={styles.cardTitleBox}>
          <Text style={theme.typography.bodyStrong}>{challenge.title}</Text>
          <Text style={[theme.typography.caption, isActive ? styles.onCardMuted : styles.muted]}>
            {challenge.custom ? `${t('challenges.customTag')} · ` : ''}
            {t('challenges.inDays', { count: challenge.window_days })}
            {challenge.completed_count > 0
              ? ` · ${t('challenges.doneTimes', { count: challenge.completed_count })}`
              : ''}
          </Text>
        </View>
      </View>
      <Text style={theme.typography.body}>{challenge.description}</Text>
      {reward ? (
        <ChallengeReward
          outfit={reward}
          earned={rewards.has(challenge.custom ? 'custom' : challenge.slug)}
        />
      ) : null}

      {isActive ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={[theme.typography.caption, isActive ? styles.onCardMuted : styles.muted]}>
            {t('challenges.progress', { done: challenge.progress, total: challenge.target })} ·{' '}
            {left === 0
              ? t('challenges.endsToday')
              : left === 1
                ? t('challenges.endsTomorrow')
                : t('challenges.endsInDays', { count: left })}
          </Text>
        </View>
      ) : challenge.last_status === 'completed' ? (
        <Text style={styles.statusLine}>{t('challenges.lastCompleted')}</Text>
      ) : challenge.last_status === 'expired' ? (
        <Text style={[theme.typography.caption, styles.muted]}>{t('challenges.lastExpired')}</Text>
      ) : null}

      <Button label={actionLabel} variant={actionVariant} onPress={onAction} disabled={disabled} />
      {onRemove ? (
        <Button
          label={t('challenges.removeCustom')}
          variant="tertiary"
          onPress={onRemove}
          disabled={disabled}
        />
      ) : null}
    </Card>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    muted: {
      color: theme.colors.muted,
    },
    // Texto secundário sobre cartão amarelo: `muted` não passa de 4,5:1 nesse fundo (recorte e noite).
    onCardMuted: {
      color: theme.colors.ink,
    },
    centeredCard: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    centeredText: {
      textAlign: 'center',
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
    progressBlock: {
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
    statusLine: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
  });
