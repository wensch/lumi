import { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, Switch, Text, View } from 'react-native';
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
import { openPrivacyPolicy } from '@/lib/privacy';

const AGE_RANGE_KEYS: Record<AgeRange, string> = {
  kid: 'ageKid',
  teen: 'ageTeen',
  adult: 'ageAdult',
  senior: 'ageSenior',
};

type Step = 'name' | 'age' | 'consent' | 'time';

/** Versão do texto de consentimento dos pais (guardada junto com o registro). */
const CONSENT_VERSION = '2026-11';
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function OnboardingScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language } = useTranslation();
  const { session } = useAuth();
  const { refetch, markOnboardingCompleted } = useProfile();

  const ageRanges = (Object.keys(AGE_RANGE_KEYS) as AgeRange[]).map((value) => ({
    value,
    label: t(`onboarding.${AGE_RANGE_KEYS[value]}` as const),
  }));

  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  // Criança: um dos pais ou responsável precisa consentir antes de terminar o cadastro (LGPD, art. 14).
  const steps: Step[] =
    ageRange === 'kid' ? ['name', 'age', 'consent', 'time'] : ['name', 'age', 'time'];
  const step: Step = steps[stepIndex];
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
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
      return;
    }
    if (step === 'consent') {
      if (guardianName.trim().length < 2) {
        setError(t('onboarding.guardianNameRequired'));
        return;
      }
      if (!EMAIL_PATTERN.test(guardianEmail.trim())) {
        setError(t('onboarding.guardianEmailInvalid'));
        return;
      }
      if (!consentChecked) {
        setError(t('onboarding.consentCheckRequired'));
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
      if (ageRange === 'kid') {
        const { error: consentError } = await supabase.rpc('record_parental_consent', {
          p_guardian_name: guardianName.trim(),
          p_guardian_email: guardianEmail.trim(),
          p_version: CONSENT_VERSION,
        });
        if (consentError) {
          setError(t('onboarding.consentFailed'));
          return;
        }
      }
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

      // O servidor já confirmou: não depende da releitura (que pode falhar sem rede) para seguir.
      markOnboardingCompleted();
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
        {steps.map((s, index) => (
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
              maxLength={100}
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

        {step === 'consent' ? (
          <>
            <Text style={theme.typography.heading}>{t('onboarding.consentTitle')}</Text>
            <Text style={styles.helperText}>{t('onboarding.consentBody')}</Text>
            <TextField
              label={t('onboarding.guardianName')}
              value={guardianName}
              onChangeText={setGuardianName}
              autoCapitalize="words"
              maxLength={100}
            />
            <TextField
              label={t('onboarding.guardianEmail')}
              value={guardianEmail}
              onChangeText={setGuardianEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={200}
            />
            <View style={styles.consentRow}>
              <Switch
                value={consentChecked}
                onValueChange={setConsentChecked}
                accessibilityLabel={t('onboarding.consentCheck')}
              />
              <Text style={[theme.typography.body, styles.consentText]}>
                {t('onboarding.consentCheck')}
              </Text>
            </View>
            <Button
              variant="ghost"
              label={t('settings.privacyPolicy')}
              onPress={() => void openPrivacyPolicy(language)}
            />
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
    consentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    consentText: {
      flex: 1,
    },
    optionsGrid: {
      gap: theme.spacing.sm,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
