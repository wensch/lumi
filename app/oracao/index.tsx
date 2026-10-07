import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Screen, TextField } from '@/components';
import { LumiMascot } from '@/features/lumi';
import { usePrayer } from '@/features/prayer';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function OracaoScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { devotional_session_id } = useLocalSearchParams<{ devotional_session_id?: string }>();
  const { saveManual, saving, error } = usePrayer();

  const [manualText, setManualText] = useState('');
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    const entry = await saveManual(manualText, devotional_session_id);
    if (entry) setDone(true);
  };

  if (done) {
    return (
      <Screen centered contentContainerStyle={styles.centeredContent}>
        <LumiMascot mood="happy" size={160} />
        <Text style={[theme.typography.heading, styles.centeredText]}>
          {t('prayer.savedTitle')}
        </Text>
        <Text style={[theme.typography.body, styles.subtitle]}>{t('prayer.savedSubtitle')}</Text>
        <Button label={t('devotional.backToToday')} onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={theme.typography.title}>{t('prayer.title')}</Text>
      <Text style={[theme.typography.body, styles.subtitle]}>{t('prayer.subtitle')}</Text>
      <Card style={styles.formCard}>
        <TextField
          label={t('prayer.label')}
          placeholder={t('prayer.placeholder')}
          value={manualText}
          onChangeText={setManualText}
          multiline
        />
      </Card>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button
        label={saving ? t('prayer.saving') : t('prayer.save')}
        onPress={handleSave}
        disabled={saving || !manualText.trim()}
      />
      <Button
        label={t('prayer.notNow')}
        variant="tertiary"
        onPress={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    centeredContent: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    centeredText: {
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.muted,
      textAlign: 'center',
    },
    formCard: {
      gap: theme.spacing.sm,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
