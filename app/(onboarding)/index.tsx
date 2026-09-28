import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Button, Card, Screen, TextField } from '@/components';
import { useAuth } from '@/features/auth';
import { useProfile } from '@/features/onboarding';
import { requestNotificationPermission, scheduleDailyReminder } from '@/features/notifications';
import { supabase } from '@/lib/supabase';
import type { AgeRange } from '@/lib/supabase';
import { useTheme, type Theme } from '@/theme';

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: 'kid', label: 'Criança' },
  { value: 'teen', label: 'Adolescente' },
  { value: 'adult', label: 'Adulto' },
  { value: 'senior', label: 'Idoso' },
];

const STEPS = ['name', 'age', 'time'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { session } = useAuth();
  const { refetch } = useProfile();

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
        setError('Como podemos te chamar?');
        return;
      }
      setStepIndex(stepIndex + 1);
      return;
    }
    if (step === 'age') {
      if (!ageRange) {
        setError('Escolha uma faixa etária.');
        return;
      }
      setStepIndex(stepIndex + 1);
    }
  };

  const goBack = () => {
    setError(null);
    setStepIndex(Math.max(0, stepIndex - 1));
  };

  const finish = async () => {
    if (!session || !ageRange) return;
    setError(null);
    setSubmitting(true);

    const timeString = `${String(preferredTime.getHours()).padStart(2, '0')}:${String(
      preferredTime.getMinutes(),
    ).padStart(2, '0')}:00`;

    const { error: onboardingError } = await supabase.rpc('complete_onboarding', {
      p_display_name: displayName.trim(),
      p_age_range: ageRange,
      p_preferred_time: timeString,
    });

    if (onboardingError) {
      setError(onboardingError.message);
      setSubmitting(false);
      return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      await scheduleDailyReminder(timeString);
    }

    await refetch();
    setSubmitting(false);
    router.replace('/(tabs)');
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
            <Text style={theme.typography.heading}>Como podemos te chamar?</Text>
            <TextField
              label="Nome"
              placeholder="Seu nome"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </>
        ) : null}

        {step === 'age' ? (
          <>
            <Text style={theme.typography.heading}>Qual sua faixa etária?</Text>
            <Text style={styles.helperText}>Isso nos ajuda a personalizar sua experiência.</Text>
            <View style={styles.optionsGrid}>
              {AGE_RANGES.map((option) => (
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
            <Text style={theme.typography.heading}>Que horas você quer ser lembrado?</Text>
            <Text style={styles.helperText}>Pode ajustar isso depois no seu perfil.</Text>
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
                onChange={(_event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowPicker(false);
                  }
                  if (selectedDate) {
                    setPreferredTime(selectedDate);
                  }
                }}
              />
            ) : null}
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={step === 'time' ? 'Concluir' : 'Continuar'}
          onPress={step === 'time' ? finish : goNext}
          disabled={submitting}
        />

        {stepIndex > 0 ? (
          <Button label="Voltar" variant="tertiary" onPress={goBack} disabled={submitting} />
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
      color: '#E05252',
    },
  });
