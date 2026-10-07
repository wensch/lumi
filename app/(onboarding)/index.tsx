import { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Button, Card, Screen, TextField } from '@/components';
import { useAuth } from '@/features/auth';
import { useProfile } from '@/features/onboarding';
import { requestNotificationPermission, scheduleDailyReminder } from '@/features/notifications';
import { supabase } from '@/lib/supabase';
import type { AgeRange } from '@/lib/supabase';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

const AGE_RANGE_KEYS: Record<AgeRange, string> = {
  kid: 'ageKid',
  teen: 'ageTeen',
  adult: 'ageAdult',
  senior: 'ageSenior',
};

const STEPS = ['name', 'age', 'time'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { session } = useAuth();
  const { refetch } = useProfile();

  const ageRanges = (Object.keys(AGE_RANGE_KEYS) as AgeRange[]).map((value) => ({
    value,
    label: t(`onboarding.${AGE_RANGE_KEYS[value]}` as const),
  }));

  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex];
  const [displayName, setDisplayName] = useState('');
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [preferredTime, setPreferredTime] = useState(new Date(2000, 0, 1, 8, 0));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const goNext = () => {
    setError(null);
    if (step === 'name') {
      if (!displayName.trim()) {
        setError(t('onboarding.nameRequired'));
        return;
      }
      setStepIndex(stepIndex + 1);
      return;
    }
    if (step === 'age') {
      if (!ageRange) {
        setError(t('onboarding.ageRequired'));
        return;
      }
      setStepIndex(stepIndex + 1);
    }
  };

  const goBack = () => {
    setError(null);
    setStepIndex(Math.max(0, stepIndex - 1));
  };

  // Botão voltar do Android: volta uma etapa em vez de sair do app.
  useEffect(() => {
    if (stepIndex === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setError(null);
      setStepIndex((current) => Math.max(0, current - 1));
      return true;
    });
    return () => subscription.remove();
  }, [stepIndex]);

  const finish = async () => {
    if (!session || !ageRange) return;
    setError(null);
    setSubmitting(true);

    const timeString = `${String(preferredTime.getHours()).padStart(2, '0')}:${String(
      preferredTime.getMinutes(),
    ).padStart(2, '0')}:00`;

    try {
      const { error: onboardingError } = await supabase.rpc('complete_onboarding', {
        p_display_name: displayName.trim(),
        p_age_range: ageRange,
        p_preferred_time: timeString,
      });

      if (onboardingError) {
        setError(t('errors.onboardingFailed'));
        return;
      }

      // Lembrete é um extra: se a permissão falhar ou for negada, o onboarding já valeu.
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleDailyReminder(timeString);
        }
      } catch {
        // segue sem lembrete; dá para ligar depois em Configurações
      }

      await refetch();
      router.replace('/(tabs)');
    } catch {
      setError(t('errors.onboardingFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen centered contentContainerStyle={styles.content}>
      <View style={styles.progress}>
        {STEPS.map((s, index) => (
          <View
            key={s}
            style={[styles.progressDot, index <= stepIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      <Card style={styles.card}>
        {step === 'name' ? (
          <>
            <Text style={theme.typography.heading}>{t('onboarding.nameQuestion')}</Text>
            <TextField
              label={t('onboarding.nameLabel')}
              placeholder={t('onboarding.namePlaceholder')}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </>
        ) : null}

        {step === 'age' ? (
          <>
            <Text style={theme.typography.heading}>{t('onboarding.ageQuestion')}</Text>
            <Text style={styles.helperText}>{t('onboarding.ageHelper')}</Text>
            <View style={styles.optionsGrid}>
              {ageRanges.map((option) => (
                <Button
                  key={option.value}
                  label={option.label}
                  variant={ageRange === option.value ? 'primary' : 'ghost'}
                  onPress={() => setAgeRange(option.value)}
                />
              ))}
            </View>
          </>
        ) : null}

        {step === 'time' ? (
          <>
            <Text style={theme.typography.heading}>{t('onboarding.timeQuestion')}</Text>
            <Text style={styles.helperText}>{t('onboarding.timeHelper')}</Text>
            {Platform.OS === 'android' && !showPicker ? (
              <Button
                variant="ghost"
                label={preferredTime.toTimeString().slice(0, 5)}
                onPress={() => setShowPicker(true)}
              />
            ) : null}
            {showPicker ? (
              <DateTimePicker
                value={preferredTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowPicker(false);
                  }
                  // 'dismissed' (Cancelar) também traz a data original: só vale se confirmou.
                  if (event.type === 'set' && selectedDate) {
                    setPreferredTime(selectedDate);
                  }
                }}
              />
            ) : null}
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={step === 'time' ? t('onboarding.finish') : t('onboarding.continue')}
          onPress={step === 'time' ? finish : goNext}
          disabled={submitting}
        />

        {stepIndex > 0 ? (
          <Button
            label={t('common.back')}
            variant="tertiary"
            onPress={goBack}
            disabled={submitting}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      alignItems: 'stretch',
    },
    progress: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
    },
    progressDotActive: {
      backgroundColor: theme.colors.green,
    },
    card: {
      gap: theme.spacing.md,
    },
    helperText: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    optionsGrid: {
      gap: theme.spacing.sm,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
