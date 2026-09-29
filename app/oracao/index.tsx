import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Screen, TextField } from '@/components';
import { LumiMascot } from '@/features/lumi';
import { usePrayer } from '@/features/prayer';
import { useTheme, type Theme } from '@/theme';

export default function OracaoScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
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
        <Text style={[theme.typography.heading, styles.centeredText]}>Oração registrada</Text>
        <Text style={[theme.typography.body, styles.subtitle]}>
          Fica guardada com você — nunca compartilhamos suas orações.
        </Text>
        <Button label="Voltar para Hoje" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={theme.typography.title}>Sua oração</Text>
      <Text style={[theme.typography.body, styles.subtitle]}>
        Escreva do seu jeito. Isso fica só entre você e o Lumi.
      </Text>
      <Card style={styles.formCard}>
        <TextField
          label="Oração"
          placeholder="Senhor, hoje eu queria..."
          value={manualText}
          onChangeText={setManualText}
          multiline
        />
      </Card>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button
        label={saving ? 'Salvando...' : 'Salvar oração'}
        onPress={handleSave}
        disabled={saving || !manualText.trim()}
      />
      <Button label="Agora não" variant="tertiary" onPress={() => router.replace('/(tabs)')} />
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
      color: '#E05252',
    },
  });
