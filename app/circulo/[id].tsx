import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Button, Card, FadeIn, Screen, ScreenHeader, Skeleton, TextField } from '@/components';
import {
  circlesApi,
  InviteShare,
  PRAYER_REQUEST_MAX_LENGTH,
  useCircle,
  type CircleMember,
  type PrayerRequest,
} from '@/features/circles';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function CirculoScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, prayers, loading, error, refetch } = useCircle(id);
  const [copied, setCopied] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [posting, setPosting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const isOwner = detail?.my_role === 'owner';

  /** Roda uma ação do banco e, se falhar, mostra a mensagem traduzida. */
  const run = async (action: () => Promise<{ error: string | null }>) => {
    const result = await action();
    if (result.error) {
      Alert.alert(t(`circles.errors.${result.error}`));
      return false;
    }
    await refetch();
    return true;
  };

  const copyCode = async () => {
    if (!detail) return;
    await Clipboard.setStringAsync(detail.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cheer = async (member: CircleMember) => {
    if (!detail) return;
    Haptics.selectionAsync().catch(() => {});
    await run(() => circlesApi.cheer(detail.id, member.user_id));
  };

  const postRequest = async () => {
    if (!detail) return;
    setPosting(true);
    setRequestError(null);
    const result = await circlesApi.createPrayer(detail.id, requestText);
    setPosting(false);
    if (result.error) {
      setRequestError(t(`circles.errors.${result.error}`));
      return;
    }
    setRequestText('');
    setShowRequestForm(false);
    await refetch();
  };

  const confirm = (title: string, body: string, actionLabel: string, onConfirm: () => void) =>
    Alert.alert(title, body, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: actionLabel, style: 'destructive', onPress: onConfirm },
    ]);

  const confirmLeave = () => {
    if (!detail) return;
    confirm(
      t('circles.leaveConfirmTitle'),
      t('circles.leaveConfirmBody'),
      t('circles.leave'),
      async () => {
        const result = await circlesApi.leave(detail.id);
        if (result.error) {
          Alert.alert(t(`circles.errors.${result.error}`));
          return;
        }
        router.replace('/(tabs)/circulos');
      },
    );
  };

  const confirmRemove = (member: CircleMember) => {
    if (!detail) return;
    confirm(
      t('circles.removeConfirmTitle', { name: member.name }),
      t('circles.removeConfirmBody'),
      t('circles.remove'),
      () => run(() => circlesApi.removeMember(detail.id, member.user_id)),
    );
  };

  const confirmDeleteRequest = (request: PrayerRequest) =>
    confirm(
      t('circles.deleteConfirmTitle'),
      t('circles.deleteConfirmBody'),
      t('circles.deleteRequest'),
      () => run(() => circlesApi.deletePrayer(request.id)),
    );

  const confirmReport = (request: PrayerRequest) => {
    if (!detail) return;
    Alert.alert(t('circles.reportConfirmTitle'), t('circles.reportConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('circles.report'),
        onPress: async () => {
          const result = await circlesApi.report(detail.id, request.id, null, 'inappropriate');
          Alert.alert(result.error ? t(`circles.errors.${result.error}`) : t('circles.reportSent'));
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title={detail?.name ?? t('tabs.circles')} onBackPress={() => router.back()} />

      {loading ? (
        <>
          <Skeleton height={110} radius={theme.radius.lg} />
          <Skeleton height={200} radius={theme.radius.lg} />
        </>
      ) : error || !detail ? (
        <Card style={styles.centeredCard}>
          <Text style={[theme.typography.body, styles.centeredText]}>{t('circles.loadError')}</Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : (
        <>
          <FadeIn>
            <Card style={styles.togetherCard}>
              <Text style={theme.typography.bodyStrong}>
                {detail.week_moments === 1
                  ? t('circles.weekOne')
                  : t('circles.weekMany', { count: detail.week_moments })}
              </Text>
              {detail.cheers_received_today > 0 ? (
                <Text style={theme.typography.body}>
                  {detail.cheers_received_today === 1
                    ? t('circles.cheersOne')
                    : t('circles.cheersMany', { count: detail.cheers_received_today })}
                </Text>
              ) : null}
            </Card>
          </FadeIn>

          <FadeIn delay={60}>
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('circles.membersTitle')}</Text>
              {detail.members.map((member) => (
                <View key={member.user_id} style={styles.memberRow}>
                  <View style={[styles.statusDot, member.did_today && styles.statusDotOn]}>
                    <Text style={styles.statusDotLabel}>{member.did_today ? '✓' : ''}</Text>
                  </View>
                  <View style={styles.memberText}>
                    <Text style={theme.typography.bodyStrong} numberOfLines={1}>
                      {member.name}
                      {member.is_me ? ` (${t('circles.you')})` : ''}
                    </Text>
                    <Text style={[theme.typography.caption, styles.mutedText]}>
                      {member.did_today ? t('circles.didToday') : t('circles.notYet')}
                      {member.role === 'owner' ? ` · ${t('circles.owner')}` : ''}
                    </Text>
                  </View>
                  {member.is_me ? null : (
                    <View style={styles.memberActions}>
                      <Pressable
                        onPress={() => cheer(member)}
                        disabled={member.cheered_by_me}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('circles.cheer')} ${member.name}`}
                        style={[styles.smallButton, member.cheered_by_me && styles.smallButtonOn]}
                      >
                        <Text style={styles.smallButtonLabel}>
                          💛 {member.cheered_by_me ? t('circles.cheered') : t('circles.cheer')}
                        </Text>
                      </Pressable>
                      {isOwner ? (
                        <Pressable
                          onPress={() => confirmRemove(member)}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('circles.remove')} ${member.name}`}
                          hitSlop={8}
                        >
                          <Text style={styles.linkLabel}>✕</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              ))}
            </Card>
          </FadeIn>

          <FadeIn delay={120}>
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('circles.prayersTitle')}</Text>
              <Text style={[theme.typography.caption, styles.mutedText]}>
                {t('circles.prayersHint')}
              </Text>

              {showRequestForm ? (
                <View style={styles.requestForm}>
                  <TextField
                    label={t('circles.newRequest')}
                    placeholder={t('circles.requestPlaceholder')}
                    value={requestText}
                    onChangeText={setRequestText}
                    multiline
                    maxLength={PRAYER_REQUEST_MAX_LENGTH}
                  />
                  <Text style={[theme.typography.caption, styles.mutedText]}>
                    {requestText.length}/{PRAYER_REQUEST_MAX_LENGTH}
                  </Text>
                  {requestError ? <Text style={styles.errorText}>{requestError}</Text> : null}
                  <Button
                    label={posting ? t('circles.working') : t('circles.post')}
                    onPress={postRequest}
                    disabled={posting || !requestText.trim()}
                  />
                  <Button
                    label={t('common.cancel')}
                    variant="tertiary"
                    onPress={() => setShowRequestForm(false)}
                  />
                </View>
              ) : (
                <Button
                  label={t('circles.newRequest')}
                  variant="secondary"
                  onPress={() => setShowRequestForm(true)}
                />
              )}

              {prayers.length === 0 ? (
                <Text style={[theme.typography.body, styles.mutedText]}>
                  {t('circles.noPrayers')}
                </Text>
              ) : (
                prayers.map((request) => (
                  <View key={request.id} style={styles.requestCard}>
                    <Text style={[theme.typography.caption, styles.mutedText]}>
                      {request.is_mine ? t('circles.you') : request.author_name}
                      {request.resolved ? ` · ${t('circles.resolved')}` : ''}
                    </Text>
                    <Text style={theme.typography.body} selectable>
                      {request.body}
                    </Text>
                    <Text style={[theme.typography.caption, styles.mutedText]}>
                      {request.prayed_count === 1
                        ? t('circles.prayedByOne')
                        : request.prayed_count > 1
                          ? t('circles.prayedByMany', { count: request.prayed_count })
                          : ''}
                    </Text>
                    <View style={styles.requestActions}>
                      {request.is_mine ? (
                        <>
                          {request.resolved ? null : (
                            <Pressable
                              onPress={() => run(() => circlesApi.resolvePrayer(request.id))}
                              accessibilityRole="button"
                              style={styles.smallButton}
                            >
                              <Text style={styles.smallButtonLabel}>{t('circles.resolve')}</Text>
                            </Pressable>
                          )}
                          <Pressable
                            onPress={() => confirmDeleteRequest(request)}
                            accessibilityRole="button"
                            hitSlop={8}
                          >
                            <Text style={styles.linkLabel}>{t('circles.deleteRequest')}</Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Pressable
                            onPress={() => {
                              Haptics.selectionAsync().catch(() => {});
                              run(() => circlesApi.pray(request.id));
                            }}
                            disabled={request.i_prayed}
                            accessibilityRole="button"
                            style={[styles.smallButton, request.i_prayed && styles.smallButtonOn]}
                          >
                            <Text style={styles.smallButtonLabel}>
                              {request.i_prayed ? t('circles.prayed') : `🙏 ${t('circles.pray')}`}
                            </Text>
                          </Pressable>
                          {isOwner ? (
                            <Pressable
                              onPress={() => confirmDeleteRequest(request)}
                              accessibilityRole="button"
                              hitSlop={8}
                            >
                              <Text style={styles.linkLabel}>{t('circles.deleteRequest')}</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            onPress={() => confirmReport(request)}
                            accessibilityRole="button"
                            hitSlop={8}
                          >
                            <Text style={styles.linkLabel}>{t('circles.report')}</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                ))
              )}
            </Card>
          </FadeIn>

          <FadeIn delay={180}>
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('circles.inviteTitle')}</Text>
              <Text style={[theme.typography.caption, styles.mutedText]}>
                {t('circles.inviteHint')}
              </Text>
              <Text style={styles.inviteCode} selectable>
                {detail.invite_code}
              </Text>
              <Button
                label={copied ? t('circles.copied') : t('circles.copy')}
                variant="secondary"
                onPress={copyCode}
              />
              <InviteShare circleName={detail.name} code={detail.invite_code} />
            </Card>
          </FadeIn>

          <Button label={t('circles.leave')} variant="tertiary" onPress={confirmLeave} />
        </>
      )}
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    mutedText: {
      color: theme.colors.muted,
    },
    centeredText: {
      textAlign: 'center',
    },
    centeredCard: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    togetherCard: {
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.green,
    },
    sectionCard: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.heading,
      color: theme.colors.ink,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    memberText: {
      flex: 1,
    },
    memberActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    statusDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusDotOn: {
      backgroundColor: theme.colors.green,
    },
    statusDotLabel: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
      fontSize: 14,
    },
    smallButton: {
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.bg,
    },
    smallButtonOn: {
      backgroundColor: theme.colors.yellow,
    },
    smallButtonLabel: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      fontWeight: '700',
    },
    linkLabel: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      textDecorationLine: 'underline',
    },
    requestForm: {
      gap: theme.spacing.sm,
    },
    requestCard: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 2,
      borderTopColor: theme.colors.muted,
      borderStyle: 'dashed',
    },
    requestActions: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    inviteCode: {
      ...theme.typography.display,
      color: theme.colors.ink,
      textAlign: 'center',
      letterSpacing: 4,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
