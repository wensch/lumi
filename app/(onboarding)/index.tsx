import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Button, Card, ScreenContainer, TextField } from '@/components';
import { useAuth } from '@/features/auth';
import { useProfile } from '@/features/onboarding';
import { requestNotificationPermission, scheduleDailyReminder } from '@/features/notifications';
import { supabase } from '@/lib/supabase';
import type { AgeRange } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme';

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: 'kid', label: 'Criança' },
  { value: 'teen', label: 'Adolescente' },
  { value: 'adult', label: 'Adulto' },
  { value: 'senior', label: 'Idoso' },
];

const STEPS = ['name', 'age', 'time'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
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
    <ScreenContainer style={styles.container}>
      <Card style={styles.card}>
        {step === 'name' ? (
          <>
            <Text style={typography.heading}>Como podemos te chamar?</Text>
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
            <Text style={typography.heading}>Qual sua faixa etária?</Text>
            <Text style={[typography.body, styles.helperText]}>
              Isso nos ajuda a personalizar sua experiência.
            </Text>
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
            <Text style={typography.heading}>Que horas você quer ser lembrado?</Text>
            <Text style={[typography.body, styles.helperText]}>
              Pode ajustar isso depois no seu perfil.
            </Text>
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
          <Button label="Voltar" variant="ghost" onPress={goBack} disabled={submitting} />
        ) : null}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  card: {
    gap: spacing.md,
  },
  helperText: {
    color: colors.ink,
  },
  optionsGrid: {
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: '#E05252',
  },
});
