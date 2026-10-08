import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, FadeIn, Screen, ScreenHeader, Skeleton, TextField } from '@/components';
import { circlesApi, useCircles, type CircleSummary } from '@/features/circles';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type Mode = 'none' | 'create' | 'join';

export default function CirculosScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { circles, loading, error, refetch } = useCircles();
  const [mode, setMode] = useState<Mode>('none');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openMode = (next: Mode) => {
    setFormError(null);
    setMode((current) => (current === next ? 'none' : next));
  };

  const submitCreate = async () => {
    setWorking(true);
    setFormError(null);
    const result = await circlesApi.create(name);
    setWorking(false);
    if (result.error) {
      setFormError(t(`circles.errors.${result.error}`));
      return;
    }
    setName('');
    setMode('none');
    router.push(`/circulo/${result.data.id}`);
  };

  const submitJoin = async () => {
    setWorking(true);
    setFormError(null);
    const result = await circlesApi.join(code);
    setWorking(false);
    if (result.error) {
      setFormError(t(`circles.errors.${result.error}`));
      return;
    }
    if (!result.data) {
      setFormError(t('circles.errors.invalid_code'));
      return;
    }
    setCode('');
    setMode('none');
    router.push(`/circulo/${result.data}`);
  };

  return (
    <Screen>
      <ScreenHeader title={t('tabs.circles')} />

      {loading ? (
        <>
          <Skeleton height={96} radius={theme.radius.lg} />
          <Skeleton height={54} radius={18} />
        </>
      ) : error ? (
        <Card style={styles.centeredCard}>
          <Text style={[theme.typography.body, styles.centeredText]}>
            {t('circles.unavailable')}
          </Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : (
        <>
          {circles.length === 0 ? (
            <FadeIn>
              <Card style={styles.emptyCard}>
                <LumiMascot mood="waiting" size={150} />
                <Text style={[theme.typography.heading, styles.centeredText]}>
                  {t('circles.emptyTitle')}
                </Text>
                <Text style={[theme.typography.body, styles.mutedText, styles.centeredText]}>
                  {t('circles.emptyBody')}
                </Text>
              </Card>
            </FadeIn>
          ) : (
            <>
              <Text style={[theme.typography.caption, styles.mutedText]}>{t('circles.intro')}</Text>
              {circles.map((circle, index) => (
                <FadeIn key={circle.id} delay={index * 60} rise={8}>
                  <CircleCard circle={circle} theme={theme} />
                </FadeIn>
              ))}
            </>
          )}

          <View style={styles.actions}>
            <Button
              label={t('circles.create')}
              variant={mode === 'create' ? 'secondary' : 'primary'}
              onPress={() => openMode('create')}
            />
            <Button
              label={t('circles.join')}
              variant={mode === 'join' ? 'secondary' : 'ghost'}
              onPress={() => openMode('join')}
            />
          </View>

          {mode === 'create' ? (
            <Card style={styles.form}>
              <TextField
                label={t('circles.nameLabel')}
                placeholder={t('circles.namePlaceholder')}
                value={name}
                onChangeText={setName}
                maxLength={40}
                autoCapitalize="words"
              />
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              <Button
                label={working ? t('circles.working') : t('circles.createSubmit')}
                onPress={submitCreate}
                disabled={working || !name.trim()}
              />
            </Card>
          ) : null}

          {mode === 'join' ? (
            <Card style={styles.form}>
              <TextField
                label={t('circles.codeLabel')}
                placeholder={t('circles.codePlaceholder')}
                value={code}
                onChangeText={(value) => setCode(value.toUpperCase())}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              <Button
                label={working ? t('circles.working') : t('circles.joinSubmit')}
                onPress={submitJoin}
                disabled={working || code.trim().length < 4}
              />
            </Card>
          ) : null}

          <Text style={[theme.typography.caption, styles.mutedText, styles.centeredText]}>
            {t('circles.limits')}
          </Text>
        </>
      )}
    </Screen>
  );
}

function CircleCard({ circle, theme }: { circle: CircleSummary; theme: Theme }) {
  const styles = getStyles(theme);
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push(`/circulo/${circle.id}`)}
      accessibilityRole="button"
      accessibilityLabel={circle.name}
    >
      <Card style={styles.circleCard}>
        <Text style={theme.typography.heading}>{circle.name}</Text>
        <Text style={[theme.typography.caption, styles.mutedText]}>
          {circle.member_count === 1
            ? t('circles.memberOne')
            : t('circles.memberMany', { count: circle.member_count })}
        </Text>
        <View style={styles.presenceRow}>
          {Array.from({ length: circle.member_count }, (_, index) => (
            <View
              key={index}
              style={[styles.presenceDot, index < circle.did_today_count && styles.presenceDotOn]}
            />
          ))}
        </View>
        <Text style={[theme.typography.caption, styles.mutedText]}>
          {t('circles.presence', { done: circle.did_today_count, total: circle.member_count })}
        </Text>
      </Card>
    </Pressable>
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
    emptyCard: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    circleCard: {
      gap: theme.spacing.xs,
    },
    presenceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: theme.spacing.xs,
    },
    presenceDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      backgroundColor: 'transparent',
    },
    presenceDotOn: {
      backgroundColor: theme.colors.green,
    },
    actions: {
      gap: theme.spacing.sm,
    },
    form: {
      gap: theme.spacing.md,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
