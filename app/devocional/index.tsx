import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { BibleCard } from '@youversion/platform-react-native-expo-ui';
import { Button, Card, ScreenContainer, TextField } from '@/components';
import { useDevotional } from '@/features/devotional';
import { LumiMascot } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

export default function DevocionalScreen() {
  const { content, session, loading, completing, error, complete } = useDevotional();
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState<{ streak: number; xp: number } | null>(null);

  const handleComplete = async () => {
    const outcome = await complete(reflection.trim() || undefined);
    if (outcome) {
      setResult({ streak: outcome.current_streak, xp: outcome.xp_awarded });
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <Text style={typography.body}>Preparando seu momento…</Text>
      </ScreenContainer>
    );
  }

  if (!content) {
    return (
      <ScreenContainer style={styles.centered}>
        <Text style={typography.heading}>Ainda não há devocional disponível.</Text>
        <Text style={[typography.body, styles.subtitle]}>Volte em breve.</Text>
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  if (result) {
    return (
      <ScreenContainer style={styles.centered}>
        <LumiMascot mood="celebrating" size={140} />
        <Text style={typography.heading}>Momento concluído!</Text>
        <Text style={[typography.body, styles.subtitle]}>
          {result.xp > 0
            ? `+${result.xp} XP · sequência de ${result.streak} ${result.streak === 1 ? 'dia' : 'dias'}`
            : `Sequência de ${result.streak} ${result.streak === 1 ? 'dia' : 'dias'}`}
        </Text>
        <Button label="Voltar para Hoje" onPress={() => router.replace('/(tabs)')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={typography.title}>{content.title}</Text>

      {content.passage_reference && content.youversion_version_id ? (
        <Card>
          <BibleCard
            reference={content.passage_reference}
            versionId={content.youversion_version_id}
          />
        </Card>
      ) : null}

      <Card>
        <Text style={typography.body}>{content.body}</Text>
      </Card>

      <Card style={styles.reflectionCard}>
        <Text style={typography.bodyStrong}>Quer registrar uma reflexão? (opcional)</Text>
        <TextField
          label="Sua reflexão"
          placeholder="O que ficou com você hoje..."
          value={reflection}
          onChangeText={setReflection}
          multiline
        />
      </Card>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        label="Concluir meu momento"
        onPress={handleComplete}
        disabled={completing || !session}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.ink,
    textAlign: 'center',
  },
  reflectionCard: {
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: '#E05252',
  },
});
