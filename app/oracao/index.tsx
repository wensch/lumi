import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Screen, TextField } from '@/components';
import { LumiMascot } from '@/features/lumi';
import { usePrayer } from '@/features/prayer';
import { useTheme, type Theme } from '@/theme';

type Mode = 'choice' | 'manual' | 'ai' | 'done';

export default function OracaoScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { devotional_session_id } = useLocalSearchParams<{ devotional_session_id?: string }>();
  const { saveManual, generateWithAI, saving, generating, error } = usePrayer();

  const [mode, setMode] = useState<Mode>('choice');
  const [manualText, setManualText] = useState('');
  const [personalText, setPersonalText] = useState('');
  const [generatedPrayer, setGeneratedPrayer] = useState<string | null>(null);

  const handleSaveManual = async () => {
    const entry = await saveManual(manualText, devotional_session_id);
    if (entry) setMode('done');
  };

  const handleGenerate = async () => {
    const entry = await generateWithAI(personalText, devotional_session_id);
    if (entry) {
      setGeneratedPrayer(entry.body);
      setMode('done');
    }
  };

  if (mode === 'done') {
    return (
      <Screen centered contentContainerStyle={styles.centeredContent}>
        <LumiMascot mood="happy" size={160} />
        <Text style={[theme.typography.heading, styles.centeredText]}>Oração registrada</Text>
        {generatedPrayer ? (
          <Card style={styles.prayerCard}>
            <Text style={[theme.typography.body, styles.prayerText]}>{generatedPrayer}</Text>
          </Card>
        ) : (
          <Text style={[theme.typography.body, styles.subtitle]}>
            Fica guardada com você — nunca compartilhamos suas orações.
          </Text>
        )}
        <Button label="Voltar para Hoje" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  if (mode === 'manual') {
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
          onPress={handleSaveManual}
          disabled={saving || !manualText.trim()}
        />
        <Button label="Voltar" variant="tertiary" onPress={() => setMode('choice')} />
      </Screen>
    );
  }

  if (mode === 'ai') {
    return (
      <Screen>
        <Text style={theme.typography.title}>Transformar em oração</Text>
        <Text style={[theme.typography.body, styles.subtitle]}>
          Conta pra gente o que está pensando ou sentindo — o Lumi ajuda a transformar isso em
          oração, com base no devocional de hoje.
        </Text>
        <Card style={styles.formCard}>
          <TextField
            label="O que você quer levar em oração?"
            placeholder="Estou ansioso com..."
            value={personalText}
            onChangeText={setPersonalText}
            multiline
          />
        </Card>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button
          label={generating ? 'Preparando sua oração...' : 'Gerar oração'}
          onPress={handleGenerate}
          disabled={generating || !personalText.trim()}
        />
        <Button label="Voltar" variant="tertiary" onPress={() => setMode('choice')} />
      </Screen>
    );
  }

  return (
    <Screen centered contentContainerStyle={styles.centeredContent}>
      <LumiMascot mood="waiting" size={160} />
      <Text style={[theme.typography.heading, styles.centeredText]}>Quer orar agora?</Text>
      <Text style={[theme.typography.body, styles.subtitle]}>Escolha como prefere fazer isso.</Text>

      <Button label="Escrever minha oração" onPress={() => setMode('manual')} />
      <Button label="Pedir ajuda ao Lumi" variant="secondary" onPress={() => setMode('ai')} />
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
    prayerCard: {
      width: '100%',
    },
    prayerText: {
      fontStyle: 'italic',
    },
    errorText: {
      ...theme.typography.caption,
      color: '#E05252',
    },
  });
